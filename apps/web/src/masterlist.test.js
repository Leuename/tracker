import test from 'node:test'
import assert from 'node:assert/strict'
import { applyMasterlistEdit, recEffects } from './masterlist.js'
import { createPending, DELAY, PUSH_DELAY, pushKey } from './pending.js'

const spies = () => {
  const calls = []
  const fx = {}
  for (const name of ['draft', 'cancelPush', 'paint', 'saveRow', 'queuePush']) {
    fx[name] = (...args) => calls.push([name, ...args])
  }
  fx.calls = calls
  fx.names = () => calls.map(([n]) => n)
  fx.of = (name) => calls.filter(([n]) => n === name)
  return fx
}

const row = { id: 7, co: 'GTOI', cat: 'Legal Services', desc: 'Retainer', amount: 500 }

test('a real edit saves the payable and pushes the change down', () => {
  const fx = spies()
  const out = applyMasterlistEdit(row, 'amount', '750', fx)

  assert.equal(out.pushed, true)
  assert.deepEqual(fx.names(), ['draft', 'paint', 'saveRow', 'queuePush'], 'nothing is retracted')
  assert.deepEqual(fx.of('paint')[0][1], { ...row, amount: 750 })
  assert.deepEqual(fx.of('saveRow')[0][1], { ...row, amount: 750 }, 'the row saved is the row painted')
  assert.deepEqual(fx.of('queuePush')[0], ['queuePush', pushKey(7, 'amount'), { amount: 750 }, 7, 'amount', 750])
})

// D67. This is the defect three separate source-text pins failed to hold.
test('clearing a field retracts the push the last keystroke armed', () => {
  const fx = spies()
  const out = applyMasterlistEdit(row, 'amount', '', fx)

  assert.equal(out.pushed, false, 'nothing may travel')
  assert.deepEqual(fx.of('cancelPush')[0], ['cancelPush', 7, 'amount'],
    'the armed write must be cancelled, or it fires with the value the user took back')
  assert.equal(fx.names()[1], 'cancelPush', 'and before the row is painted or saved')
  assert.equal(fx.of('queuePush').length, 0)
  // The payable itself still saves — it is now 0, deliberately.
  assert.deepEqual(fx.of('saveRow')[0][1], { ...row, amount: 0 })
})

test('a negative never reaches the ledger, and is retracted too', () => {
  const fx = spies()
  applyMasterlistEdit(row, 'amount', '-5', fx)
  assert.deepEqual(fx.of('saveRow')[0][1], { ...row, amount: 0 })
  assert.equal(fx.of('cancelPush').length, 1)
  assert.equal(fx.of('queuePush').length, 0)
})

test('a cleared description is retracted, not written as a blank', () => {
  const fx = spies()
  applyMasterlistEdit(row, 'desc', '   ', fx)
  assert.equal(fx.of('cancelPush').length, 1)
  assert.equal(fx.of('queuePush').length, 0, 'txns.description accepts a blank silently — it must not get one')
  assert.deepEqual(fx.of('saveRow')[0][1], { ...row, desc: '   ' })
})

test('a field that does not travel saves the payable and pushes nothing', () => {
  const fx = spies()
  const out = applyMasterlistEdit(row, 'freq', 'Monthly', fx)
  assert.equal(out.pushed, false)
  assert.deepEqual(fx.names(), ['draft', 'paint', 'saveRow'], 'nothing to retract, nothing to push')
})

test('the description push-down uses the column, never the state key', () => {
  const fx = spies()
  applyMasterlistEdit(row, 'desc', 'Monthly fee', fx)
  const [, key, patch, src, field, val] = fx.of('queuePush')[0]
  assert.deepEqual(patch, { description: 'Monthly fee' }, 'the write uses the column')
  assert.equal(field, 'desc', 'the local repaint uses the state key')
  assert.equal(val, 'Monthly fee')
  assert.equal(key, pushKey(7, 'desc'))
  assert.equal(src, 7)
})

test('the payable is saved even when the push is retracted', () => {
  const fx = spies()
  applyMasterlistEdit(row, 'amount', '', fx)
  assert.equal(fx.of('paint').length, 1)
  assert.equal(fx.of('saveRow').length, 1)
})

