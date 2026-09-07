import { expect, test } from '@playwright/test'
import { haveCredentials } from './db.js'
import { REFRESH_STATE } from './auth-state.js'

const EMAIL = process.env.E2E_EMAIL

// Shared with functional.spec.js so there is one gate, and so E2E_REQUIRE_CREDENTIALS
// turns a silent skip into a red build here too. See haveCredentials in db.js.
test.skip(!haveCredentials(), 'Set E2E_EMAIL, E2E_PASSWORD and the two VITE_ variables.')

// The gate has no sign-up form by design, but nothing here types a password any
// more: the session comes from the saved storage state that e2e/auth.setup.js
// writes with tracing off. A spec that reached the form would put the password
// back into every failure trace, so this deliberately has no fallback — a state
// that did not load fails loudly here instead.
async function signIn(page) {
  await page.goto('/')
  // Hydration from Supabase sits between the load and the first screen.
  await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible({ timeout: 15_000 })
}

// The two specs that must still drive the form, so they override the saved
// session with an empty one. Exercising the gate is their entire purpose, and
// the wrong-password spec types a literal, which is safe for a trace to record.
test.describe('the sign-in form', () => {
  test.use({ storageState: { cookies: [], origins: [] } })

  test('the gate blocks the app until a session exists', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible()
    // No self-serve registration: accounts are issued from the Supabase dashboard.
    await expect(page.getByText('Accounts are issued by the administrator.')).toBeVisible()
    await expect(page.getByRole('navigation', { name: 'Sections' })).toBeHidden()
  })

  test('a wrong password is refused and the app stays closed', async ({ page }) => {
    await page.goto('/')
    await page.getByLabel('Email').fill(EMAIL)
    await page.getByLabel('Password').fill('definitely-not-the-password')
    await page.getByRole('button', { name: 'Sign in' }).click()
    await expect(page.getByRole('alert')).toBeVisible()
    await expect(page.getByRole('navigation', { name: 'Sections' })).toBeHidden()
  })
})

test('the dashboard totals the payables it loaded', async ({ page }) => {
  await signIn(page)
  // Payables is the total; the four status tiles must add up to it. This is
  // the one assertion that would catch a mapping bug turning amounts into
  // strings — concatenation would not balance.
  const peso = async (label) => {
    const tile = page.locator('.tile', { hasText: label }).first()
    return Number((await tile.locator('.value').innerText()).replace(/[₱,]/g, ''))
  }
  const total = await peso('PAYABLES')
  const parts = await Promise.all(['COMPLETED', 'PENDING', 'OVERDUE', 'ON HOLD'].map(peso))
  // Holds on an empty ledger too, which is a real state now that the demo rows
  // are gone: zero must equal zero rather than the spec assuming content.
  expect(parts.reduce((a, b) => a + b, 0)).toBe(total)
  expect(total).toBeGreaterThanOrEqual(0)
})

test('every screen loads its own data', async ({ page }) => {
  await signIn(page)
  const rail = page.getByRole('navigation', { name: 'Sections' })

  await rail.getByRole('button', { name: 'Tracker' }).click()
  await expect(page.getByRole('heading', { name: 'Tracker' })).toBeVisible()
  await expect(page.getByText(/Showing \d+ of \d+ transactions/)).toBeVisible()

  await rail.getByRole('button', { name: 'AckRec' }).click()
  await expect(page.getByRole('heading', { name: 'Acknowledgement receipts' })).toBeVisible()

  await rail.getByRole('button', { name: 'Masterlist' }).click()
  await expect(page.getByRole('heading', { name: 'Masterlist' })).toBeVisible()
  // Assert the screen's own chrome, not a rule row: the masterlist is legitimately
  // empty on a fresh ledger, and a spec that requires content fails on a correct app.
  await expect(page.getByRole('button', { name: '+ Add payable' })).toBeVisible()
  await expect(page.getByText('Recurring payables')).toBeVisible()
})

// This isolated REFRESH_STATE runs before the global sign-out test for two
// reasons. Forcing a refresh ROTATES this state's token, so no later test may
// reuse the saved file. The sign-out spec below passes `scope: 'global'`
// explicitly (D47) and revokes EVERY refresh token this account holds, so this
// forced refresh must happen first or it is rejected. Order within a file is
// declaration order, which `fullyParallel: false` preserves.
test.describe('token refresh', () => {
  test.use({ storageState: REFRESH_STATE })

  test('an expired token recovers by refreshing, without the user noticing', async ({ page }) => {
    // The failure a tab left open past the access token's hour actually hits:
    //   GET /rest/v1/recurring -> 401 {"code":"PGRST303","message":"JWT expired"}
    // Because `anon` holds no privilege, that is a hard 401 rather than an empty
    // result, so the app has to refresh the token and retry or it strands.
    //
    // The gate is the refresh itself, not a request count: React StrictMode
    // double-invokes effects in dev, so "fail the first request per table" would
    // be quietly rescued by the second mount and prove nothing.
    let refreshed = false
    await page.route('**/auth/v1/token**', async (route) => {
      if (route.request().url().includes('refresh_token')) refreshed = true
      await route.continue()
    })
    await page.route('**/rest/v1/**', async (route) => {
      if (refreshed) { await route.continue(); return }
      await route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({ code: 'PGRST303', details: null, hint: null, message: 'JWT expired' }),
      })
    })

    await signIn(page) // asserts the Dashboard appears anyway
    expect(refreshed, 'the app should have refreshed its token').toBe(true)
    await expect(page.getByText(/Couldn.t load the data/)).toBeHidden()
  })
})

// Last in this file on purpose: the app's Sign out passes `scope: 'global'`
// explicitly (D47), so it revokes every refresh token this account holds —
// including the ones inside both saved snapshots. Nothing after it may force a
// refresh. Later specs survive only on the access tokens the setup project
// minted minutes earlier, and would fail if a run ever outlived the token's
// hour; functional.spec.js never refreshes, so it is unaffected today. A new
// spec that refreshes would need its own session.
test('the session survives a reload, and signing out ends it', async ({ page }) => {
  await signIn(page)
  await page.reload()
  await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible({ timeout: 15_000 })

  await page.getByRole('navigation', { name: 'Sections' }).getByRole('button', { name: 'Sign out' }).click()
  await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible()
  await page.reload()
  await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible()
})

