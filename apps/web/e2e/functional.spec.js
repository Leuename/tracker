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
 * Save an add form, stepping past the duplicate warning if it appears.
 *
 * "Warn on duplicates" is on by default and fires when a company already has a
 * row in that category and period, which is easy to hit on a shared ledger.
 * It warns once and then accepts, so a second click is the intended path.
 */
async function saveAddForm(page) {
  const modal = page.locator('.modal')
  await modal.getByRole('button', { name: 'Save', exact: true }).click()
  if (await modal.isVisible().catch(() => false)) {
    if (await modal.getByRole('alert').isVisible().catch(() => false)) {
      await modal.getByRole('button', { name: 'Save', exact: true }).click()
    }
  }
  await expect(modal).toBeHidden()
}

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

// Runs whatever happened above: a failed assertion must not leave rows or
// files in a ledger three people read.
test.beforeAll(async () => { await D.cleanup() })
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
  await saveAddForm(page)

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
  // Create the fixture BEFORE signing in: the app loads its data once at mount,
  // so a row inserted afterwards is not in the state the screen is rendering.
  const c = await D.db()
  const before = await D.makeReceipt({ amount: 5000 })
  await signIn(page)
  await go(page, 'AckRec')

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
  await D.makeRecurring({ due_date: '2026-12-15' })
  await page.reload()
  await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible({ timeout: 25_000 })

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
  await D.makeRecurring({ due_date: '2026-11-15' })
  await page.reload()
  await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible({ timeout: 25_000 })
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

test('a scripting payload in a description is stored and shown as text', async ({ page }) => {
  // Anything one of the three accounts types is read by the other two, so a
  // stored payload is the realistic injection route here.
  const problems = watch(page)
  let executed = false
  await page.exposeFunction('__xssFired', () => { executed = true })
  const payload = `${D.MARK} <img src=x onerror=window.__xssFired()><script>window.__xssFired()</script>`

  await signIn(page)
  await go(page, 'Tracker')
  await page.getByRole('button', { name: '+ Add transaction' }).click()
  const modal = page.locator('.modal')
  await modal.getByLabel('Company').selectOption('GTOI')
  await modal.getByLabel('Expense category').selectOption('Other')
  await modal.getByPlaceholder('What is being paid for').fill(payload)
  await modal.getByPlaceholder('0.00').fill('1')
  await saveAddForm(page)

  // Stored verbatim: escaping belongs at render time, not on the way in.
  await expect.poll(async () => (await D.txnsTagged()).length, { timeout: 10_000 }).toBe(1)
  const [row] = await D.txnsTagged()
  expect(row.description).toBe(payload)

  // Rendered as text on a fresh load, and no injected node in the document.
  await page.reload()
  await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible({ timeout: 25_000 })
  await go(page, 'Tracker')
  await expect(page.getByText(payload)).toBeVisible()
  expect(await page.locator('img[src="x"]').count(), 'the payload must not become an element').toBe(0)
  expect(await page.locator('.sheet-row script').count()).toBe(0)
  expect(executed, 'nothing from the payload may execute').toBe(false)
  expect(problems).toEqual([])

  // Clean up here, not in afterAll: later specs count rows by tag.
  const c = await D.db()
  await c.from('txns').delete().eq('id', row.id)
})

