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
