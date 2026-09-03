import { expect, test as setup } from '@playwright/test'
import { haveCredentials } from './db.js'
import { REFRESH_STATE, SHARED_STATE } from './auth-state.js'

/**
 * Sign in through the UI, once per run, with tracing off.
 *
 * **Why this file exists.** `trace: 'retain-on-failure'` records every `fill()`
 * value verbatim, so every failed run used to write the shared account's
 * password into `test-results/*​/trace.zip` in cleartext. Nothing shipped —
 * `test-results/` is git-ignored and no workflow uploads it — but the mechanism
 * regenerated the file on every failure. Signing in here, in a project whose
 * `use.trace` is `off`, means the password is typed exactly once per run in the
 * one place that records nothing, and never in a spec that can fail with a
 * trace attached.
 *
 * **Why a setup project rather than `globalSetup`.** A setup project is an
 * ordinary test: it gets the browser fixtures, `baseURL`, and the right origin
 * without being told any of them. An earlier design called
 * `signInWithPassword()` from Node instead; that does not work, because it never
 * populates the browser's storage, and hand-building Supabase's project-scoped
 * localStorage key is brittle and undocumented. Do not go back to it.
 *
 * Two sign-ins, not one — see `auth-state.js` for why the refresh spec needs its
 * own session.
 */
async function signInAndSave(page, path) {
  // Without credentials every spec skips itself (see `haveCredentials`), and a
  // suite that skips must still exit 0. Write an empty, signed-out state so the
  // projects that declare `storageState` have a file to read.
  if (!haveCredentials()) {
    await page.context().storageState({ path })
    return
  }
  await page.goto('/')
  await page.getByLabel('Email').fill(process.env.E2E_EMAIL)
  await page.getByLabel('Password').fill(process.env.E2E_PASSWORD)
  await page.getByRole('button', { name: 'Sign in' }).click()
  // Hydration from Supabase sits between the click and the first screen.
  await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible({ timeout: 25_000 })
  await page.context().storageState({ path })
}

setup('sign in once and save the shared session', async ({ page }) => {
  await signInAndSave(page, SHARED_STATE)
})

setup('sign in again, isolated, for the token-refresh spec', async ({ page }) => {
  await signInAndSave(page, REFRESH_STATE)
})