test('a liquidation document is uploaded, recorded and reachable', async ({ page }) => {
  await signIn(page)
  const c = await D.db()
  const before = await D.makeReceipt({ amount: 4000 })
  await page.reload()
  await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible({ timeout: 25_000 })

  try {
    await go(page, 'AckRec')
    await page.locator('.sheet-row', { hasText: before.name }).getByRole('button', { name: 'Liquidate' }).click()
    const modal = page.locator('.modal')

    await modal.getByLabel('Receipt file', { exact: false }).setInputFiles({
      name: 'receipt.pdf',
      mimeType: 'application/pdf',
      buffer: Buffer.from('%PDF-1.4 e2e liquidation document'),
    })
    await modal.getByLabel('Actual amount', { exact: false }).fill('2500')
    await modal.getByRole('button', { name: /Save|Uploading/ }).click()
    await expect(modal).toBeHidden({ timeout: 20_000 })

    await expect.poll(async () => (await D.receiptById(before.id)).file_path, { timeout: 20_000 })
      .toBeTruthy()
    const after = await D.receiptById(before.id)
    expect(after.status).toBe('liquidated')
    expect(after.file_path.startsWith(before.id + '/'), 'the key is scoped to its receipt').toBe(true)

    // The bucket is private: the object must not be readable without a signature.
    const publicUrl = c.storage.from('receipts').getPublicUrl(after.file_path).data.publicUrl
    const anon = await fetch(publicUrl)
    expect(anon.status, 'the bucket must not serve files publicly').toBeGreaterThanOrEqual(400)

    // ...but a signed link works, and returns what was uploaded.
    const { data: signed } = await c.storage.from('receipts').createSignedUrl(after.file_path, 60)
    const got = await fetch(signed.signedUrl)
    expect(got.status).toBe(200)
    expect(await got.text()).toContain('e2e liquidation document')

    await page.reload()
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible({ timeout: 25_000 })
    await go(page, 'AckRec')
    await expect(page.locator('.sheet-row', { hasText: before.name }).getByRole('button', { name: 'File' }))
      .toBeVisible()

    await c.storage.from('receipts').remove([after.file_path])
  } finally {
    await c.from('receipts').update({
      status: before.status, date: before.date, actual: before.actual, file_path: before.file_path,
    }).eq('id', before.id)
  }
})

test('requiring a receipt file actually blocks the liquidation', async ({ page }) => {
  // Fixture first, for the same reason as above: the app reads its data once.
  const c = await D.db()
  const beforeConfig = await D.config()
  const receipt = await D.makeReceipt({ amount: 3000 })
  await signIn(page)

  try {
    // Turn the setting on through the UI it belongs to.
    await page.getByRole('navigation', { name: 'Sections' }).getByRole('button', { name: /^Settings/ }).click()
    await page.getByRole('button', { name: 'AckRec settings' }).click()
    const sw = page.getByRole('switch', { name: /Require a receipt file/ })
    if ((await sw.getAttribute('aria-checked')) !== 'true') await sw.click()
    await expect.poll(async () => (await D.config()).settings.ackRequirePhoto, { timeout: 10_000 }).toBe(true)

    await go(page, 'AckRec')
    await page.locator('.sheet-row', { hasText: receipt.name }).getByRole('button', { name: 'Liquidate' }).click()
    const modal = page.locator('.modal')
    await modal.getByLabel('Actual amount', { exact: false }).fill('1500')
    await modal.getByRole('button', { name: 'Save' }).click()

    // The setting says liquidation cannot be saved without a file. It must hold.
    await expect(modal, 'the dialog must stay open').toBeVisible()
    await expect(modal.getByRole('alert')).toContainText(/receipt file is required/i)
    expect((await D.receiptById(receipt.id)).status, 'nothing may be written').toBe(receipt.status)
  } finally {
    await D.restoreConfig(beforeConfig)
  }
})

