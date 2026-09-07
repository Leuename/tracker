import test from 'node:test'
import assert from 'node:assert/strict'
import { createPending, DELAY, pageAll, pushKey } from './pending.js'

// Fake timers, so the tests describe cancellation rather than wait for it.
const fake = () => {
  let now = 0
  let seq = 0
  const jobs = new Map()
  const set = (fn, ms) => { jobs.set(++seq, { at: now + ms, fn }); return seq }
  const clear = (id) => { jobs.delete(id) }
  const tick = (ms) => {
    now += ms
    for (const [id, j] of [...jobs]) if (j.at <= now) { jobs.delete(id); j.fn() }
  }
  return { set, clear, tick }
}

const spy = () => {
  const calls = []
  const fn = (...a) => { calls.push(a); return a[0] }
  fn.calls = calls
  return fn
}

test('a queued row write fires once after the delay, however many keystrokes armed it', () => {
  const t = fake()
  const p = createPending(t.set, t.clear)
  const save = spy()
  for (const amount of [1, 12, 123]) p.queueRow('recurring', { id: 5, amount }, save, (r) => r, 'row')
  t.tick(DELAY - 1)
  assert.equal(save.calls.length, 0, 'nothing may fire before the window closes')
  t.tick(1)
  assert.equal(save.calls.length, 1, 'and exactly one write survives the burst')
  assert.equal(save.calls[0][0].amount, 123, 'the last value wins')
})

test('cancelRow disarms a row write that has not fired', () => {
  const t = fake()
  const p = createPending(t.set, t.clear)
  const save = spy()
  p.queueRow('recurring', { id: 5 }, save, (r) => r, 'row')
  p.cancelRow('recurring', 5)
  t.tick(DELAY * 2)
  assert.equal(save.calls.length, 0)
})

/**
 * D67. Typing an amount arms a push-down; clearing the field must retract it.
 * Without this the timer fires with the value the user took back, leaving the
 * payable at 0 and its linked rows holding the retracted number.
 */
test('cancelPush retracts one armed push-down and leaves the others alone', () => {
  const t = fake()
  const p = createPending(t.set, t.clear)
  const amount = spy()
  const desc = spy()
  p.queueCall(pushKey(5, 'amount'), amount)
  p.queueCall(pushKey(5, 'desc'), desc)

  p.cancelPush(5, 'amount')
  assert.deepEqual(p.armed(), [pushKey(5, 'desc')])
  t.tick(DELAY * 2)
  assert.equal(amount.calls.length, 0, 'the retracted push must not fire')
  assert.equal(desc.calls.length, 1, 'the unrelated one must')
})

/**
 * D59. Deleting a payable arms nothing new but must disarm everything already
 * armed for it — the row write AND every push-down — or a write lands against a
 * payable that no longer exists.
 */
test('cancelForRecurring disarms the row write and every push-down for that payable', () => {
  const t = fake()
  const p = createPending(t.set, t.clear)
  const hits = spy()
  p.queueRow('recurring', { id: 5 }, hits, (r) => r, 'row')
  p.queueCall(pushKey(5, 'amount'), hits)
  p.queueCall(pushKey(5, 'desc'), hits)
  p.queueCall(pushKey(5, 'co'), hits)

  p.cancelForRecurring(5)
  assert.deepEqual(p.armed(), [], 'nothing may remain armed for a deleted payable')
  t.tick(DELAY * 2)
  assert.equal(hits.calls.length, 0)
})

// The trailing colon in the prefix is load-bearing: without it `push:5:` also
// matches `push:50:amount`, and deleting payable 5 would silently retract an
// unrelated payable's edit.
test('cancelForRecurring does not touch a payable whose id merely starts the same', () => {
  const t = fake()
  const p = createPending(t.set, t.clear)
  const five = spy()
  const fifty = spy()
  p.queueCall(pushKey(5, 'amount'), five)
  p.queueCall(pushKey(50, 'amount'), fifty)

  p.cancelForRecurring(5)
  assert.deepEqual(p.armed(), [pushKey(50, 'amount')], 'payable 50 must survive deleting payable 5')
  t.tick(DELAY * 2)
  assert.equal(five.calls.length, 0)
  assert.equal(fifty.calls.length, 1)
})

test('a row write and a push-down for the same id never collide', () => {
  const t = fake()
  const p = createPending(t.set, t.clear)
  const row = spy()
  const push = spy()
  p.queueRow('recurring', { id: 5 }, row, (r) => r, 'row')
  p.queueCall(pushKey(5, 'amount'), push)
  assert.equal(p.armed().length, 2, 'two distinct keys')
  t.tick(DELAY)
  assert.equal(row.calls.length, 1)
  assert.equal(push.calls.length, 1)
})