// Round 25: `if (fx.draft) fx.draft(v)` was optional-guarded and the spy factory
// did not build `draft`, so the call was never exercised — deleting the line left
// the suite green and restored the hundredfold decimal bug, defended only by one
// Playwright spec that costs a production write to run.
test('the raw keystrokes are handed to the draft, before anything is parsed', () => {
  const fx = spies()
  applyMasterlistEdit(row, 'amount', '1250.', fx)
  assert.deepEqual(fx.of('draft')[0], ['draft', '1250.'],
    'the draft gets the text as typed — the store holds a number and would eat the point')
  assert.equal(fx.names()[0], 'draft', 'and it is recorded before the value is parsed')
  // What is stored is still the sanitised value.
  assert.deepEqual(fx.of('saveRow')[0][1], { ...row, amount: 1250 })
})

test('every field drafts, not only amount', () => {
  const fx = spies()
  applyMasterlistEdit(row, 'desc', 'Retai', fx)
  assert.deepEqual(fx.of('draft')[0], ['draft', 'Retai'])
})

test('the real recEffects factory wires draft, paint, save, push and cancellation', async () => {
  const calls = []
  const state = { recurring: [row], txns: [{ id: 8, src: 7 }] }
  const set = (value) => {
    const next = typeof value === 'function' ? value(state) : value
    calls.push(['set', next])
    Object.assign(state, next)
  }
  const db = {
    updateRecurring: () => Promise.resolve('saved-row'),
    patchTxns: () => Promise.resolve([8]),
  }
  const save = (promise, label) => calls.push(['save', promise, label])
  const queueRow = (...args) => calls.push(['queueRow', ...args])
  // The third argument is the DELAY, and it is recorded: round 46 found that
  // dropping it here — putting a money write back on the keystroke debounce —
  // left the whole suite green, because no test looked at it.
  const queueCall = (key, fn, delay) => { calls.push(['queueCall', key, delay]); fn() }
  const cancelPush = (...args) => calls.push(['cancelPush', ...args])
  const flash = (value) => calls.push(['flash', value])
  const noteWrote = (...args) => calls.push(['notePushWrote', ...args])
  const fx = recEffects({
    set, save, db, queueRow, queueCall, cancelPush, flash, id: 7, key: 'amount',
    pushWrote: () => false, notePushWrote: noteWrote, forgetPushWrote: () => {},
  })

  const out = applyMasterlistEdit(row, 'amount', '1250.', fx)
  assert.equal(out.pushed, true)
  assert.equal(fx.calls === undefined, true)
  const queued = calls.find(([n]) => n === 'queueCall')
  assert.equal(queued[2], PUSH_DELAY,
    'the push-down must be armed with the commit-length delay, not the keystroke one')
  assert.deepEqual(state.recDraft, { id: 7, k: 'amount', text: '1250.' })
  assert.ok(calls.some(([name]) => name === 'queueRow'))
  assert.ok(calls.some(([name]) => name === 'queueCall'))
  assert.ok(calls.some(([name]) => name === 'save'))
  assert.equal(calls.some(([name]) => name === 'cancelPush'), false)
})

// ROUND 45, corrected by ROUND 46.
//
// The round-45 version of this test built its own `fx` and passed `PUSH_DELAY`
// itself, so it never touched `recEffects` — the half that actually runs. D99
// then claimed the mutation turned tests red; it turned the CONSTANT's own
// assertions red, while reverting the production wiring left all 235 green.
// Trap 98, in the fix for a defect found by trap 98.
//
// This drives the real `recEffects` and the real `createPending`, so the delay
// the app actually arms a push-down with is what is under test.
const drive = ({ pauseMs, written = [1, 2], patchFails = false, correctionTo = null }) => {
  let now = 0, seq = 0
  const q = []
  const p = createPending(
    (fn, ms) => { const id = ++seq; q.push({ id, at: now + ms, fn }); return id },
    (id) => { const i = q.findIndex((t) => t.id === id); if (i >= 0) q.splice(i, 1) },
  )
  const tick = (ms) => { now += ms; for (const t of [...q]) if (t.at <= now) { q.splice(q.indexOf(t), 1); t.fn() } }
  const flashes = []
  const patches = []
  let row = { id: 5, amount: 800 }
  const mk = (k) => recEffects({
    set: (u) => { const n = typeof u === 'function' ? u({ txns: [], recurring: [row] }) : u; if (n.recurring) row = n.recurring[0] },
    save: (pr) => Promise.resolve(pr).catch(() => {}),
    db: {
      updateRecurring: () => Promise.resolve(),
      patchTxns: (patch) => { patches.push(patch); return patchFails ? Promise.reject(new Error('permission denied')) : Promise.resolve(written) },
    },
    queueRow: () => {}, queueCall: p.queueCall, cancelPush: p.cancelPush,
    pushWrote: p.pushWrote, notePushWrote: p.notePushWrote, forgetPushWrote: p.forgetPushWrote,
    flash: (m) => flashes.push(m), id: 5, key: k,
  })
  const edit = (v) => applyMasterlistEdit(row, 'amount', v, mk('amount'))
  // `settle` lets the write's promise resolve before the retract, which is what
  // happens in life: the push goes out, the database answers, and only then does
  // the person clear the field.
  const settle = () => new Promise((res) => setTimeout(res, 0))
  return {
    async run() {
      edit('1250')
      tick(pauseMs)
      await settle()
      // One more pushable keystroke before the field is cleared — a correction,
      // which is ordinary. Round 47: this used to erase the record of the write
      // that had already landed.
      if (correctionTo !== null) edit(correctionTo)
      const r = edit('')
      tick(9000)
      await settle()
      return { patches, flashes, lateRetract: r.lateRetract, again: () => edit('0').lateRetract }
    },
  }
}

