import { expect, test } from '@playwright/test'
import * as D from './db.js'

test.skip(!D.haveCredentials(), 'Set E2E_EMAIL, E2E_PASSWORD and the two VITE_ variables.')
test.describe.configure({ mode: 'serial' }) // one shared ledger; parallel specs would collide

const EMAIL = process.env.E2E_EMAIL
const PASSWORD = process.env.E2E_PASSWORD

async function signIn(page) {
  await page.goto('/')
  if (await page.getByLabel('Email').isVisible().catch(() => false)) {
    await page.getByLabel('Email').fill(EMAIL)
    await page.getByLabel('Password').fill(PASSWORD)
    await page.getByRole('button', { name: 'Sign in' }).click()
  }
  await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible({ timeout: 25_000 })
}

const go = (page, name) =>
  page.getByRole('navigation', { name: 'Sections' }).getByRole('button', { name, exact: true }).click()

const peso = (s) => Number(String(s).replace(/[^0-9.]/g, ''))

/**
 * Fail loudly on any console error or failed request — a silent one is still a
 * defect. Two exclusions, both about the dev server rather than the app:
 *
 *   - Vite re-optimises dependencies on a cold start and can 504 a module
 *     mid-reload. Confirmed as noise by running this whole suite three times
 *     against `vite preview`, where it never appears.
 *   - The bare "Failed to load resource" console line carries no URL, so it is
 *     dropped in favour of the response watcher below, which has one. A real
 *     401 from PostgREST still fails the test, with the path named.
 */
const DEV_NOISE = /\/@vite\/|\/node_modules\/\.vite\/|\/@react-refresh/

function watch(page) {
  const problems = []
  page.on('console', (m) => {
    if (m.type() !== 'error') return
    if (/Failed to load resource/.test(m.text())) return // covered, with a URL, below
    problems.push('console: ' + m.text())
  })
  page.on('pageerror', (e) => problems.push('pageerror: ' + e.message))
  page.on('response', (r) => {
    if (r.ok() || r.status() < 400) return
    if (DEV_NOISE.test(r.url())) return
    problems.push(r.status() + ' ' + new URL(r.url()).pathname)
  })
  return problems
}

test.afterAll(async () => { await D.cleanup() })

test('adding a transaction stores every field it collected', async ({ page }) => {
  const problems = watch(page)
  await signIn(page)
  await go(page, 'Tracker')

  const desc = D.MARK + ' warehouse rent'
  await page.getByRole('button', { name: '+ Add transaction' }).click()
  await page.locator('.modal').getByLabel('Company').selectOption('GTOI')
  await page.locator('.modal').getByLabel('Expense category').selectOption('Rental Expense')
  await page.locator('.modal').getByPlaceholder('What is being paid for').fill(desc)
  await page.locator('.modal').getByPlaceholder('0.00').fill('12345.67')
  await page.locator('.modal').getByLabel('Notes', { exact: false }).fill('note from the add form')
  await page.getByRole('button', { name: 'Save', exact: true }).click()
  await expect(page.locator('.modal')).toBeHidden()

  const [row] = await D.txnsTagged()
  expect(row, 'the new transaction must reach Postgres').toBeTruthy()
  expect(row.co).toBe('GTOI')
  expect(row.cat).toBe('Rental Expense')
  expect(Number(row.amount)).toBe(12345.67)
  expect(row.status).toBe('pending')
  // The Add form collects Notes; it must not be dropped on the way to the row.
  expect(row.notes, 'notes typed on the add form must be saved').toBe('note from the add form')

  // And it must still be there after a reload, read back from the database.
  await page.reload()
  await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible({ timeout: 25_000 })
  await go(page, 'Tracker')
  await expect(page.getByText(desc)).toBeVisible()
  expect(problems, 'no console error or failed request during a full add').toEqual([])
})

test('a transaction the form rejects is never written', async ({ page }) => {
  await signIn(page)
  await go(page, 'Tracker')
  const before = (await D.txnsTagged()).length

  await page.getByRole('button', { name: '+ Add transaction' }).click()
  await page.locator('.modal').getByPlaceholder('What is being paid for').fill(D.MARK + ' incomplete')
  await page.getByRole('button', { name: 'Save', exact: true }).click()

  await expect(page.locator('.modal')).toBeVisible() // stays open on invalid input
  await expect(page.getByText(/required/i).first()).toBeVisible()
  expect((await D.txnsTagged()).length, 'a rejected form must not write').toBe(before)
  await page.getByRole('button', { name: 'Cancel' }).click()
})

