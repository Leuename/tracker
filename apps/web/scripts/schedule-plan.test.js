import test from 'node:test'
import assert from 'node:assert/strict'
import { classifySchedule, formatScheduleOutcome, formatScheduleReport } from './schedule-plan.js'

test('classifies the finite scheduler outcomes', () => {
  assert.equal(classifySchedule({}).at(0).outcome, 'not-due')
  assert.equal(classifySchedule({ recurring: [{}], dueCount: 0 }).at(0).outcome, 'not-due')
  assert.equal(classifySchedule({ recurring: [{}], rows: [{ id: 1 }] }).at(0).outcome, 'generated')
  assert.equal(classifySchedule({ recurring: [{}], dueCount: 1, skipped: 1 }).at(0).outcome, 'covered')
  assert.equal(classifySchedule({ recurring: [{}], unpriced: [{}] }).at(0).outcome, 'unpriced')
  assert.equal(classifySchedule({ recurring: [{}], unresolved: [{}] }).at(0).outcome, 'unresolved-identity')
  assert.equal(classifySchedule({ error: { code: '23505' } })[0].outcome, 'concurrent-23505')
  assert.equal(classifySchedule({ error: { code: '23514' } })[0].outcome, 'contract-23514')
  assert.equal(classifySchedule({ error: new Error('nope') })[0].outcome, 'failed')
  assert.match(formatScheduleOutcome([{ outcome: 'covered', count: 2 }], 'Sep 2026')[0], /already exists/)
})

test('unpriced and unresolved identities are both reported', () => {
  const out = classifySchedule({ recurring: [{}], dueCount: 1, unpriced: [{ id: 1 }], unresolved: [{ id: 2 }] })
  assert.deepEqual(out.map((x) => x.outcome), ['unpriced', 'unresolved-identity'])
})

test('a concurrent failure never reports attempted rows as generated', () => {
  const out = classifySchedule({ recurring: [{}], dueCount: 1, rows: [{ id: 1 }], error: { code: '23505' }, unresolved: [{ id: 2 }] })
  assert.deepEqual(out.map((x) => x.outcome), ['concurrent-23505', 'unresolved-identity'])
  assert.equal(formatScheduleOutcome(out, 'Sep 2026').some((line) => /Added/.test(line)), false)
})

// ROUND 27, finding 4. `schedule.mjs` said "Added N payable(s)" itself and then
// let the classifier say it again, so the job summary carried the line twice.
// The classifier owns the summary now, which means it also has to carry the
// skipped count that the hand-written line used to be the only source of.
test('a generated run reports itself once, and says what it skipped', () => {
  const out = classifySchedule({ recurring: [{}], dueCount: 3, rows: [{ id: 1 }, { id: 2 }], skipped: 4 })
  assert.deepEqual(out.map((x) => x.outcome), ['generated'])

  const lines = formatScheduleOutcome(out, 'Sep 2026')
  assert.equal(lines.filter((l) => /Added/.test(l)).length, 1, 'exactly one summary line')
  assert.match(lines[0], /Added 2 payable\(s\) for Sep 2026, skipping 4 already there\./)

  // Nothing skipped reads cleanly rather than "skipping 0".
  assert.match(formatScheduleOutcome(classifySchedule({ recurring: [{}], rows: [{ id: 1 }] }), 'Sep 2026')[0],
    /^- Added 1 payable\(s\) for Sep 2026\.$/)
  assert.match(formatScheduleOutcome(classifySchedule({ recurring: [{}], rows: [{ id: 1 }], skipped: 2 }), 'Sep 2026', { dryRun: true })[0],
    /^- Would add 1 payable\(s\) for Sep 2026, skipping 2 already there\.$/)
})

// ROUND 28, finding 3. Removing the duplicated summary left the two callers
// printing in different orders: the dry run said summary-then-rows, the live
// 22:00 job said rows-then-summary. `schedule.mjs` is not in `npm test`, so the
// order was untestable where it lived. It lives here now.
test('the report puts its summary before the rows it describes, on both paths', () => {
  const rows = [
    { co: 'GTOI', cat: 'Rent', desc: 'Retainer', due: '2026-09-15' },
    { co: 'ANG', cat: 'Rent', desc: 'Warehouse', due: '2026-09-20' },
  ]
  const outcome = classifySchedule({ recurring: [{}], dueCount: 2, rows, skipped: 1 })

  for (const dryRun of [false, true]) {
    const lines = formatScheduleReport(outcome, 'Sep 2026', rows, { dryRun })
    assert.equal(lines.length, 3, 'one summary and one line per row')
    assert.match(lines[0], /^- (Added|Would add) 2 payable\(s\)/, 'summary first')
    assert.match(lines[1], /^ {2}- GTOI · Rent · Retainer · due 2026-09-15$/)
    assert.match(lines[2], /^ {2}- ANG · Rent · Warehouse · due 2026-09-20$/)
    assert.equal(lines.filter((l) => /payable\(s\)/.test(l)).length, 1, 'and says it once')
  }

  // A run that wrote nothing must not list rows it did not write. `schedule.mjs`
  // passes `detail: generated`, which is false when the insert threw.
  assert.deepEqual(formatScheduleReport(outcome, 'Sep 2026', rows, { detail: false }).length, 1)
  assert.deepEqual(formatScheduleReport(outcome, 'Sep 2026', []).length, 1)
})

// ROUND 29, finding 3. A run is routinely more than one outcome — `generated`
// plus `unpriced`, say — and appending the rows to the end of the whole report
// hung them under "have no amount and were skipped". The rows belong to the
// line that describes them.
test('the rows hang off the generated line, not the last line of the report', () => {
  const rows = [{ co: 'GTOI', cat: 'Rent', desc: 'Retainer', due: '2026-09-15' }]
  const outcome = classifySchedule({
    recurring: [{}, {}], dueCount: 2, rows, skipped: 0, unpriced: [{ id: 1 }],
  })
  assert.deepEqual(outcome.map((x) => x.outcome), ['generated', 'unpriced'])

  const lines = formatScheduleReport(outcome, 'Sep 2026', rows)
  assert.equal(lines.length, 3)
  assert.match(lines[0], /^- Added 1 payable\(s\)/)
  assert.match(lines[1], /^ {2}- GTOI · Rent · Retainer · due 2026-09-15$/)
  assert.match(lines[2], /have no amount and were skipped/)
  // Positional, not `indexOf(find(...))`: that returns -1 when no detail row
  // exists at all, and -1 < anything passes vacuously — a pin that cannot fail.
  const detailAt = lines.findIndex((l) => /^ {2}- /.test(l))
  const unrelatedAt = lines.findIndex((l) => /no amount/.test(l))
  assert.notEqual(detailAt, -1, 'there must BE a detail row for this assertion to mean anything')
  assert.notEqual(unrelatedAt, -1)
  assert.ok(detailAt < unrelatedAt, 'the detail must precede the unrelated outcome, not hang under it')

  // Unresolved identity is the other multi-outcome shape.
  const both = classifySchedule({ recurring: [{}, {}], dueCount: 2, rows, unresolved: [{ id: 9 }] })
  const bothLines = formatScheduleReport(both, 'Sep 2026', rows)
  assert.match(bothLines[0], /^- Added 1 payable\(s\)/)
  assert.match(bothLines[1], /^ {2}- GTOI/)
  assert.match(bothLines[2], /no occurrence identity/)
})
