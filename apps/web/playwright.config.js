import { readFileSync } from 'node:fs'
import { defineConfig, devices } from '@playwright/test'
import { SHARED_STATE } from './e2e/auth-state.js'

// The specs verify Postgres directly after each UI action, so the test process
// needs the same two variables the app does. Vite loads .env.local itself;
// Playwright does not, so read it here rather than making every run repeat them.
try {
  for (const line of readFileSync(new URL('.env.local', import.meta.url), 'utf8').split('\n')) {
    const m = /^([A-Z0-9_]+)=(.*)$/.exec(line.trim())
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2]
  }
} catch { /* not every environment has one; the specs report what is missing */ }

/**
 * These tests drive the real app against the real Supabase project — there is
 * no local database or fixture to point them at. Two consequences:
 *
 *   1. They need credentials. Set E2E_EMAIL and E2E_PASSWORD to one of the
 *      issued accounts; nothing is hardcoded here.
 *   2. They use the SHARED production ledger, the same rows the owner works in.
 *      app.spec.js only reads, but functional.spec.js WRITES heavily — every
 *      write path is driven through the UI and then verified in Postgres. It
 *      tags its rows and sweeps every E2E- tag before and after, and that sweep
 *      is the only thing keeping a failed run from leaving residue behind. A
 *      new writing test has to carry the same tag-and-sweep discipline.
 */
// Point E2E_BASE_URL at a deployment to run the same specs against it, e.g.
//   E2E_BASE_URL=https://tracker-six-flax.vercel.app npm run e2e
// Left unset, the specs run against a local dev server started for them.
const baseURL = process.env.E2E_BASE_URL || 'http://localhost:5173'
const local = baseURL.startsWith('http://localhost')

export default defineConfig({
  testDir: './e2e',
  // fullyParallel only serialises tests WITHIN a file. Playwright still runs
  // separate files concurrently — four workers by default — so app.spec.js and
  // functional.spec.js were racing each other against one production ledger.
  // Three runs at the default worker count failed; two at one worker passed
  // 27/27. Both keys are needed: workers is what actually makes it one at a
  // time, fullyParallel is what keeps a single file in written order.
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 0 : 1,
  globalSetup: './e2e/network-preflight.js',
  reporter: 'list',
  use: {
    baseURL,
    // A trace is diagnostically valuable and stays on. What changed is what can
    // reach one: a trace records every `fill()` value verbatim, so the password
    // used to be written into test-results/*/trace.zip on every failed run.
    // Signing in now happens once, in the `setup` project below, where tracing
    // is off — see e2e/auth.setup.js. Playwright has no evidenced way to redact
    // one input value and keep the rest of a trace, so keeping the password out
    // of the specs is the whole of the control.
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'setup',
      testMatch: /auth\.setup\.js/,
      // The one place the password is typed, and the one project that records
      // nothing. Do not turn tracing on here.
      use: { ...devices['Desktop Chrome'], trace: 'off' },
    },
    {
      name: 'chromium',
      testIgnore: /auth\.setup\.js/,
      // Specs start already signed in. Two in app.spec.js override this with an
      // empty state because exercising the sign-in form is their whole purpose.
      use: { ...devices['Desktop Chrome'], storageState: SHARED_STATE },
      dependencies: ['setup'],
    },
  ],
  // Only spin up a dev server when the target is that dev server.
  webServer: local ? {
    command: 'npm run dev',
    url: baseURL,
    reuseExistingServer: true,
    timeout: 60_000,
  } : undefined,
})
