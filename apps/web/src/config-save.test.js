// Run with: npm test  (node --test, no framework)
import test from 'node:test'
import assert from 'node:assert/strict'
import { createConfigSync } from './config-save.js'
import { configOf } from './rows.js'

const cfg = (settings = {}, extra = {}) => ({
  notes: [], companies: ['ANG'], categories: ['Other'],
  settings: { ackRequirePhoto: false, warnDuplicate: false, dashWindow: 'Next 30 days', ...settings },
  ...extra,
})

/**
 * `configPatch` builds its accumulators with `bare()` (see `rows.js`), so a
 * patch has no prototype and `deepStrictEqual` against a plain literal fails on
 * that alone. A patch is only ever consumed by being serialised and sent to
 * `merge_app_config`, so compare what the database actually receives.
 */
const asSent = (patch) => (patch == null ? patch : JSON.parse(JSON.stringify(patch)))

/** A `write` that hands back a promise the test resolves or rejects by hand. */
const deferred = () => {
  const calls = []
  const write = (patch) => {
    let settle
    const p = new Promise((res, rej) => { settle = { res, rej } })
    // Nothing else attaches a handler until the caller does, so keep the
    // rejection from being reported as unhandled while the test sets up.
    p.catch(() => {})
    calls.push({ patch, ...settle })
    return p
  }
  return { write, calls }
}

test('seeding records the baseline and sends nothing', () => {
  const { write, calls } = deferred()
  const s = createConfigSync({ write })
  assert.equal(s.current(), null)
  s.seed(cfg())
  assert.deepEqual(s.current(), cfg())
  assert.equal(calls.length, 0)
  assert.equal(s.pending(cfg()), null, 'an unchanged config has nothing to send')
  assert.equal(s.send(cfg()), null)
  assert.equal(calls.length, 0)
})

test('a change sends only its delta and advances the baseline', () => {
  const { write, calls } = deferred()
  const s = createConfigSync({ write })
  s.seed(cfg())
  const next = cfg({ ackRequirePhoto: true })
  assert.deepEqual(asSent(s.pending(next)), { settings: { ackRequirePhoto: true } })
  s.send(next)
  assert.equal(calls.length, 1)
  assert.deepEqual(asSent(calls[0].patch), { settings: { ackRequirePhoto: true } },
    'only the key that moved, so merge_app_config can fold two people together')
  assert.deepEqual(s.current(), next)
})

test('a refused write puts the baseline back', async () => {
  const { write, calls } = deferred()
  const s = createConfigSync({ write })
  const base = cfg()
  s.seed(base)
  const next = cfg({ ackRequirePhoto: true })
  const p = s.send(next)
  assert.deepEqual(s.current(), next, 'advanced optimistically')
  calls[0].rej(new Error('refused'))
  await assert.rejects(p, /refused/, 'and the rejection still reaches the caller, which reports it')
  assert.deepEqual(s.current(), base, 'baseline restored, so the change is not lost')
})

// ROUND 30, finding 1. The rollback existed to recover a change refused while a
// later edit was in flight, and it did not, because the patch was computed when
// the effect ran and frozen in a 600ms debounce closure: rolling the baseline
// back afterwards changed nothing about what had already been decided to send.
//
// The sequence below is the one that loses `ackRequirePhoto` permanently — the
// setting that once stopped the owner liquidating a receipt — with the screen
// and the baseline both claiming the database has it.
test('a refusal landing inside a later edit is recovered by the next send', async () => {
  const { write, calls } = deferred()
  const s = createConfigSync({ write })
  const base = cfg()
  s.seed(base)

  // The owner toggles ackRequirePhoto on. It goes out and is still in flight.
  const first = cfg({ ackRequirePhoto: true })
  const w1 = s.send(first)
  assert.deepEqual(asSent(calls[0].patch), { settings: { ackRequirePhoto: true } })

  // They toggle warnDuplicate on. The effect arms a timer; nothing is sent yet.
  const second = cfg({ ackRequirePhoto: true, warnDuplicate: true })
  assert.deepEqual(asSent(s.pending(second)), { settings: { warnDuplicate: true } },
    'at this instant the delta is only the second toggle')

  // The first write is refused while that timer is still pending.
  calls[0].rej(new Error('refused'))
  await assert.rejects(w1, /refused/)
  assert.deepEqual(s.current(), base, 'baseline is back to what the database really holds')

  // Now the timer fires. The diff must be recomputed HERE, not reused.
  s.send(second)
  assert.equal(calls.length, 2)
  assert.deepEqual(asSent(calls[1].patch), { settings: { ackRequirePhoto: true, warnDuplicate: true } },
    'the second write must carry the refused change too, or it is lost for good')
  assert.deepEqual(s.current(), second)

  // And nothing is owed afterwards.
  assert.equal(s.pending(second), null)
})

