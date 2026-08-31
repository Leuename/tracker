import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  CONFIG_KEYS, configOf, forUpdate, fromReceipt, fromRecurring, fromTxn, toReceipt, toRecurring, toTxn,
} from './rows.js'
import { initialState } from './data.js'

// The app and the database disagree about empty values: '' versus NULL. A
// round trip is the check that matters, because a one-way slip shows up as a
// blank due date or a lost check number only after a reload.

test('a fully populated transaction survives the round trip', () => {
  const t = {
    id: 3, co: 'GTOI', cat: 'Salary & Wages', desc: 'Semi-monthly payroll, 2nd half',
    period: 'Aug 2026', due: '2026-08-30', amount: 210000, status: 'completed',
    done: '2026-08-29', payType: 'Check', checkNo: '004182', notes: 'released early',
  }
  assert.deepEqual(fromTxn(toTxn(t)), t)
})

test('an unpaid transaction round-trips its empty dates as empty strings', () => {
  const t = {
    id: 1, co: 'GTOI', cat: 'Rental Expense', desc: 'Warehouse B monthly rent',
    period: 'Aug 2026', due: '2026-08-24', amount: 45000, status: 'pending',
    done: '', payType: '', checkNo: '', notes: '',
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
  const r = { id: 3, co: 'VAR', name: 'Jack Rivera', desc: 'Permit filing fees', amount: 40000, status: 'released', date: '', actual: null }
  const row = toReceipt(r)
  assert.equal(row.date, null)
  assert.equal(row.actual, null)
  assert.deepEqual(fromReceipt(row), r)
})

test('a liquidated receipt round-trips its actual amount', () => {
  const r = { id: 2, co: 'ZON', name: 'Maria Lansang', desc: 'Client meeting expenses', amount: 12000, status: 'liquidated', date: '2026-08-18', actual: 13850 }
  assert.deepEqual(fromReceipt(toReceipt(r)), r)
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

test('an update payload never carries the primary key', () => {
  // The database does not grant UPDATE on `id`, so a payload containing it is
  // rejected outright and every edit silently fails to save.
  const row = toTxn(initialState.txns[0])
  assert.ok('id' in row, 'an insert does carry the client-generated id')
  const update = forUpdate(row)
  assert.ok(!('id' in update))
  // Everything else must survive, or an edit would blank the fields it omits.
  for (const k of Object.keys(row)) {
    if (k === 'id') continue
    assert.deepEqual(update[k], row[k], k + ' must survive forUpdate')
  }
})