// ---- the keyset pager ------------------------------------------------------

/** A table of sequential ids, served in keyset pages the way PostgREST would. */
const source = (ids, size, { onPage } = {}) => {
  let calls = 0
  return async (cursor) => {
    calls += 1
    if (onPage) onPage(calls)
    const start = cursor === null ? 0 : ids.indexOf(cursor) + 1
    return ids.slice(start, start + size).map((id) => ({ id }))
  }
}

test('pageAll returns every row exactly once, across many pages', async () => {
  const ids = Array.from({ length: 2500 }, (_, i) => i + 1)
  const got = await pageAll(source(ids, 1000), 1000)
  assert.equal(got.length, 2500, 'nothing may be lost past the first page')
  assert.deepEqual(got.map((r) => r.id), ids, 'in order, with no duplicates')
})

test('pageAll is correct when the last page is exactly full', async () => {
  // 20 rows at a page size of 10: two full pages, then one empty. Correct
  // either way — recorded because it is the case an off-by-one would break.
  const ids = [...Array(20)].map((_, i) => i + 1)
  assert.deepEqual((await pageAll(source(ids, 10), 10)).map((r) => r.id), ids)
})

// A short page means the end, so it must not cost another round trip. Stopping
// only on an EMPTY page would be correct and would read the whole table once
// more than necessary — on a 1,000-row page against a shared production
// database that is not free.
test('a partial last page ends the read without another request', async () => {
  let calls = 0
  const ids = [...Array(15)].map((_, i) => i + 1)
  const got = await pageAll(source(ids, 10, { onPage: (n) => { calls = n } }), 10)
  assert.equal(got.length, 15)
  assert.equal(calls, 2, 'ten then five is two requests, not three')
})

test('pageAll handles an empty table in one request', async () => {
  let calls = 0
  const got = await pageAll(source([], 1000, { onPage: (n) => { calls = n } }), 1000)
  assert.deepEqual(got, [])
  assert.equal(calls, 1, 'an empty table must cost exactly one request')
})

test('pageAll works at a page size of one, which is where an off-by-one shows', async () => {
  const ids = [5, 4, 3, 2, 1]
  assert.deepEqual((await pageAll(source(ids, 1), 1)).map((r) => r.id), ids)
})

/**
 * The reason this is keyset and not offset. Offset paging re-counts from the
 * start on every page, so a row inserted between pages shifts everything after
 * it — one row returns twice and another is never seen, while an exact count
 * still matches. This simulates exactly that insertion and asserts the cursor
 * is immune to it.
 */
test('pageAll loses nothing when a row is inserted between pages', async () => {
  const ids = [...Array(20)].map((_, i) => i + 1)
  let served = 0
  const shifting = async (cursor) => {
    served += 1
    if (served === 2) ids.unshift(0)          // a row appears before everything read so far
    const start = cursor === null ? 0 : ids.indexOf(cursor) + 1
    return ids.slice(start, start + 10).map((id) => ({ id }))
  }
  const got = await pageAll(shifting, 10)
  const seen = got.map((r) => r.id)
  assert.equal(new Set(seen).size, seen.length, 'no row may be returned twice')
  for (const id of [...Array(20)].map((_, i) => i + 1)) {
    assert.ok(seen.includes(id), 'row ' + id + ' must not be skipped by the shift')
  }
})

// Both tables carry their own id sequence, so a transfer and a masterlist row
// sharing an id is ordinary, not exotic. Keying the debounce on the id alone
// would let a keystroke in one cancel the other's unsaved write.
test('two tables sharing an id keep separate timers', () => {
  const t = fake()
  const p = createPending(t.set, t.clear)
  const save = spy()
  p.queueRow('transfers', { id: 7, name: 'transfer' }, save, (r) => r, 'the transfer')
  p.queueRow('recurring', { id: 7, name: 'payable' }, save, (r) => r, 'the masterlist row')
  assert.deepEqual(p.armed(), ['recurring:7', 'transfers:7'], 'one key per table')
  t.tick(DELAY)
  assert.deepEqual(save.calls.map((c) => c[0].name).sort(), ['payable', 'transfer'],
    'both writes survive; neither cancelled the other')
})

test('cancelling one table leaves the other table’s write armed', () => {
  const t = fake()
  const p = createPending(t.set, t.clear)
  const save = spy()
  p.queueRow('transfers', { id: 7, name: 'transfer' }, save, (r) => r, 'the transfer')
  p.queueRow('recurring', { id: 7, name: 'payable' }, save, (r) => r, 'the masterlist row')
  p.cancelRow('transfers', 7)
  t.tick(DELAY)
  assert.deepEqual(save.calls.map((c) => c[0].name), ['payable'], 'only the transfer was disarmed')
})

