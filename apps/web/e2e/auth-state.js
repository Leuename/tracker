import { fileURLToPath } from 'node:url'

/**
 * Where the saved sign-in state lives.
 *
 * **A storage-state file is a credential.** It holds a Supabase access token and
 * a refresh token in cleartext — anyone holding it is signed in as that account
 * until the refresh token is revoked. It therefore lives under `test-results/`,
 * which both `.gitignore` files already cover, and must never move anywhere a
 * commit could reach. Playwright clears `test-results/` at the start of every
 * run and `e2e/auth.setup.js` rewrites these before any spec reads them.
 */
const at = (name) => fileURLToPath(new URL(`../test-results/.auth/${name}.json`, import.meta.url))

/** The session every spec starts from, written once per run by the setup project. */
export const SHARED_STATE = at('shared')

/**
 * A second, independent sign-in for the one spec that forces a token refresh
 * (`app.spec.js`, "an expired token recovers by refreshing"). A refresh
 * **rotates** the refresh token, so that spec would leave `SHARED_STATE` holding
 * a spent one for whatever ran next — even at `workers: 1`. Its own session
 * means it can rotate freely and nothing else notices.
 */
export const REFRESH_STATE = at('refresh')
