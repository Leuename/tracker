/**
 * Test-side database access.
 *
 * These specs are not allowed to trust the screen. Every write goes in through
 * the UI and is then read back out of Postgres here, because "the row appeared
 * in the table" and "the row reached the database" are different claims and
 * only the second one survives a reload.
 *
 * Two rules, because this points at the live shared ledger and not a fixture:
 *   1. Only ever touch rows this run created. `MARK` tags them.
 *   2. Clean up in a finally, so a failing assertion still removes its rows.
 */
import { createClient } from '@supabase/supabase-js'

export const MARK = 'E2E-' + Date.now().toString(36)

const url = process.env.VITE_SUPABASE_URL
const key = process.env.VITE_SUPABASE_PUBLISHABLE_KEY

/**
 * The one credential gate. Both spec files ask this, so there is one answer.
 *
 * On a laptop, missing credentials are a reason to skip: a developer without an
 * issued account should still be able to run everything else. In CI they are a
 * defect, because `playwright test` prints `27 skipped` and exits 0, and a gate
 * built on that reports a safety it is not providing. `E2E_REQUIRE_CREDENTIALS`
 * is how CI says which of the two it is; the workflow sets it.
 */
export function haveCredentials() {
  const missing = ['VITE_SUPABASE_URL', 'VITE_SUPABASE_PUBLISHABLE_KEY', 'E2E_EMAIL', 'E2E_PASSWORD']
    .filter((n) => !process.env[n])
  if (missing.length && process.env.E2E_REQUIRE_CREDENTIALS) {
    throw new Error(
      'E2E_REQUIRE_CREDENTIALS is set and these are missing: ' + missing.join(', ') +
      '. Refusing to skip — a skipped suite that exits 0 is worse than a failing one.'
    )
  }
  return missing.length === 0
}

let client = null

/**
 * Test seam. `hold` and `releaseHeld` decide what to write to the OWNER'S live
 * config, and until 2026-09-06 nothing exercised that logic offline — deleting
 * either function's body left the whole suite green. This lets a unit test
 * drive them against a fake that models what `merge_app_config` actually does.
 */
export function useClient(fake) { client = fake }

export async function db() {
  if (client) return client
  const c = createClient(url, key, { auth: { persistSession: false } })
  const { error } = await c.auth.signInWithPassword({
    email: process.env.E2E_EMAIL,
    password: process.env.E2E_PASSWORD,
  })
  if (error) throw new Error('test db sign-in failed: ' + error.message)
  client = c
  return c
}

const rows = async (table, col, needle) => {
  const c = await db()
  const { data, error } = await c.from(table).select('*').like(col, '%' + needle + '%')
  if (error) throw error
  return data
}

export const txnsTagged = (needle = MARK) => rows('txns', 'description', needle)
export const recurringTagged = (needle = MARK) => rows('recurring', 'description', needle)

export async function txnById(id) {
  const c = await db()
  const { data, error } = await c.from('txns').select('*').eq('id', id).maybeSingle()
  if (error) throw error
  return data
}

export async function receiptById(id) {
  const c = await db()
  const { data, error } = await c.from('receipts').select('*').eq('id', id).maybeSingle()
  if (error) throw error
  return data
}

export async function recurringById(id) {
  const c = await db()
  const { data, error } = await c.from('recurring').select('*').eq('id', id).maybeSingle()
  if (error) throw error
  return data
}

export async function transferById(id) {
  const c = await db()
  const { data, error } = await c.from('transfers').select('*').eq('id', id).maybeSingle()
  if (error) throw error
  return data
}

export async function config() {
  const c = await db()
  const { data, error } = await c.from('app_config').select('data').maybeSingle()
  if (error) throw error
  return data ? data.data : null
}

/**
 * Fixtures.
 *
 * The ledger used to arrive pre-filled with demo rows and several specs quietly
 * leaned on them — a receipt to liquidate, a rule to generate from. The demo
 * data is gone, so a spec that needs a row now makes it, tagged, and the sweep
 * removes it. A suite that depends on data it did not create is a suite that
 * breaks the day someone tidies up.
 */
