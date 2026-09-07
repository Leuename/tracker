import test from 'node:test'
import assert from 'node:assert/strict'
import { keyFor, nextCursor, planPage } from './backup-plan.js'

test('ordinary tables use declared keyset paging', () => {
  assert.deepEqual(planPage('txns', { cursor: 4, page: 2 }), { mode: 'keyset', key: 'id', order: [{ column: 'id', ascending: true }], cursor: 4, gt: 4, limit: 2 })
  assert.equal(nextCursor([{ id: 5 }], 'id', 4), 5)
  assert.throws(() => nextCursor([{ id: 4 }], 'id', 4), /did not advance/)
  assert.throws(() => nextCursor([{ id: 4 }, { id: 4 }], 'id', 3), /did not advance/)
})

test('unknown tables refuse and FX uses stable ordering', () => {
  assert.throws(() => keyFor('new_table'), /no paging key/)
  assert.deepEqual(planPage('fx_rates', { from: 100, page: 3 }), { mode: 'range', order: [{ column: 'as_of', ascending: true }, { column: 'cur', ascending: true }], from: 100, to: 102 })
})