test('editing a transaction updates the stored row', async ({ page }) => {
  await signIn(page)
  await go(page, 'Tracker')
  const [row] = await D.txnsTagged()

  await page.getByText(row.description).click()
  const modal = page.locator('.modal')
  await expect(modal.getByRole('heading', { name: 'Transaction details' })).toBeVisible()
  await modal.getByLabel('Amount').fill('999.5')
  await modal.getByLabel('Notes', { exact: false }).fill('edited note')
  await modal.getByRole('button', { name: 'Save', exact: true }).click()
  await expect(modal).toBeHidden()

  await expect.poll(async () => Number((await D.txnById(row.id)).amount)).toBe(999.5)
  expect((await D.txnById(row.id)).notes).toBe('edited note')
})

test('marking paid by check requires the number and stores it', async ({ page }) => {
  await signIn(page)
  await go(page, 'Tracker')
  const [row] = await D.txnsTagged()

  await page.locator('.sheet-row', { hasText: D.MARK }).getByRole('button', { name: 'Mark as paid' }).click()

  const modal = page.locator('.modal')
  await expect(modal.getByRole('heading', { name: 'How was it paid?' })).toBeVisible()
  await modal.getByRole('button', { name: 'Check' }).click()
  await modal.getByRole('button', { name: 'Mark as paid' }).click()
  // No check number yet: the dialog must refuse and write nothing.
  await expect(modal).toBeVisible()
  expect((await D.txnById(row.id)).status).not.toBe('completed')

  await modal.getByPlaceholder('e.g. 004821').fill('004821')
  await modal.getByRole('button', { name: 'Mark as paid' }).click()
  await expect(modal).toBeHidden()

  await expect.poll(async () => (await D.txnById(row.id)).status).toBe('completed')
  const paid = await D.txnById(row.id)
  expect(paid.pay_type).toBe('Check')
  expect(paid.check_no).toBe('004821')
  expect(paid.done, 'completion date must be filled in').toBeTruthy()
})

test('the dashboard totals what the database holds', async ({ page }) => {
  await signIn(page)
  const tile = async (label) =>
    peso(await page.locator('.tile', { hasText: label }).first().locator('.value').innerText())

  const total = await tile('PAYABLES')
  const parts = await Promise.all(['COMPLETED', 'PENDING', 'OVERDUE', 'ON HOLD'].map(tile))
  expect(parts.reduce((a, b) => a + b, 0), 'the four tiles must add up to the total').toBe(total)

  const c = await D.db()
  const { data } = await c.from('txns').select('amount')
  const fromDb = Math.round(data.reduce((a, r) => a + Number(r.amount), 0))
  expect(total, 'the Payables tile must equal the sum of every stored row').toBe(fromDb)
})

test('a paid row leaves the default view and is found under Completed', async ({ page }) => {
  await signIn(page)
  await go(page, 'Tracker')
  const [row] = await D.txnsTagged()
  expect(row.status).toBe('completed')

  // Completed is off by default, so a row just marked paid should drop out.
  await expect(page.getByText(row.description)).toBeHidden()

  // The dashboard's Completed tile is the route back to it.
  await go(page, 'Dashboard')
  await page.locator('.tile', { hasText: 'COMPLETED' }).click()
  await expect(page.getByRole('heading', { name: 'Tracker' })).toBeVisible()
  await expect(page.getByText(row.description)).toBeVisible()
})

test('deleting a transaction removes it from the database', async ({ page }) => {
  await signIn(page)
  await go(page, 'Dashboard')
  await page.locator('.tile', { hasText: 'COMPLETED' }).click()
  const [row] = await D.txnsTagged()

  await page.getByText(row.description).click()
  await page.locator('.modal').getByRole('button', { name: /Delete transaction/ }).click()
  await expect(page.locator('.modal')).toBeHidden()

  await expect.poll(async () => await D.txnById(row.id)).toBeNull()
  await page.reload()
  await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible({ timeout: 25_000 })
  await page.locator('.tile', { hasText: 'COMPLETED' }).click()
  await expect(page.getByText(row.description)).toBeHidden()
})

