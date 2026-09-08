/**
 * Authorised security probe against this project's own Supabase and deployment.
 *
 * Everything here is a read-only or self-cleaning check of controls we claim to
 * have. It asserts the boundary holds; it does not try to break anything it
 * would then leave broken.
 *
 *   npm run security                      # against the deployment
 *   SEC_ORIGIN=http://localhost:4173 npm run security
 */
import { createClient } from '@supabase/supabase-js'
import { readFileSync, readdirSync, statSync } from 'node:fs'

const URL_ = process.env.VITE_SUPABASE_URL
const KEY = process.env.VITE_SUPABASE_PUBLISHABLE_KEY
const ORIGIN = process.env.SEC_ORIGIN || 'https://tracker-six-flax.vercel.app'
const EMAIL = process.env.E2E_EMAIL
const PASSWORD = process.env.E2E_PASSWORD
// Which rollout phase the database under test is in. Deliberately NOT detected
// from the database: a check that reads the grants and then asserts what it read
// cannot fail. The caller declares what it expects and the probe holds it to it.
//
// The default is '2' because that is production since 2026-09-08 (D80). It read
// '1' until then, which meant `npm run security` with no variable set — how
// `verify.yml` invokes it — failed against a correctly secured database, because
// phase 1 requires `src` to still be updateable and phase 2 revokes it. Set '1'
// explicitly for a database that has had phase 1 but not phase 2.
const OCCURRENCE_IDENTITY_PHASE = process.env.OCCURRENCE_IDENTITY_PHASE || '2'

if (!['1', '2'].includes(OCCURRENCE_IDENTITY_PHASE)) {
  console.error('OCCURRENCE_IDENTITY_PHASE must be 1 or 2')
  process.exit(2)
}

const OCCURRENCE_IDENTITY_UNAVAILABLE = 'generated occurrence identity rollout unavailable'
const OCCURRENCE_IDENTITY_PERMISSIONS = 'generated occurrence identity rollout permissions are exact'

/**
 * Checks that fail by decision rather than by defect.
 *
 * A deferred check still runs and still prints its real result — it simply does
 * not fail the suite. The alternative in practice is that a known, accepted
 * failure trains everyone to read a red run as normal, and then a real one goes
 * unnoticed.
 *
 * Two rules. Every entry names the decision that authorises it, so nobody has
 * to guess whether it is deliberate. And an entry is removed the moment its
 * cause is gone: this file reports a STALE line when a deferred check starts
 * passing, because an exemption that outlives its reason is how a suite quietly
 * stops meaning anything.
 */
const DEFERRED = OCCURRENCE_IDENTITY_PHASE === '1'
  ? { [OCCURRENCE_IDENTITY_UNAVAILABLE]: 'D79/D80: phase 1 is applied in production; this entry only excuses a database that has not had it yet.' }
  : {}

const results = []
const check = (name, ok, detail = '') => {
  const excuse = ok ? null : DEFERRED[name] || null
  results.push({ name, ok, detail, excuse })
  const tag = ok ? '  PASS  ' : excuse ? '  DEFER ' : '  FAIL  '
  console.log(tag + name + (detail ? ' — ' + detail : ''))
  if (excuse) console.log('         ' + excuse)
}

const rest = (path, init = {}) =>
  fetch(URL_ + '/rest/v1/' + path, { ...init, headers: { apikey: KEY, ...(init.headers || {}) } })

console.log('\n== 1. Anonymous access ==')
for (const table of ['txns', 'receipts', 'recurring', 'transfers', 'app_config', 'audit_log', 'profiles', 'fx_rates', 'fx_latest']) {
  const r = await rest(table + '?select=*')
  const body = await r.text()
  check(`anon cannot read ${table}`, r.status === 401 || r.status === 403,
    `HTTP ${r.status} ${body.slice(0, 80)}`)
}
{
  const r = await rest('txns', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id: 1, co: 'X', cat: 'Y', description: 'anon write probe', amount: 1 }),
  })
  check('anon cannot write txns', r.status === 401 || r.status === 403, 'HTTP ' + r.status)
}

console.log('\n== 2. Forged and tampered tokens ==')
const signedIn = createClient(URL_, KEY, { auth: { persistSession: false } })
const { data: auth, error: authErr } = await signedIn.auth.signInWithPassword({ email: EMAIL, password: PASSWORD })
if (authErr) { console.error('cannot sign in: ' + authErr.message); process.exit(2) }
const good = auth.session.access_token

