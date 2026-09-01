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
import { readFileSync, readdirSync } from 'node:fs'

const URL_ = process.env.VITE_SUPABASE_URL
const KEY = process.env.VITE_SUPABASE_PUBLISHABLE_KEY
const ORIGIN = process.env.SEC_ORIGIN || 'https://tracker-six-flax.vercel.app'
const EMAIL = process.env.E2E_EMAIL
const PASSWORD = process.env.E2E_PASSWORD

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
// Empty, and that is the healthy state. Self-serve sign-up lived here on
// 2026-09-01 and was closed the next day; its entry was deleted the moment the
// check went green, which is the whole discipline.
const DEFERRED = {}

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
for (const table of ['txns', 'receipts', 'recurring', 'transfers', 'app_config', 'audit_log']) {
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
  const r = await withToken(good, 'users?select=*')
  check('auth.users is not exposed through the API', r.status >= 400, 'HTTP ' + r.status)
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
  // Mass assignment: created_at is server-managed and should not be settable.
  const id = Date.now()
  const { error } = await c.from('txns').insert({
    id, co: 'GTOI', cat: 'Other', description: 'SEC created_at probe', amount: 1,
    created_at: '1999-01-01T00:00:00Z',
  })
  const { data } = await c.from('txns').select('created_at').eq('id', id).maybeSingle()
  const spoofed = data && String(data.created_at).startsWith('1999')
  check('created_at cannot be back-dated by the client', !spoofed,
    error ? 'insert rejected: ' + error.code : 'stored ' + (data && data.created_at))
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
  check('a transfer created_at cannot be back-dated', !backdated,
    insErr ? 'insert rejected: ' + insErr.code : 'stored ' + (made && made.created_at))

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
  const { error } = await c.from('app_config').update({ data: (await c.from('app_config').select('data').maybeSingle()).data.data, updated_at: '1999-01-01T00:00:00Z' }).eq('id', true)
  check('app_config.updated_at cannot be set by the client', !!error, error ? error.code : 'UPDATE SUCCEEDED')
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
  const r = await fetch(ORIGIN, { redirect: 'follow' })
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
// A deferred check that has started passing: the decision behind it is spent.
const stale = results.filter((r) => r.ok && DEFERRED[r.name])

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
