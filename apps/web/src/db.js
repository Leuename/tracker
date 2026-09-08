import { supabase } from './supabase.js'
import { pageAll } from './pending.js'
import { deleteGeneratedTxns, pushDownTxns } from './queries.js'
import { initialState, bare } from './data.js'
import { isAuthError, sessionExpired } from './errors.js'
import { alphabetical } from './logic.js'
import {
  CONFIG_KEYS, configOf, forUpdate, fromReceipt, fromRecurring, fromTransfer, fromTxn,
  toReceipt, toRecurring, toTransfer, toTxn,
} from './rows.js'

/**
 * Every query the app makes, in one place. Row shape translation lives next
 * door in `rows.js`; this file is only about talking to Supabase.
 */

/** The client's own `from`, handed to `queries.js` so those builds are testable. */
const from = (table) => supabase.from(table)

/** Throw on a Supabase error so callers can use one try/catch. */
const ok = ({ data, error }) => {
  if (error) throw error
  return data
}

/**
 * Every call goes through this. An hour-old tab holds a dead access token, and
 * its first request comes back 401 rather than empty, because `anon` has no
 * privilege here. One refresh fixes that, so retry once rather than surfacing
 * a failure the user can do nothing about.
 *
 * If the refresh itself fails the session is genuinely gone — the refresh
 * token was revoked, or expired — and the caller is told to send the user back
 * to the sign-in form.
 */
const retryOnce = (fn) => async (...args) => {
  try {
    return await fn(...args)
  } catch (e) {
    if (!isAuthError(e)) throw e
    const { data, error } = await supabase.auth.refreshSession()
    if (error || !data || !data.session) throw sessionExpired()
    return fn(...args)
  }
}

/**
 * A workspace that has never been used starts empty.
 *
 * It used to be filled with the prototype's 32 demo rows so the app did not
 * open blank. That was right for a demo and wrong the moment real payables
 * went in: invented rows sitting beside genuine ones are told apart only by
 * their amounts. The config row is still written, because its absence is what
 * marks a workspace as new — without it this would run on every sign-in.
 */
async function start() {
  const defaults = configOf(initialState)
  await supabase.from('app_config').insert({ id: true, data: defaults }).then(ok)
  return {
    txns: [], receipts: [], recurring: [], transfers: [], fxRates: bare({}), ...defaults, notes: [],
    // Whoever reaches this line is an administrator: creating the config row is
    // an INSERT on app_config, and only "administrators may create the settings"
    // permits one — a viewer would have thrown above. Saying so explicitly
    // matters because `initialState.readOnly` is true, so omitting the key here
    // left the first person ever to open a workspace looking at an app that
    // refused every action until they reloaded.
    readOnly: false,
  }
}

/**
 * Is the signed-in account an administrator?
 *
 * This used to be `supabase.rpc('is_viewer')`. The function it called was
 * `security definer` and reachable at `/rest/v1/rpc/is_viewer`, which a
 * Supabase advisor flagged; it now lives in the `private` schema, which
 * PostgREST does not expose, so there is no endpoint left to call. Revoking
 * EXECUTE instead was tested and is not available — Postgres checks it against
 * the querying role, so every write would fail 42501 while reads kept working
 * ([Decisions] D34).
 *
 * The roster is the right place to ask anyway: `authenticated` holds SELECT on
 * `public.profiles` deliberately, so the app can grey out what a viewer cannot
 * use. No new privilege is needed here.
 *
 * **Pessimistic in exactly the way the database function is.** No session, no
 * profile row, a row with any other role, or an error of any kind all mean
 * viewer. Only a row that says `admin` grants anything, so every failure path
 * greys the app out rather than opening it up — matching the function's
 * `coalesce(…, true)`, which makes an account created in the dashboard and
 * forgotten about a viewer rather than a silent administrator.
 *
 * The app only *reflects* this. The enforcement is the policy: a client that
 * lied to itself would still be refused by the database.
 */