const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url')
const claims = JSON.parse(Buffer.from(good.split('.')[1], 'base64url').toString())

const withToken = (tok, table = 'txns') =>
  rest(table + '?select=id&limit=1', { headers: { Authorization: 'Bearer ' + tok } })

{
  const none = b64({ alg: 'none', typ: 'JWT' }) + '.' + b64(claims) + '.'
  const r = await withToken(none)
  check('alg:none token is rejected', r.status === 401, 'HTTP ' + r.status)
}
{
  const [h, p] = good.split('.')
  const r = await withToken(`${h}.${p}.${'A'.repeat(86)}`)
  check('token with a replaced signature is rejected', r.status === 401, 'HTTP ' + r.status)
}
{
  // Same signature, claims rewritten to a different subject and a stronger role.
  const forged = good.split('.')[0] + '.' +
    b64({ ...claims, sub: '00000000-0000-0000-0000-000000000000', role: 'service_role' }) + '.' +
    good.split('.')[2]
  const r = await withToken(forged)
  check('token with rewritten claims is rejected', r.status === 401, 'HTTP ' + r.status)
}
{
  const r = await withToken(good)
  check('a genuine token still works', r.status === 200, 'HTTP ' + r.status)
}

console.log('\n== 3. What a signed-in client can reach beyond its own tables ==')
{
  // `withToken` appends its own query string, so passing `users?select=*` built
  // `users?select=*?select=id&limit=1` — an unparseable select expression. In the
  // very state this check exists to detect (a `public.users` view exposing
  // `auth.users`), PostgREST would resolve the table, pass the privilege gate,
  // then fail parsing that garbage and return 400 — satisfying `>= 400`. The
  // check could not fail in its own failure mode. Pin the exact statuses that
  // mean "not exposed": 404 (no such table) or 401/403 (refused). Round 43.
  const r = await withToken(good, 'users')
  check('auth.users is not exposed through the API', [401, 403, 404].includes(r.status),
    'HTTP ' + r.status + (r.status === 400 ? ' — a 400 here means the request was malformed, not that access was refused' : ''))
}
{
  const r = await fetch(URL_ + '/rest/v1/', { headers: { apikey: KEY, Authorization: 'Bearer ' + good } })
  const body = await r.text()
  const isSpec = body.includes('"swagger"') || body.includes('"openapi"')
  check('the OpenAPI schema is not served to clients', !isSpec, 'HTTP ' + r.status + ', ' + body.length + ' bytes')
}
{
  const r = await rest('rpc/pg_sleep', {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + good, 'Content-Type': 'application/json' },
    body: JSON.stringify({ seconds: 0 }),
  })
  check('built-in functions are not callable over RPC', r.status >= 400, 'HTTP ' + r.status)
}

console.log('\n== 4. Injection through PostgREST filters ==')
{
  const payload = encodeURIComponent("1;drop table txns;--")
  const r = await rest('txns?select=id&id=eq.' + payload, { headers: { Authorization: 'Bearer ' + good } })
  const stillThere = await withToken(good)
  check('a SQL payload in a filter is rejected, not executed',
    r.status >= 400 && stillThere.status === 200, 'filter HTTP ' + r.status)
}
{
  const r = await rest("txns?select=*&description=like.*'*", { headers: { Authorization: 'Bearer ' + good } })
  check('an unbalanced quote in a filter does not error the server', r.status < 500, 'HTTP ' + r.status)
}