// Every fixture in a run must be distinguishable on screen. Sharing one name
// made two receipts match the same row locator and the click became ambiguous.
let seq = 0
const unique = () => MARK + '-' + (++seq)

export async function makeReceipt(fields = {}) {
  const c = await db()
  const tag = unique()
  const row = {
    id: Date.now() + Math.floor(Math.random() * 1000),
    co: 'VAR', name: tag + ' holder', description: tag + ' cash advance',
    amount: 5000, status: 'released', date: null, actual: null, ...fields,
  }
  const { error } = await c.from('receipts').insert(row)
  if (error) throw error
  return row
}

export async function makeTransfer(fields = {}) {
  const c = await db()
  const tag = unique()
  const row = {
    id: Date.now() + Math.floor(Math.random() * 1000),
    co: 'ZON', name: tag + ' beneficiary', cur: 'USD',
    amount: 4200, status: 'pending', note: tag + ' wire', ...fields,
  }
  const { error } = await c.from('transfers').insert(row)
  if (error) throw error
  return row
}

export async function makeRecurring(fields = {}) {
  const c = await db()
  const row = {
    id: Date.now() + Math.floor(Math.random() * 1000),
    co: 'GTOI', cat: 'Rental Expense', freq: 'Monthly',
    description: unique() + ' monthly rule', due_date: '2026-09-15', amount: 1000, ...fields,
  }
  const { error } = await c.from('recurring').insert(row)
  if (error) throw error
  return row
}

/** Snapshot a receipt so a test can put it back exactly as it found it. */
export async function restoreReceipt(before) {
  const c = await db()
  const { error } = await c.from('receipts').update({
    status: before.status, date: before.date, actual: before.actual,
  }).eq('id', before.id)
  if (error) throw error
}

/**
 * Give back whatever a killed run was holding.
 *
 * Restoring in a spec's `finally` is not enough: a **killed** process
 * never runs `finally`, and a run terminated mid-spec left `ackRequirePhoto`
 * ON in the owner's live config — which does not merely fail the next run, it
 * stops the owner liquidating a receipt without attaching a file, a setting
 * they never chose.
 *
 * The first version of this simply forced the documented defaults back. That
 * traded one failure for another: `ackRequirePhoto` defaults off because
 * turning it on is a policy decision (`src/data.js`), so an owner who had
 * deliberately turned it on would have had the nightly run quietly turn it off
 * again. A suite cannot tell residue from policy by looking at a value.
 *
 * So the spec says so instead. Before it changes anything it calls `hold`,
 * which records what was there under `__e2eHeld`. That marker outlives a kill,
 * and this restores exactly the recorded value rather than one it assumed. No
 * marker means no run was interrupted, and nothing is written.
 *
 * A path is either `settings.<key>` or the name of a top-level config section
 * such as `companies`. Settings alone were not enough: a spec adds a company
 * code to the shared list, and nothing here could give that back.
 */
export async function releaseHeld() {
  const c = await db()
  // `error` was discarded here, so a transient 5xx or an expired token made
  // this return null and the spec pass green — leaving whatever it was holding
  // in the owner's live config with nothing reporting it. Every other reader in
  // this file throws; so does this one.
  const { data, error: readError } = await c.from('app_config').select('data').eq('id', true).maybeSingle()
  if (readError) throw readError
  if (!data) return null
  const held = (data.data.settings || {}).__e2eHeld
  if (!held || !Object.keys(held).length) return null

  // Through the merge function, never a whole-document update: sending the
  // whole config would throw away anything the owner changed since the read
  // above — the lost update `merge_app_config` exists to prevent (`src/db.js`).
  const patch = {}
  for (const [path, value] of Object.entries(held)) {
    if (path.startsWith('settings.')) (patch.settings ||= {})[path.slice(9)] = value
    else patch[path] = value
  }
  // Seeded LAST and never before the loop: a top-level path assigning to
  // `patch.settings` used to overwrite the object holding this clear.
  patch.settings = { ...(patch.settings || {}), __e2eHeld: null }
  const { data: touched, error } = await c.rpc('merge_app_config', { patch })
  if (error) throw error
  if (!touched) throw new Error('releaseHeld: merge_app_config wrote no row')
  return Object.keys(held)
}