async function isAdmin() {
  try {
    const { data: sess } = await supabase.auth.getSession()
    const uid = sess && sess.session && sess.session.user && sess.session.user.id
    if (!uid) return false
    const { data, error } = await supabase.from('profiles')
      .select('role').eq('user_id', uid).maybeSingle()
    if (error) return false
    return !!data && data.role === 'admin'
  } catch {
    return false
  }
}

/**
 * Read a whole table, in pages, with the row count asserted.
 *
 * PostgREST silently truncates a plain `.select()` at 1,000 rows — it returns
 * 1,000 and no error, so the app simply believes the ledger is smaller than it
 * is. This file already documented that cap for `fx_rates` four lines below and
 * then did not apply it to the tables that actually grow.
 *
 * The consequence was not merely a short list. `alreadyOnSheet` decides what
 * Generate writes by comparing against what was read, so a truncated read makes
 * rows past the cap invisible and Generate duplicates them — and since D63 the
 * unique index turns that into a 23505 that aborts the whole batch. At roughly
 * 30 generated rows a month the cap is about two and a half years out; the
 * failure it produces is a nightly job that stops working.
 *
 * Termination is a short page: fewer rows than asked for means there are no
 * more. That is sound with keyset paging, where the cursor names a position, in
 * a way it is not with offset paging — an earlier version counted with
 * `count: 'exact'` and still lost rows, because a concurrent insert shifted
 * every later page while the count went on matching.
 *
 * The cursor is the last row's `id`, so a caller passing a projection that
 * omits `id` would page once and stop. Every caller passes `'*'`.
 */
const PAGE = 1000

const readAll = (table, columns = '*', ascending = false) => pageAll((cursor) => {
  let q = supabase.from(table).select(columns).order('id', { ascending }).limit(PAGE)
  if (cursor !== null) q = ascending ? q.gt('id', cursor) : q.lt('id', cursor)
  return q.then(ok)
}, PAGE)

/** Read the shared dataset, seeding it on the workspace's first run. */
async function read() {
  const [txns, receipts, recurring, transfers, fx, config, admin] = await Promise.all([
    readAll('txns'),
    readAll('receipts', '*', true),
    readAll('recurring', '*', true),
    readAll('transfers', '*', true),
    // `fx_latest`, not `fx_rates`: the view is one row per currency and stays
    // that size, while the table grows by four rows every working day and would
    // cross PostgREST's silent 1,000-row cap inside a year.
    supabase.from('fx_latest').select('cur, rate, as_of').then(ok),
    supabase.from('app_config').select('data').maybeSingle().then(ok),
    // The same question every policy asks, read from the same table the policy
    // reads, so the screen and the row-level security agree about who this is.
    // Swallows its own failures on purpose — see `isAdmin`. An auth failure is
    // still surfaced, because the five reads above it in this list throw on one
    // and `retryOnce` refreshes the session and runs the whole read again.
    isAdmin(),
  ])

  // No config row is the one reliable marker of a never-used workspace:
  // deleting every payable still leaves one behind.
  if (!config) return start()

  const cfg = config.data || {}
  return {
    // `!== true`, not `!`: anything that is not an explicit administrator is
    // read-only. `initialState.readOnly` is true and every path out of `load`
    // must set this key deliberately, or the app refuses every action until the
    // page is reloaded (trap 45).
    readOnly: admin !== true,
    txns: txns.map(fromTxn),
    receipts: receipts.map(fromReceipt),
    recurring: recurring.map(fromRecurring),
    transfers: transfers.map(fromTransfer),
    // `{ USD: { rate, as_of }, … }` — what `rateFor` in logic.js takes as its
    // second rung. An empty object is a valid state, not a failure: it is what
    // a database with no rates yet looks like, and every wire then falls
    // through to TRANSFER_RATES exactly as it did before rates existed.
    // `bare`: this map is indexed by `transfers.cur`, which is free text, so a
    // prototype it does not need is a prototype something can be found on.
    fxRates: bare(Object.fromEntries((fx || []).map((r) => [r.cur, { rate: Number(r.rate), as_of: r.as_of }]))),
    notes: cfg.notes || initialState.notes,
    // Held a–z on the way in, so a row written before the lists were sorted
    // still displays in order without needing a migration to rewrite it.
    companies: alphabetical(cfg.companies || initialState.companies),
    categories: alphabetical(cfg.categories || initialState.categories),
    // Spread over the defaults so a setting added after this row was written
    // still has a value instead of arriving undefined.
    settings: { ...initialState.settings, ...(cfg.settings || {}) },
  }
}

