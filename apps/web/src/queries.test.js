import test from 'node:test'
import assert from 'node:assert/strict'
import { deleteGeneratedTxns, pushDownTxns } from './queries.js'

/**
 * Records the PostgREST chain instead of issuing it.
 *
 * These two builders reach many rows of a shared ledger holding real money,
 * and until round 22 nothing exercised them: both of `patchTxns`'s filters
 * could be deleted with the whole suite green, which turns one keystroke in a
 * masterlist Amount field into an unfiltered UPDATE across every transaction.
 */
const recorder = () => {
  const calls = []
  const chain = new Proxy({}, {
    get: (_, name) => (...args) => { calls.push([name, ...args]); return chain },
  })
  const from = (table) => { calls.push(['from', table]); return chain }
  from.calls = calls
  from.filters = () => calls.filter(([n]) => ['eq', 'neq', 'in', 'is'].includes(n))
  return from
}

test('a push-down writes only the payable’s own rows, and only unpaid ones', () => {
  const from = recorder()
  pushDownTxns(from, { amount: 500 }, 7)

  assert.deepEqual(from.calls[0], ['from', 'txns'])
  assert.deepEqual(from.calls[1], ['update', { amount: 500 }])
  // Both filters, or the write reaches rows it has no business touching.
  assert.deepEqual(from.filters(), [
    ['eq', 'src', 7],
    ['neq', 'status', 'completed'],
  ], 'scoped to this payable, and never to a row already paid')
  // The WHOLE call, not just its first argument. `select('id', { head: true })`
  // makes PostgREST return no representation, so `written` comes back empty:
  // the rows change in the ledger, the screen never repaints and no toast
  // fires. The caller's correctness depends on the return shape as much as on
  // the filters.
  assert.deepEqual(from.calls.filter(([n]) => n === 'select'), [['select', 'id']],
    'exactly one select, for the ids, with no options that suppress the rows')
})

test('the push-down is never issued unscoped', () => {
  const from = recorder()
  pushDownTxns(from, { description: 'Retainer' }, 42)
  const names = from.calls.map(([n]) => n)
  assert.ok(names.includes('eq'), 'an UPDATE with no src filter would rewrite the whole ledger')
  assert.ok(names.includes('neq'), 'and one with no status filter would rewrite settled rows')
})

test('undo deletes the ids it names, and refuses anything paid', () => {
  const from = recorder()
  deleteGeneratedTxns(from, [1, 2, 3])

  assert.deepEqual(from.calls[1], ['delete'])
  assert.deepEqual(from.filters(), [
    ['in', 'id', [1, 2, 3]],
    ['neq', 'status', 'completed'],
    ['is', 'done', null],
  ], 'undo promises to keep anything already paid — twice over')
  assert.deepEqual(from.calls.filter(([n]) => n === 'select'), [['select', 'id']],
    'undo repaints from what the database actually removed, so it must be returned')
})

// Round 23: `select('id', { head: true })` passed every assertion while making
// both builders return nothing. On a push-down that means the ledger changes
// and the screen does not; on undo it means `undoGenerate` leaves deleted rows
// on screen and flashes "0 removed — N left in place, they changed in another
// session" about rows the database did delete.
test('neither builder may suppress the rows it returns', () => {
  for (const build of [
    (from) => pushDownTxns(from, { amount: 1 }, 7),
    (from) => deleteGeneratedTxns(from, [1]),
  ]) {
    const from = recorder()
    build(from)
    const selects = from.calls.filter(([n]) => n === 'select')
    assert.equal(selects.length, 1, 'one select')
    assert.equal(selects[0].length, 2, 'and no options argument — head:true returns no rows')
  }
})

// Round 24: the recorder inspected `calls[0]`, `calls[1]`, the filter subset and
// `select`. Anything APPENDED was invisible — `.single()` makes `written` an
// object so `written.length` is undefined and every push-down is swallowed
// silently; `.limit(1)` updates one linked row instead of all of them. So pin
// the whole chain, exactly, and let an addition fail until someone justifies it.
test('the whole chain is pinned, so nothing can be appended unnoticed', () => {
  const push = recorder()
  pushDownTxns(push, { amount: 500 }, 7)
  assert.deepEqual(push.calls, [
    ['from', 'txns'],
    ['update', { amount: 500 }],
    ['eq', 'src', 7],
    ['neq', 'status', 'completed'],
    ['select', 'id'],
  ], 'no .single(), no .limit(), no .order() — each one changes what the caller gets')

  const del = recorder()
  deleteGeneratedTxns(del, [1, 2])
  assert.deepEqual(del.calls, [
    ['from', 'txns'],
    ['delete'],
    ['in', 'id', [1, 2]],
    ['neq', 'status', 'completed'],
    ['is', 'done', null],
    ['select', 'id'],
  ])
})