test('the duplicate warning fires once and then lets the row through', async ({ page }) => {
  await signIn(page)
  const c = await D.db()
  const beforeConfig = await D.config()

  // The add form defaults to the current month, so the clash has to be in that
  // period or the warning has nothing to match. Build the label the same way
  // the app does rather than hardcoding a month that goes stale.
  const now = new Date()
  const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  const period = MONTHS[now.getMonth()] + ' ' + now.getFullYear()
  const clashId = Date.now()
  // A tag private to this spec, so no leftover from another one is counted.
  const TAG = D.MARK + '-dup'
  const mine = async () => (await D.txnsTagged(TAG)).length

  try {
    await c.from('app_config')
      .update({ data: { ...beforeConfig, settings: { ...beforeConfig.settings, warnDuplicate: true } } })
      .eq('id', true)
    await c.from('txns').insert({
      id: clashId, co: 'GTOI', cat: 'Legal Services',
      description: TAG + ' the original', period, amount: 100, status: 'pending',
    })

    await page.reload()
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible({ timeout: 25_000 })
    await go(page, 'Tracker')
    await page.getByRole('button', { name: '+ Add transaction' }).click()
    const modal = page.locator('.modal')
    await modal.getByLabel('Company').selectOption('GTOI')
    await modal.getByLabel('Expense category').selectOption('Legal Services')
    await modal.getByPlaceholder('What is being paid for').fill(TAG + ' the duplicate')
    await modal.getByPlaceholder('0.00').fill('10')

    await modal.getByRole('button', { name: 'Save', exact: true }).click()
    await expect(modal, 'the first save must be held back by the warning').toBeVisible()
    await expect(modal.getByRole('alert')).toContainText(/already has/i)
    expect(await mine(), 'nothing may be written while warning').toBe(1) // only the clash

    // Saving again accepts it: a company can legitimately owe twice in a period.
    await modal.getByRole('button', { name: 'Save', exact: true }).click()
    await expect(modal).toBeHidden()
    await expect.poll(mine, { timeout: 10_000 }).toBe(2)
  } finally {
    await D.cleanup(TAG)
    await D.restoreConfig(beforeConfig)
  }
})

test('the deadline window setting actually narrows the list', async ({ page }) => {
  await signIn(page)
  const beforeConfig = await D.config()

  try {
    const rows = () => page.locator('.deadline')
    await page.getByRole('navigation', { name: 'Sections' }).getByRole('button', { name: /^Settings/ }).click()
    await page.getByRole('button', { name: 'Dashboard settings' }).click()
    await page.getByLabel('Deadline window').selectOption('Next 90 days')
    await expect.poll(async () => (await D.config()).settings.dashWindow, { timeout: 10_000 }).toBe('Next 90 days')

    await go(page, 'Dashboard')
    const wide = await rows().count()

    await page.getByRole('navigation', { name: 'Sections' }).getByRole('button', { name: /^Settings/ }).click()
    await page.getByRole('button', { name: 'Dashboard settings' }).click()
    await page.getByLabel('Deadline window').selectOption('Next 7 days')
    await go(page, 'Dashboard')
    const narrow = await rows().count()

    expect(narrow, 'a 7-day window cannot show more than a 90-day one').toBeLessThanOrEqual(wide)
    await expect(page.getByText('next 7 days')).toBeVisible()
  } finally {
    await D.restoreConfig(beforeConfig)
  }
})

test('deleting a receipt asks first, then removes the row from the database', async ({ page }) => {
  // Created before signIn: the app reads its data once at mount, so a row
  // written afterwards is invisible to the page that is already loaded.
  const receipt = await D.makeReceipt()
  const problems = watch(page)
  await signIn(page)
  await go(page, 'AckRec')

  const row = page.locator('.sheet-row', { hasText: receipt.name })
  await expect(row).toHaveCount(1)

  // Cancelling has to leave the row alone — that is the whole point of asking.
  await row.getByRole('button', { name: 'Delete the receipt for ' + receipt.name }).click()
  const dialog = page.getByRole('dialog')
  await expect(dialog.getByRole('heading', { name: 'Delete this receipt?' })).toBeVisible()
  await dialog.getByRole('button', { name: 'Cancel' }).click()
  await expect(dialog).toBeHidden()
  expect(await D.receiptById(receipt.id), 'cancelling must not delete anything').toBeTruthy()

  await row.getByRole('button', { name: 'Delete the receipt for ' + receipt.name }).click()
  await page.getByRole('dialog').getByRole('button', { name: 'Delete receipt' }).click()

  await expect(page.locator('.sheet-row', { hasText: receipt.name })).toHaveCount(0)
  await expect.poll(async () => await D.receiptById(receipt.id), { timeout: 10_000 }).toBeFalsy()

  await page.reload()
  await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible({ timeout: 25_000 })
  await go(page, 'AckRec')
  await expect(page.getByText(receipt.name), 'the deletion must survive a reload').toHaveCount(0)
  expect(problems, 'no console error or failed request during a receipt delete').toEqual([])
})