export const load = retryOnce(read)

const BUCKET = 'receipts'

/**
 * Store a liquidation document and return its object key.
 *
 * The bucket is private, so nothing here produces a public URL. The key is
 * what goes in the row; a viewable link is signed on demand and expires.
 */
export const uploadReceiptFile = retryOnce(async (receiptId, file) => {
  const ext = (file.name.split('.').pop() || 'bin').toLowerCase().replace(/[^a-z0-9]/g, '')
  const path = receiptId + '/' + Date.now() + '.' + ext
  const { error } = await supabase.storage.from(BUCKET)
    .upload(path, file, { contentType: file.type || 'application/octet-stream', upsert: false })
  if (error) throw error
  return path
})

/**
 * Drop a stored document. Deleting a receipt has to take its file with it —
 * the object key lives only on the row, so a row removed without this leaves
 * a file in the bucket that nothing can ever name again.
 */
export const removeReceiptFile = retryOnce(async (path) => {
  const { error } = await supabase.storage.from(BUCKET).remove([path])
  if (error) throw error
})

/** A link that works for an hour, for opening a stored document. */
export const signedReceiptUrl = retryOnce(async (path) => {
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(path, 3600)
  if (error) throw error
  return data.signedUrl
})

const queries = {
  insertTxn: (t) => supabase.from('txns').insert(toTxn(t)).then(ok),
  insertTxns: (rows) => supabase.from('txns').insert(rows.map(toTxn)).then(ok),
  /**
   * The Tracker as Postgres has it right now, not as this tab last read it.
   *
   * Generate decides what to write by comparing against `state.txns`, a
   * page-load snapshot — and the scheduler writes the same month unattended at
   * 22:00 UTC. A tab opened that morning would see none of those rows and
   * duplicate the lot. This is the re-read that closes the window; the partial
   * unique index `txns_one_generated_row_per_occurrence` on
   * `(src, occurrence_due)` — which replaced D63's editable `(src, due)` key — is the
   * backstop for the case where two writers race anyway.
   */
  freshTxns: () => readAll('txns').then((rows) => rows.map(fromTxn)),
  updateTxn: (t) => supabase.from('txns').update(forUpdate(toTxn(t))).eq('id', t.id).then(ok),
  deleteTxn: (id) => supabase.from('txns').delete().eq('id', id).then(ok),
  /**
   * Undo's bulk delete. Its only caller is `undoGenerate`.
   *
   * The `completed` and `done` filters live here rather than in the caller for
   * the reason D61 records: `state.txns` is a page-load snapshot with no
   * realtime subscription, so a row another session has since paid is still
   * `pending` in this tab. Undo promises — in its own toast — to keep anything
   * already paid, and a client-side filter cannot keep that promise. This one
   * can, because Postgres evaluates it against the row as it actually is.
   *
   * Deleting is worse than the mis-write D61 fixed: there is nothing left to
   * discover afterwards. Resolves to the ids actually removed, so the caller
   * drops exactly those from the screen and counts truthfully.
   */
  deleteTxns: (ids) => deleteGeneratedTxns(from, ids)
    .then(ok)
    .then((rows) => (rows || []).map((r) => Number(r.id))),
  /**
   * One column, one value, many rows — what a masterlist edit pushes down.
   *
   * `patch` arrives already in database column names, because the caller is the
   * only thing that knows which app field it came from.
   *
   * The two filters beyond `id` are the point. `state.txns` is a snapshot taken
   * at page load and there is no realtime subscription, so a row another
   * session has since **completed** is still `pending` in this tab — and the
   * client-side "never rewrite a completed row" guard could not see it. A
   * masterlist keystroke would then overwrite the amount of a payable that had
   * already been paid, with a window as long as the tab had been open.
   *
   * Enforcing it here means the database decides, from the row's real current
   * state, not from whatever this tab last read. `src` is checked too, so a row
   * unlinked by ON DELETE SET NULL or re-parented since is left alone.
   *
   * Returns the ids actually written, so the caller can paint exactly those and
   * report a count that is true.
   */
  /**
   * Push a masterlist change onto the payable's linked open rows.
   *
   * Selected by `src` in the WRITE, not by a list of ids gathered on the
   * client. `state.txns` is a page-load snapshot, so a linked row another
   * session created after this tab mounted was simply never in the list: the
   * payable and that row diverged, and the toast still said the rows had been
   * updated to match. The database knows which rows are linked; this asks it.
   */
  patchTxns: (patch, src) => pushDownTxns(from, patch, src)
    .then(ok)
    .then((rows) => (rows || []).map((r) => Number(r.id))),

  insertReceipt: (r) => supabase.from('receipts').insert(toReceipt(r)).then(ok),
  updateReceipt: (r) => supabase.from('receipts').update(forUpdate(toReceipt(r))).eq('id', r.id).then(ok),
  deleteReceipt: (id) => supabase.from('receipts').delete().eq('id', id).then(ok),

  insertRecurring: (p) => supabase.from('recurring').insert(toRecurring(p)).then(ok),
  updateRecurring: (p) => supabase.from('recurring').update(forUpdate(toRecurring(p))).eq('id', p.id).then(ok),
  deleteRecurring: (id) => supabase.from('recurring').delete().eq('id', id).then(ok),

  insertTransfer: (w) => supabase.from('transfers').insert(toTransfer(w)).then(ok),
  updateTransfer: (w) => supabase.from('transfers').update(forUpdate(toTransfer(w))).eq('id', w.id).then(ok),
  deleteTransfer: (id) => supabase.from('transfers').delete().eq('id', id).then(ok),

  /**
   * The config row is a singleton pinned by `id = true`. An upsert would carry
   * that `id` into its DO UPDATE, and clients are not granted UPDATE on it, so
   * update the existing row and fall back to an insert only when there is none
   * — which happens once, on a workspace that has never been seeded.
   *
   * `updated_at` is deliberately absent: a trigger owns it.
   */
  /**
   * Save a PATCH of the config, not the whole thing.
   *
   * `merge_app_config` folds it into the stored row server-side, so two people
   * changing different settings both keep their change. Sending the whole
   * document, as this used to, meant the second save was built from a config
   * loaded before the first and quietly threw the first away.
   *
   * A patch is a partial config — `{ settings: { trkOverdueRed: true } }`, or
   * `{ companies: [...] }`. Passing a complete config still works and simply
   * merges every key.
   */
  saveConfig: async (patch) => {
    const body = Object.fromEntries(
      CONFIG_KEYS.filter((k) => k in patch).map((k) => [k, patch[k]]),
    )
    const touched = await supabase.rpc('merge_app_config', { patch: body }).then(ok)
    if (touched) return touched
    // No config row yet — a workspace nobody has opened. Seed it whole, with the
    // patch over the defaults rather than the patch alone: `configOf` of a
    // partial patch would write `undefined` into every key the patch omits.
    return supabase.from('app_config')
      .insert({ id: true, data: { ...configOf(initialState), ...body } }).then(ok)
  },
}

// Writes need the same protection as the initial read: a tab left open past
// the token's hour would otherwise fail every save until it was reloaded.
export const db = {
  ...Object.fromEntries(Object.entries(queries).map(([name, fn]) => [name, retryOnce(fn)])),
  // Already wrapped where they are defined, since they are not plain queries.
  uploadReceiptFile,
  signedReceiptUrl,
  removeReceiptFile,
}
