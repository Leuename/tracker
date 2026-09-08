// Run with: npm test  (node --test, no framework)
import test from 'node:test'
import assert from 'node:assert/strict'
import { CSYM, initialState, MAX_OCC, TODAY } from './data.js'
import {
  addDays, alphabetical, alreadyOnSheet, amountOf, buildGeneratedRows, curFmt, dstr, eff, forecast, inPesos, monthKeys, monthKeyOf, monthLabel, occurrences, openingView, parsePeriod, periodLabel, positiveAmountOf, unpricedFor, unresolvedFor, rateFor, ruleLabel, tagOf, SORTS, sortRows, summaryHTML, transferTotals, visibleRows, windowDays, viewerActions, VIEWER_MAY, pushable, pushPlan, groupKey, editRecurring, recValue, draftText, coverageFor } from './logic.js'

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

// `eff` takes `today` precisely so it can be pinned. These assertions used the
// real one, so `due: '2026-09-05'` meant "pending" on 2026-09-05 and "overdue"
// on 2026-09-06 — the suite went red overnight with no code change. A test that
// depends on the wall clock reports the calendar, not the code.
test('eff derives overdue from the due date, never from stored status', () => {
  const on = '2026-09-05'
  assert.equal(eff({ status: 'pending', due: '2026-08-24' }, on), 'overdue')
  assert.equal(eff({ status: 'pending', due: '2026-09-05' }, on), 'pending', 'due today is not yet overdue')
  assert.equal(eff({ status: 'pending', due: '2026-09-06' }, on), 'pending')
  assert.equal(eff({ status: 'hold', due: '2026-08-01' }, on), 'hold')
  assert.equal(eff({ status: 'completed', due: '2026-08-01' }, on), 'completed')
})

// The bug this file just demonstrated, pinned as its own case: the same row is
// pending on its due date and overdue the next day, and nothing about the row
// changed.
test('a row becomes overdue by the calendar advancing, not by being written to', () => {
  const row = { status: 'pending', due: '2026-09-05' }
  assert.equal(eff(row, '2026-09-05'), 'pending')
  assert.equal(eff(row, '2026-09-06'), 'overdue')
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
  assert.equal(initialState.categories.length, 19)
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
  assert.deepEqual(transferTotals([]), { pending: 0, pendingCount: 0, released: 0, asOf: null })
  assert.deepEqual(transferTotals(), { pending: 0, pendingCount: 0, released: 0, asOf: null })
})

test('an unknown currency falls back to 1:1 rather than dropping the amount', () => {
  assert.equal(inPesos({ cur: 'ZZZ', amount: 250 }), 250)
  assert.equal(inPesos({ cur: 'USD', amount: 0 }), 0)
})

// ---- the rate fallback chain -----------------------------------------
// Three rungs, and which one answered matters as much as the number: a total
// built on a constant must not print a date claiming it came from the ECB.

const FEED = { USD: { rate: 62.5453, as_of: '2026-09-02' }, EUR: { rate: 72.415, as_of: '2026-09-02' } }

test('a rate stored on the wire beats the feed and the constant', () => {
  const w = { cur: 'USD', amount: 100, rate: 60, rate_as_of: '2026-08-01' }
  assert.deepEqual(rateFor(w, FEED), { rate: 60, src: 'wire', asOf: '2026-08-01' })
  assert.equal(inPesos(w, FEED), 6000)
})

test('a wire with no stored rate takes the feed, not the constant', () => {
  const w = { cur: 'USD', amount: 100 }
  assert.deepEqual(rateFor(w, FEED), { rate: 62.5453, src: 'feed', asOf: '2026-09-02' })
  assert.equal(inPesos(w, FEED), 6254.53)
})

test('a currency the feed does not carry falls through to the constant', () => {
  assert.deepEqual(rateFor({ cur: 'GBP', amount: 1 }, FEED), { rate: 74, src: 'constant', asOf: null })
  assert.deepEqual(rateFor({ cur: 'ZZZ', amount: 1 }, FEED), { rate: 1, src: 'constant', asOf: null })
})

test('no feed at all still values every wire, the way it did before rates existed', () => {
  assert.equal(inPesos({ cur: 'USD', amount: 100 }), 5800)
  assert.equal(inPesos({ cur: 'USD', amount: 100 }, {}), 5800)
})

test('a stored rate of zero is honoured, never silently replaced by a constant', () => {
  // Zero is wrong, but it is wrong VISIBLY. Falling through would value the
  // wire at 58x what somebody deliberately wrote down, and say nothing.
  const w = { cur: 'USD', amount: 100, rate: 0 }
  assert.equal(rateFor(w, FEED).src, 'wire')
  assert.equal(inPesos(w, FEED), 0)
})

test('an empty-string rate off a form is not a rate', () => {
  assert.equal(rateFor({ cur: 'USD', amount: 100, rate: '' }, FEED).src, 'feed')
})

test('totals report the oldest date they were priced at', () => {
  const rows = [
    { cur: 'USD', amount: 100, status: 'released', rate: 62, rate_as_of: '2026-08-20' },
    { cur: 'EUR', amount: 100, status: 'pending' }, // feed, 2026-09-02
  ]
  assert.equal(transferTotals(rows, FEED).asOf, '2026-08-20')
})