console.log('\n== 5. What a signed-in client may write ==')
const c = await (async () => signedIn)()
{
  // THE POSITIVE CONTROL, and it goes first on purpose.
  //
  // Every other UPDATE in this file asserts a REFUSAL. Round 43 pointed out what
  // that means: `revoke update on all tables in schema public from authenticated`
  // — one statement, and the application can no longer edit a transaction, mark a
  // payable paid, liquidate a receipt or save a setting — would make this suite
  // report 57/57 GREEN. Every refusal check would be satisfied by the outage.
  //
  // That is exactly the shape D34 describes and this file claims to guard
  // against: "that revocation and the intended move look the same; both are 'an
  // error'. Only one of them is the fix." The reasoning was applied to
  // `is_viewer` EXECUTE and nowhere else.
  //
  // So: an ordinary edit — the thing the owner does dozens of times a day — must
  // SUCCEED, and the new value must be readable back. If this fails, the column
  // grants have been revoked too widely and the refusal checks below are
  // meaningless.
  const id = Date.now() + 4242
  const { error: seedErr } = await c.from('txns').insert({
    id, co: 'GTOI', cat: 'Other', description: 'SEC writable probe', amount: 1, status: 'pending',
  })
  const { error: editErr } = await c.from('txns').update({ amount: 2, status: 'completed' }).eq('id', id)
  const { data: edited } = await c.from('txns').select('amount, status').eq('id', id).maybeSingle()
  check('an ordinary edit still succeeds — the refusals below are not an outage',
    !seedErr && !editErr && !!edited && Number(edited.amount) === 2 && edited.status === 'completed',
    seedErr ? 'seed rejected: ' + seedErr.code
      : editErr ? 'EDIT REFUSED: ' + editErr.code + ' — UPDATE may be revoked too widely'
        : 'stored ' + JSON.stringify(edited))
  await c.from('txns').delete().eq('id', id)
}
{
  // Mass assignment: created_at is server-managed and should not be settable.
  const id = Date.now()
  const { error } = await c.from('txns').insert({
    id, co: 'GTOI', cat: 'Other', description: 'SEC created_at probe', amount: 1,
    created_at: '1999-01-01T00:00:00Z',
  })
  const { data } = await c.from('txns').select('created_at').eq('id', id).maybeSingle()
  const spoofed = data && String(data.created_at).startsWith('1999')
  // `!spoofed` alone passed whenever the insert failed for ANY reason — a NOT
  // NULL violation, a new CHECK, a rate limit — because `data` is then null.
  // The D23 guard could have been dropped from the database entirely and this
  // stayed green. The row must actually exist for the conclusion to mean
  // anything. Round 43.
  // Two distinct passes, and one of them is the STRONGER result:
  //   - 42501: the column is not grantable at all, so the value never reaches
  //     the table. That is the protection working at its best.
  //   - the row landed and `created_at` is not 1999: the server overrode it.
  // Anything else is a failure, including an insert refused for some OTHER
  // reason — that tests nothing and must not read as a pass, which is what
  // `!spoofed` alone did (round 43). Round 43's own fix then over-corrected and
  // called the 42501 case untested; it is the best case.
  const notGrantable = error && error.code === '42501'
  check('created_at cannot be back-dated by the client',
    notGrantable || (!error && !!data && !spoofed),
    notGrantable ? 'the column is not grantable: 42501'
      : error ? 'INSERT REJECTED for an unrelated reason, so nothing was tested: ' + error.code
        : !data ? 'NO ROW LANDED, so nothing was tested'
          : 'stored ' + data.created_at)
  await c.from('txns').delete().eq('id', id)
}
{
  // transfers shipped briefly with a table-wide INSERT/UPDATE grant still in
  // place behind its column lists, so created_at was settable and id was
  // rewritable — Decisions D23. These two checks are the regression test, and
  // any future table needs its own pair.
  const id = Date.now() + 7
  const { error: insErr } = await c.from('transfers').insert({
    id, co: 'GTOI', name: 'SEC transfer probe', cur: 'USD', amount: 1,
    created_at: '1999-01-01T00:00:00Z',
  })
  const { data: made } = await c.from('transfers').select('created_at').eq('id', id).maybeSingle()
  const backdated = made && String(made.created_at).startsWith('1999')
  // Same as above: no row, no test. The sibling check below already carried this
  // reasoning in a comment; it was never applied to these two.
  const telNotGrantable = insErr && insErr.code === '42501'
  check('a transfer created_at cannot be back-dated',
    telNotGrantable || (!insErr && !!made && !backdated),
    telNotGrantable ? 'the column is not grantable: 42501'
      : insErr ? 'INSERT REJECTED for an unrelated reason, so nothing was tested: ' + insErr.code
        : !made ? 'NO ROW LANDED, so nothing was tested'
          : 'stored ' + made.created_at)

  // Insert a clean row so the id check actually exercises UPDATE. Skipping it
  // when the back-dated insert was refused would have reported a pass without
  // testing anything.
  const id2 = id + 100
  await c.from('transfers').insert({ id: id2, co: 'GTOI', name: 'SEC transfer probe', cur: 'USD', amount: 1 })
  const { error: updErr } = await c.from('transfers').update({ id: id2 + 1 }).eq('id', id2)
  const { data: moved } = await c.from('transfers').select('id').eq('id', id2 + 1).maybeSingle()
  check('a transfer primary key cannot be rewritten', !!updErr && !moved,
    updErr ? 'update rejected: ' + updErr.code : 'UPDATE SUCCEEDED')
  await c.from('transfers').delete().in('id', [id, id2, id2 + 1])
}
{
  // The config row is a singleton; a client must not be able to add a second.
  const { error } = await c.from('app_config').insert({ id: false, data: { injected: true } })
  check('a second app_config row cannot be created', !!error, error ? error.code : 'INSERT SUCCEEDED')
  if (!error) await c.from('app_config').delete().eq('id', false)
}
{
  // updated_at is server-managed too; a client must not be able to set it.
  // `.data.data` was unguarded: a failed read threw a TypeError at top level and
  // took sections 6 to 9 with it, so the run died without printing what had
  // passed. Round 43.
  const { data: cfgRow, error: cfgErr } = await c.from('app_config').select('data').maybeSingle()
  if (cfgErr || !cfgRow) {
    check('app_config.updated_at cannot be set by the client', false,
      'could not read app_config, so nothing was tested: ' + (cfgErr ? cfgErr.code : 'no row'))
  } else {
    const { error } = await c.from('app_config')
      .update({ data: cfgRow.data, updated_at: '1999-01-01T00:00:00Z' }).eq('id', true)
    check('app_config.updated_at cannot be set by the client', !!error, error ? error.code : 'UPDATE SUCCEEDED')
  }
}

