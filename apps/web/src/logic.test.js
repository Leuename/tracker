// Run with: npm test  (node --test, no framework)
import test from 'node:test'
import assert from 'node:assert/strict'
import { CSYM, initialState, MAX_OCC, TODAY } from './data.js'
import {
  addDays, alphabetical, buildGeneratedRows, curFmt, dstr, eff, inPesos, monthKeys, occurrences, openingView, parsePeriod, periodLabel, ruleLabel, transferTotals, visibleRows, windowDays, viewerActions, VIEWER_MAY} from './logic.js'

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

test('monthKeys offers 13 months from a given month, rolling the year over', () => {
  // Pinned to an explicit date: TODAY is the real date now, so an assertion
  // against a hardcoded end month would start failing on its own next month.
  const keys = monthKeys('2026-08-30')
  assert.equal(keys.length, 13)
  assert.equal(keys[0], '2026-08')
  assert.equal(keys[4], '2026-12')
  assert.equal(keys[5], '2027-01', 'the year must roll over')
  assert.equal(keys[12], '2027-08')
})

test('monthKeys defaults to the current month', () => {
  const keys = monthKeys()
  assert.equal(keys.length, 13)
  assert.equal(keys[0], TODAY.slice(0, 7))
  assert.match(keys[12], /^\d{4}-(0[1-9]|1[0-2])$/)
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

test('the deadline window is read from the setting, not assumed', () => {
  assert.equal(windowDays('Next 7 days'), 7)
  assert.equal(windowDays('Next 30 days'), 30)
  assert.equal(windowDays('Next 90 days'), 90)
  // A value the settings screen never offers must not collapse the list to zero.
  assert.equal(windowDays(undefined), 30)
  assert.equal(windowDays('whenever'), 30)
})

test('addDays crosses a month boundary correctly', () => {
  assert.equal(addDays('2026-08-30', 7), '2026-09-06')
  assert.equal(addDays('2026-12-31', 1), '2027-01-01')
  assert.equal(addDays('2026-08-30', 0), '2026-08-30')
})

test('the opening view comes from the saved settings', () => {
  assert.deepEqual(openingView({ dashDefaultScope: 'All companies', trkGroupDefault: 'Company' }),
    { scope: 'All companies', groupBy: 'company' })
  // "GTOI only" is the label; the scope compares against the bare company code.
  assert.deepEqual(openingView({ dashDefaultScope: 'GTOI only', trkGroupDefault: 'Category' }),
    { scope: 'GTOI', groupBy: 'category' })
  // Missing settings must still yield a usable view rather than undefined.
  assert.deepEqual(openingView({}), { scope: 'All companies', groupBy: 'company' })
  assert.deepEqual(openingView(), { scope: 'All companies', groupBy: 'company' })
})

test('addDays does not drift with the machine timezone', () => {
  // Parsing local and formatting UTC loses a day east of Greenwich. Assert the
  // arithmetic directly rather than trusting the runner's zone.
  assert.equal(addDays('2026-01-01', 0), '2026-01-01')
  assert.equal(addDays('2026-03-01', -1), '2026-02-28')
  assert.equal(addDays('2028-03-01', -1), '2028-02-29') // leap year
})

test('alphabetical sorts a–z, copies rather than mutating, and tolerates nothing', () => {
  const codes = ['ZON', 'ANG', 'GTOI']
  assert.deepEqual(alphabetical(codes), ['ANG', 'GTOI', 'ZON'])
  assert.deepEqual(codes, ['ZON', 'ANG', 'GTOI'], 'the caller’s array must be untouched')
  assert.deepEqual(alphabetical(['Other', 'Credit card', 'Alan Expense']),
    ['Alan Expense', 'Credit card', 'Other'])
  assert.deepEqual(alphabetical(undefined), [])
})

test('the shipped company and category lists are already a–z', () => {
  assert.deepEqual(initialState.companies, alphabetical(initialState.companies))
  assert.deepEqual(initialState.categories, alphabetical(initialState.categories))
  assert.equal(initialState.companies.length, 21)
  assert.equal(initialState.categories.length, 13)
})

test('transfer totals convert to pesos and exclude what is not going anywhere', () => {
  const rows = [
    { cur: 'USD', amount: 100, status: 'pending' },     // 5,800
    { cur: 'PHP', amount: 5000, status: 'pending' },    // 5,000
    { cur: 'GBP', amount: 100, status: 'released' },    // 7,400
    { cur: 'USD', amount: 999, status: 'cancelled' },   // excluded
    { cur: 'EUR', amount: 999, status: 'onhold' },      // excluded
  ]
  const t = transferTotals(rows)
  assert.equal(t.pending, 10800)
  assert.equal(t.pendingCount, 2)
  assert.equal(t.released, 7400)
})

test('transferTotals is safe on an empty ledger', () => {
  assert.deepEqual(transferTotals([]), { pending: 0, pendingCount: 0, released: 0 })
  assert.deepEqual(transferTotals(), { pending: 0, pendingCount: 0, released: 0 })
})

test('an unknown currency falls back to 1:1 rather than dropping the amount', () => {
  assert.equal(inPesos({ cur: 'ZZZ', amount: 250 }), 250)
  assert.equal(inPesos({ cur: 'USD', amount: 0 }), 0)
})

test('a wire prints in its own currency, not in pesos', () => {
  assert.equal(curFmt('USD', 38200, CSYM), '$38,200')
  assert.equal(curFmt('PHP', 820000, CSYM), '₱820,000')
  assert.equal(curFmt('AUD', 14900.4, CSYM), 'A$14,900')
})

test('a viewer keeps navigation and loses every mutation', () => {
  const called = []
  const actions = {
    state: { readOnly: true },
    go: () => called.push('go'),
    clearFilters: () => called.push('clearFilters'),
    openRow: () => called.push('openRow'),
    commit: () => called.push('commit'),
    deleteEdit: () => called.push('deleteEdit'),
    confirmRemoveReceipt: () => called.push('confirmRemoveReceipt'),
    addCompany: () => called.push('addCompany'),
  }
  const messages = []
  const guarded = viewerActions(actions, (m) => messages.push(m))

  // Looking around still works, or the account is useless rather than read-only.
  guarded.go(); guarded.clearFilters(); guarded.openRow()
  assert.deepEqual(called, ['go', 'clearFilters', 'openRow'])

  // Everything that writes is refused, and says so once per attempt.
  guarded.commit(); guarded.deleteEdit(); guarded.confirmRemoveReceipt(); guarded.addCompany()
  assert.deepEqual(called, ['go', 'clearFilters', 'openRow'], 'no mutation may run')
  assert.equal(messages.length, 4)
  assert.match(messages[0], /not change it/)

  // Non-functions pass straight through; `state` is one.
  assert.deepEqual(guarded.state, { readOnly: true })
})

test('an action nobody listed is blocked, not allowed', () => {
  // The default matters more than the list: forgetting to classify a new action
  // must cost a viewer a button, never cost the ledger a row.
  const guarded = viewerActions({ someBrandNewWrite: () => 'wrote' }, () => {})
  assert.notEqual(guarded.someBrandNewWrite(), 'wrote')
  assert.ok(!VIEWER_MAY.has('someBrandNewWrite'))
})
