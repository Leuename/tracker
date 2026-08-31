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

export function haveCredentials() {
  return !!(url && key && process.env.E2E_EMAIL && process.env.E2E_PASSWORD)
}

let client = null

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

export async function restoreConfig(before) {
  const c = await db()
  const { error } = await c.from('app_config').update({ data: before }).eq('id', true)
  if (error) throw error
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
  for (const tag of [needle, 'E2E-']) {
    await c.from('txns').delete().like('description', '%' + tag + '%')
    await c.from('recurring').delete().like('description', '%' + tag + '%')
    await c.from('receipts').delete().like('name', '%' + tag + '%')
    await c.from('receipts').delete().like('description', '%' + tag + '%')
  }
  await cleanupOrphanFiles()
}

/** Delete stored files that no receipt row points at any more. */
export async function cleanupOrphanFiles() {
  const c = await db()
  const { data: rows } = await c.from('receipts').select('file_path')
  const kept = new Set((rows || []).map((r) => r.file_path).filter(Boolean))

  const { data: folders } = await c.storage.from('receipts').list('', { limit: 1000 })
  const orphans = []
  for (const folder of folders || []) {
    const { data: files } = await c.storage.from('receipts').list(folder.name, { limit: 1000 })
    for (const f of files || []) {
      const key = folder.name + '/' + f.name
      if (!kept.has(key)) orphans.push(key)
    }
  }
  if (orphans.length) await c.storage.from('receipts').remove(orphans)
  return orphans
}
