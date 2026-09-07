import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  CONFIG_KEYS, configOf, forUpdate, fromReceipt, fromRecurring, fromTransfer, fromTxn, toReceipt, toRecurring, toTransfer, toTxn, configPatch,
} from './rows.js'
import { initialState } from './data.js'
import { buildGeneratedRows } from './logic.js'

// The app and the database disagree about empty values: '' versus NULL. A
// round trip is the check that matters, because a one-way slip shows up as a
// blank due date or a lost check number only after a reload.

test('a fully populated transaction survives the round trip', () => {
  const t = {
    id: 3, co: 'GTOI', cat: 'Salary & Wages', desc: 'Semi-monthly payroll, 2nd half',
    period: 'Aug 2026', due: '2026-08-30', amount: 210000, status: 'completed',
    done: '2026-08-29', payType: 'Check', checkNo: '004182', notes: 'released early',
    src: 12, fee: 25,
  }
  assert.deepEqual(fromTxn(toTxn(t)), t)
})

// `src` and `fee` are nullable and both have a meaningful zero, so the empty
// case has to survive as null rather than be flattened into 0 — a row claiming
// masterlist payable 0 or a recorded charge of nothing are different facts from
// "no parent" and "no charge".
test('an absent link and an absent charge reach the database as NULL, not 0', () => {
  const row = toTxn({ id: 1, co: 'A', cat: 'B', desc: 'c', period: 'p', due: '', amount: 1, status: 'pending', done: '' })
  assert.equal(row.src, null)
  assert.equal(row.fee, null)
  assert.equal(fromTxn({ ...row, src: null, fee: null }).src, null)
})

test('a deliberate zero charge is kept, because 0 is a recorded charge', () => {
  assert.equal(toTxn({ fee: 0 }).fee, 0)
  assert.equal(fromTxn({ fee: 0 }).fee, 0)
  assert.equal(fromTxn({ fee: '25' }).fee, 25, 'numeric arrives as a string from PostgREST')
})

test('an unpaid transaction round-trips its empty dates as empty strings', () => {
  const t = {
    id: 1, co: 'GTOI', cat: 'Rental Expense', desc: 'Warehouse B monthly rent',
    period: 'Aug 2026', due: '2026-08-24', amount: 45000, status: 'pending',
    done: '', payType: '', checkNo: '', notes: '', src: null, fee: null,
  }
  const row = toTxn(t)
  assert.equal(row.done, null, "'' must reach a date column as NULL")
  assert.equal(row.check_no, null)
  assert.deepEqual(fromTxn(row), t)
})

test('seed transactions round-trip even without the optional fields', () => {
  // data.js omits payType, checkNo and notes entirely; they must come back as
  // empty strings rather than undefined, which is what the edit form expects.
  const back = fromTxn(toTxn(initialState.txns[0]))
  assert.equal(back.payType, '')
  assert.equal(back.checkNo, '')
  assert.equal(back.notes, '')
  assert.equal(back.amount, initialState.txns[0].amount)
})

test('an unliquidated receipt keeps actual as null, not zero or empty', () => {
  const r = { id: 3, co: 'VAR', name: 'Jack Rivera', desc: 'Permit filing fees', amount: 40000, status: 'released', date: '', actual: null, filePath: '' }
  const row = toReceipt(r)
  assert.equal(row.date, null)
  assert.equal(row.actual, null)
  // No document attached must reach the column as NULL, not an empty string:
  // '' would look like a stored object key and produce a broken signed URL.
  assert.equal(row.file_path, null)
  assert.deepEqual(fromReceipt(row), r)
})

test('a liquidated receipt round-trips its actual amount and its document', () => {
  const r = {
    id: 2, co: 'ZON', name: 'Maria Lansang', desc: 'Client meeting expenses',
    amount: 12000, status: 'liquidated', date: '2026-08-18', actual: 13850,
    filePath: '2/1788190000000.pdf',
  }
  const row = toReceipt(r)
  assert.equal(row.file_path, '2/1788190000000.pdf')
  assert.deepEqual(fromReceipt(row), r)
})

test('a seed receipt with no file field still round-trips', () => {
  // data.js predates file storage and gives no filePath at all; undefined must
  // become NULL going out and '' coming back, never the string "undefined".
  const back = fromReceipt(toReceipt(initialState.receipts[2]))
  assert.equal(back.filePath, '')
  assert.equal(toReceipt(initialState.receipts[2]).file_path, null)
})

