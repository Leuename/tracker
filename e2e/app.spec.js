import { expect, test } from '@playwright/test'

const EMAIL = process.env.E2E_EMAIL
const PASSWORD = process.env.E2E_PASSWORD

test.skip(!EMAIL || !PASSWORD, 'Set E2E_EMAIL and E2E_PASSWORD to an issued account.')

// The gate has no sign-up form by design, so every test starts by signing in.
async function signIn(page) {
  await page.goto('/')
  await page.getByLabel('Email').fill(EMAIL)
  await page.getByLabel('Password').fill(PASSWORD)
  await page.getByRole('button', { name: 'Sign in' }).click()
  // Hydration from Supabase sits between the click and the first screen.
  await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible({ timeout: 15_000 })
}

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
  expect(parts.reduce((a, b) => a + b, 0)).toBe(total)
  expect(total).toBeGreaterThan(0)
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
  await expect(page.getByLabel('Company').first()).toBeVisible()
})

test('the session survives a reload, and signing out ends it', async ({ page }) => {
  await signIn(page)
  await page.reload()
  await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible({ timeout: 15_000 })

  await page.getByRole('navigation', { name: 'Sections' }).getByRole('button', { name: 'Sign out' }).click()
  await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible()
  await page.reload()
  await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible()
})