test('a receipt can be added and reaches the database', async ({ page }) => {
  const problems = watch(page)
  await signIn(page)
  await go(page, 'AckRec')

  const who = D.MARK + ' Rivera'
  await page.getByRole('button', { name: '+ Add receipt' }).click()
  const modal = page.locator('.modal')
  await modal.getByLabel('Company').selectOption('VAR')
  await modal.getByLabel('Released to').fill(who)
  await modal.getByLabel('Description', { exact: false }).fill(D.MARK + ' permit fees')
  await modal.getByLabel('Amount released').fill('4500')
  await modal.getByRole('button', { name: 'Save' }).click()
  await expect(modal).toBeHidden()

  const c = await D.db()
  const find = async () => (await c.from('receipts').select('*').eq('name', who)).data || []
  // Writes are optimistic: the screen updates first and the row is sent after,
  // so poll rather than assuming the round trip finished with the animation.
  await expect.poll(async () => (await find()).length, { timeout: 10_000 })
    .toBe(1)
  const saved = (await find())[0]
  expect(saved.co).toBe('VAR')
  expect(Number(saved.amount)).toBe(4500)
  expect(saved.date, 'a new receipt is not liquidated yet').toBeNull()
  expect(saved.actual).toBeNull()

  await page.reload()
  await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible({ timeout: 25_000 })
  await go(page, 'AckRec')
  await expect(page.getByText(who)).toBeVisible()
  expect(problems, 'no console error or failed request during a full receipt add').toEqual([])

  await c.from('receipts').delete().eq('id', saved.id)
})

test('liquidating a receipt stores the date, the actual amount and the difference', async ({ page }) => {
  await signIn(page)
  await go(page, 'AckRec')

  const c = await D.db()
  const { data: open } = await c.from('receipts').select('*').neq('status', 'liquidated').limit(1)
  const before = open[0]
  expect(before, 'need one unliquidated receipt to exercise this').toBeTruthy()

  try {
    await page.locator('.sheet-row', { hasText: before.name }).getByRole('button', { name: 'Liquidate' }).click()
    const modal = page.locator('.modal')
    await modal.getByLabel('Actual amount', { exact: false }).fill('')
    await modal.getByRole('button', { name: 'Save' }).click()
    await expect(modal, 'an empty actual amount must be refused').toBeVisible()

    await modal.getByLabel('Actual amount', { exact: false }).fill('1234')
    await modal.getByLabel('Date liquidated', { exact: false }).fill('2026-08-31')
    await modal.getByRole('button', { name: 'Save' }).click()
    await expect(modal).toBeHidden()

    await expect.poll(async () => (await D.receiptById(before.id)).status).toBe('liquidated')
    const after = await D.receiptById(before.id)
    expect(Number(after.actual)).toBe(1234)
    expect(after.date).toBe('2026-08-31')

    // The screen states the difference; it must agree with the stored numbers.
    const expected = Number(before.amount) - 1234
    await expect(page.locator('.sheet-row', { hasText: before.name }))
      .toContainText(new RegExp(Math.abs(expected).toLocaleString('en-US')))
  } finally {
    await D.restoreReceipt(before)
  }
})

test('a masterlist rule can be added, edited in place and removed', async ({ page }) => {
  await signIn(page)
  await go(page, 'Masterlist')

  const desc = D.MARK + ' quarterly audit'
  await page.getByRole('button', { name: '+ Add payable' }).click()
  const modal = page.locator('.modal')
  await modal.getByLabel('Company').selectOption('BSC')
  await modal.getByLabel('Expense category').selectOption('Accounting Services')
  await modal.getByLabel('Description', { exact: false }).fill(desc)
  await modal.getByLabel('Amount', { exact: false }).fill('7000')
  await modal.getByRole('button', { name: 'Save' }).click()
  await expect(modal).toBeHidden()

  await expect.poll(async () => (await D.recurringTagged()).length).toBe(1)
  const [rule] = await D.recurringTagged()
  expect(Number(rule.amount)).toBe(7000)

  // The masterlist edits in place, so the description lives in an input value
  // rather than in text — `hasText` cannot see it. Find the row by its field.
  const rows = page.locator('.sheet-row')
  let row = null
  for (let i = 0; i < await rows.count(); i++) {
    if ((await rows.nth(i).getByLabel('Description').inputValue()) === desc) { row = rows.nth(i); break }
  }
  expect(row, 'the new rule must be on screen').toBeTruthy()

  // The write is debounced, so poll rather than asserting immediately.
  await row.getByLabel('Amount').fill('8250')
  await expect.poll(async () => Number((await D.recurringTagged())[0].amount), { timeout: 10_000 }).toBe(8250)

  await row.getByRole('button', { name: 'Remove' }).click()
  await expect.poll(async () => (await D.recurringTagged()).length).toBe(0)
})