{
  // Prove both columns exist before exercising their UPDATE privileges: an
  // unknown-column error (PGRST204/42703) is not evidence of immutability.
  // Phase 1 locks occurrence_due while leaving src writable for the deployed
  // old bundle. Set OCCURRENCE_IDENTITY_PHASE=2 after phase 2 locks src.
  const { error: columnErr } = await c.from('txns').select('src, occurrence_due').limit(0)
  if (columnErr) {
    check(OCCURRENCE_IDENTITY_UNAVAILABLE, false, 'column probe rejected: ' + columnErr.code)
  } else {
    const { error: occurrenceErr } = await c.from('txns')
      .update({ occurrence_due: '2000-01-01' }).eq('id', -1)
    const { error: srcErr } = await c.from('txns')
      .update({ src: null }).eq('id', -1)
    const occurrenceLocked = occurrenceErr?.code === '42501'
    const srcCorrect = OCCURRENCE_IDENTITY_PHASE === '2'
      ? srcErr?.code === '42501'
      : !srcErr
    check(OCCURRENCE_IDENTITY_PERMISSIONS, occurrenceLocked && srcCorrect,
      `phase ${OCCURRENCE_IDENTITY_PHASE}, occurrence_due: ${occurrenceErr?.code || 'UPDATE ALLOWED'}, src: ${srcErr?.code || 'UPDATE allowed'}`)
  }
}

{
  // The audit log, from the client's side. Check A proves the trigger fires and
  // attributes the change; B, C and D prove the record cannot then be edited.
  //
  // A is deliberately a DELETE, because a deletion is the change the log exists
  // for: it is the only operation that leaves nothing behind to inspect.
  const id = Date.now() + 21
  await c.from('txns').insert({ id, co: 'GTOI', cat: 'Other', description: 'SEC audit probe', amount: 1 })
  await c.from('txns').delete().eq('id', id)

  const { data: entry } = await c.from('audit_log')
    .select('id, actor, actor_email, before')
    .eq('tbl', 'txns').eq('row_id', id).eq('op', 'DELETE').maybeSingle()
  check('a client delete is recorded in the audit log, naming the actor',
    !!entry && entry.actor_email === EMAIL && !!entry.actor,
    entry ? 'actor ' + entry.actor_email : 'NO AUDIT ROW')

  if (!entry) {
    // Never report a pass for a control that was not exercised — the transfers
    // primary-key check did exactly that on 2026-09-01 and hid a real hole.
    for (const n of ['inserted', 'updated', 'deleted']) {
      check('audit rows cannot be ' + n + ' by a client', false, 'not exercised: no audit row to work from')
    }
  } else {
    const { error: insErr } = await c.from('audit_log').insert({
      tbl: 'txns', op: 'DELETE', row_id: id, actor_email: 'forged@example.com',
    })
    check('audit rows cannot be inserted by a client', !!insErr,
      insErr ? 'rejected: ' + insErr.code : 'INSERT SUCCEEDED')

    // Read back rather than trust the error: a silent no-op and a refusal look
    // the same from the caller's side, and only one of them is the control.
    const { error: updErr } = await c.from('audit_log')
      .update({ actor_email: 'rewritten@example.com' }).eq('id', entry.id)
    const { data: afterUpd } = await c.from('audit_log')
      .select('actor_email').eq('id', entry.id).maybeSingle()
    check('audit rows cannot be updated by a client',
      !!updErr && !!afterUpd && afterUpd.actor_email === entry.actor_email,
      updErr ? 'rejected: ' + updErr.code : 'UPDATE SUCCEEDED')

    const { error: delErr } = await c.from('audit_log').delete().eq('id', entry.id)
    const { data: afterDel } = await c.from('audit_log').select('id').eq('id', entry.id).maybeSingle()
    check('audit rows cannot be deleted by a client', !!delErr && !!afterDel,
      delErr ? 'rejected: ' + delErr.code : 'DELETE SUCCEEDED')
  }
  // The probe's own rows stay in the log on purpose: nothing may remove them,
  // which is the property being asserted.
}

