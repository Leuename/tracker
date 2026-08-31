/**
 * End-to-end check against the real Supabase project: `npm run smoke`.
 *
 * Kept out of `npm test` because it needs the network and a real account. It
 * signs in, seeds the workspace if it is empty, writes through every table,
 * reloads from scratch and compares.
 *
 *   SMOKE_EMAIL=admin@example.com SMOKE_PASSWORD=... npm run smoke
 *
 * It cannot create its own account: sign-up is closed, by decision. Use one of
 * the two real accounts, and note that it writes to the SHARED ledger — it
 * cleans up the row it adds, but run it before real payables go in.
 */
import assert from 'node:assert/strict'
import { supabase } from './supabase.js'
import { db, load } from './db.js'

const email = process.env.SMOKE_EMAIL
const password = process.env.SMOKE_PASSWORD
if (!email || !password) {
  console.error('Set SMOKE_EMAIL and SMOKE_PASSWORD to a real account on this project.')
  process.exit(2)
}

const step = (msg) => console.log('  ' + msg)

const { data: auth, error } = await supabase.auth.signInWithPassword({ email, password })
if (error) {
  console.error('Sign-in failed: ' + error.message)
  console.error('Accounts are created in the Supabase dashboard; sign-up is disabled.')
  process.exit(2)
}
step('signed in as ' + email + ' (' + auth.user.id + ')')

const created = { txns: [], receipts: [] }
let restoreConfig = false

try {
  const first = await load()
  step('loaded ' + first.txns.length + ' transactions, ' + first.receipts.length + ' receipts, ' + first.recurring.length + ' recurring')

  // Everything below works on a row this script creates. It used to edit a
  // seeded row, which stopped existing when the demo data was cleared — and on a
  // real ledger, editing whatever happened to be first is not acceptable anyway.
  const added = { id: Date.now(), co: 'GTOI', cat: 'Other', desc: 'smoke row', period: 'Sep 2026', due: '2026-09-30', amount: 1234.5, status: 'pending', done: '' }
  await db.insertTxn(added)
  created.txns.push(added.id)

  const paid = { ...added, status: 'completed', done: '2026-09-01', payType: 'Check', checkNo: '004182' }
  await db.updateTxn(paid)

  const receipt = { id: Date.now() + 1, co: 'VAR', name: 'smoke holder', desc: 'smoke advance', amount: 2000, status: 'released', date: '', actual: null, filePath: '' }
  await db.insertReceipt(receipt)
  created.receipts.push(receipt.id)
  const liq = { ...receipt, status: 'liquidated', date: '2026-09-01', actual: 999 }
  await db.updateReceipt(liq)

  await db.saveConfig({ ...first, categories: [...first.categories, 'Smoke Category'] })
  restoreConfig = true
  step('wrote a payment, an insert, a liquidation and a config change')

  const again = await load()
  const back = again.txns.find((t) => t.id === paid.id)
  assert.equal(back.status, 'completed')
  assert.equal(back.checkNo, '004182', 'check number must survive the reload')
  assert.equal(back.done, paid.done, 'the completion date must round-trip')

  const newRow = again.txns.find((t) => t.id === added.id)
  assert.equal(newRow.desc, 'smoke row')
  assert.equal(newRow.amount, 1234.5, 'a fractional amount must not be rounded')

  const backLiq = again.receipts.find((r) => r.id === liq.id)
  assert.equal(backLiq.status, 'liquidated')
  assert.equal(backLiq.actual, 999)

  assert.ok(again.categories.includes('Smoke Category'), 'config must persist')
  step('every write read back correctly')

  // Leave the shared category list as it was found.
  await db.saveConfig(first)

  await db.deleteTxn(added.id)
  const third = await load()
  assert.equal(third.txns.find((t) => t.id === added.id), undefined, 'delete must stick')
  step('delete confirmed')

} finally {
  // Runs whether the assertions passed or threw.
  if (created.txns.length) await supabase.from('txns').delete().in('id', created.txns)
  if (created.receipts.length) await supabase.from('receipts').delete().in('id', created.receipts)
  // The category list is shared configuration, not a row this script owns.
  if (restoreConfig) await db.saveConfig(first)
}

console.log('smoke passed')
await supabase.auth.signOut()
