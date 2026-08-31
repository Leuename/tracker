import { supabase } from './supabase.js'
import { initialState } from './data.js'
import { isAuthError, sessionExpired } from './errors.js'
import {
  configOf, fromReceipt, fromRecurring, fromTxn, toReceipt, toRecurring, toTxn,
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
 * The very first sign-in fills the empty ledger with the prototype's demo rows
 * so the app does not open blank. This runs once for the workspace, not once
 * per account — the second person to sign in finds the first one's data.
 *
 * Delete the `seed()` call in `load()` to start from nothing instead. Do that
 * before real payables go in: these 32 rows are invented, and once they are
 * mixed with genuine ones only the amounts tell them apart.
 */
async function seed() {
  const s = initialState
  // Entities first, config row last: it is the "already seeded" marker, so a
  // partial failure must not leave it behind on an empty workspace.
  await supabase.from('txns').insert(s.txns.map(toTxn)).then(ok)
  await supabase.from('receipts').insert(s.receipts.map(toReceipt)).then(ok)
  await supabase.from('recurring').insert(s.recurring.map(toRecurring)).then(ok)
  await supabase.from('app_config').insert({ data: configOf(s) }).then(ok)
  return { txns: s.txns, receipts: s.receipts, recurring: s.recurring, ...configOf(s) }
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
  if (!config) return seed()

  const cfg = config.data || {}
  return {
    txns: txns.map(fromTxn),
    receipts: receipts.map(fromReceipt),
    recurring: recurring.map(fromRecurring),
    notes: cfg.notes || initialState.notes,
    companies: cfg.companies || initialState.companies,
    categories: cfg.categories || initialState.categories,
    // Spread over the defaults so a setting added after this row was written
    // still has a value instead of arriving undefined.
    settings: { ...initialState.settings, ...(cfg.settings || {}) },
  }
}

export const load = retryOnce(read)

const queries = {
  insertTxn: (t) => supabase.from('txns').insert(toTxn(t)).then(ok),
  insertTxns: (rows) => supabase.from('txns').insert(rows.map(toTxn)).then(ok),
  updateTxn: (t) => supabase.from('txns').update(toTxn(t)).eq('id', t.id).then(ok),
  deleteTxn: (id) => supabase.from('txns').delete().eq('id', id).then(ok),
  deleteTxns: (ids) => supabase.from('txns').delete().in('id', ids).then(ok),

  updateReceipt: (r) => supabase.from('receipts').update(toReceipt(r)).eq('id', r.id).then(ok),

  insertRecurring: (p) => supabase.from('recurring').insert(toRecurring(p)).then(ok),
  updateRecurring: (p) => supabase.from('recurring').update(toRecurring(p)).eq('id', p.id).then(ok),
  deleteRecurring: (id) => supabase.from('recurring').delete().eq('id', id).then(ok),

  // `id` is the singleton column: always true, so this upsert always targets
  // the one shared row.
  saveConfig: (state) =>
    supabase.from('app_config')
      .upsert({ id: true, data: configOf(state), updated_at: new Date().toISOString() })
      .then(ok),
}

// Writes need the same protection as the initial read: a tab left open past
// the token's hour would otherwise fail every save until it was reloaded.
export const db = Object.fromEntries(
  Object.entries(queries).map(([name, fn]) => [name, retryOnce(fn)]),
)