test('numeric columns arriving as strings still come back as numbers', () => {
  // PostgREST sends numeric as a JSON number today; if that ever changes,
  // arithmetic on the totals must not silently turn into concatenation.
  const back = fromTxn({ ...toTxn(initialState.txns[0]), amount: '45000.00' })
  assert.equal(back.amount, 45000)
  assert.equal(typeof back.amount, 'number')

  const rec = fromReceipt({ ...toReceipt(initialState.receipts[0]), amount: '25000.00', actual: '23400.00' })
  assert.equal(rec.amount + rec.actual, 48400)
})

test('a recurring payable maps dueDate to due_date and back', () => {
  const p = initialState.recurring[0]
  const row = toRecurring(p)
  assert.equal(row.due_date, p.dueDate)
  assert.equal(row.description, p.desc)
  assert.deepEqual(fromRecurring(row), p)
})

test('configOf picks exactly the slices stored in app_config', () => {
  const cfg = configOf(initialState)
  assert.deepEqual(Object.keys(cfg), CONFIG_KEYS)
  assert.deepEqual(cfg.settings, initialState.settings)
  // Screen, filters and open dialogs are UI state and must never be persisted.
  for (const k of ['screen', 'filtersOpen', 'addOpen', 'toast', 'search']) {
    assert.ok(!(k in cfg), k + ' must not be written to app_config')
  }
})

test('an update payload never carries the primary key or generated identity', () => {
  // The database does not grant UPDATE on these columns, so including any of
  // them makes an otherwise ordinary edit fail with a privilege error.
  const row = toTxn(initialState.txns[0])
  assert.ok('id' in row, 'an insert does carry the client-generated id')
  assert.ok('src' in row, 'an insert does carry its recurring parent')
  assert.ok('occurrence_due' in row, 'an insert does carry its occurrence date')
  const update = forUpdate(row)
  assert.ok(!('id' in update))
  assert.ok(!('src' in update))
  assert.ok(!('occurrence_due' in update))
  // Everything else must survive, or an edit would blank the fields it omits.
  for (const k of Object.keys(row)) {
    if (k === 'id' || k === 'src' || k === 'occurrence_due') continue
    assert.deepEqual(update[k], row[k], k + ' must survive forUpdate')
  }
})

test('configPatch reports only what changed', () => {
  const prev = {
    notes: [{ t: 'file returns', done: false }],
    companies: ['ANG', 'BAR'],
    categories: ['Other'],
    settings: { trkOverdueRed: true, dashWindow: 'Next 30 days' },
  }
  assert.equal(configPatch(prev, prev), null, 'an unchanged config saves nothing')

  const renamed = { ...prev, companies: ['ANG', 'BAR', 'ZON'] }
  assert.deepEqual(configPatch(prev, renamed), { companies: ['ANG', 'BAR', 'ZON'] })

  // The collision this exists for: one person flips a toggle, another edits a
  // different toggle. Each patch must carry only its own key, or the second
  // save puts the first one back.
  const toggled = { ...prev, settings: { ...prev.settings, trkOverdueRed: false } }
  assert.deepEqual(configPatch(prev, toggled), { settings: { trkOverdueRed: false } })

  const windowed = { ...prev, settings: { ...prev.settings, dashWindow: 'Next 7 days' } }
  assert.deepEqual(configPatch(prev, windowed), { settings: { dashWindow: 'Next 7 days' } })

  // Two unrelated changes in one save still travel together.
  const both = { ...prev, categories: ['Other', 'Rent'], settings: { ...prev.settings, dashWindow: 'Today' } }
  assert.deepEqual(configPatch(prev, both), {
    categories: ['Other', 'Rent'],
    settings: { dashWindow: 'Today' },
  })
})

test('configPatch compares by value, not by reference', () => {
  const prev = { notes: [{ t: 'a' }], companies: ['ANG'], categories: [], settings: { x: 1 } }
  // A re-render hands back fresh arrays holding identical contents; saving on
  // that would write the whole config over everyone else's edits on every
  // keystroke, which is exactly what patching is meant to stop.
  const rebuilt = { notes: [{ t: 'a' }], companies: ['ANG'], categories: [], settings: { x: 1 } }
  assert.equal(configPatch(prev, rebuilt), null)

  const edited = { ...prev, notes: [{ t: 'a', done: true }] }
  assert.deepEqual(configPatch(prev, edited), { notes: [{ t: 'a', done: true }] })
})

// ---- a wire's stored rate --------------------------------------------
// null means "never priced", and it has to survive the round trip as null.
// Writing 0 instead would mean "worth nothing", which values the wire at zero
// pesos instead of falling back to the feed.

const wire = { id: 1, co: 'GTOI', name: 'Acme', cur: 'USD', amount: 1000, status: 'pending', note: '' }

test('a wire round-trips the rate it was sent at', () => {
  const priced = { ...wire, rate: 62.5453, rate_as_of: '2026-09-02' }
  const back = fromTransfer(toTransfer(priced))
  assert.equal(back.rate, 62.5453)
  assert.equal(back.rate_as_of, '2026-09-02')
})