test('one wire on a constant strips the date off the whole total', () => {
  // GBP is not in FEED, so it lands on a constant and the total may not claim
  // a source it did not entirely come from.
  const rows = [
    { cur: 'USD', amount: 100, status: 'pending' },
    { cur: 'GBP', amount: 100, status: 'pending' },
  ]
  assert.equal(transferTotals(rows, FEED).asOf, null)
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

// ---- tracker sort ----------------------------------------------------------

const sortable = [
  { id: 1, co: 'ZON', cat: 'rental', due: '2026-09-10' },
  { id: 2, co: 'ang', cat: 'Salary', due: '2026-08-02' },
  { id: 3, co: 'MCR', cat: 'Accounting', due: '2026-12-31' },
]

test('sortRows leaves the arrival order alone when nothing is chosen', () => {
  assert.deepEqual(sortRows(sortable, 'none').map((t) => t.id), [1, 2, 3])
  assert.deepEqual(sortRows(sortable).map((t) => t.id), [1, 2, 3], 'no key is the same as none')
})

test('sortRows copies rather than reordering the array it was handed', () => {
  const before = sortable.map((t) => t.id)
  sortRows(sortable, 'co')
  assert.deepEqual(sortable.map((t) => t.id), before)
})

// 'ZON' sorting before 'ang' is a code-point artefact — uppercase letters all
// precede lowercase ones — not an order anyone would ask for on a company list.
test('sortRows compares company and category case-insensitively', () => {
  assert.deepEqual(sortRows(sortable, 'co').map((t) => t.co), ['ang', 'MCR', 'ZON'])
  assert.deepEqual(sortRows(sortable, 'cat').map((t) => t.cat), ['Accounting', 'rental', 'Salary'])
})

test('sortRows reverses on desc, and sorts due dates as dates read left to right', () => {
  assert.deepEqual(sortRows(sortable, 'due').map((t) => t.id), [2, 1, 3])
  assert.deepEqual(sortRows(sortable, 'due', 'desc').map((t) => t.id), [3, 1, 2])
})

test('every sort key the menu offers is one sortRows understands', () => {
  for (const o of SORTS) {
    assert.equal(sortRows(sortable, o.k).length, 3, o.k + ' dropped rows')
  }
})

// ---- masterlist forecast ---------------------------------------------------

const fcState = (over = {}) => ({
  recurring: [{ id: 7, co: 'GTOI', cat: 'Rental Expense', freq: 'Monthly', desc: 'Warehouse B monthly rent', dueDate: '2026-09-24', amount: 45000 }],
  txns: [],
  ...over,
})

test('forecast reports a payable due inside the window and not yet generated', () => {
  const out = forecast(fcState(), '2026-09-05')
  assert.equal(out.length, 1)
  assert.equal(out[0].due, '2026-09-24')
  assert.equal(out[0].src, 7, 'the line has to name the payable it came from')
  assert.equal(out[0].month, '2026-09')
})

// A Monthly rule always has an occurrence inside any 30-day window, so the
// horizon has to be tested with a rule that fires exactly once.
test('forecast ignores anything past the 30-day horizon or already behind', () => {
  const once = fcState({
    recurring: [{ id: 8, co: 'GTOI', cat: 'Legal Services', freq: 'Once', desc: 'filing fee', dueDate: '2026-09-24', amount: 1000 }],
  })
  assert.equal(forecast(once, '2026-09-05').length, 1, 'inside the window')
  assert.equal(forecast(once, '2026-08-01').length, 0, 'due date is beyond 30 days')
  assert.equal(forecast(once, '2026-09-25').length, 0, 'due date has passed')
})

/**
 * The whole point of the sync line: it must count exactly what Generate would
 * write. If these two ever disagree the bar says "N due" and pressing Generate
 * produces a different number, which is worse than saying nothing at all.
 */
// Round 14 caught this spec passing for a reason that no longer generalises:
// its fixture was fully priced, so it could not see the zero rule being applied
// to one of the two functions and not the other. An unpriced payable is now in
// the fixture, which is the case that actually broke.
test('forecast and buildGeneratedRows agree even when a payable has no amount', () => {
  const st = {
    recurring: [
      { id: 7, co: 'GTOI', cat: 'Rental Expense', freq: 'Monthly', desc: 'Warehouse B monthly rent', dueDate: '2026-09-24', amount: 45000 },
      { id: 8, co: 'GTOI', cat: 'Legal Services', freq: 'Monthly', desc: 'retainer, amount not set', dueDate: '2026-09-20', amount: 0 },
    ],
    txns: [],
  }
  const due = forecast(st, '2026-09-05')
  const { rows } = buildGeneratedRows(st.recurring, st.txns, '2026-09')
  assert.deepEqual(due.map((x) => x.desc).sort(), rows.map((r) => r.desc).sort(),
    'the sync line must count exactly what Generate would write')
  assert.equal(rows.length, 1, 'the unpriced payable produces nothing')
})

test('forecast and buildGeneratedRows agree on what is missing', () => {
  const st = fcState()
  const due = forecast(st, '2026-09-05')
  const { rows } = buildGeneratedRows(st.recurring, st.txns, '2026-09')
  assert.deepEqual(due.map((x) => x.desc), rows.map((r) => r.desc))

  const after = { ...st, txns: rows }
  assert.equal(forecast(after, '2026-09-05').length, 0, 'generating has to empty the forecast')
})

test('generated rows carry the payable that produced them', () => {
  const { rows } = buildGeneratedRows(fcState().recurring, [], '2026-09')
  assert.equal(rows[0].src, 7)
})

// ---- export summary --------------------------------------------------------

const sumState = (over = {}) => ({
  txns: [{ id: 1, co: 'GTOI', cat: 'Rental Expense', desc: 'rent', period: 'Sep 2026', due: '2026-09-24', amount: 45000, status: 'pending', done: '' }],
  recurring: [], statuses: { pending: true, overdue: true, completed: false, hold: false },
  coFilter: 'All companies', catFilter: 'All categories', search: '', groupBy: 'company',
  sortKey: 'none', sortDir: 'asc', ...over,
})

test('the export summary reports the rows the sheet is showing', () => {
  const html = summaryHTML(sumState(), '2026-09-05')
  assert.match(html, /Tracker summary/)
  assert.match(html, /GTOI/)
  assert.match(html, /Grand total/)
})

// A description is already shown as text rather than markup everywhere else in
// the app; the export writes into a popup with document.write, so it is the one
// place a stored payload could start executing instead.
test('the export summary escapes what a user typed rather than running it', () => {
  const html = summaryHTML(sumState({ search: '<script>alert(1)</script>' }), '2026-09-05')
  assert.ok(!html.includes('<script>'), 'a script tag must not survive into the summary')
  assert.match(html, /&lt;script&gt;/)
})

test('the export summary escapes a company name too, not just the search box', () => {
  const html = summaryHTML(sumState({
    txns: [{ id: 1, co: '<img src=x onerror=1>', cat: 'c', desc: 'd', period: 'p', due: '2026-09-24', amount: 1, status: 'pending', done: '' }],
  }), '2026-09-05')
  assert.ok(!html.includes('<img'), 'a group name must not survive into the summary as markup')
})

// ---- amounts off a form ----------------------------------------------------

// The sign used to be stripped, so a field reading -50 was stored as 50 — the
// screen and the ledger disagreeing with nothing in between to notice. It now
// survives so the callers' `> 0` checks can refuse it.
test('amountOf keeps a negative so it can be rejected, rather than turning it positive', () => {
  assert.equal(amountOf('-50'), -50)
  assert.equal(amountOf('-20'), -20)
  assert.ok(!(amountOf('-50') > 0), 'a negative must fail the positive check every writer applies')
})

test('amountOf still strips the things a person types around a number', () => {
  assert.equal(amountOf('1,050.50'), 1050.5)
  assert.equal(amountOf('₱500'), 500)
  assert.equal(amountOf(' 42 '), 42)
})

test('amountOf reports no number at all as NaN, which is also not > 0', () => {
  assert.ok(Number.isNaN(amountOf('')))
  assert.ok(Number.isNaN(amountOf('abc')))
  assert.ok(!(amountOf('') > 0))
  assert.ok(!(amountOf('0') > 0), 'zero is not an amount either')
})

// Making `amountOf` sign-aware fixed one defect and opened another: seven
// writers tested `!amt`, and -25 is truthy, so a negative could reach the
// ledger where sign-stripping had previously made it impossible. One helper
// carries the guard now, so a new writer inherits it rather than remembering it.
test('positiveAmountOf refuses everything that is not a positive number', () => {
  for (const bad of ['-25', '-0.01', '0', '-0', '', 'abc', '   ']) {
    assert.ok(!positiveAmountOf(bad), JSON.stringify(bad) + ' must not pass as an amount')
  }
})

test('positiveAmountOf keeps a real amount, punctuation and all', () => {
  assert.equal(positiveAmountOf('500'), 500)
  assert.equal(positiveAmountOf('1,050.50'), 1050.5)
  assert.equal(positiveAmountOf('₱42'), 42)
})

// The two are deliberately different: `amountOf` reports the negative so
// intermediate arithmetic can see it, `positiveAmountOf` refuses it so no
// writer can store it.
test('amountOf reports a negative while positiveAmountOf refuses one', () => {
  assert.equal(amountOf('-25'), -25)
  assert.ok(Number.isNaN(positiveAmountOf('-25')))
})

// ---- Generate stays idempotent after a masterlist edit ----------------------

const meralco = { id: 1, co: 'GTOI', cat: 'General Expense', freq: 'Bi-monthly', desc: 'Meralco', dueDate: '2026-09-05', amount: 5000 }

/**
 * The Masterlist pushes an edited description down onto its open Tracker rows.
 * Generate's dedupe key used to include that description, so an edit broke the
 * match and re-running Generate wrote duplicates — real rows, real money, on a
 * multi-occurrence payable where the description also carries a date suffix.
 */
test('re-running Generate after a description edit writes nothing', () => {
  const first = buildGeneratedRows([meralco], [], '2026-09')
  assert.equal(first.rows.length, 2, 'a bi-monthly payable produces two occurrences')

  // exactly what updRec's push-down does: the bare description, suffix gone
  const pushed = first.rows.map((r) => ({ ...r, desc: 'Meralco bill' }))
  const edited = { ...meralco, desc: 'Meralco bill' }

  const second = buildGeneratedRows([edited], pushed, '2026-09')
  assert.equal(second.rows.length, 0, 'nothing may be written twice')
  assert.equal(second.skipped, 2, 'both occurrences must be recognised as already present')
})

test('the sync line agrees with Generate after the same edit', () => {
  const pushed = buildGeneratedRows([meralco], [], '2026-09').rows.map((r) => ({ ...r, desc: 'Meralco bill' }))
  const edited = { ...meralco, desc: 'Meralco bill' }
  assert.equal(forecast({ recurring: [edited], txns: pushed }, '2026-09-01').length, 0,
    'the bar must not report rows that are already on the sheet')
})

// A row generated before `src` existed, or entered by hand, has no parent to
// key on — it must still stop a duplicate.
test('a row with no parent still deduplicates on the original key', () => {
  const legacy = [{ co: 'GTOI', cat: 'General Expense', period: 'Sep 2026', desc: 'Meralco — Sep 05', due: '2026-09-05' }]
  assert.equal(buildGeneratedRows([meralco], legacy, '2026-09').skipped, 1)
})

// ROUND 27, finding 1. `coverageFor` scoped coverage to the month being
// generated with `MON.indexOf(m[1])`, where `m[1]` came from `monthLabel` as
// 'Oct' and `MON` holds 'OCT'. indexOf returned -1 for all twelve months, so
// the scope was silently null and EVERY linked row of that payable — from any
// month — counted as coverage for the month being generated. A monthly payable
// was therefore generated once, ever: month two onward reported "already
// exists" and wrote nothing, on the Generate button and in the unattended
// 22:00 job alike, with the Dashboard and the sync bar agreeing because they
// read the same function. The inverse of finding 78 and worse — that one
// double-billed loudly, this one silently stopped billing.
//
// Deleting the month filter outright left all 191 tests green, because every
// coverage assertion used a single month. These use two.
// The pin that stops finding 1 coming back: `monthKeyOf` is the inverse of
// `monthLabel`, and any drift between them silently unscopes coverage.
// ROUND 31, finding 1. `TAG[r.status]` raw in AckRec.jsx threw
// "Cannot read properties of undefined (reading 'bg')" out of render for any
// status the dropdown does not offer, unmounting the whole application — a
// blank page a reload does not fix, because the same row loads again.
// Telegraphic.jsx had the guard; AckRec.jsx and ui.jsx's Tag did not. One
// helper now, so the three cannot drift apart again.
//
// `public.receipts.status` is text with NO CHECK constraint, so a `<select>` is
// the only thing keeping those four values in range.
test('tagOf never throws, whatever the row carries', () => {
  for (const known of ['completed', 'pending', 'overdue', 'hold', 'released', 'liquidated', 'onhold', 'cancelled']) {
    const t = tagOf(known)
    assert.ok(t.bg && t.fg && t.label, known + ' must keep its own colours')
  }
  for (const rogue of ['archived', 'ARCHIVED', '', null, undefined, 'Liquidated', 0]) {
    const t = tagOf(rogue)
    assert.ok(t && typeof t.bg === 'string' && typeof t.fg === 'string',
      'a chip must always be renderable for ' + JSON.stringify(rogue))
    assert.equal(typeof t.label, 'string')
  }
})

test('tagOf shows the unknown status rather than calling it Pending', () => {
  // Falling back to `pending` was the other option and it is worse: this is a
  // money screen, and a receipt that is actually 'archived' must not be
  // labelled "Pending". Show the raw value so the operator sees the problem.
  assert.equal(tagOf('archived').label, 'archived')
  assert.notEqual(tagOf('archived').label, tagOf('pending').label)
  assert.notEqual(tagOf('archived').bg, tagOf('pending').bg)
  assert.equal(tagOf(null).label, 'Unknown')
  assert.equal(tagOf(undefined).label, 'Unknown')
})

test('tagOf takes any tag map, so the shared Tag component is safe too', () => {
  const custom = { live: { bg: '#fff', fg: '#000', label: 'Live' } }
  assert.deepEqual(tagOf('live', custom), custom.live)
  assert.equal(tagOf('missing', custom).label, 'missing', 'and still cannot throw')
})

test('monthKeyOf round-trips every month label monthLabel can produce', () => {
  for (let m = 1; m <= 12; m++) {
    const key = '2026-' + String(m).padStart(2, '0')
    assert.equal(monthKeyOf(monthLabel(key)), key, key + ' must survive the round trip')
  }
  assert.equal(monthKeyOf('Oct 2026'), '2026-10')
  assert.equal(monthKeyOf('OCT 2026'), '2026-10', 'case is not the caller\'s problem')

  // It throws rather than returning null. Null was the old behaviour and it
  // disabled the caller's month filter instead of stopping.
  assert.throws(() => monthKeyOf('Xyz 2026'), /not a period label/)
  assert.throws(() => monthKeyOf('2026-10'), /not a period label/)
  assert.throws(() => monthKeyOf(''), /not a period label/)
  assert.throws(() => monthKeyOf(undefined), /not a period label/)
})

test('coverage counts only the month being generated, not every month of the payable', () => {
  const p = { id: 7, co: 'GTOI', cat: 'Rent', desc: 'Retainer', amount: 5000, freq: 'Monthly', dueDate: '2026-09-15' }
  const sep = { id: 1, src: 7, occurrenceDue: '2026-09-15', co: 'GTOI', cat: 'Rent', desc: 'Retainer', period: 'Sep 2026', due: '2026-09-15' }

  assert.equal(coverageFor([sep], p, 'Sep 2026').count, 1, 'its own month is covered')
  assert.equal(coverageFor([sep], p, 'Oct 2026').count, 0,
    "September's row must not cover October")
  assert.ok(!coverageFor([sep], p, 'Oct 2026').dues.has('2026-09-15'))

  // Every month, because the bug was in a lookup that failed for all twelve.
  for (const [key, label] of [['2026-01', 'Jan 2026'], ['2026-02', 'Feb 2026'], ['2026-03', 'Mar 2026'],
    ['2026-04', 'Apr 2026'], ['2026-05', 'May 2026'], ['2026-06', 'Jun 2026'], ['2026-07', 'Jul 2026'],
    ['2026-08', 'Aug 2026'], ['2026-09', 'Sep 2026'], ['2026-10', 'Oct 2026'], ['2026-11', 'Nov 2026'],
    ['2026-12', 'Dec 2026']]) {
    const own = { ...sep, occurrenceDue: key + '-15' }
    assert.equal(coverageFor([own], p, label).count, 1, label + ' must cover its own occurrence')
    assert.equal(coverageFor([own], p, 'Sep 2027').count, 0, label + " must not cover another year's month")
  }
})

test('a monthly payable is generated every month, not once ever', () => {
  const p = { id: 7, co: 'GTOI', cat: 'Rent', desc: 'Retainer', amount: 5000, freq: 'Monthly', dueDate: '2026-09-15' }
  let ledger = []
  const written = []
  for (const key of ['2026-09', '2026-10', '2026-11', '2026-12', '2027-01']) {
    const { rows } = buildGeneratedRows([p], ledger, key)
    written.push(rows.length)
    ledger = ledger.concat(rows)
  }
  assert.deepEqual(written, [1, 1, 1, 1, 1], 'each month writes exactly its own occurrence')
  assert.deepEqual(ledger.map((r) => r.occurrenceDue),
    ['2026-09-15', '2026-10-15', '2026-11-15', '2026-12-15', '2027-01-15'])

  // ...and re-running a month it already has still writes nothing.
  assert.equal(buildGeneratedRows([p], ledger, '2026-10').rows.length, 0)
  assert.equal(buildGeneratedRows([p], ledger, '2026-10').skipped, 1)
})

// ROUND 27, mutation M4. Deleting `occurrenceDue: due` from the generated row
// left the whole offline suite green, while in production every generated row
// would violate `txns_generated_occurrence_has_identity` with 23514 and abort
// the batch — including the unattended job.
test('every generated row carries the occurrence it was generated for', () => {
  const semi = { id: 9, co: 'GTOI', cat: 'Rent', desc: 'Twice monthly', amount: 100, freq: 'Bi-monthly', dueDate: '2026-09-05' }
  const { rows } = buildGeneratedRows([semi], [], '2026-09')
  assert.ok(rows.length > 1, 'this rule fires more than once, so identity must be per row')
  for (const r of rows) {
    assert.equal(r.occurrenceDue, r.due, 'identity is the scheduled occurrence at generation time')
    assert.ok(r.occurrenceDue, 'never null: the database CHECK refuses a linked row without one')
  }
  assert.equal(new Set(rows.map((r) => r.occurrenceDue)).size, rows.length, 'and is distinct per row')
})

// ROUND 27, mutation M6. `unresolvedFor` returning [] left the suite green,
// removing the owner's only signal that generation has paused for a payable.
test('unresolvedFor names linked rows that carry no occurrence identity', () => {
  const st = { txns: [
    { id: 1, src: 7, occurrenceDue: '2026-09-15' },
    { id: 2, src: 7 },
    { id: 3, src: null },
  ] }
  assert.deepEqual(unresolvedFor(st).map((t) => t.id), [2])
  assert.deepEqual(unresolvedFor({ txns: [] }), [])
  assert.deepEqual(unresolvedFor(undefined), [])
})

test('coverage keys on the link when there is one, and on shape when there is not', () => {
  const p = { id: 7, co: 'GTOI', cat: 'Rent', desc: 'Retainer', amount: 5000, freq: 'Monthly', dueDate: '2026-09-15' }
  const label = 'Sep 2026'

  // A linked row is accounted for by `coverageFor`, whatever its due date now
  // says — that is the whole of finding 78.
  const linked = { id: 1, src: 7, occurrenceDue: '2026-09-15', co: 'GTOI', cat: 'Rent', desc: 'Retainer', period: label, due: '2026-09-15' }
  assert.equal(coverageFor([linked], p, label).count, 1)
  assert.ok(coverageFor([linked], p, label).dues.has('2026-09-15'))
  assert.equal(coverageFor([{ ...linked, due: '2026-09-20' }], p, label).count, 1,
    'a rescheduled row is still coverage')
  assert.equal(coverageFor([{ ...linked, period: 'Aug 2026' }], p, label).count, 1, 'identity survives an editable period move')
  assert.equal(coverageFor([{ ...linked, src: 99 }], p, label).count, 0, 'nor another payable')

  // `alreadyOnSheet` is now ONLY the legacy path: rows written before
  // `txns.src` existed, matched on the shape they were given.
  const legacy = { id: 2, src: null, co: 'GTOI', cat: 'Rent', desc: 'Retainer', period: label, due: '2026-09-15' }
  assert.equal(alreadyOnSheet([legacy], p, label, '2026-09-15', 'Retainer'), true)
  assert.equal(alreadyOnSheet([legacy], p, label, '2026-09-15', 'Something else'), false)
  assert.equal(alreadyOnSheet([{ ...legacy, period: 'Aug 2026' }], p, label, '2026-09-15', 'Retainer'), false)
  // A row that HAS a link is never matched on shape — two payables sharing a
  // company, category, description and period used to suppress each other.
  assert.equal(alreadyOnSheet([{ ...legacy, src: 99 }], p, label, '2026-09-15', 'Retainer'), false,
    'a linked row belonging to another payable is not this one\'s coverage')
})

// ---- fortnightly means fortnightly -----------------------------------------

/**
 * Weekly and Bi-weekly shared a branch that found the first matching weekday of
 * each month and stepped from there. Correct for 7 days, wrong for 14: the
 * phase reset every month, so the anchor date itself was never generated and a
 * 7-day gap appeared at month boundaries — "every other Friday" became weekly
 * for one cycle.
 */
test('a bi-weekly payable keeps a 14-day cadence across month boundaries', () => {
  const p = { id: 1, freq: 'Bi-weekly', dueDate: '2026-09-11', amount: 1 }
  const dates = ['2026-09', '2026-10', '2026-11', '2026-12'].flatMap((k) => occurrences(p, k))

  assert.ok(dates.includes('2026-09-11'), 'the date the owner entered must be generated')
  const gaps = dates.slice(1).map((d, i) => (Date.parse(d) - Date.parse(dates[i])) / 86400000)
  assert.deepEqual([...new Set(gaps)], [14], 'every gap must be a fortnight: ' + gaps.join(','))
})

test('a weekly payable is still weekly, and still includes its anchor', () => {
  const p = { id: 1, freq: 'Weekly', dueDate: '2026-09-11', amount: 1 }
  const dates = ['2026-09', '2026-10'].flatMap((k) => occurrences(p, k))
  assert.ok(dates.includes('2026-09-11'))
  const gaps = dates.slice(1).map((d, i) => (Date.parse(d) - Date.parse(dates[i])) / 86400000)
  assert.deepEqual([...new Set(gaps)], [7], 'every gap must be a week: ' + gaps.join(','))
})

// ---- the forecast horizon follows its caller -------------------------------

/**
 * `forecast` was written for the Tracker's fixed 30-day sync line and then
 * reused by the Dashboard, whose window the owner sets to 7, 30 or 90 days. The
 * horizon was hard-coded, so under "Next 90 days" the Tracker-row half of the
 * deadline list honoured the setting while the masterlist half silently stopped
 * at 30 — the exact gap the feature exists to close, still open for two thirds
 * of the widest window.
 */
const monthlyOn20th = {
  recurring: [{ id: 1, co: 'GTOI', cat: 'Rental Expense', freq: 'Monthly', desc: 'rent', dueDate: '2026-09-20', amount: 1 }],
  txns: [],
}

test('forecast reaches as far as the window it is given', () => {
  const due = (days) => forecast(monthlyOn20th, '2026-09-05', days).map((x) => x.due)
  assert.deepEqual(due(7), [], 'nothing falls inside a week')
  assert.deepEqual(due(30), ['2026-09-20'])
  assert.deepEqual(due(90), ['2026-09-20', '2026-10-20', '2026-11-20'],
    'a 90-day window must not stop at 30')
})

test('forecast still defaults to the 30 days the Tracker sync line promises', () => {
  assert.deepEqual(forecast(monthlyOn20th, '2026-09-05').map((x) => x.due), ['2026-09-20'])
})

// The month scan has to widen with the horizon, or the far end of a long window
// is empty however generous the date comparison is.
test('the month scan widens with the horizon, so the far end is not silently empty', () => {
  // A yearly payable has exactly one occurrence, four months out. It is only
  // reachable if the scan follows the horizon rather than stopping at three
  // months — which is what the old fixed `slice(0, 3)` did.
  const yearly = {
    recurring: [{ id: 1, co: 'GTOI', cat: 'Rental Expense', freq: 'Yearly', desc: 'insurance', dueDate: '2025-12-20', amount: 1 }],
    txns: [],
  }
  assert.deepEqual(forecast(yearly, '2026-09-05', 30).map((x) => x.due), [],
    'nothing is due inside a month')
  assert.deepEqual(forecast(yearly, '2026-09-05', 120).map((x) => x.due), ['2026-12-20'],
    'a due date four months out must be reachable at a 120-day horizon')
})

// ---- a payable with no amount is not a Tracker row -------------------------

/**
 * `recurring.amount >= 0` and `txns.amount > 0` are both real constraints
 * (D65), and they disagree about zero on purpose: 0 means "not decided yet" on
 * a payable, and is never a legal state for a row on the ledger. The generator
 * used to emit it anyway, so one cleared Amount field would make Postgres
 * refuse the whole batch with 23514 — in the browser and in the unattended
 * 22:00 job alike.
 */
test('a payable with no amount yet generates nothing, rather than a row the ledger refuses', () => {
  const priced = { id: 1, co: 'GTOI', cat: 'Rental Expense', freq: 'Monthly', desc: 'rent', dueDate: '2026-09-24', amount: 45000 }
  const unpriced = { id: 2, co: 'GTOI', cat: 'Legal Services', freq: 'Monthly', desc: 'retainer', dueDate: '2026-09-20', amount: 0 }

  const { rows } = buildGeneratedRows([priced, unpriced], [], '2026-09')
  assert.equal(rows.length, 1, 'only the priced payable may produce a row')
  assert.equal(rows[0].cat, 'Rental Expense')
  assert.ok(rows.every((r) => r.amount > 0), 'every generated amount must satisfy txns_amount_positive')
})

test('a negative payable amount is treated the same way', () => {
  const bad = { id: 3, co: 'GTOI', cat: 'Other', freq: 'Monthly', desc: 'x', dueDate: '2026-09-10', amount: -5 }
  assert.equal(buildGeneratedRows([bad], [], '2026-09').rows.length, 0)
})

// ---- one rule for "this payable has no amount yet" -------------------------

/**
 * Five places encoded this idea and drifted apart across two rounds: the
 * generator skipped an unpriced payable, `forecast` did not, `generate` blocked
 * on a whole-masterlist scan, the scheduler reported them for months they were
 * never candidates in, and the sync line announced "in sync" while one sat
 * unwritable. `unpricedFor` is the single rule they now all ask.
 */
const monthlyUnpriced = { id: 1, co: 'GTOI', cat: 'Legal Services', freq: 'Monthly', desc: 'retainer', dueDate: '2026-09-20', amount: 0 }
const yearlyUnpriced = { id: 2, co: 'GTOI', cat: 'Other', freq: 'Yearly', desc: 'insurance', dueDate: '2025-12-20', amount: 0 }
const priced = { id: 3, co: 'GTOI', cat: 'Rental Expense', freq: 'Monthly', desc: 'rent', dueDate: '2026-09-24', amount: 45000 }

test('unpricedFor names only payables that are actually due in the month asked about', () => {
  assert.deepEqual(unpricedFor([monthlyUnpriced, yearlyUnpriced, priced], '2026-09').map((p) => p.id), [1],
    'the December yearly payable is not a September candidate')
  assert.deepEqual(unpricedFor([monthlyUnpriced, yearlyUnpriced, priced], '2026-12').map((p) => p.id).sort(), [1, 2])
})

test('unpricedFor ignores a priced payable, however it is written', () => {
  assert.deepEqual(unpricedFor([priced], '2026-09'), [])
  assert.deepEqual(unpricedFor([{ ...priced, amount: '45000' }], '2026-09'), [], 'a numeric string is an amount')
  assert.deepEqual(unpricedFor([{ ...priced, amount: -1 }], '2026-09').map((p) => p.id), [3], 'a negative is not')
})

// The whole point of scoping: an unpriced Monthly payable has an occurrence in
// EVERY month, so an unscoped rule blocks or mis-reports all of them.
test('an unpriced Monthly payable is a candidate every month, which is why scope matters', () => {
  for (const m of ['2026-09', '2026-10', '2026-11']) {
    assert.equal(unpricedFor([monthlyUnpriced], m).length, 1, m + ' must see it')
  }
  assert.equal(unpricedFor([yearlyUnpriced], '2026-09').length, 0,
    'a yearly December payable must not be reported during September')
})

// Generate must still be able to write the priced siblings alongside it.
test('an unpriced payable does not stop its priced siblings being generated', () => {
  const { rows } = buildGeneratedRows([monthlyUnpriced, priced], [], '2026-09')
  assert.equal(rows.length, 1)
  assert.equal(rows[0].desc, 'rent')
  assert.ok(rows.every((r) => r.amount > 0))
})

test('pushable stops a mid-edit value travelling onto linked Tracker rows', () => {
  // amount: the database refuses 0 with a CHECK, so this one was already guarded
  assert.equal(pushable('amount', 500), true)
  assert.equal(pushable('amount', 0), false)
  assert.equal(pushable('amount', -1), false)
  // description: `txns.description` is `not null default ''` and accepts a
  // blank silently, so an unguarded clear wrote '' onto live rows and the
  // toast claimed they matched.
  assert.equal(pushable('desc', 'Retainer'), true)
  assert.equal(pushable('desc', ''), false)
  assert.equal(pushable('desc', '   '), false)
  assert.equal(pushable('desc', undefined), false)
  assert.equal(pushable('desc', null), false)
  assert.equal(pushable('co', 'GTOI'), true)
  assert.equal(pushable('cat', ''), false)
})

// Round 20: `pushable` was extracted and tested, and `updRec` could still be
// edited to stop consulting it with the whole suite green. These pin the whole
// decision, not one input to it.
test('pushPlan refuses to push a mid-edit value and gives the caller the patch', () => {
  const good = pushPlan('amount', 500)
  assert.equal(good.column, 'amount')
  assert.equal(good.retract, false)
  assert.deepEqual(good.patch, { amount: 500 })

  // Cleared to 0: nothing may travel, AND the write the last keystroke armed
  // must be cancelled or it fires with the value the user took back (D67).
  const cleared = pushPlan('amount', 0)
  assert.equal(cleared.patch, null)
  assert.equal(cleared.retract, true, 'the armed push must be retracted')

  // The state key and the column differ. A caller that built this itself wrote
  // `{ desc: … }` — a column that does not exist — with every test green.
  assert.deepEqual(pushPlan('desc', 'Retainer').patch, { description: 'Retainer' })
  assert.equal(pushPlan('desc', '').patch, null, 'a cleared description never travels')
  assert.equal(pushPlan('desc', '').retract, true)

  // A field that does not travel: nothing to write, and nothing to retract.
  const untravelled = pushPlan('freq', 'Monthly')
  assert.equal(untravelled.column, undefined)
  assert.equal(untravelled.patch, null)
  assert.equal(untravelled.retract, false)
})

// The PNG export and the Tracker screen each had their own copy of this.
// Identical today, but the export claims to summarise what the screen shows,
// so a drift between them would be a lie nobody would notice.
test('groupKey is the one rule the export and the screen share', () => {
  const row = { co: 'GTOI', cat: 'Legal Services' }
  assert.equal(groupKey('company')(row), 'GTOI')
  assert.equal(groupKey('category')(row), 'Legal Services')
  assert.equal(groupKey(undefined)(row), 'Legal Services', 'anything but company groups by category')
})

// Round 23 landed three mutations inside `updRec` that the whole suite passed,
// because `actions.js` imports React and nothing offline can reach it. These
// pin the part that decides what actually gets stored.
test('recValue keeps a half-typed or negative amount out of the ledger', () => {
  assert.equal(recValue('amount', '500'), 500)
  assert.equal(recValue('amount', ''), 0, 'a cleared field is 0, not NaN')
  assert.equal(recValue('amount', 'abc'), 0, 'and so is nonsense')
  assert.equal(recValue('amount', '-5'), 0, 'a negative must not survive — it pushes down')
  assert.equal(recValue('amount', '-0.01'), 0)
  assert.equal(recValue('amount', '1,250.50'), 1250.5, 'thousands separators are ordinary typing')
  // Every other field is stored as typed.
  assert.equal(recValue('desc', '  Retainer '), '  Retainer ')
  assert.equal(recValue('co', 'GTOI'), 'GTOI')
})

test('editRecurring stores the sanitised value, never the raw input', () => {
  const row = { id: 7, co: 'GTOI', amount: 100, desc: 'Retainer' }
  assert.deepEqual(editRecurring(row, 'amount', '-5'), { ...row, amount: 0 })
  assert.deepEqual(editRecurring(row, 'amount', '250'), { ...row, amount: 250 })
  assert.deepEqual(editRecurring(row, 'desc', 'Fuel'), { ...row, desc: 'Fuel' })
  assert.equal(typeof editRecurring(row, 'amount', '250').amount, 'number',
    'a string would reach a numeric column')
})

// The Masterlist Amount field is controlled from the stored row, and the store
// holds a number. Typing `1250.50` meant the `.` parsed to 1250, state did not
// change, React restored `"1250"`, and the next keys produced 125050 — a
// hundredfold payable that then pushed down onto the linked Tracker rows.
test('draftText shows what is being typed, not what is stored', () => {
  const draft = { id: 7, k: 'amount', text: '1250.' }
  assert.equal(draftText(draft, 7, 'amount', 1250), '1250.', 'the half-typed decimal survives')
  assert.equal(draftText(draft, 7, 'desc', 'Retainer'), 'Retainer', 'another field on the same row is unaffected')
  assert.equal(draftText(draft, 9, 'amount', 400), '400', 'and so is the same field on another row')
  assert.equal(draftText(null, 7, 'amount', 1250), '1250', 'no draft, show the stored value')
  assert.equal(draftText(undefined, 7, 'amount', 0), '0', 'zero renders, it is not blank')
  assert.equal(draftText(null, 7, 'desc', undefined), '', 'and a missing value is empty, never "undefined"')
})

// Round 25, and the worst defect the loop produced: `alreadyOnSheet` matched a
// linked row by exact due date — the same key as the D63 unique index — so the
// index could not catch what the index and the client agreed to disagree about.
// Move a generated row's due date and the occurrence looked missing again, so
// the unattended 22:00 job re-created it: one bill, twice the liability,
// reported as "Added 1 payable(s)".
test('a rescheduled generated row is not generated again', () => {
  const p = { id: 7, co: 'GTOI', cat: 'Rent', desc: 'Retainer', amount: 5000, freq: 'Monthly', dueDate: '2026-09-15' }
  const gen = { id: 1, src: 7, occurrenceDue: '2026-09-15', co: 'GTOI', cat: 'Rent', desc: 'Retainer', period: 'Sep 2026', due: '2026-09-15', amount: 5000, status: 'pending' }

  assert.equal(buildGeneratedRows([p], [gen], '2026-09').rows.length, 0, 'untouched: nothing to add')

  // The owner moves the Tracker row to the 20th.
  assert.equal(buildGeneratedRows([p], [{ ...gen, due: '2026-09-20' }], '2026-09').rows.length, 0,
    'a row that moved still covers the occurrence it came from')

  // The owner moves the payable's own due date instead.
  assert.equal(buildGeneratedRows([{ ...p, dueDate: '2026-09-20' }], [gen], '2026-09').rows.length, 0,
    'and so does the row, when the payable is what moved')

  assert.equal(buildGeneratedRows([p], [], '2026-09').rows.length, 1, 'nothing on the sheet: generate it')
  assert.equal(buildGeneratedRows([p], [{ ...gen, src: null }], '2026-09').rows.length, 0,
    'a legacy row with no link is still matched on its shape')
})

test('coverage is per payable per period, so a partial month still fills in', () => {
  const bi = { id: 7, co: 'GTOI', cat: 'Rent', desc: 'Fee', amount: 100, freq: 'Bi-weekly', dueDate: '2026-09-01' }
  const all = buildGeneratedRows([bi], [], '2026-09').rows
  assert.ok(all.length >= 2, 'a bi-weekly payable has several occurrences in a month')

  // One of them exists and has been rescheduled to a date no occurrence uses.
  const one = { ...all[0], src: 7, occurrenceDue: all[0].due, period: 'Sep 2026', due: '2026-09-29' }
  const rest = buildGeneratedRows([bi], [one], '2026-09')
  assert.equal(rest.rows.length, all.length - 1, 'the rest are still generated')
  assert.equal(rest.skipped, 1, 'and exactly one is counted as covered')

  // Another payable's rows never count as coverage for this one.
  assert.equal(buildGeneratedRows([bi], [{ ...one, src: 99 }], '2026-09').rows.length, all.length)
  // Nor do rows in another period.
  const stale = buildGeneratedRows([bi], [{ ...one, occurrenceDue: null, period: 'Aug 2026' }], '2026-09')
  assert.equal(stale.rows.length, 0, 'a stale linked row blocks generation rather than guessing a month')
  assert.equal(stale.unresolved.length, 1, 'the scheduler can report the unresolved identity')
})
