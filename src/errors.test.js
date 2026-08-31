import { test } from 'node:test'
import assert from 'node:assert/strict'
import { isAuthError, sessionExpired } from './errors.js'

test('the exact error an expired token produces is recoverable', () => {
  // Captured verbatim from PostgREST on 2026-08-31, which is what a stale tab
  // sees on its first request: GET /rest/v1/recurring -> 401.
  assert.ok(isAuthError({ code: 'PGRST303', message: 'JWT expired', details: null, hint: null }))
})

test('a request carrying no usable token is recoverable too', () => {
  // `anon` is revoked, so a tokenless request surfaces as a privilege error
  // rather than an empty result.
  assert.ok(isAuthError({ code: '42501', message: 'permission denied for table recurring' }))
  assert.ok(isAuthError({ code: 'PGRST301', message: 'JWS: no key found' }))
  assert.ok(isAuthError({ status: 401, message: 'Unauthorized' }))
})

test('a genuine failure is not mistaken for an expired session', () => {
  // Retrying these would hide the real problem behind a pointless refresh.
  assert.ok(!isAuthError({ code: '23505', message: 'duplicate key value violates unique constraint' }))
  assert.ok(!isAuthError({ code: '42P01', message: 'relation "txns" does not exist' }))
  assert.ok(!isAuthError({ message: 'Failed to fetch' }))
  assert.ok(!isAuthError(null))
  assert.ok(!isAuthError(undefined))
})

test('a failed refresh is flagged so the app can send the user back to sign-in', () => {
  const e = sessionExpired()
  assert.equal(e.sessionExpired, true)
  assert.match(e.message, /sign in again/i)
})
