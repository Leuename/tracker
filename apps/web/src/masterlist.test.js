import test from 'node:test'
import assert from 'node:assert/strict'
import { applyMasterlistEdit, recEffects } from './masterlist.js'
import { pushKey } from './pending.js'

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
  const queueCall = (key, fn) => { calls.push(['queueCall', key]); fn() }
  const cancelPush = (...args) => calls.push(['cancelPush', ...args])
  const flash = (value) => calls.push(['flash', value])
  const fx = recEffects({ set, save, db, queueRow, queueCall, cancelPush, flash, id: 7, key: 'amount' })

  const out = applyMasterlistEdit(row, 'amount', '1250.', fx)
  assert.equal(out.pushed, true)
  assert.deepEqual(state.recDraft, { id: 7, k: 'amount', text: '1250.' })
  assert.ok(calls.some(([name]) => name === 'queueRow'))
  assert.ok(calls.some(([name]) => name === 'queueCall'))
  assert.ok(calls.some(([name]) => name === 'save'))
  assert.equal(calls.some(([name]) => name === 'cancelPush'), false)
})
