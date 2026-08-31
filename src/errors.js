/**
 * Telling an expired session apart from a real failure.
 *
 * Access tokens last an hour. supabase-js refreshes them on a timer while a
 * tab is open, but a tab that was asleep, backgrounded, or simply left alone
 * wakes up holding a dead token — and because `anon` has no privilege on any
 * table, PostgREST answers a dead token with 401 rather than an empty result.
 * That is recoverable: refresh once and repeat the request.
 *
 * Imports nothing, so it is testable without a database.
 */

// PGRST301: no/invalid JWT. PGRST303: expired. 42501: the `anon` fallback,
// which is what a request carrying no usable token ends up as here.
const AUTH_CODES = new Set(['PGRST301', 'PGRST302', 'PGRST303', '42501'])

export const isAuthError = (e) =>
  !!e && (AUTH_CODES.has(e.code) || e.status === 401 || /jwt (expired|invalid)/i.test(e.message || ''))

/** Thrown when refreshing failed too — the only cure is signing in again. */
export const sessionExpired = () => {
  const e = new Error('Your session expired. Please sign in again.')
  e.sessionExpired = true
  return e
}