{
  // Roles. The probe signs in as an administrator, so what it can prove here is
  // that the boundary exists and that nobody can move themselves across it —
  // the viewer side is exercised separately, by demoting an account.
  const { data: me } = await c.auth.getUser()
  const { data: mine } = await c.from('profiles').select('role').eq('user_id', me.user.id).maybeSingle()
  check('the signed-in account has a role on record', !!mine, mine ? mine.role : 'NO PROFILE ROW')

  // The whole model rests on this: a role a client can rewrite is not a role.
  const { error: selfErr } = await c.from('profiles').update({ role: 'admin' }).eq('user_id', me.user.id)
  const { data: after } = await c.from('profiles').select('role').eq('user_id', me.user.id).maybeSingle()
  check('no account can change its own role', !!selfErr && !!after && after.role === (mine && mine.role),
    selfErr ? 'rejected: ' + selfErr.code : 'UPDATE SUCCEEDED')

  const { error: insErr } = await c.from('profiles')
    .insert({ user_id: '00000000-0000-0000-0000-000000000000', role: 'admin' })
  check('a client cannot add itself to the roster', !!insErr,
    insErr ? 'rejected: ' + insErr.code : 'INSERT SUCCEEDED')

  const { error: delErr } = await c.from('profiles').delete().eq('user_id', me.user.id)
  const { data: still } = await c.from('profiles').select('role').eq('user_id', me.user.id).maybeSingle()
  check('a client cannot remove a role', !!delErr && !!still,
    delErr ? 'rejected: ' + delErr.code : 'DELETE SUCCEEDED')

  // An account with no profile row is a viewer, not an administrator. Asserted
  // on the function rather than on a real account, since making one would mean
  // creating a user; is_viewer() is what every policy actually consults.
  //
  // R7 moves that function into the `private` schema, which PostgREST does not
  // expose, so this RPC answers only until the second migration lands. Once it
  // is gone the question is answered where `db.js` now asks it — the caller's
  // own roster row, read just above. Both states pass; nothing else does, and
  // in particular `PGRST202` is required rather than "some error", because a
  // 42501 here is the D34 outage and must never read as a move.
  const { data: viewerNow, error: fnErr } = await c.rpc('is_viewer')
  const answers = !fnErr && viewerNow === false
  const movedOut = !!fnErr && fnErr.code === 'PGRST202' && !!mine && mine.role === 'admin'
  check('is_viewer() answers for the caller', answers || movedOut,
    fnErr ? fnErr.code + ', roster says ' + (mine ? mine.role : 'nothing') : 'is_viewer=' + viewerNow)
}