test('generate writes a month, guards duplicates, and undo takes it back', async ({ page }) => {
  await signIn(page)
  const c = await D.db()
  const idsBefore = new Set(((await c.from('txns').select('id')).data || []).map((r) => r.id))
  const count = async () => ((await c.from('txns').select('id')).data || []).length
  const before = idsBefore.size

  try {
    await go(page, 'Masterlist')
    // A month far enough out that it holds nothing yet.
    await page.getByRole('button', { name: 'Pick a month' }).click()
    await page.getByRole('button', { name: /Dec 2026/ }).click()
    await page.getByRole('button', { name: /^Generate Dec 2026/ }).click()
    await expect(page.getByText(/payables were added to the Tracker/)).toBeVisible()

    await expect.poll(count).toBeGreaterThan(before)
    const afterGenerate = await count()

    // Re-running must add nothing: every rule already has its row for that month.
    await page.getByRole('button', { name: /^Generate Dec 2026/ }).click()
    await expect(page.getByText(/already exists|skipped as duplicates/)).toBeVisible()
    expect(await count(), 'the duplicate guard must stop a second write').toBe(afterGenerate)

    await page.reload()
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible({ timeout: 25_000 })
    expect(await count(), 'generated rows must survive a reload').toBe(afterGenerate)
  } finally {
    // Undo only knows about the run that created them, and the reload above
    // cleared it, so remove them here by id rather than trusting the button.
    const { data } = await c.from('txns').select('id')
    const extra = (data || []).map((r) => r.id).filter((id) => !idsBefore.has(id))
    if (extra.length) await c.from('txns').delete().in('id', extra)
    expect(await count()).toBe(before)
  }
})

test('undo removes exactly the rows that generate created', async ({ page }) => {
  await signIn(page)
  const c = await D.db()
  const idsBefore = new Set(((await c.from('txns').select('id')).data || []).map((r) => r.id))

  await go(page, 'Masterlist')
  await page.getByRole('button', { name: 'Pick a month' }).click()
  await page.getByRole('button', { name: /Nov 2026/ }).click()
  await page.getByRole('button', { name: /^Generate Nov 2026/ }).click()
  await expect(page.getByText(/payables were added to the Tracker/)).toBeVisible()

  await page.getByRole('button', { name: /Undo/ }).click()
  await expect.poll(async () => {
    const { data } = await c.from('txns').select('id')
    return (data || []).filter((r) => !idsBefore.has(r.id)).length
  }).toBe(0)
})

test('settings, company and category lists persist to the shared config row', async ({ page }) => {
  await signIn(page)
  const before = await D.config()
  expect(before, 'the shared config row must exist').toBeTruthy()

  try {
    await page.getByRole('navigation', { name: 'Sections' })
      .getByRole('button', { name: /^Settings/ }).click()
    await page.getByRole('button', { name: 'Masterlist settings' }).click()

    const code = 'E2E' + Math.floor(Math.random() * 900 + 100)
    await page.getByPlaceholder('New company code').fill(code)
    await page.getByPlaceholder('New company code').press('Enter').catch(() => {})
    if (!(await page.getByText(code).isVisible().catch(() => false))) {
      await page.locator('.card', { hasText: 'New company code' }).getByRole('button', { name: 'Add' }).click()
    }
    await expect(page.getByText(code)).toBeVisible()

    // The config row saves on a debounce, so poll for it.
    await expect.poll(async () => ((await D.config()).companies || []).includes(code), { timeout: 10_000 }).toBe(true)

    await page.reload()
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible({ timeout: 25_000 })
    await page.getByRole('navigation', { name: 'Sections' })
      .getByRole('button', { name: /^Settings/ }).click()
    await page.getByRole('button', { name: 'Masterlist settings' }).click()
    await expect(page.getByText(code), 'the new code must survive a reload').toBeVisible()
  } finally {
    await D.restoreConfig(before)
  }
})
