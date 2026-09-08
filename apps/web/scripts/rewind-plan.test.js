import assert from 'node:assert/strict'
import test from 'node:test'
import { PK, lit, planRewind, toSql } from './rewind-plan.js'

const e = (id, tbl, op, before, after, at = '2026-09-02T02:00:00Z') =>
  ({ id, tbl, op, before, after, at, actor_email: 'someone@example.com' })

test('a row inserted after the cut is deleted, not restored', () => {
  const { steps } = planRewind([e(1, 'txns', 'INSERT', null, { id: 7, amount: 5 })])
  assert.equal(steps.length, 1)
  assert.equal(steps[0].action, 'delete')
  assert.equal(steps[0].key, 7)
  assert.equal(steps[0].before, null)
})

test('a row deleted after the cut is restored from before', () => {
  const { steps } = planRewind([e(1, 'txns', 'DELETE', { id: 7, amount: 5 }, null)])
  assert.equal(steps[0].action, 'restore')
  assert.deepEqual(steps[0].before, { id: 7, amount: 5 })
})

test('only the oldest entry for a row counts, however many followed', () => {
  // Edited three times and then deleted: the state at the cut is the `before`
  // of the FIRST entry after it, and one statement puts it back.
  const { steps } = planRewind([
    e(3, 'txns', 'UPDATE', { id: 7, amount: 2 }, { id: 7, amount: 3 }),
    e(1, 'txns', 'UPDATE', { id: 7, amount: 0 }, { id: 7, amount: 1 }),
    e(4, 'txns', 'DELETE', { id: 7, amount: 3 }, null),
    e(2, 'txns', 'UPDATE', { id: 7, amount: 1 }, { id: 7, amount: 2 }),
  ])
  assert.equal(steps.length, 1)
  assert.deepEqual(steps[0].before, { id: 7, amount: 0 })
})

test('a row created after the cut and then deleted still ends up deleted', () => {
  const { steps } = planRewind([
    e(1, 'txns', 'INSERT', null, { id: 9 }),
    e(2, 'txns', 'DELETE', { id: 9 }, null),
  ])
  assert.equal(steps.length, 1)
  assert.equal(steps[0].action, 'delete')
})

test('entries are grouped per table, so two tables give two steps', () => {
  const { steps, tables } = planRewind([
    e(1, 'txns', 'INSERT', null, { id: 1 }),
    e(2, 'transfers', 'DELETE', { id: 2, cur: 'EUR' }, null),
  ])
  assert.equal(steps.length, 2)
  assert.deepEqual(tables, { txns: { delete: 1, restore: 0 }, transfers: { delete: 0, restore: 1 } })
})

test('profiles is keyed on user_id, and app_config on its boolean id', () => {
  assert.equal(PK.profiles, 'user_id')
  assert.equal(PK.app_config, 'id')
  const { steps } = planRewind([
    e(1, 'profiles', 'DELETE', { user_id: 'abc-123', role: 'admin' }, null),
    e(2, 'app_config', 'UPDATE', { id: true, data: {} }, { id: true, data: { a: 1 } }),
  ])
  assert.equal(steps[0].key, 'abc-123')
  assert.equal(steps[1].key, true)
})

test('an unrecognised table is reported, never guessed at', () => {
  const { steps, unknown } = planRewind([e(1, 'somewhere_else', 'INSERT', null, { id: 1 })])
  assert.equal(steps.length, 0)
  assert.deepEqual(unknown, ['somewhere_else'])
})

test('literals quote text and leave numbers and booleans bare', () => {
  assert.equal(lit(5), '5')
  assert.equal(lit(true), 'true')
  assert.equal(lit(null), 'null')
  assert.equal(lit("O'Brien"), "'O''Brien'")
})

test('the generated script disables the triggers it touches and turns them back on', () => {
  const plan = planRewind([e(1, 'txns', 'DELETE', { id: 7 }, null)])
  const sql = toSql(plan, { since: '2026-09-02T01:00:00Z', generatedAt: '2026-09-02T09:00:00Z' })
  assert.match(sql, /alter table public\.txns disable trigger txns_audit;/)
  assert.match(sql, /alter table public\.txns enable trigger txns_audit;/)
  assert.match(sql, /^begin;$/m)
  assert.match(sql, /^commit;$/m)
  // The restore has to put the whole row back, not just the columns that moved.
  assert.match(sql, /jsonb_populate_record\(null::public\.txns/)
  // And it writes exactly one row into the log, not one per undo.
  assert.equal(sql.match(/insert into public\.audit_log/g).length, 1)
})

test('a delete step emits no insert', () => {
  const plan = planRewind([e(1, 'txns', 'INSERT', null, { id: 7 })])
  const sql = toSql(plan, { since: 'x', generatedAt: 'y' })
  assert.match(sql, /delete from public\.txns where id = 7;/)
  assert.equal(sql.includes('jsonb_populate_record(null::public.txns'), false)
})

test('identity-aware rewinds refuse linked pre-migration images', () => {
  const entry = e(1, 'txns', 'DELETE', { id: 7, src: 3, due: '2026-09-20' }, null)
  assert.throws(() => planRewind([entry], { occurrenceIdentity: true }), /pre-migration schema|occurrence mapping/)
  assert.equal(planRewind([entry]).steps.length, 1)
})

test('identity-aware rewinds may delete a linked post-migration insert', () => {
  const entry = e(1, 'txns', 'INSERT', null, { id: 7, src: 3 })
  assert.equal(planRewind([entry], { occurrenceIdentity: true }).steps[0].action, 'delete')
})

// ROUND 39. Every value interpolated into a `--` comment reaches a file an
// operator applies as `postgres`. A newline in one would end the comment and put
// the remainder on a live line. `actor_email` is validated by GoTrue before it
// reaches `auth.users`, so this was never a live path — but this file's whole
// purpose is that a human runs its output against real money, and "the other
// system validates it" is exactly the assumption that stops being true quietly.
test('no value can break out of a comment line into executable SQL', () => {
  const entries = [{
    id: 9, tbl: 'txns', op: 'UPDATE', row_id: 1,
    before: { id: 1, amount: 10 }, after: { id: 1, amount: 20 },
    at: '2026-09-08T00:00:00Z',
    actor_email: 'a@b.com\ndrop table public.txns; --',
  }]
  const sql = toSql(planRewind(entries), { since: '2026-09-07T00:00:00Z', generatedAt: '2026-09-08T00:00:00Z' })
  const lines = sql.split('\n')

  for (const line of lines) {
    const code = line.trim()
    if (!code || code.startsWith('--')) continue
    assert.ok(!/drop table/i.test(code),
      'a newline in an audited value must not reach a live line: ' + code)
  }
  // And the text is still there, on the comment, flattened rather than dropped.
  assert.ok(sql.includes('a@b.com drop table public.txns; --'),
    'the value is preserved for the reader, just made harmless')
})