{
  // R7 / D34, and the reason this pair exists rather than one `!!error` check.
  //
  // The advisor's first remediation — revoke EXECUTE on is_viewer() from
  // `authenticated` — was tested on 2026-09-02 and breaks every write in the
  // application while every read keeps working, because Postgres checks EXECUTE
  // on a function used in an RLS policy against the querying role. From this
  // endpoint's side that revocation and the intended move look the same: both
  // are "an error". Only one of them is the fix.
  //
  // So assert the refusal, not the absence of an answer. 200 is the state
  // before the move; 404/PGRST202 is the state after it, the function having no
  // endpoint left in an exposed schema. 42501 or 403 is the outage.
  const r = await rest('rpc/is_viewer', {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + good, 'Content-Type': 'application/json' },
    body: '{}',
  })
  const body = await r.text()
  let code = null
  try { code = JSON.parse(body).code || null } catch { code = null }
  const present = r.status === 200
  const notExposed = r.status === 404 && code === 'PGRST202'
  check('the is_viewer RPC is absent or answers, never refused for want of EXECUTE',
    present || notExposed, 'HTTP ' + r.status + ' ' + (code || body.slice(0, 60)))
}
{
  // The other half of the ambiguity: a 404 above proves the endpoint is not
  // there, not that the function is out of reach. PostgREST serves whatever
  // schemas it is configured with, and asking for one it is not configured with
  // must be refused by name — `PGRST106`, "the schema must be one of the
  // following" — rather than quietly honoured. If this ever starts returning a
  // row, `private` has been added to the exposed schema list and moving the
  // function bought nothing.
  const r = await rest('rpc/is_viewer', {
    method: 'POST',
    headers: {
      Authorization: 'Bearer ' + good,
      'Content-Type': 'application/json',
      'Content-Profile': 'private',
      'Accept-Profile': 'private',
    },
    body: '{}',
  })
  const body = await r.text()
  let code = null
  try { code = JSON.parse(body).code || null } catch { code = null }
  check('the private schema is refused by PostgREST, not served',
    r.status >= 400 && code === 'PGRST106', 'HTTP ' + r.status + ' ' + (code || body.slice(0, 80)))
}

// ---- exchange rates -------------------------------------------------
// The rates table is the one place in this schema where being an administrator
// grants NOTHING. Every other table gates writes on `not is_viewer()`; these
// two policies name a single account, so the probe — which signs in as an
// administrator — must be refused here and nowhere else.
//
// Assert the refusal, not the absence of an error: a blocked policy and a
// missing row both leave you with no row, so each check reads the state back.
{
  const row = { cur: 'USD', as_of: '1999-01-04', rate: 1.234567, source: 'sec-probe' }
  const { error: insErr } = await c.from('fx_rates').insert(row)
  const { data: landed } = await c.from('fx_rates')
    .select('cur').eq('as_of', '1999-01-04').maybeSingle()
  check('an administrator cannot add a rate', !!insErr && !landed,
    insErr ? insErr.code + ' ' + insErr.message.slice(0, 60) : 'INSERT WAS ACCEPTED')
}
{
  // Against a row that exists, so a refusal cannot be confused with "no match".
  const { data: real } = await c.from('fx_rates')
    .select('cur, as_of, rate').order('as_of', { ascending: false }).limit(1).maybeSingle()
  if (!real) {
    check('an administrator cannot rewrite a rate', true, 'no rates stored yet — nothing to rewrite')
  } else {
    const { error: updErr } = await c.from('fx_rates')
      .update({ rate: 1.111111 }).eq('cur', real.cur).eq('as_of', real.as_of)
    const { data: after } = await c.from('fx_rates')
      .select('rate').eq('cur', real.cur).eq('as_of', real.as_of).maybeSingle()
    check('an administrator cannot rewrite a rate',
      Number(after && after.rate) === Number(real.rate),
      updErr ? updErr.code + ' ' + updErr.message.slice(0, 60) : 'rate is still ' + (after && after.rate))
  }
}
{
  // `fetched_at` is server-managed and in neither column grant, so a client
  // cannot claim a rate was fetched at a time it was not. Same shape as
  // `created_at` on the other four tables (D23).
  const { error } = await c.from('fx_rates')
    .insert({ cur: 'USD', as_of: '1999-01-05', rate: 1, source: 'sec-probe', fetched_at: '1999-01-05T00:00:00Z' })
  check('fx_rates.fetched_at cannot be set by the client', !!error,
    error ? error.code + ' ' + error.message.slice(0, 60) : 'INSERT WAS ACCEPTED')
}
{
  const { data, error } = await c.from('fx_latest').select('cur, rate, as_of')
  check('a signed-in account can read the latest rates', !error,
    error ? error.message.slice(0, 70) : (data || []).length + ' currencies')
}
{
  // The wire's own rate IS client-writable, deliberately: a person may override
  // the fetched rate, because only they know what the bank actually charged.
  // This check proves the column grant landed, not that a control is holding.
  const id = Date.now()
  const { error: insErr } = await c.from('transfers')
    .insert({ id, co: 'SEC', name: 'sec-probe rate', cur: 'USD', amount: 1, status: 'cancelled', note: 'E2E-secprobe', rate: 61.5, rate_as_of: '2026-09-02' })
  const { data: back } = await c.from('transfers').select('rate, rate_as_of').eq('id', id).maybeSingle()
  check('a wire records the rate it was sent at',
    !insErr && !!back && Number(back.rate) === 61.5 && back.rate_as_of === '2026-09-02',
    insErr ? insErr.message.slice(0, 70) : 'rate ' + (back && back.rate) + ' as of ' + (back && back.rate_as_of))
  await c.from('transfers').delete().eq('id', id)
}

