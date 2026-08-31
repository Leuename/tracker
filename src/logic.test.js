// Run with: npm test  (node --test, no framework)
import test from 'node:test'
import assert from 'node:assert/strict'
import { initialState, MAX_OCC, TODAY } from './data.js'
import {
  occurrences, ruleLabel, periodLabel, parsePeriod, eff,
  buildGeneratedRows, monthKeys, dstr, visibleRows,
} from './logic.js'

const rent = { co: 'GTOI', cat: 'Rental Expense', freq: 'Monthly', desc: 'Warehouse B monthly rent', dueDate: '2026-08-24', amount: 45000 }

test('occurrences: monthly clamps the anchor day into the target month', () => {
  assert.deepEqual(occurrences({ ...rent, dueDate: '2026-08-31' }, '2026-09'), ['2026-09-30'])
  assert.deepEqual(occurrences(rent, '2026-09'), ['2026-09-24'])
})

test('occurrences: bi-monthly pairs the anchor day with the day 15 later, capped at month end', () => {
  assert.deepEqual(occurrences({ ...rent, freq: 'Bi-monthly', dueDate: '2026-08-15' }, '2026-09'), ['2026-09-15', '2026-09-30'])
  // Anchor and +15 collapse onto the same clamped day — emit one, not a duplicate.
  assert.deepEqual(occurrences({ ...rent, freq: 'Bi-monthly', dueDate: '2026-08-30' }, '2026-09'), ['2026-09-30'])
})

test('occurrences: quarterly only fires on months 3 apart from the anchor', () => {
  const q = { ...rent, freq: 'Quarterly', dueDate: '2026-09-20' }
  assert.deepEqual(occurrences(q, '2026-09'), ['2026-09-20'])
  assert.deepEqual(occurrences(q, '2026-10'), [])
  assert.deepEqual(occurrences(q, '2026-12'), ['2026-12-20'])
  assert.deepEqual(occurrences(q, '2026-06'), ['2026-06-20']) // backwards across the anchor
})

test('occurrences: yearly and once are anchored to a single month', () => {
  const y = { ...rent, freq: 'Yearly', dueDate: '2026-09-20' }
  assert.deepEqual(occurrences(y, '2027-09'), ['2027-09-20'])
  assert.deepEqual(occurrences(y, '2027-08'), [])
  assert.deepEqual(occurrences({ ...rent, freq: 'Once' }, '2026-08'), ['2026-08-24'])
  assert.deepEqual(occurrences({ ...rent, freq: 'Once' }, '2026-09'), [])
})

test('occurrences: daily and weekly stop at MAX_OCC', () => {
  const daily = occurrences({ ...rent, freq: 'Daily' }, '2026-09')
  assert.equal(daily.length, MAX_OCC)
  assert.deepEqual(daily[0], '2026-09-01')

  const weekly = occurrences({ ...rent, freq: 'Weekly' }, '2026-09')
  const anchorDay = new Date('2026-08-24T00:00:00').getDay()
  assert.ok(weekly.length > 0 && weekly.length <= MAX_OCC)
  for (const d of weekly) assert.equal(new Date(d + 'T00:00:00').getDay(), anchorDay)
})

test('occurrences: a missing due date falls back to the 15th rather than throwing', () => {
  assert.deepEqual(occurrences({ ...rent, dueDate: '' }, '2026-09'), ['2026-09-15'])
})

test('ruleLabel restates the recurrence in English', () => {
  assert.equal(ruleLabel('Bi-monthly', '2026-08-15'), '15th & month-end')
  assert.equal(ruleLabel('Bi-monthly', '2026-08-01'), '1st & 16th of the month')
  assert.equal(ruleLabel('Monthly', '2026-08-24'), '24th of the month')
  assert.equal(ruleLabel('Monthly', ''), 'pick a due date')
})

test('periodLabel renders month, single day and range forms', () => {
  assert.equal(periodLabel({ periodFrom: '2026-08', periodRange: false }), 'Aug 2026')
  assert.equal(periodLabel({ periodFrom: '2026-08', periodFromDay: '24', periodRange: false }), '24 Aug 2026')
  assert.equal(periodLabel({ periodFrom: '2026-07', periodTo: '2026-09', periodRange: true }), 'Jul–Sep 2026')
  assert.equal(periodLabel({ periodFrom: '2026-11', periodTo: '2027-01', periodRange: true }), 'Nov 2026–Jan 2027')
  // An inverted range is pulled back to the start month instead of rendering backwards.
  assert.equal(periodLabel({ periodFrom: '2026-09', periodTo: '2026-07', periodRange: true }), 'Sep 2026')
})

test('parsePeriod round-trips a rendered range back into picker fields', () => {
  assert.deepEqual(parsePeriod('Jul–Sep 2026'), { periodFromDay: '', periodToDay: '', periodFrom: '2026-07', periodRange: true, periodTo: '2026-09' })
  assert.equal(parsePeriod('Aug 2026').periodFrom, '2026-08')
})

test('eff derives overdue from the due date, never from stored status', () => {
  assert.equal(eff({ status: 'pending', due: '2026-08-24' }), 'overdue')
  assert.equal(eff({ status: 'pending', due: '2026-09-05' }), 'pending')
  assert.equal(eff({ status: 'hold', due: '2026-08-01' }), 'hold')
  assert.equal(eff({ status: 'completed', due: '2026-08-01' }), 'completed')
})

test('buildGeneratedRows skips a payable the month already has', () => {
  const { rows, skipped, label } = buildGeneratedRows([rent], initialState.txns, '2026-08')
  assert.equal(label, 'Aug 2026')
  assert.equal(rows.length, 0)
  assert.equal(skipped, 1)

  const next = buildGeneratedRows([rent], initialState.txns, '2026-09')
  assert.equal(next.rows.length, 1)
  assert.equal(next.skipped, 0)
  assert.equal(next.rows[0].status, 'pending')
  assert.equal(next.rows[0].period, 'Sep 2026')
})

test('buildGeneratedRows tags each occurrence when a rule fires more than once', () => {
  const semi = { ...rent, freq: 'Bi-monthly', dueDate: '2026-08-15' }
  const { rows } = buildGeneratedRows([semi], [], '2026-09')
  assert.equal(rows.length, 2)
  assert.equal(rows[0].desc, semi.desc + ' — ' + dstr('2026-09-15'))
  assert.notEqual(rows[0].id, rows[1].id)
})

test('monthKeys offers 13 months starting at today', () => {
  const keys = monthKeys()
  assert.equal(keys.length, 13)
  assert.equal(keys[0], TODAY.slice(0, 7))
  assert.equal(keys[12], '2027-08')
})

test('visibleRows applies company, status and search together', () => {
  const base = { ...initialState, statuses: { pending: true, overdue: true, completed: false, hold: false } }
  const all = visibleRows(base)
  assert.ok(all.every((t) => eff(t) === 'pending' || eff(t) === 'overdue'))

  const scoped = visibleRows({ ...base, coFilter: 'ZON' })
  assert.ok(scoped.length > 0 && scoped.every((t) => t.co === 'ZON'))

  assert.deepEqual(visibleRows({ ...base, search: 'payroll' }).map((t) => t.id), [8])

  // No status ticked means "do not filter by status", matching the prototype.
  const none = visibleRows({ ...base, statuses: { pending: false, overdue: false, completed: false, hold: false } })
  assert.equal(none.length, initialState.txns.length)
})