test('two failures in a row still leave the baseline on what the database holds', async () => {
  const { write, calls } = deferred()
  const s = createConfigSync({ write })
  const base = cfg()
  s.seed(base)

  const a = cfg({ ackRequirePhoto: true })
  const w1 = s.send(a)
  calls[0].rej(new Error('one'))
  await assert.rejects(w1, /one/)

  const b = cfg({ ackRequirePhoto: true, warnDuplicate: true })
  const w2 = s.send(b)
  assert.deepEqual(asSent(calls[1].patch), { settings: { ackRequirePhoto: true, warnDuplicate: true } })
  calls[1].rej(new Error('two'))
  await assert.rejects(w2, /two/)

  assert.deepEqual(s.current(), base)
  assert.deepEqual(asSent(s.pending(b)), { settings: { ackRequirePhoto: true, warnDuplicate: true } },
    'both changes are still owed')
})

test('a successful write is not undone by an earlier failure', async () => {
  const { write, calls } = deferred()
  const s = createConfigSync({ write })
  s.seed(cfg())
  const a = cfg({ ackRequirePhoto: true })
  const w1 = s.send(a)
  calls[0].res()
  await w1
  assert.deepEqual(s.current(), a, 'an accepted write leaves the baseline where it is')
})

// ROUND 29's loop, pinned at its root. `save` reports a failure through
// `flash`, which sets `toast` on the reducer state. The effect keys on
// `JSON.stringify(configOf(state))`, so this must hold or a failed write can
// re-trigger itself: 79 writes and 79 toasts from one toggle in 500ms.
test('a toast is not part of the config, so it cannot trigger a write', () => {
  const state = { ...cfg(), toast: '', screen: 'tracker', readOnly: false }
  const shouting = { ...state, toast: "Couldn't save the settings — offline" }
  assert.deepEqual(configOf(shouting), configOf(state))
  assert.equal(JSON.stringify(configOf(shouting)), JSON.stringify(configOf(state)),
    'the effect key must be identical, or the failure toast re-fires the write')

  const s = createConfigSync({ write: () => Promise.resolve() })
  s.seed(configOf(state))
  assert.equal(s.pending(configOf(shouting)), null, 'and nothing is owed because of it')
})

// ROUND 29, finding 2. The rollback was once guarded on the baseline still
// equalling what this write sent — "do not clobber a later save". That guard
// skipped precisely the case the rollback existed for: two writes genuinely in
// flight, the first refused after the second has already moved the baseline.
test('a refusal is rolled back even when a later write has moved the baseline', async () => {
  const { write, calls } = deferred()
  const s = createConfigSync({ write })
  const base = cfg()
  s.seed(base)

  const a = cfg({ ackRequirePhoto: true })
  const w1 = s.send(a)                       // baseline: base -> a
  const b = cfg({ ackRequirePhoto: true, dashWindow: 'Today' })
  const w2 = s.send(b)                       // baseline: a -> b, patch is only dashWindow
  assert.deepEqual(asSent(calls[1].patch), { settings: { dashWindow: 'Today' } })

  calls[1].res()                             // the SECOND write lands
  await w2
  calls[0].rej(new Error('refused'))         // the FIRST is refused afterwards
  await assert.rejects(w1, /refused/)

  assert.deepEqual(s.current(), base,
    'the baseline must fall back to what the database actually holds')
  assert.deepEqual(asSent(s.pending(b)), { settings: { ackRequirePhoto: true, dashWindow: 'Today' } },
    'so the next send carries the refused change; re-sending dashWindow is a no-op merge')
})