console.log('\n== 6. Receipt file storage ==')
{
  const anon = createClient(URL_, KEY, { auth: { persistSession: false } })
  const { data, error } = await anon.storage.from('receipts').list('')
  check('a signed-out client cannot list receipt files', !!error || (data || []).length === 0,
    error ? error.message : 'listed ' + (data || []).length + ' entries')
}
{
  // Upload a throwaway object as a signed-in user, then try to read it without
  // a signature. A public bucket would serve it; this one must not.
  const path = 'sec-probe/' + Date.now() + '.txt'
  const { error: upErr } = await c.storage.from('receipts')
    .upload(path, new Blob(['probe'], { type: 'application/pdf' }), { contentType: 'application/pdf' })
  if (upErr) {
    check('storage probe upload', false, upErr.message)
  } else {
    const pub = c.storage.from('receipts').getPublicUrl(path).data.publicUrl
    const open = await fetch(pub)
    check('files are not served without a signature', open.status >= 400, 'HTTP ' + open.status)

    const { data: signed } = await c.storage.from('receipts').createSignedUrl(path, 60)
    const ok = await fetch(signed.signedUrl)
    check('a signed link does work', ok.status === 200, 'HTTP ' + ok.status)

    const tampered = signed.signedUrl.replace(/token=.*/, 'token=' + 'a'.repeat(40))
    const bad = await fetch(tampered)
    check('a tampered signature is refused', bad.status >= 400, 'HTTP ' + bad.status)

    await c.storage.from('receipts').remove([path])
  }
}
{
  const { data } = await c.storage.from('receipts').list('')
  check('the probe left nothing behind', !(data || []).some((f) => f.name === 'sec-probe'),
    'entries: ' + (data || []).map((f) => f.name).join(',') || 'none')
}

console.log('\n== 7. Secrets in the shipped bundle ==')
try {
  const dir = 'dist/assets'
  const files = readdirSync(dir).filter((f) => f.endsWith('.js') || f.endsWith('.css'))
  const text = files.map((f) => readFileSync(dir + '/' + f, 'utf8')).join('\n')
  // Scanning nothing finds nothing. The `catch` below only fires when the
  // directory is MISSING — an existing but empty `dist/assets`, or one holding
  // only a source map, yielded four green secret checks over zero bytes.
  //
  // Staleness is the reachable case, not emptiness: `.claude/rules/git-workflow.md`
  // told people to run `npm run security` BEFORE `npm run build`, so the pre-push
  // scan meant to catch a key you just pasted read yesterday's bundle. That
  // ordering is corrected, and this refuses to draw a conclusion from a bundle
  // older than the source it claims to have scanned. Round 43.
  check('the bundle scan had something to scan', files.length > 0,
    files.length + ' file(s) in ' + dir)
  const newestSrc = Math.max(...readdirSync('src', { recursive: true })
    .filter((f) => /\.jsx?$/.test(String(f)))
    .map((f) => statSync('src/' + f).mtimeMs))
  const newestBundle = Math.max(...files.map((f) => statSync(dir + '/' + f).mtimeMs))
  check('the scanned bundle is not older than the source', newestBundle >= newestSrc,
    newestBundle >= newestSrc ? 'built after the last source edit'
      : 'STALE by ' + Math.round((newestSrc - newestBundle) / 1000) + 's — run npm run build first')
  check('no service_role key in the bundle', !/service_role/.test(text))
  // Match an actual key value, not supabase-js's own `startsWith("sb_secret_")`
  // format check, which is a string literal in the library and not a secret.
  check('no secret-format key in the bundle', !/sb_secret_[A-Za-z0-9_-]{12,}/.test(text))
  check('no database connection string in the bundle', !/postgres(ql)?:\/\//.test(text))
  const jwts = text.match(/eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\./g) || []
  const roles = jwts.map((t) => {
    try { return JSON.parse(Buffer.from(t.split('.')[1], 'base64url').toString()).role } catch { return null }
  })
  check('no privileged JWT in the bundle', !roles.includes('service_role'), 'roles found: ' + (roles.join(',') || 'none'))
} catch (e) {
  check('bundle scan', false, 'could not read dist/assets — run npm run build first')
}

console.log('\n== 8. Sign-up and account enumeration ==')
{
  const r = await fetch(URL_ + '/auth/v1/signup', {
    method: 'POST',
    headers: { apikey: KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'sec-probe-' + Date.now() + '@zoneoffice.ph', password: 'a-long-probe-password-9931' }),
  })
  const body = await r.text()
  check('self-serve sign-up is refused', r.status >= 400, 'HTTP ' + r.status + ' ' + body.slice(0, 60))
}

