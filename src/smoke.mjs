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

const first = await load()
assert.ok(first.txns.length > 0, 'load must seed an empty workspace')
step('loaded ' + first.txns.length + ' transactions, ' + first.receipts.length + ' receipts, ' + first.recurring.length + ' recurring')

// A payable marked paid by check: the whole point of persistence is that the
// check number and completion date are still there after a reload.
const target = first.txns.find((t) => t.status === 'pending')
const paid = { ...target, status: 'completed', done: '2026-08-31', payType: 'Check', checkNo: '004182' }
await db.updateTxn(paid)

const added = { id: Date.now(), co: 'GTOI', cat: 'Other', desc: 'smoke row', period: 'Aug 2026', due: '2026-09-30', amount: 1234.5, status: 'pending', done: '' }
await db.insertTxn(added)

const liq = { ...first.receipts.find((r) => r.status !== 'liquidated'), status: 'liquidated', date: '2026-08-31', actual: 999 }
await db.updateReceipt(liq)

await db.saveConfig({ ...first, categories: [...first.categories, 'Smoke Category'] })
step('wrote a payment, an insert, a liquidation and a config change')

const again = await load()
const back = again.txns.find((t) => t.id === paid.id)
assert.equal(back.status, 'completed')
assert.equal(back.checkNo, '004182', 'check number must survive the reload')
assert.equal(back.done, '2026-08-31')

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

console.log('smoke passed')
await supabase.auth.signOut()
