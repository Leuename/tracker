import { supabase } from './supabase.js'
import { initialState } from './data.js'
import { isAuthError, sessionExpired } from './errors.js'
import { alphabetical } from './logic.js'
import {
  configOf, forUpdate, fromReceipt, fromRecurring, fromTxn, toReceipt, toRecurring, toTxn,
} from './rows.js'

/**
 * Every query the app makes, in one place. Row shape translation lives next
 * door in `rows.js`; this file is only about talking to Supabase.
 */

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
  return { txns: [], receipts: [], recurring: [], ...defaults, notes: [] }
}

/** Read the shared dataset, seeding it on the workspace's first run. */
async function read() {
  const [txns, receipts, recurring, config] = await Promise.all([
    supabase.from('txns').select('*').order('id', { ascending: false }).then(ok),
    supabase.from('receipts').select('*').order('id').then(ok),
    supabase.from('recurring').select('*').order('id').then(ok),
    supabase.from('app_config').select('data').maybeSingle().then(ok),
  ])

  // No config row is the one reliable marker of a never-used workspace:
  // deleting every payable still leaves one behind.
  if (!config) return start()

  const cfg = config.data || {}
  return {
    txns: txns.map(fromTxn),
    receipts: receipts.map(fromReceipt),
    recurring: recurring.map(fromRecurring),
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
  updateTxn: (t) => supabase.from('txns').update(forUpdate(toTxn(t))).eq('id', t.id).then(ok),
  deleteTxn: (id) => supabase.from('txns').delete().eq('id', id).then(ok),
  deleteTxns: (ids) => supabase.from('txns').delete().in('id', ids).then(ok),

  insertReceipt: (r) => supabase.from('receipts').insert(toReceipt(r)).then(ok),
  updateReceipt: (r) => supabase.from('receipts').update(forUpdate(toReceipt(r))).eq('id', r.id).then(ok),
  deleteReceipt: (id) => supabase.from('receipts').delete().eq('id', id).then(ok),

  insertRecurring: (p) => supabase.from('recurring').insert(toRecurring(p)).then(ok),
  updateRecurring: (p) => supabase.from('recurring').update(forUpdate(toRecurring(p))).eq('id', p.id).then(ok),
  deleteRecurring: (id) => supabase.from('recurring').delete().eq('id', id).then(ok),

  /**
   * The config row is a singleton pinned by `id = true`. An upsert would carry
   * that `id` into its DO UPDATE, and clients are not granted UPDATE on it, so
   * update the existing row and fall back to an insert only when there is none
   * — which happens once, on a workspace that has never been seeded.
   *
   * `updated_at` is deliberately absent: a trigger owns it.
   */
  saveConfig: async (state) => {
    const payload = { data: configOf(state) }
    const updated = await supabase.from('app_config').update(payload).eq('id', true).select('id').then(ok)
    if (updated && updated.length) return updated
    return supabase.from('app_config').insert({ id: true, ...payload }).then(ok)
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