// Pinned as a number, not via DELAY, so a change to the constant fails here
// rather than silently moving every other test's clock with it.
test('the debounce window is half a second', () => {
  assert.equal(DELAY, 500)
})

// `armed()` is the seam the other tests read, so it has to stop lying the
// moment a timer fires. Without the delete the map grows one entry per row
// ever edited and never shrinks, and `armed()` reports fired writes as pending.
test('a fired timer releases its key', () => {
  const t = fake()
  const p = createPending(t.set, t.clear)
  p.queueRow('recurring', { id: 5 }, spy(), (r) => r, 'row')
  assert.deepEqual(p.armed(), ['recurring:5'], 'armed before the window closes')
  t.tick(DELAY)
  assert.deepEqual(p.armed(), [], 'and released once it has fired')
})

// The delete has to happen *before* run(), not after: `save` can throw
// synchronously, and a key left behind is one the next edit re-arms over.
test('a key is released even when the write throws', () => {
  const t = fake()
  const p = createPending(t.set, t.clear)
  p.queueRow('recurring', { id: 5 }, () => { throw new Error('write failed') }, (r) => r, 'row')
  assert.throws(() => t.tick(DELAY), /write failed/)
  assert.deepEqual(p.armed(), [], 'the key must not survive a failed write')
})

// The push-down key is built in one module and cancelled in another. Nothing
// but this pins that the two agree: `actions.js` used to hand-build the string.
test('pushKey is the contract cancelPush and cancelForRecurring match', () => {
  const t = fake()
  const p = createPending(t.set, t.clear)
  p.queueCall(pushKey(5, 'amount'), spy())
  p.cancelPush(5, 'amount')
  assert.deepEqual(p.armed(), [], 'cancelPush must match what pushKey builds')

  p.queueCall(pushKey(5, 'desc'), spy())
  p.queueRow('recurring', { id: 5 }, spy(), (r) => r, 'row')
  p.cancelForRecurring(5)
  assert.deepEqual(p.armed(), [], 'and so must the prefix scan')
})

// The two source-text tests that stood here are GONE, and their deletion is the
// point. They asserted that `actions.js` contained certain lines, because
// nothing could import it. Round 24 defeated them three ways — a commented-out
// copy of a pinned line, a string literal holding the same text, and
// `if (state.readOnly)` prefixed to a pinned statement — each of which left the
// suite green while the push-down cancellation became unreachable. A regex over
// source cannot tell a statement from one that never runs, and a pin that
// cannot fail is worse than no pin: it reads as coverage.
//
// The decisions now live in `masterlist.js`, which a test drives with spies.
// See `masterlist.test.js`. `actions.js` keeps only the effects.

// `profiles` is keyed by `user_id`, not `id`. Paging it on `id` carried
// `undefined` forward as the cursor, so the reader re-read page one forever —
// or, with a `.gt(key, undefined)` filter, read nothing at all.
test('pageAll rides the cursor on the key it is given', async () => {
  const rows = [{ user_id: 'a' }, { user_id: 'b' }, { user_id: 'c' }]
  const seen = []
  const got = await pageAll((cursor) => {
    seen.push(cursor)
    const start = cursor === null ? 0 : rows.findIndex((r) => r.user_id === cursor) + 1
    return rows.slice(start, start + 2)
  }, 2, 'user_id')
  assert.deepEqual(got, rows)
  assert.deepEqual(seen, [null, 'b'], 'the second page starts after the last row of the first')
})

test('pageAll still defaults to id, so every existing caller is unchanged', async () => {
  const seen = []
  await pageAll((cursor) => { seen.push(cursor); return seen.length === 1 ? [{ id: 9 }, { id: 12 }] : [] }, 2)
  assert.deepEqual(seen, [null, 12])
})

// The mutant that exposed this hung the suite rather than failing it: paging on
// a column the rows do not have carries `undefined` forward, so every request
// repeats the first page and `rows` grows without bound. A backup or a restore
// plan is the caller, so it fails loudly now.
test('pageAll refuses a cursor that cannot advance', async () => {
  await assert.rejects(
    () => pageAll(() => [{ user_id: 'a' }, { user_id: 'b' }], 2),
    /cursor cannot advance/,
    'paging these rows on the default `id` must throw, not loop',
  )
  // A short page still ends the read normally, cursor or no cursor.
  assert.deepEqual(await pageAll(() => [{ user_id: 'a' }], 2), [{ user_id: 'a' }])
})
