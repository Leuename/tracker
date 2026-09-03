// Run with: npm test  (node --test, no framework)
//
// These are the cases a live run never reaches. A preflight only earns its
// place if it fails when the deployment is broken, so the failures are what is
// pinned here — the passing path is the easy half and the half that gets
// exercised for real on every e2e run.
//
// The first version of this preflight passed every one of the bad-status cases
// below, because `fetch` resolves for 4xx and 5xx and it only awaited the
// promise. A 503 deployment cleared the gate and the suite then failed 29 times
// for one reason. That is the bug these tests exist to keep fixed.
import test from 'node:test'
import assert from 'node:assert/strict'
import { preflight, SLOW, UNREACHABLE, BAD_STATUS, BAD_URL } from './network-preflight.js'

const ok = async () => new Response('<!doctype html>', { status: 200 })
const status = (code) => async () => new Response('', { status: code })
const throws = (err) => async () => { throw err }

const rejectsWith = async (label, fn, impl) => {
  await assert.rejects(() => preflight('https://deployment.test', impl), (e) => {
    assert.match(e.message, new RegExp('^' + label), `expected ${label}, got: ${e.message}`)
    return true
  }, fn)
}

test('a healthy deployment passes', async () => {
  await preflight('https://deployment.test', ok)
})

test('three probes are sent, each with a distinct cache-buster', async () => {
  const seen = []
  await preflight('https://deployment.test', async (url) => { seen.push(String(url)); return new Response('', { status: 200 }) })
  assert.equal(seen.length, 3)
  assert.equal(new Set(seen).size, 3, 'a cached probe proves nothing; each URL must differ')
  for (const u of seen) assert.match(u, /__playwright_preflight=/)
})

test('a 503 deployment is refused, not passed', async () => {
  // The original defect, pinned. fetch resolves for 5xx.
  await rejectsWith(BAD_STATUS, 'a reachable but broken deployment must fail the gate', status(503))
})

test('a 500 deployment is refused', async () => {
  await rejectsWith(BAD_STATUS, '500 must fail the gate', status(500))
})

test('a 404 baseURL is refused — a wrong URL must not look healthy', async () => {
  await rejectsWith(BAD_STATUS, 'a typo in E2E_BASE_URL must fail the gate', status(404))
})

test('one bad response among three still fails the gate', async () => {
  // A deployment that is only sometimes serving is not a deployment to test
  // against; the flake would land in the specs instead.
  let n = 0
  await rejectsWith(BAD_STATUS, 'any bad response fails', async () => {
    n += 1
    return new Response('', { status: n === 2 ? 502 : 200 })
  })
})

test('a refused connection is UNREACHABLE, not SLOW', async () => {
  await rejectsWith(UNREACHABLE, 'a refusal is not slowness', throws(new Error('ECONNREFUSED')))
})

test('a timeout is SLOW', async () => {
  const timeout = Object.assign(new Error('The operation was aborted due to timeout'), { name: 'TimeoutError' })
  await rejectsWith(SLOW, 'a timeout is the one thing SLOW should mean', throws(timeout))
})

test('a malformed baseURL is a config fault, not a network one', async () => {
  // Sends the reader to E2E_BASE_URL instead of to the network.
  await assert.rejects(() => preflight('not-a-url', ok), (e) => {
    assert.match(e.message, new RegExp('^' + BAD_URL))
    assert.match(e.message, /E2E_BASE_URL/)
    return true
  })
})

test('an undefined baseURL is reported as a config fault', async () => {
  await assert.rejects(() => preflight(undefined, ok), (e) => {
    assert.match(e.message, new RegExp('^' + BAD_URL))
    return true
  })
})

test('the four classifications are distinct strings', () => {
  // They are asserted on by name in CI output and in the handoffs.
  assert.equal(new Set([SLOW, UNREACHABLE, BAD_STATUS, BAD_URL]).size, 4)
  assert.equal(SLOW, 'NETWORK_PREFLIGHT_SLOW')
})