console.log('\n== 9. Deployment response headers ==')
{
  // An unguarded fetch here meant an unreachable deployment killed the run with
  // a stack trace instead of recording six failures — and the summary, which is
  // the whole output, never printed. Round 43.
  const r = await fetch(ORIGIN, { redirect: 'follow' }).catch((e) => ({ ok: false, url: ORIGIN, headers: { get: () => null }, error: e }))
  if (r.error) check('the deployment is reachable', false, ORIGIN + ' — ' + (r.error.message || r.error))
  const h = (n) => r.headers.get(n)
  check('served over HTTPS', ORIGIN.startsWith('https://') ? r.url.startsWith('https://') : true, r.url)
  check('HSTS is set', !!h('strict-transport-security') || !ORIGIN.startsWith('https://'), h('strict-transport-security') || 'missing')
  check('framing is restricted', !!(h('x-frame-options') || /frame-ancestors/.test(h('content-security-policy') || '')),
    h('x-frame-options') || h('content-security-policy') || 'missing')
  check('MIME sniffing is disabled', h('x-content-type-options') === 'nosniff', h('x-content-type-options') || 'missing')
  check('a Content-Security-Policy is set', !!h('content-security-policy'), h('content-security-policy') || 'missing')
  check('referrer policy is set', !!h('referrer-policy'), h('referrer-policy') || 'missing')
}

await signedIn.auth.signOut()

const failed = results.filter((r) => !r.ok && !r.excuse)
const deferred = results.filter((r) => r.excuse)
// A deferred check whose reason is spent.
//
// This used to be `results.filter((r) => r.ok && DEFERRED[r.name])`, which could
// never match anything. The only deferred name is recorded exclusively on the
// FAILING branch — when the thing it excuses is fixed, a DIFFERENT name is
// recorded — so `r.ok && DEFERRED[r.name]` was empty by construction, in every
// one of the four reachable states. The docblock above promised this file
// "reports a STALE line when a deferred check starts passing"; it could not.
// Trap 100 inside the mechanism written to prevent exemptions from rotting.
// Round 43.
//
// A deferred entry is stale when its name was never recorded at all — the check
// it excuses no longer runs — or when it did run and passed.
const recorded = new Set(results.map((r) => r.name))
const stale = Object.keys(DEFERRED)
  .filter((name) => !recorded.has(name) || results.some((r) => r.name === name && r.ok))
  .map((name) => ({ name, excuse: DEFERRED[name] }))

console.log('\n' + results.length + ' checks, ' + failed.length + ' failed' +
  (deferred.length ? ', ' + deferred.length + ' deferred' : ''))
if (failed.length) {
  console.log('\nFailing:')
  for (const f of failed) console.log('  - ' + f.name + (f.detail ? ' — ' + f.detail : ''))
}
if (deferred.length) {
  console.log('\nDeferred, not passing, and not counted:')
  for (const d of deferred) console.log('  - ' + d.name + ' — ' + d.excuse)
}
if (stale.length) {
  // Loud, but not fatal. Closing the hole must never turn the nightly run red.
  console.log('\nSTALE EXEMPTION — these now pass and their DEFERRED entries should be deleted:')
  for (const s_ of stale) console.log('  - ' + s_.name)
}
process.exit(failed.length ? 1 : 0)
