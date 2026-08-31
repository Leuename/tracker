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
export default defineConfig({
  testDir: './e2e',
  fullyParallel: false, // one shared dataset; parallel specs would race each other
  retries: 0,
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: true,
    timeout: 60_000,
  },
})