test('the push-down the APP arms waits longer than a keystroke', async () => {
  // Reverting `}, PUSH_DELAY)` in recEffects must break this. The round-45
  // version could not see that change at all.
  for (const pause of [600, 1200, 2400]) {
    const r = await drive({ pauseMs: pause }).run()
    assert.deepEqual(r.patches, [], pause + 'ms must not reach the ledger')
    assert.equal(r.lateRetract, false)
  }
  const late = await drive({ pauseMs: 3000 }).run()
  assert.deepEqual(late.patches, [{ amount: 1250 }], 'past the window it does go out')
})

// ROUND 46. `pushFired` recorded that the callback RAN. With no linked rows the
// push writes nothing; if the database refuses it the write fails outright — and
// both still warned "the rows were already updated". `flash` is a single slot,
// so that warning ERASED the genuine error and told the person to go correct
// rows that were never touched. Following that instruction is itself a wrong
// money write.
test('the late-retract warning only fires when rows were really changed', async () => {
  const wroteNothing = await drive({ pauseMs: 3000, written: [] }).run()
  assert.deepEqual(wroteNothing.patches, [{ amount: 1250 }], 'the push went out')
  assert.equal(wroteNothing.lateRetract, false, 'but changed no rows, so no warning')
  assert.equal(wroteNothing.flashes.filter((f) => /already updated/.test(f)).length, 0)

  const refused = await drive({ pauseMs: 3000, patchFails: true }).run()
  assert.equal(refused.lateRetract, false, 'a refused write must never claim the rows hold the value')
  assert.equal(refused.flashes.filter((f) => /already updated/.test(f)).length, 0)
})

test('the warning is delivered once, not on every later keystroke', async () => {
  const r = await drive({ pauseMs: 3000 }).run()
  assert.equal(r.lateRetract, true, 'the first retract after a real write warns')
  assert.equal(r.again(), false, 'and a later keystroke does not warn again')
})

// ROUND 47. `arm` cleared the record of a completed write, so arming the NEXT
// push pretended the last one had never landed. Deleting that line left all 237
// tests green: nothing typed a second value between the write and the clear.
//
// What it cost on the money screen: type 1250, pause, correct it to 1300, then
// empty the field because the payable has no amount yet. The linked Tracker rows
// silently keep 1250, the masterlist says nothing is decided, and the last thing
// the person was told is "2 open Tracker rows updated to match".
test('a correction between the write and the retract does not silence the warning', async () => {
  const r = await drive({ pauseMs: 3000, correctionTo: '1300' }).run()
  assert.deepEqual(r.patches, [{ amount: 1250 }], 'the first push landed')
  assert.equal(r.lateRetract, true,
    'arming a second push does not un-write the rows the first one already wrote')
  assert.equal(r.flashes.filter((f) => /already updated/.test(f)).length, 1,
    'and the person is told exactly once')
})

test('a push-down waits materially longer than a row save', () => {
  // If these ever converge, the defect above returns: the row save is a
  // keystroke debounce and the push-down is a money write.
  assert.ok(PUSH_DELAY > 2000, 'a think-pause must fit inside the window')
  assert.ok(PUSH_DELAY >= DELAY * 4, 'and it must not be the same debounce as the row save')
})
