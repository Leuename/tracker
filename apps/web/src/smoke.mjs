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
import { createHash, randomBytes } from 'node:crypto'
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

const created = { txns: [], receipts: [], transfers: [], files: [] }
const sha = (b) => createHash('sha256').update(b).digest('hex')
let restoreConfig = false
// Declared out here on purpose: the finally block restores the shared config
// from it, and a `const` inside the try is not in scope there. It threw
// `ReferenceError: first is not defined` on every run that got as far as
// touching the category list, which masked the script's real result.
let first = null

try {
  first = await load()
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

  const wire = { id: Date.now() + 2, co: 'ZON', name: 'smoke beneficiary', cur: 'GBP', amount: 3400, status: 'pending', note: 'smoke wire' }
  await db.insertTransfer(wire)
  created.transfers.push(wire.id)
  const released = { ...wire, status: 'released', note: 'smoke wire released' }
  await db.updateTransfer(released)

  await db.saveConfig({ ...first, categories: [...first.categories, 'Smoke Category'] })
  restoreConfig = true
  step('wrote a payment, an insert, a liquidation, a wire and a config change')

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

  const backWire = again.transfers.find((w) => w.id === wire.id)
  assert.ok(backWire, 'the transfer must reach the database')
  assert.equal(backWire.status, 'released')
  assert.equal(backWire.cur, 'GBP', 'a wire keeps the currency it was sent in')
  assert.equal(backWire.amount, 3400, 'the amount is stored unconverted')
  assert.equal(backWire.note, 'smoke wire released')

  assert.ok(again.categories.includes('Smoke Category'), 'config must persist')
  step('every write read back correctly')

  // Leave the shared category list as it was found.
  await db.saveConfig(first)

  // ---- stored documents ----------------------------------------------
  // The one path in scripts/backup.mjs that nothing else exercises. The bucket
  // has been empty at every backup so far, so `files: 0 stored` has never said
  // anything about whether a document would survive one. Random bytes behind a
  // PDF header, because the bucket only accepts real media types and a byte
  // comparison must not be able to pass by accident.
  const doc = Buffer.concat([Buffer.from('%PDF-1.4\n'), randomBytes(2048)])
  const docPath = receipt.id + '/smoke.pdf'
  const { error: upErr } = await supabase.storage.from('receipts')
    .upload(docPath, doc, { contentType: 'application/pdf' })
  assert.ok(!upErr, 'a receipt document must upload: ' + (upErr && upErr.message))
  created.files.push(docPath)

  const { data: blob, error: dlErr } = await supabase.storage.from('receipts').download(docPath)
  assert.ok(!dlErr, 'a stored document must download again: ' + (dlErr && dlErr.message))
  const held = Buffer.from(await blob.arrayBuffer())
  assert.equal(sha(held), sha(doc), 'the bytes a backup would hold must match what was stored')

  // And back the other way, which is the half a restore depends on.
  const restoredPath = receipt.id + '/smoke-restored.pdf'
  const { error: reErr } = await supabase.storage.from('receipts')
    .upload(restoredPath, held, { contentType: 'application/pdf' })
  assert.ok(!reErr, 'a held document must upload back: ' + (reErr && reErr.message))
  created.files.push(restoredPath)
  const { data: restored } = await supabase.storage.from('receipts').download(restoredPath)
  assert.equal(sha(Buffer.from(await restored.arrayBuffer())), sha(doc),
    'a restored document must be byte-identical to the original')
  step('a receipt document stored, read back and restored byte-for-byte')

  await db.deleteTransfer(wire.id)
  await db.deleteTxn(added.id)
  const third = await load()
  assert.equal(third.txns.find((t) => t.id === added.id), undefined, 'delete must stick')
  step('delete confirmed')

} finally {
  // Runs whether the assertions passed or threw.
  // Files first, then the rows that point at them — the comment here used to
  // claim this order while the code did the opposite. A kill between the two
  // must leave a row still naming the file, or the file is unreachable forever.
  if (created.files.length) await supabase.storage.from('receipts').remove(created.files)
  if (created.txns.length) await supabase.from('txns').delete().in('id', created.txns)
  if (created.receipts.length) await supabase.from('receipts').delete().in('id', created.receipts)
  if (created.transfers.length) await supabase.from('transfers').delete().in('id', created.transfers)
  // The category list is shared configuration, not a row this script owns.
  if (restoreConfig && first) await db.saveConfig(first)
}

console.log('smoke passed')
await supabase.auth.signOut()
