import { defineConfig, devices } from '@playwright/test'

/**
 * These tests drive the real app against the real Supabase project — there is
 * no local database or fixture to point them at. Two consequences:
 *
 *   1. They need credentials. Set E2E_EMAIL and E2E_PASSWORD to one of the
 *      issued accounts; nothing is hardcoded here.
 *   2. They read the SHARED ledger, the same rows both people use. The specs
 *      are deliberately read-only for that reason. Think hard before adding a
 *      test that writes.
 */
// Point E2E_BASE_URL at a deployment to run the same specs against it, e.g.
//   E2E_BASE_URL=https://tracker-six-flax.vercel.app npm run e2e
// Left unset, the specs run against a local dev server started for them.
const baseURL = process.env.E2E_BASE_URL || 'http://localhost:5173'
const local = baseURL.startsWith('http://localhost')

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false, // one shared dataset; parallel specs would race each other
  retries: 0,
  reporter: 'list',
  use: {
    baseURL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  // Only spin up a dev server when the target is that dev server.
  webServer: local ? {
    command: 'npm run dev',
    url: baseURL,
    reuseExistingServer: true,
    timeout: 60_000,
  } : undefined,
})
