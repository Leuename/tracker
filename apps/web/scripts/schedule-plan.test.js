import test from 'node:test'
import assert from 'node:assert/strict'
import { classifySchedule, formatScheduleOutcome } from './schedule-plan.js'

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