test('an unpriced wire keeps its rate null, not zero', () => {
  const back = fromTransfer(toTransfer(wire))
  assert.equal(back.rate, null)
  assert.equal(back.rate_as_of, null)
})

test('an empty rate off a form is stored as null rather than 0', () => {
  const typed = { ...wire, rate: '', rate_as_of: '' }
  assert.equal(toTransfer(typed).rate, null)
  assert.equal(toTransfer(typed).rate_as_of, null)
})

test('a rate arriving as a string comes back as a number', () => {
  // numeric columns come off PostgREST as strings, the same way amount does.
  assert.equal(fromTransfer({ ...wire, rate: '62.545300', rate_as_of: '2026-09-02' }).rate, 62.5453)
})

test('a deliberate zero rate is kept, because it is visibly wrong', () => {
  assert.equal(fromTransfer(toTransfer({ ...wire, rate: 0 })).rate, 0)
})

// ---- the invoice number on a wire ------------------------------------------

// `inv` is modelled on `note`, not on `rate`: text, never null, empty when
// unknown. The distinction matters because `rate` uses null to mean "never
// priced", and copying that here would invent a state an invoice number does
// not have — an invoice is either recorded or not yet typed, and both are text.
test('a wire round-trips its invoice number alongside its note', () => {
  const w = {
    id: 1, co: 'GTOI', name: 'Sumitomo Metals Ltd.', cur: 'GBP',
    amount: 38200, status: 'released', note: 'Steel order — PO 2026-114',
    inv: 'SM-40218', rate: null, rate_as_of: null,
  }
  const back = fromTransfer(toTransfer(w))
  assert.equal(back.inv, 'SM-40218')
  assert.equal(back.note, 'Steel order — PO 2026-114', 'the note must survive beside it')
  assert.deepEqual(back, w)
})

test('an invoice number is alphanumeric text, not coerced to a number', () => {
  assert.equal(toTransfer({ inv: 'SM-40218' }).inv, 'SM-40218')
  assert.equal(toTransfer({ inv: '004821' }).inv, '004821', 'a leading zero must not be lost')
  assert.equal(fromTransfer({ inv: 'LH-2026-0442' }).inv, 'LH-2026-0442')
})

// The column is NOT NULL with an empty-string default, so nothing may send null
// to it — a wire with no invoice yet has to arrive as ''.
test('a missing invoice number reaches the database as an empty string, never null', () => {
  assert.equal(toTransfer({ id: 1, co: 'A', name: 'B', cur: 'USD', amount: 1, status: 'pending' }).inv, '')
  assert.equal(fromTransfer({ inv: null }).inv, '')
  assert.equal(fromTransfer({}).inv, '')
})

// ---- what the nightly scheduler sends ---------------------------------------

/**
 * `npm run schedule` runs unattended in GitHub Actions at 22:00 UTC and inserts
 * whatever `buildGeneratedRows` produces, through `toTxn`. `public.txns` has no
 * table-wide INSERT grant — the column list is exhaustive — so a column added
 * to `toTxn` without being added to the migration's grant breaks that job in
 * production, at night, with nobody watching.
 *
 * The grant list is duplicated here deliberately: this test exists to assert
 * that the app and the database still agree about it.
 */
const TXN_INSERT_GRANT = [
  'id', 'co', 'cat', 'description', 'period', 'due', 'amount',
  'status', 'done', 'pay_type', 'check_no', 'notes', 'src', 'occurrence_due', 'fee',
]

test('every column the scheduler inserts is one the database grants', () => {
  const recurring = [{ id: 7, co: 'GTOI', cat: 'Rental Expense', freq: 'Monthly', desc: 'rent', dueDate: '2026-09-24', amount: 45000 }]
  const { rows } = buildGeneratedRows(recurring, [], '2026-09')
  assert.ok(rows.length, 'the fixture must actually generate a row')

  for (const row of rows) {
    const ungranted = Object.keys(toTxn(row)).filter((c) => !TXN_INSERT_GRANT.includes(c))
    assert.deepEqual(ungranted, [], 'these columns would be refused by the INSERT grant')
  }
})

test('a generated row carries its parent and no charge', () => {
  const recurring = [{ id: 7, co: 'GTOI', cat: 'Rental Expense', freq: 'Monthly', desc: 'rent', dueDate: '2026-09-24', amount: 45000 }]
  const wire = toTxn(buildGeneratedRows(recurring, [], '2026-09').rows[0])
  assert.equal(wire.src, 7, 'the FK must point at the payable that produced it')
  assert.equal(wire.fee, null, 'a generated row has no e-cash charge, and null is not 0')
})