/**
 * Record what the config held, so an interrupted run can be undone.
 *
 * Written before the spec changes anything. Existing marks are kept, so two
 * paths held at once both come back, and a re-held path keeps the value from
 * the first hold rather than one the suite already changed.
 *
 * A path that is not in the stored config **throws**. Recording absence as
 * `null` and writing that back later would shadow the default in
 * `src/db.js` — for a setting whose default is `true`, recovery from a killed
 * run would silently turn it off. Refusing loudly here is the only answer that
 * does not invent a value.
 */
export async function hold(paths) {
  const c = await db()
  const { data, error: readError } = await c.from('app_config').select('data').eq('id', true).maybeSingle()
  if (readError) throw readError
  if (!data) throw new Error('hold: no app_config row, so nothing can be held')
  const cfg = data.data
  const settings = cfg.settings || {}
  const held = { ...(settings.__e2eHeld || {}) }
  for (const path of paths) {
    if (path in held) continue
    // `'settings' in cfg` is true, so this validated — and `releaseHeld` would
    // then write the whole settings object back over its own marker clear,
    // re-arming the marker on every run while reporting success. Hold a
    // setting by name; the section as a whole is not a thing to hold.
    if (path === 'settings') throw new Error('hold: hold "settings.<key>", not the whole settings section')
    const [where, key] = path.startsWith('settings.') ? [settings, path.slice(9)] : [cfg, path]
    if (!(key in where)) throw new Error('hold: "' + path + '" is not in the stored config')
    held[path] = where[key]
  }
  const { data: touched, error } = await c.rpc('merge_app_config', { patch: { settings: { __e2eHeld: held } } })
  if (error) throw error
  if (!touched) throw new Error('hold: merge_app_config wrote no row, so nothing is held')
}


/**
 * Remove everything any run tagged, plus files no receipt references.
 *
 * Sweeps every `E2E-` tag, not only this run's: an interrupted run leaves rows
 * behind, and the next run should clear them rather than let them accumulate
 * in a ledger people actually read. Nothing without the tag is ever touched.
 */
export async function cleanup(needle = MARK) {
  const c = await db()
  const ok = ({ data, error }) => { if (error) throw error; return data || [] }

  // Files FIRST, then the rows that name them.
  //
  // The order is the whole design. Deleting the rows first and removing their
  // files afterwards — which this did until round 23 — means a failed remove or
  // a killed process orphans those files **permanently**: the rows that named
  // them are gone, so no later sweep can find them. Reversed, a kill between
  // the two leaves the rows in place, still carrying their `E2E-` tag, and the
  // next sweep finds them and finishes the job. Removing a key that is already
  // absent is not an error, so the retry is free.
  //
  // What this must never go back to is identifying files by *absence* from a
  // `receipts` read. That was the previous design, and one failed read made it
  // delete every attachment the owner had ever uploaded.
  // Deduped: the default `needle` IS `'E2E-'`, so both passes match the same
  // rows, and a receipt can match on `name` and `description` both.
  const seen = new Set()
  for (const tag of [needle, 'E2E-']) {
    const like = '%' + tag + '%'
    for (const column of ['name', 'description']) {
      for (const r of ok(await c.from('receipts').select('file_path').like(column, like))) {
        if (r.file_path) seen.add(r.file_path)
      }
    }
  }
  const files = [...seen]
  if (files.length) {
    const { error } = await c.storage.from('receipts').remove(files)
    if (error) throw error
  }

  for (const tag of [needle, 'E2E-']) {
    const like = '%' + tag + '%'
    ok(await c.from('txns').delete().like('description', like).select('id'))
    ok(await c.from('recurring').delete().like('description', like).select('id'))
    ok(await c.from('receipts').delete().like('name', like).select('id'))
    ok(await c.from('receipts').delete().like('description', like).select('id'))
    ok(await c.from('transfers').delete().like('name', like).select('id'))
    ok(await c.from('transfers').delete().like('note', like).select('id'))
  }
  return files
}
