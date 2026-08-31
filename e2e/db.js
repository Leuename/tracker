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

/** Remove everything this run tagged. Safe to call twice. */
export async function cleanup(needle = MARK) {
  const c = await db()
  await c.from('txns').delete().like('description', '%' + needle + '%')
  await c.from('recurring').delete().like('description', '%' + needle + '%')
}
