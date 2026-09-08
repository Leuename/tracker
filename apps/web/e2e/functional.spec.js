import { expect, test } from '@playwright/test'
import * as D from './db.js'
import { dstr, monthKeys, monthLabel } from '../src/logic.js'

test.skip(!D.haveCredentials(), 'Set E2E_EMAIL, E2E_PASSWORD and the two VITE_ variables.')
test.describe.configure({ mode: 'serial' }) // one shared ledger; parallel specs would collide

// The session comes from the storage state e2e/auth.setup.js saves once per run
// with tracing off; nothing in this file types a password. The old fallback that
// filled the form when it was visible is gone on purpose — this is the suite
// that fails most often, and a `fill()` here is a password in a failure trace.
// A snapshot that did not load now fails here loudly instead.
async function signIn(page) {
  await page.goto('/')
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
 * Add one tagged pending row through the UI and return it.
 *
 * The specs below share a single `MARK`-tagged transaction, which is fine until
 * one of them marks it paid — everything after that is then acting on a
 * completed row. A spec that needs a fresh pending row asks for its own here.
 * The description still carries `MARK`, so the sweep in `D.cleanup` still
 * removes it.
 */
async function addPendingRow(page, suffix) {
  const desc = D.MARK + ' ' + suffix
  await page.getByRole('button', { name: '+ Add transaction' }).click()
  await page.locator('.modal').getByLabel('Company').selectOption('GTOI')
  await page.locator('.modal').getByLabel('Expense category').selectOption('Rental Expense')
  await page.locator('.modal').getByPlaceholder('What is being paid for').fill(desc)
  await page.locator('.modal').getByPlaceholder('0.00').fill('500')
  await saveAddForm(page)
  await expect.poll(async () => (await D.txnsTagged(desc)).length, { timeout: 10_000 }).toBe(1)
  const [row] = await D.txnsTagged(desc)
  return row
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
test.beforeAll(async () => {
  await D.cleanup()
  // A previous run killed mid-spec never ran its `finally`, so a setting it
  // toggled can still be on — in the owner's live config, not just the test's.
  const released = await D.releaseHeld()
  if (released) console.warn('[e2e] gave back what an interrupted run was holding:', released.join(', '))
})
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

  // Writes are optimistic — the dialog closes on the reducer, and the row is
  // sent after — so poll for it rather than reading once and calling a race a
  // defect. Every other spec here polls; this one did not, and failed on a
  // slow round trip while the code was working correctly.
  await expect.poll(async () => (await D.txnsTagged()).length, { timeout: 10_000 }).toBe(1)

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

// The number used to be mandatory. It is not any more: a check written today
// often has no number to hand, and refusing the payment over it left the row
// reading pending while the money had already gone out. What still has to hold
// is that a number, once typed, is the number that gets stored.
test('marking paid by check stores the number, and no longer demands one', async ({ page }) => {
  await signIn(page)
  await go(page, 'Tracker')
  const [row] = await D.txnsTagged()

  await page.locator('.sheet-row', { hasText: D.MARK }).getByRole('button', { name: 'Mark as paid' }).click()

  const modal = page.locator('.modal')
  await expect(modal.getByRole('heading', { name: 'How was it paid?' })).toBeVisible()
  await modal.getByRole('button', { name: 'Check' }).click()
  await modal.getByPlaceholder('e.g. 004821').fill('004821')
  await modal.getByRole('button', { name: 'Mark as paid' }).click()
  await expect(modal).toBeHidden()

  await expect.poll(async () => (await D.txnById(row.id)).status).toBe('completed')
  const paid = await D.txnById(row.id)
  expect(paid.pay_type).toBe('Check')
  expect(paid.check_no).toBe('004821')
  expect(paid.done, 'completion date must be filled in').toBeTruthy()
})

// The reversed rule, pinned on its own row so a regression to "required" fails
// rather than passing quietly because the earlier spec filled the field in.
test('a check with no number still marks the row paid', async ({ page }) => {
  await signIn(page)
  await go(page, 'Tracker')
  const row = await addPendingRow(page, 'unnumbered check')

  await page.locator('.sheet-row', { hasText: row.description })
    .getByRole('button', { name: 'Mark as paid' }).click()

  const modal = page.locator('.modal')
  await modal.getByRole('button', { name: 'Check' }).click()
  await modal.getByRole('button', { name: 'Mark as paid' }).click()
  await expect(modal).toBeHidden()

  await expect.poll(async () => (await D.txnById(row.id)).status).toBe('completed')
  const paid = await D.txnById(row.id)
  expect(paid.pay_type).toBe('Check')
  expect(paid.check_no ?? '').toBe('')
})

// The charge is folded into `amount`, so the row totals what actually left the
// account, and kept in `fee` so the sheet can still name it.
test('an e-cash charge is added into the amount and recorded separately', async ({ page }) => {
  await signIn(page)
  await go(page, 'Tracker')
  const row = await addPendingRow(page, 'ecash charge')
  const before = Number(row.amount)

  await page.locator('.sheet-row', { hasText: row.description })
    .getByRole('button', { name: 'Mark as paid' }).click()

  const modal = page.locator('.modal')
  await modal.getByRole('button', { name: 'E-cash' }).click()
  await modal.getByPlaceholder('0.00').fill('25')
  await expect(modal).toContainText('Recorded amount')
  await modal.getByRole('button', { name: 'Mark as paid' }).click()
  await expect(modal).toBeHidden()

  await expect.poll(async () => (await D.txnById(row.id)).status).toBe('completed')
  const paid = await D.txnById(row.id)
  expect(paid.pay_type).toBe('E-cash')
  expect(Number(paid.fee)).toBe(25)
  expect(Number(paid.amount), 'the charge has to be inside the amount').toBe(before + 25)
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
    await page.getByRole('button', { name: /^Dec 2026/ }).click()
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

test('generated occurrence identity survives visible due and period edits', async ({ page }) => {
  const c = await D.db()
  const probe = await c.from('txns').select('occurrence_due').limit(1)
  test.skip(probe.error && ['PGRST204', '42703'].includes(String(probe.error.code)),
    'occurrence identity migration is not applied on this deployment')

  const desc = D.MARK + ' occurrence identity'
  const rule = await D.makeRecurring({ description: desc, due_date: '2026-12-15', amount: 1000 })
  try {
    await signIn(page)
    await go(page, 'Masterlist')
    await page.getByRole('button', { name: 'Pick a month' }).click()
    await page.getByRole('button', { name: /^Dec 2026/ }).click()
    await page.getByRole('button', { name: /^Generate Dec 2026/ }).click()
    await expect.poll(async () => (await D.txnsTagged(desc)).length, { timeout: 10_000 }).toBe(1)

    const [before] = await D.txnsTagged(desc)
    expect(before.src).toBe(rule.id)
    expect(before.occurrence_due).toBe('2026-12-15')

    await go(page, 'Tracker')
    await page.locator('.sheet-row', { hasText: desc }).click()
    const modal = page.getByRole('dialog')
    await modal.getByLabel('Due date').fill('2026-12-20')
    await modal.getByLabel('Period covered').click()
    await modal.locator('input[type="month"]').fill('2027-01')
    await modal.getByRole('button', { name: 'Apply' }).click()
    await modal.getByRole('button', { name: 'Save', exact: true }).click()
    await expect(modal).toBeHidden()

    await expect.poll(async () => {
      const row = await D.txnById(before.id)
      return row && row.due + '|' + row.period
    }, { timeout: 10_000 }).toBe('2026-12-20|Jan 2027')
    const edited = await D.txnById(before.id)
    expect(edited.occurrence_due, 'visible edits must not alter occurrence identity').toBe('2026-12-15')

    await go(page, 'Masterlist')
    await page.getByRole('button', { name: 'Pick a month' }).click()
    await page.getByRole('button', { name: /^Dec 2026/ }).click()
    await page.getByRole('button', { name: /^Generate Dec 2026/ }).click()
    await expect(page.getByText(/already exists|In sync/).first()).toBeVisible()
    const rows = await D.txnsTagged(desc)
    expect(rows).toHaveLength(1)
    expect(rows[0].src).toBe(rule.id)
    expect(rows[0].occurrence_due).toBe('2026-12-15')
  } finally {
    await D.cleanup()
  }
})

// ROUND 27, finding 1. `coverageFor` scoped coverage by parsing the month back
// out of the period label with `MON.indexOf('Oct')` against an uppercase `MON`,
// so the scope was null for all twelve months and every linked row of a payable
// counted as coverage for whatever month was being generated. A monthly payable
// generated once and then reported "already exists" forever — on this button,
// in the nightly job, and on the Dashboard, all reading the same function.
//
// The offline suite missed it because every coverage assertion used a single
// month, and so did every e2e spec. This one uses two, against the deployed
// bundle and the real unique index, because that is the combination that was
// green while production was wrong.
test('a monthly payable generates in each month, not only the first', async ({ page }) => {
  // The months are taken from the app's own Generate menu rather than written
  // in. `TODAY` is `localToday()`, not a frozen constant, so the menu is a
  // rolling thirteen months and any hardcoded pair eventually falls out of it —
  // the spec would then fail on a locator that no longer resolves, months after
  // anyone remembered why. Mid-window keeps both inside it whenever this runs.
  const [firstKey, secondKey] = monthKeys().slice(6, 8)
  const [firstLabel, secondLabel] = [monthLabel(firstKey), monthLabel(secondKey)]

  const desc = D.MARK + ' two months'
  const rule = await D.makeRecurring({ description: desc, due_date: firstKey + '-12', amount: 700 })
  try {
    await signIn(page)
    await go(page, 'Masterlist')

    // Waits for the banner to name THIS month rather than just to be visible.
    // The previous generate's banner is still on screen, so `toBeVisible()`
    // resolves instantly against stale text and the read comes back describing
    // the wrong month. `toContainText` retries until the screen catches up, and
    // still fails if it never does.
    const generate = async (label) => {
      await page.getByRole('button', { name: 'Pick a month' }).click()
      await page.getByRole('button', { name: new RegExp('^' + label) }).click()
      await page.getByRole('button', { name: new RegExp('^Generate ' + label) }).click()
      const banner = page.locator('.banner').first()
      await expect(banner, label + ' must raise its own banner').toContainText(label, { timeout: 15_000 })
      return (await banner.textContent()) || ''
    }

    // Both months must actually write. Asserted without swallowing the
    // rejection: the first version of this was
    // `.not.toBeVisible().catch(() => {})`, which cannot fail — trap 104,
    // introduced while fixing trap 104.
    //
    // The banner must NAME its month. Matching only /added to the Tracker/ let
    // a stale banner from the previous generate satisfy the assertion, because
    // both months produce the same sentence — a second, weaker version of the
    // same mistake, caught by running it.
    expect(await generate(firstLabel)).toMatch(/added to the Tracker/)
    expect(await generate(secondLabel), secondLabel + ' must not be reported as covered by ' + firstLabel)
      .toMatch(/added to the Tracker/)

    await expect.poll(async () => (await D.txnsTagged(desc)).length, { timeout: 10_000 }).toBe(2)
    const rows = (await D.txnsTagged(desc)).sort((a, b) => (a.occurrence_due < b.occurrence_due ? -1 : 1))
    expect(rows.map((r) => r.occurrence_due)).toEqual([firstKey + '-12', secondKey + '-12'])
    for (const r of rows) expect(r.src).toBe(rule.id)

    // And re-running the first month must add nothing — the fix must not have
    // traded under-generating for double-billing. A no-op generate raises no new
    // banner, so the ledger is the assertion here, not the screen.
    await page.getByRole('button', { name: 'Pick a month' }).click()
    await page.getByRole('button', { name: new RegExp('^' + firstLabel) }).click()
    await page.getByRole('button', { name: new RegExp('^Generate ' + firstLabel) }).click()
    await expect(page.getByText(/already exists|In sync/).first()).toBeVisible()
    await page.waitForTimeout(1000)
    expect(await D.txnsTagged(desc), 'a repeat generate must not add a second liability').toHaveLength(2)
  } finally {
    await D.cleanup()
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
  await page.getByRole('button', { name: /^Nov 2026/ }).click()
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
  // Both lists, not just settings: a killed run that leaves an `E2E###` code in
  // the shared company list puts it in every company dropdown in the app, and
  // `cleanup` cannot reach `app_config`.
  await D.hold(['companies', 'categories'])

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
    await D.releaseHeld()
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
  //
  // Asserted on THIS row, not on how many rows carry the run's tag. Counting
  // made the spec depend on every earlier spec having finished cleaning up —
  // an assumption that held until `load()` grew one more request and the timing
  // shifted, at which point it failed roughly every other run with
  // `Expected: 1, Received: 3`. The payload is unique; look for it directly.
  await expect
    .poll(async () => (await D.txnsTagged()).some((t) => t.description === payload),
      { timeout: 10_000 })
    .toBe(true)
  const row = (await D.txnsTagged()).find((t) => t.description === payload)

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
  const receipt = await D.makeReceipt({ amount: 3000 })
  // Record the value before touching it, so a kill here is recoverable.
  await D.hold(['settings.ackRequirePhoto'])
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
    await D.releaseHeld()
  }
})

test('the duplicate warning fires once and then lets the row through', async ({ page }) => {
  await signIn(page)
  const c = await D.db()

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

  await D.hold(['settings.warnDuplicate'])
  try {
    // Through the merge function, not a whole-document update. This spec was
    // still doing the very write that `restoreConfig` was deleted for: it read
    // the config, spread it, and wrote the whole document back — so anything
    // the owner changed in that window was silently discarded, and it bypassed
    // the viewer guard the hardening migration added.
    const { error: mergeError } = await c.rpc('merge_app_config', { patch: { settings: { warnDuplicate: true } } })
    if (mergeError) throw mergeError
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
    await D.releaseHeld()
  }
})

test('the deadline window setting actually narrows the list', async ({ page }) => {
  await signIn(page)
  // This one changes a setting too. Without the hold, a killed run leaves the
  // owner's dashboard stuck on whatever window the spec set last.
  await D.hold(['settings.dashWindow'])

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
    await D.releaseHeld()
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

test('a receipt can be edited in place, the way a transaction can', async ({ page }) => {
  const receipt = await D.makeReceipt()
  const problems = watch(page)
  await signIn(page)
  await go(page, 'AckRec')

  // Click the name cell, not the row. A row click lands on its centre, which
  // is the status select — and that deliberately stops propagation, or every
  // status change would open a form on top of the change being made.
  const row = page.locator('.sheet-row', { hasText: receipt.name })
  await row.getByText(receipt.name, { exact: true }).click()
  const modal = page.getByRole('dialog')
  await expect(modal.getByRole('heading', { name: 'Receipt details' })).toBeVisible()

  const renamed = receipt.name + ' edited'
  await modal.getByLabel('Released to').fill(renamed)
  await modal.getByLabel('Amount released').fill('7250')
  await modal.getByRole('button', { name: 'Save' }).click()
  await expect(modal).toBeHidden()

  await expect.poll(async () => {
    const row = await D.receiptById(receipt.id)
    return row && [row.name, Number(row.amount)]
  }, { timeout: 10_000 }).toEqual([renamed, 7250])

  // A liquidated receipt without its figures is not a state the form may save.
  await page.locator('.sheet-row', { hasText: renamed }).getByText(renamed, { exact: true }).click()
  await page.getByRole('dialog').getByLabel('Status').selectOption('liquidated')
  await page.getByRole('dialog').getByLabel('Actual amount').fill('')
  await page.getByRole('dialog').getByRole('button', { name: 'Save' }).click()
  await expect(page.getByText('A liquidated receipt needs both the date and the actual amount.')).toBeVisible()
  await page.getByRole('dialog').getByRole('button', { name: 'Cancel' }).click()

  const stillOpen = await D.receiptById(receipt.id)
  expect(stillOpen.status, 'a rejected edit must not have been written').toBe('released')

  expect(problems, 'no console error or failed request while editing a receipt').toEqual([])
  await D.cleanup()
})

test('a telegraphic transfer is added, edited in place, and edited in the form', async ({ page }) => {
  const problems = watch(page)
  await signIn(page)
  await go(page, 'Telegraphic')

  const who = D.MARK + ' Sumitomo Metals'
  await page.getByRole('button', { name: '+ Add transfer' }).click()
  const modal = page.locator('.modal')
  await modal.getByLabel('Company').selectOption('GTOI')
  await modal.getByLabel('Beneficiary').fill(who)
  await modal.getByLabel('Currency').selectOption('GBP')
  await modal.getByLabel('Amount').fill('38200')
  await modal.getByLabel('Note').fill(D.MARK + ' steel order')
  await modal.getByRole('button', { name: 'Save' }).click()
  await expect(modal).toBeHidden()

  const c = await D.db()
  const find = async () => (await c.from('transfers').select('*').eq('name', who)).data || []
  await expect.poll(async () => (await find()).length, { timeout: 10_000 }).toBe(1)
  const saved = (await find())[0]
  expect(saved.co).toBe('GTOI')
  expect(saved.cur, 'the wire stores the currency it is sent in').toBe('GBP')
  expect(Number(saved.amount), 'the amount is not converted on the way in').toBe(38200)
  expect(saved.status).toBe('pending')

  // The row prints in its own currency, never in pesos.
  const row = page.locator('.sheet-row', { hasText: who })
  await expect(row.getByText('£38,200')).toBeVisible()

  // Status is editable in place, and the write is coalesced, so poll for it.
  await row.getByLabel('Status for ' + who).selectOption('released')
  await expect.poll(async () => (await D.transferById(saved.id)).status, { timeout: 10_000 }).toBe('released')

  // The form reaches what the sheet cannot: company, beneficiary and amount.
  await row.getByText(who, { exact: true }).click()
  const form = page.getByRole('dialog')
  await expect(form.getByRole('heading', { name: 'Transfer details' })).toBeVisible()
  await form.getByLabel('Amount').fill('41000')
  await form.getByRole('button', { name: 'Save' }).click()
  await expect(form).toBeHidden()
  await expect.poll(async () => Number((await D.transferById(saved.id)).amount), { timeout: 10_000 }).toBe(41000)

  // A transfer with no beneficiary is not a state the form may save.
  await page.locator('.sheet-row', { hasText: who }).getByText(who, { exact: true }).click()
  await page.getByRole('dialog').getByLabel('Beneficiary').fill('')
  await page.getByRole('dialog').getByRole('button', { name: 'Save' }).click()
  await expect(page.getByText('Company, beneficiary and a positive amount are required.')).toBeVisible()
  await page.getByRole('dialog').getByRole('button', { name: 'Cancel' }).click()

  await page.reload()
  await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible({ timeout: 25_000 })
  await go(page, 'Telegraphic')
  await expect(page.getByText(who), 'the transfer must survive a reload').toBeVisible()

  expect(problems, 'no console error or failed request across a transfer').toEqual([])
  await D.cleanup()
})

// The invoice number is its own column, not a convention inside the note. This
// checks both survive the same wire independently — the failure this guards
// against is one field's value landing in the other's column.
test('a wire records an invoice number beside its note, and both survive', async ({ page }) => {
  await signIn(page)
  await go(page, 'Telegraphic')

  const who = D.MARK + ' Helvetia Instruments'
  await page.getByRole('button', { name: '+ Add transfer' }).click()
  const modal = page.locator('.modal')
  await modal.getByLabel('Company').selectOption('GTOI')
  await modal.getByLabel('Beneficiary').fill(who)
  await modal.getByLabel('Currency').selectOption('EUR')
  await modal.getByLabel('Amount').fill('16400')
  await modal.getByLabel('Inv No').fill('HI-2026-0442')
  await modal.getByLabel('Note', { exact: false }).fill(D.MARK + ' awaiting signed invoice')
  await modal.getByRole('button', { name: 'Save' }).click()
  await expect(modal).toBeHidden()

  const c = await D.db()
  const find = async () => (await c.from('transfers').select('*').eq('name', who)).data || []
  await expect.poll(async () => (await find()).length, { timeout: 10_000 }).toBe(1)
  const saved = (await find())[0]
  expect(saved.inv, 'the invoice number reaches its own column').toBe('HI-2026-0442')
  expect(saved.note, 'the note is untouched by it').toBe(D.MARK + ' awaiting signed invoice')

  // Editable in place on the sheet, like the note beside it.
  const row = page.locator('.sheet-row', { hasText: who })
  await row.getByLabel('Invoice number for ' + who).fill('HI-2026-0999')
  await expect.poll(async () => (await D.transferById(saved.id)).inv, { timeout: 10_000 }).toBe('HI-2026-0999')
  expect((await D.transferById(saved.id)).note, 'editing one must not clear the other')
    .toBe(D.MARK + ' awaiting signed invoice')

  // A leading zero is data, not a number to be normalised away.
  await row.getByLabel('Invoice number for ' + who).fill('004821')
  await expect.poll(async () => (await D.transferById(saved.id)).inv, { timeout: 10_000 }).toBe('004821')

  await D.cleanup()
})

/**
 * Reported from the live app: typing a space into a sheet note opened the
 * transaction mid-sentence. The row is operable by keyboard, so it answers
 * Enter and Space; the controls inside it stopped clicks but not keystrokes, so
 * the space bubbled up to the row.
 *
 * Asserted as "no dialog appeared and the text arrived intact", because the two
 * halves fail separately: a guard that swallowed the keystroke would stop the
 * dialog and lose the space.
 */
test('typing a space into a sheet field does not open the row', async ({ page }) => {
  await signIn(page)
  await go(page, 'Telegraphic')

  const who = D.MARK + ' Pacific Freight'
  await page.getByRole('button', { name: '+ Add transfer' }).click()
  const modal = page.locator('.modal')
  await modal.getByLabel('Company').selectOption('GTOI')
  await modal.getByLabel('Beneficiary').fill(who)
  await modal.getByLabel('Amount').fill('28500')
  await modal.getByRole('button', { name: 'Save' }).click()
  await expect(modal).toBeHidden()

  const c = await D.db()
  await expect.poll(async () => ((await c.from('transfers').select('id').eq('name', who)).data || []).length,
    { timeout: 10_000 }).toBe(1)

  const row = page.locator('.sheet-row', { hasText: who })
  const note = row.getByLabel('Note for ' + who)
  await note.click()
  await note.pressSequentially('awaiting signed invoice', { delay: 12 })

  await expect(page.getByRole('dialog'), 'a space must not open the transfer').toHaveCount(0)
  await expect(note).toHaveValue('awaiting signed invoice')

  // Same guard on the invoice box beside it.
  const inv = row.getByLabel('Invoice number for ' + who)
  await inv.click()
  await inv.pressSequentially('PO 2026 114', { delay: 12 })
  await expect(page.getByRole('dialog'), 'a space in the invoice box must not open it either').toHaveCount(0)
  await expect(inv).toHaveValue('PO 2026 114')

  await D.cleanup()
})

// Both export routes are offered, and PNG actually produces a file. The PDF
// route opens the browser's print dialog, which Playwright cannot dismiss, so
// only its presence is asserted here.
test('the tracker exports a summary as PNG', async ({ page }) => {
  await signIn(page)
  await go(page, 'Tracker')

  await page.getByRole('button', { name: /^Export/ }).click()
  await expect(page.getByRole('button', { name: 'Download PNG' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Save as PDF' })).toBeVisible()

  const download = page.waitForEvent('download', { timeout: 30_000 })
  await page.getByRole('button', { name: 'Download PNG' }).click()
  const file = await download
  expect(file.suggestedFilename()).toMatch(/^tracker-summary-\d{4}-\d{2}-\d{2}\.png$/)
  expect((await file.path()) !== null, 'the PNG must actually be written').toBe(true)
})

/**
 * Found by adversarial review, not by a spec — which is why this one exists.
 *
 * The payment dialog has three ways in. One of them, the "change" link beside a
 * recorded payment, never seeded the charge field, so the dialog opened holding
 * whatever the previous dialog had left there: empty after a reload, which
 * deleted a recorded charge on confirm, or a different row's charge
 * mid-session, which moved it onto this row. Both wrote a wrong amount to a
 * live ledger silently.
 *
 * The reload is load-bearing — it is what resets the leaked field to empty.
 */
test('reopening a paid row through "change" keeps its recorded charge', async ({ page }) => {
  await signIn(page)
  await go(page, 'Tracker')
  const row = await addPendingRow(page, 'change-link charge')

  await page.locator('.sheet-row', { hasText: row.description })
    .getByRole('button', { name: 'Mark as paid' }).click()
  let modal = page.locator('.modal')
  await modal.getByRole('button', { name: 'E-cash' }).click()
  await modal.getByPlaceholder('0.00').fill('25')
  await modal.getByRole('button', { name: 'Mark as paid' }).click()
  await expect(modal).toBeHidden()

  await expect.poll(async () => Number((await D.txnById(row.id)).fee), { timeout: 10_000 }).toBe(25)
  const paid = await D.txnById(row.id)
  expect(Number(paid.amount)).toBe(Number(row.amount) + 25)

  // The reload clears the leaked dialog state, which is exactly the case that
  // used to silently drop the charge.
  await page.reload()
  await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible({ timeout: 25_000 })
  // Completed is off in the default view, so the dashboard tile is the way back
  // to a row that was just paid.
  await page.locator('.tile', { hasText: 'COMPLETED' }).click()
  await expect(page.getByRole('heading', { name: 'Tracker' })).toBeVisible()

  await page.getByText(row.description).click()
  const form = page.getByRole('dialog')
  await expect(form.getByRole('heading', { name: 'Transaction details' })).toBeVisible()
  await form.getByRole('button', { name: 'change', exact: true }).click()

  modal = page.locator('.modal').last()
  await expect(modal.getByPlaceholder('0.00'), 'the dialog must reopen showing the stored charge')
    .toHaveValue('25')
  await expect(modal, 'and must total the amount that was actually paid').toContainText('₱' + (Number(row.amount) + 25).toLocaleString('en-US'))

  await modal.getByRole('button', { name: 'Mark as paid' }).click()
  await form.getByRole('button', { name: 'Save', exact: true }).click()
  await expect(form).toBeHidden()

  await expect.poll(async () => Number((await D.txnById(row.id)).amount), { timeout: 10_000 })
    .toBe(Number(row.amount) + 25)
  expect(Number((await D.txnById(row.id)).fee), 'the charge must survive the round trip').toBe(25)
})

/**
 * Found by the second adversarial review. Dialogs stack — the edit form opens
 * the payment dialog on top of itself — and both listened for Escape on the
 * window. The outer one won, because it registered first, so Escape closed the
 * form and left the payment dialog orphaned over an empty screen. Confirming
 * from that orphan wrote nothing at all: the edit path only stages into the
 * form, and the form was gone. The dialog closed with no toast and no error,
 * and a payment the user had just confirmed did not exist.
 *
 * Escape must close the innermost dialog and leave the form standing.
 */
test('Escape closes the payment dialog, not the form underneath it', async ({ page }) => {
  await signIn(page)
  await go(page, 'Tracker')
  const row = await addPendingRow(page, 'stacked escape')

  await page.locator('.sheet-row', { hasText: row.description }).first().click()
  const form = page.locator('.modal').filter({ hasText: 'Transaction details' })
  await expect(form).toBeVisible()
  await form.getByLabel('Status').selectOption('completed')

  const pay = page.locator('.modal').filter({ hasText: 'How was it paid?' })
  await expect(pay).toBeVisible()

  await page.keyboard.press('Escape')
  await expect(pay, 'Escape must dismiss the innermost dialog').toBeHidden()
  await expect(form, 'and must leave the form it opened from standing').toBeVisible()

  // Cancelling the payment rolls the status back, so nothing was recorded.
  await expect(form.getByLabel('Status')).toHaveValue('pending')
  await form.getByRole('button', { name: 'Cancel' }).click()
  await expect(form).toBeHidden()

  const after = await D.txnById(row.id)
  expect(after.status, 'no payment was confirmed, so nothing may be written').toBe('pending')
  expect(Number(after.amount)).toBe(Number(row.amount))
  expect(after.fee).toBe(null)
})

/**
 * The other half of D52, which the first regression spec did not cover: the
 * leak used to run row-to-row within a single session, with no reload needed.
 * A charge typed for one transaction could be written onto a different one.
 */
test('a charge typed for one row cannot follow the user to another row', async ({ page }) => {
  await signIn(page)
  await go(page, 'Tracker')
  const a = await addPendingRow(page, 'charge row A')
  const b = await addPendingRow(page, 'charge row B')

  const payWith = async (desc, charge) => {
    await page.locator('.sheet-row', { hasText: desc })
      .getByRole('button', { name: 'Mark as paid' }).click()
    const modal = page.locator('.modal')
    await modal.getByRole('button', { name: 'E-cash' }).click()
    await modal.getByPlaceholder('0.00').fill(String(charge))
    await modal.getByRole('button', { name: 'Mark as paid' }).click()
    await expect(modal).toBeHidden()
  }

  await payWith(a.description, 40)
  await payWith(b.description, 25)
  await expect.poll(async () => Number((await D.txnById(b.id)).fee), { timeout: 10_000 }).toBe(25)

  // No reload. Reopen A through the "change" link while B's charge is the most
  // recent thing the dialog held.
  await go(page, 'Dashboard')
  await page.locator('.tile', { hasText: 'COMPLETED' }).click()
  await expect(page.getByRole('heading', { name: 'Tracker' })).toBeVisible()
  await page.locator('.sheet-row', { hasText: a.description }).first().click()

  const form = page.getByRole('dialog')
  await form.getByRole('button', { name: 'change', exact: true }).click()
  const pay = page.locator('.modal').last()
  await expect(pay.getByPlaceholder('0.00'), "row A must show its own charge, not row B's")
    .toHaveValue('40')

  await pay.getByRole('button', { name: 'Mark as paid' }).click()
  await form.getByRole('button', { name: 'Save', exact: true }).click()
  await expect(form).toBeHidden()

  await expect.poll(async () => Number((await D.txnById(a.id)).amount), { timeout: 10_000 })
    .toBe(Number(a.amount) + 40)
  expect(Number((await D.txnById(b.id)).fee), 'row B must be untouched by any of this').toBe(25)
  expect(Number((await D.txnById(b.id)).amount)).toBe(Number(b.amount) + 25)
})

/**
 * Found by the third adversarial review, in the fix from D51 itself.
 *
 * Dropping a paid row out of completed has to give its e-cash charge back. That
 * used to happen inside `saveEdit`, which assumed `amount` still contained the
 * charge — and the user can retype Amount in between. A ₱550 row (₱500 + ₱50)
 * set back to Pending with Amount retyped as 2000 saved **1950**: a number the
 * screen never displayed, written to a live ledger with a success toast.
 *
 * The charge now comes out where the user can see it, so this asserts both what
 * the field shows and what Postgres stores.
 */
test('retyping the amount after dropping out of completed saves what is on screen', async ({ page }) => {
  await signIn(page)
  await go(page, 'Tracker')
  const row = await addPendingRow(page, 'retyped amount')
  const base = Number(row.amount)

  await page.locator('.sheet-row', { hasText: row.description })
    .getByRole('button', { name: 'Mark as paid' }).click()
  const pay = page.locator('.modal')
  await pay.getByRole('button', { name: 'E-cash' }).click()
  await pay.getByPlaceholder('0.00').fill('50')
  await pay.getByRole('button', { name: 'Mark as paid' }).click()
  await expect(pay).toBeHidden()
  await expect.poll(async () => Number((await D.txnById(row.id)).amount), { timeout: 10_000 }).toBe(base + 50)

  await go(page, 'Dashboard')
  await page.locator('.tile', { hasText: 'COMPLETED' }).click()
  await expect(page.getByRole('heading', { name: 'Tracker' })).toBeVisible()
  await page.locator('.sheet-row', { hasText: row.description }).first().click()

  const form = page.getByRole('dialog')
  await expect(form.getByRole('heading', { name: 'Transaction details' })).toBeVisible()

  // Leaving completed must hand the charge back visibly, before anything saves.
  await form.getByLabel('Status').selectOption('pending')
  await expect(form.getByLabel('Amount'), 'the charge comes off in front of the user')
    .toHaveValue(String(base))

  await form.getByLabel('Amount').fill('2000')
  await form.getByRole('button', { name: 'Save', exact: true }).click()
  await expect(form).toBeHidden()

  await expect.poll(async () => Number((await D.txnById(row.id)).amount), { timeout: 10_000 })
    .toBe(2000)
  const after = await D.txnById(row.id)
  expect(after.fee, 'a row that is no longer completed records no charge').toBe(null)
  expect(after.status).toBe('pending')
})

/**
 * The status dropdown route through the payment dialog — open the form, set
 * Completed, confirm the method, save — had no spec that went all the way
 * through. It is the path the `confirmPay` guard sits on.
 */
test('the edit form can complete a row through the payment dialog and save it', async ({ page }) => {
  await signIn(page)
  await go(page, 'Tracker')
  const row = await addPendingRow(page, 'status dropdown pay')

  await page.locator('.sheet-row', { hasText: row.description }).first().click()
  const form = page.getByRole('dialog')
  await form.getByLabel('Status').selectOption('completed')

  const pay = page.locator('.modal').filter({ hasText: 'How was it paid?' })
  await expect(pay).toBeVisible()
  await pay.getByRole('button', { name: 'E-cash' }).click()
  await pay.getByPlaceholder('0.00').fill('15')
  await pay.getByRole('button', { name: 'Mark as paid' }).click()
  await expect(pay).toBeHidden()

  await form.getByRole('button', { name: 'Save', exact: true }).click()
  await expect(form).toBeHidden()

  await expect.poll(async () => (await D.txnById(row.id)).status, { timeout: 10_000 }).toBe('completed')
  const after = await D.txnById(row.id)
  expect(after.pay_type).toBe('E-cash')
  expect(Number(after.fee)).toBe(15)
  expect(Number(after.amount), 'the charge is inside the amount').toBe(Number(row.amount) + 15)
  expect(after.done, 'completion date must be filled in').toBeTruthy()
})

/**
 * Found by the fourth adversarial review — D54's own fix reintroducing D54's
 * own symptom. `setEditStatus` subtracted the charge from whatever was in the
 * Amount field, and `amountOf` stripped the minus sign, so clearing the field
 * on a ₱550 row with a ₱50 charge put `-50` on screen and wrote **50** to the
 * ledger. No exotic input needed; an empty field was enough.
 *
 * The charge is only removed from an amount that still contains it, and a
 * non-positive amount is now refused with a message rather than laundered.
 */
test('an amount that cannot carry the charge is refused, never silently flipped positive', async ({ page }) => {
  await signIn(page)
  await go(page, 'Tracker')
  const row = await addPendingRow(page, 'negative laundering')
  const base = Number(row.amount)

  await page.locator('.sheet-row', { hasText: row.description })
    .getByRole('button', { name: 'Mark as paid' }).click()
  const pay = page.locator('.modal')
  await pay.getByRole('button', { name: 'E-cash' }).click()
  await pay.getByPlaceholder('0.00').fill('50')
  await pay.getByRole('button', { name: 'Mark as paid' }).click()
  await expect(pay).toBeHidden()
  await expect.poll(async () => Number((await D.txnById(row.id)).amount), { timeout: 10_000 }).toBe(base + 50)

  await go(page, 'Dashboard')
  await page.locator('.tile', { hasText: 'COMPLETED' }).click()
  await expect(page.getByRole('heading', { name: 'Tracker' })).toBeVisible()
  await page.locator('.sheet-row', { hasText: row.description }).first().click()

  const form = page.getByRole('dialog')
  await form.getByLabel('Amount').fill('')
  await form.getByLabel('Status').selectOption('pending')

  // Nothing to take the charge out of, so the field is left exactly as typed
  // rather than going negative.
  await expect(form.getByLabel('Amount'), 'an emptied field must not become -50').toHaveValue('')

  await form.getByRole('button', { name: 'Save', exact: true }).click()
  await expect(form, 'and saving it must be refused, not laundered').toBeVisible()

  const after = await D.txnById(row.id)
  expect(Number(after.amount), 'the stored amount must not have moved').toBe(base + 50)
  expect(after.status).toBe('completed')

  await form.getByLabel('Amount').fill('120')
  await form.getByRole('button', { name: 'Save', exact: true }).click()
  await expect(form).toBeHidden()
  await expect.poll(async () => Number((await D.txnById(row.id)).amount), { timeout: 10_000 }).toBe(120)
})

/**
 * Also from the fourth review. `generatedIds` outlives the rows it names, and
 * the banner's "Review them" link walks the user to the Tracker without
 * dismissing the banner — so Generate → Review them → Mark as paid → Undo
 * deleted a transaction that had been paid, and reported only "Generated rows
 * removed". A completed row records money that moved; Undo does not get it.
 */
test('Undo will not delete a generated row that has since been paid', async ({ page }) => {
  await signIn(page)
  await go(page, 'Masterlist')

  // Two payables, so Undo has something it *may* remove as well as something it
  // may not. Without the unpaid row there is no observable signal that Undo ran
  // at all, and the spec would pass against the defect by racing a
  // fire-and-forget delete.
  const paidDesc = D.MARK + ' undo guard paid'
  const openDesc = D.MARK + ' undo guard open'
  for (const [desc, amount] of [[paidDesc, '700'], [openDesc, '800']]) {
    await page.getByRole('button', { name: '+ Add payable' }).click()
    const modal = page.locator('.modal')
    await modal.getByLabel('Company').selectOption('GTOI')
    await modal.getByLabel('Category').selectOption('Rental Expense')
    await modal.getByLabel('Description').fill(desc)
    await modal.getByLabel('Amount').fill(amount)
    await modal.getByRole('button', { name: 'Save', exact: true }).click()
    await expect(modal).toBeHidden()
  }

  await page.getByRole('button', { name: /^Generate / }).click()
  await expect(page.locator('.banner')).toBeVisible()

  // The banner stays up while the user goes and pays one of the rows — its own
  // "Review them" link is what walks them over there.
  await go(page, 'Tracker')
  await page.locator('.sheet-row', { hasText: paidDesc })
    .getByRole('button', { name: 'Mark as paid' }).click()
  const pay = page.locator('.modal')
  await pay.getByRole('button', { name: 'Mark as paid' }).click()
  await expect(pay).toBeHidden()

  // The write is fire-and-forget, so poll rather than read once.
  await expect.poll(
    async () => (await D.txnsTagged(paidDesc)).filter((t) => t.status === 'completed').length,
    { timeout: 10_000 },
  ).toBe(1)
  const paid = (await D.txnsTagged(paidDesc)).find((t) => t.status === 'completed')
  const [stillOpen] = await D.txnsTagged(openDesc)
  expect(stillOpen).toBeTruthy()

  await go(page, 'Masterlist')
  await page.locator('.banner').getByRole('button', { name: 'Undo' }).click()

  // Undo really ran: the untouched row is gone. Polling this first is what
  // makes the assertion below meaningful rather than a race the defect wins.
  await expect.poll(async () => await D.txnById(stillOpen.id), { timeout: 10_000 }).toBe(null)

  const survivor = await D.txnById(paid.id)
  expect(survivor, 'a paid transaction must survive Undo').toBeTruthy()
  expect(survivor.status).toBe('completed')
  expect(survivor.pay_type, 'and keep the payment that was recorded on it').toBeTruthy()

  await D.cleanup()
})

/**
 * Round 5, found in round 4's own fix. Making `amountOf` sign-aware meant a
 * negative could reach seven writers that tested `!amt` — and `-25` is truthy.
 * Sign-stripping had made that impossible before, so the fix for one defect
 * opened another across the whole app.
 *
 * The e-cash charge is the worst of them: a negative charge is *added* to the
 * amount, so it would quietly reduce a payable.
 */
test('a negative e-cash charge is refused, not added as a reduction', async ({ page }) => {
  await signIn(page)
  await go(page, 'Tracker')
  const row = await addPendingRow(page, 'negative charge')
  const base = Number(row.amount)

  await page.locator('.sheet-row', { hasText: row.description })
    .getByRole('button', { name: 'Mark as paid' }).click()
  const pay = page.locator('.modal')
  await pay.getByRole('button', { name: 'E-cash' }).click()
  await pay.getByPlaceholder('0.00').fill('-25')
  await pay.getByRole('button', { name: 'Mark as paid' }).click()

  await expect(pay, 'the dialog must stay open rather than record it').toBeVisible()
  const after = await D.txnById(row.id)
  expect(after.status, 'nothing may be written').toBe('pending')
  expect(Number(after.amount), 'and the amount must not have been reduced').toBe(base)

  // The field itself must say which input is wrong. `payErr` had no reader at
  // all between the check number becoming optional and round 27 — the state was
  // still being set, and the input it used to mark was gone from the DOM. The
  // toast said so, but nothing pointed at the box. Round 28: the rewiring had no
  // test of any kind, so it could be deleted again in silence.
  const charge = pay.getByPlaceholder('0.00')
  await expect(charge, 'the offending field must be marked invalid').toHaveClass(/invalid/)
  await expect(charge).toHaveAttribute('aria-invalid', 'true')

  // The same dialog accepts a real charge straight afterwards, and typing
  // clears the mark rather than leaving it stuck on a field now valid.
  await pay.getByPlaceholder('0.00').fill('25')
  await expect(charge).not.toHaveClass(/invalid/)
  await pay.getByRole('button', { name: 'Mark as paid' }).click()
  await expect(pay).toBeHidden()
  await expect.poll(async () => Number((await D.txnById(row.id)).amount), { timeout: 10_000 })
    .toBe(base + 25)
})

/**
 * The same class, on the receipts side: a liquidation records what was actually
 * spent, and a negative there corrupts the difference the sheet reports.
 */
// ROUND 31, finding 2. Controls inside a sheet row carried `onKeyDown={stop}`,
// which stopped EVERY key so a Space press could not reach the row and open it.
// React listens at the root container, so that also stopped the native event
// before `useEscapeToClose`'s window listener saw it — and focus stays on the
// control after it opens a dialog. Escape was therefore dead for the whole
// lifetime of any modal opened from a row button. Ten presses left the
// Liquidate dialog open.
//
// The offline suite cannot see this: it is a real key event crossing a real
// React root. Only the browser can.
test('Escape closes a dialog opened from a row control, not just from the toolbar', async ({ page }) => {
  await signIn(page)
  await go(page, 'AckRec')

  const who = D.MARK + ' escape from row'
  await page.getByRole('button', { name: '+ Add receipt' }).click()
  const add = page.locator('.modal')
  await add.getByLabel('Company').selectOption('GTOI')
  await add.getByLabel('Released to').fill(who)
  await add.getByLabel('Amount released').fill('1200')
  await add.getByRole('button', { name: 'Save', exact: true }).click()
  await expect(add).toBeHidden()

  const row = page.locator('.sheet-row', { hasText: who })
  await expect(row).toHaveCount(1)

  // The toolbar path always worked; assert it too so a regression tells us
  // which of the two broke rather than just "Escape is broken".
  await page.getByRole('button', { name: '+ Add receipt' }).click()
  await expect(page.locator('.modal')).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(page.locator('.modal'), 'Escape must close a toolbar dialog').toBeHidden()

  // The row path is the one that was dead.
  await row.getByRole('button', { name: 'Liquidate' }).click()
  await expect(page.locator('.modal')).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(page.locator('.modal'), 'and a dialog opened from a row control').toBeHidden()

  // Remove asks first, and that confirmation is opened from a row control too.
  // Its accessible name is the aria-label, not the word on the button.
  await row.getByRole('button', { name: 'Delete the receipt for ' + who }).click()
  await expect(page.locator('.modal')).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(page.locator('.modal'), 'including the delete confirmation').toBeHidden()

  // Escape must not have removed it — a dialog that closes AND acts is worse
  // than one that will not close.
  const c = await D.db()
  expect(((await c.from('receipts').select('id').eq('name', who)).data || []).length,
    'Escape cancels, it does not confirm').toBe(1)

  await D.cleanup()
})

test('a receipt will not liquidate to a negative actual amount', async ({ page }) => {
  await signIn(page)
  await go(page, 'AckRec')

  const who = D.MARK + ' negative actual'
  await page.getByRole('button', { name: '+ Add receipt' }).click()
  let modal = page.locator('.modal')
  await modal.getByLabel('Company').selectOption('GTOI')
  await modal.getByLabel('Released to').fill(who)
  await modal.getByLabel('Amount released').fill('4000')
  await modal.getByRole('button', { name: 'Save', exact: true }).click()
  await expect(modal).toBeHidden()

  const c = await D.db()
  await expect.poll(async () => ((await c.from('receipts').select('id').eq('name', who)).data || []).length,
    { timeout: 10_000 }).toBe(1)
  const [saved] = (await c.from('receipts').select('*').eq('name', who)).data

  await page.locator('.sheet-row', { hasText: who }).getByRole('button', { name: 'Liquidate' }).click()
  modal = page.locator('.modal')
  await modal.getByLabel(/Actual amount/).fill('-500')
  await modal.getByRole('button', { name: 'Save', exact: true }).click()

  await expect(modal, 'a negative actual must be refused').toBeVisible()
  const still = (await c.from('receipts').select('*').eq('id', saved.id)).data[0]
  expect(still.actual, 'nothing may be recorded').toBe(null)
  expect(still.status).not.toBe('liquidated')

  await D.cleanup()
})

/**
 * Found by the sixth adversarial review. The reminder Edit and Delete buttons
 * were rendered only while `noteHover` was set, and that state is written by
 * `onMouseEnter` alone — so the buttons were absent from the DOM, not merely
 * hidden. Tab walked from one reminder's checkbox straight to the next, and a
 * touch device never reached them at all. CSS could not rescue it.
 *
 * They are always in the DOM now and revealed by `:hover`/`:focus-within`, so
 * this asserts reachability rather than visibility — presence in the tab order
 * is what was broken.
 */
test('a reminder can be edited and deleted without a mouse', async ({ page }) => {
  await signIn(page)
  const first = page.locator('.note-row').first()
  await expect(first).toBeVisible()

  const label = (await first.locator('.text').innerText()).trim()
  const edit = page.getByRole('button', { name: 'Edit reminder: ' + label })
  const del = page.getByRole('button', { name: 'Delete reminder: ' + label })

  // Present without any pointer having touched the row.
  await expect(edit, 'the edit control must exist before any hover').toHaveCount(1)
  await expect(del, 'and so must delete').toHaveCount(1)

  // And genuinely focusable, which is what "reachable by keyboard" means.
  await edit.focus()
  await expect(edit).toBeFocused()

  // `toBeVisible()` checks the bounding box and `visibility` — it does NOT look
  // at opacity, so it passes on a fully transparent control. This spec shipped
  // green once with the `:focus-within` reveal deleted and the button at
  // opacity 0, which is precisely the regression it exists to catch. Read the
  // computed value instead.
  await expect(edit, 'focus must actually reveal it').toHaveCSS('opacity', '1')

  // Keyboard activation opens the inline editor, then Escape backs out with the
  // reminder unchanged — no write to the shared config row.
  await page.keyboard.press('Enter')
  await expect(page.locator('.note-input').first()).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(page.locator('.note-input')).toHaveCount(0)
  await expect(page.locator('.note-row').first().locator('.text')).toHaveText(label)
})

/**
 * Found by the seventh adversarial review. A masterlist edit arms two debounced
 * writes — the payable's own row (`recurring:<id>`) and one push-down per field
 * (`push:<id>:<field>`) — and `removeRec` cancelled only the first. Deleting a
 * payable within the 500 ms debounce window therefore let the push-down fire
 * afterwards, writing an **amount** onto live ledger rows whose payable no
 * longer existed, immediately after telling the user those rows were unlinked.
 *
 * The race is the point, so this edits and deletes without waiting between.
 */
test('deleting a payable cancels the edit still in flight for it', async ({ page }) => {
  await signIn(page)
  await go(page, 'Masterlist')

  const desc = D.MARK + ' cancel in flight'
  await page.getByRole('button', { name: '+ Add payable' }).click()
  const modal = page.locator('.modal')
  await modal.getByLabel('Company').selectOption('GTOI')
  await modal.getByLabel('Category').selectOption('Rental Expense')
  await modal.getByLabel('Description').fill(desc)
  await modal.getByLabel('Amount').fill('700')
  await modal.getByRole('button', { name: 'Save', exact: true }).click()
  await expect(modal).toBeHidden()

  await page.getByRole('button', { name: /^Generate / }).click()
  await expect(page.locator('.banner')).toBeVisible()
  await expect.poll(async () => (await D.txnsTagged(desc)).length, { timeout: 10_000 }).toBeGreaterThan(0)
  const generated = await D.txnsTagged(desc)
  const originals = new Map(generated.map((t) => [t.id, Number(t.amount)]))

  // The Masterlist keeps its description in an input VALUE, which `hasText`
  // cannot match — locate the row by position instead. Production carries no
  // recurring payables, so the one this spec added is the only row present.
  const rows = page.locator('.sheet-row')
  await expect(rows, 'this spec assumes it owns the only masterlist row').toHaveCount(1)
  const row = rows.first()

  // Retype the amount and delete the payable inside the 500 ms debounce window.
  await row.getByLabel('Amount').fill('999999')
  await row.getByRole('button', { name: 'Remove' }).click()

  // Well past the 500 ms window: an armed push-down would have fired by now.
  await page.waitForTimeout(2000)

  for (const [id, amount] of originals) {
    const after = await D.txnById(id)
    expect(after, 'the generated row must survive the delete').toBeTruthy()
    expect(Number(after.amount), 'a deleted payable must not write to the ledger afterwards').toBe(amount)
    expect(after.src, 'and its link must be gone').toBe(null)
  }

  // And the screen must agree with the ledger. The first fix for this cancelled
  // the database write but left the optimistic push-down painted, so the Tracker
  // showed a number that was never saved — a worse failure than the one it
  // replaced, because nothing contradicted it until a reload.
  await go(page, 'Tracker')
  const sheetRow = page.locator('.sheet-row', { hasText: desc })
  await expect(sheetRow, 'the row must still be on the sheet').toHaveCount(1)
  await expect(sheetRow, 'the screen must show the saved amount, not the cancelled one')
    .toContainText('₱' + [...originals.values()][0].toLocaleString('en-US'))
  await expect(sheetRow, 'the cancelled amount must not be on screen').not.toContainText('999,999')

  await D.cleanup()
})

/**
 * Found by the ninth adversarial review, and the most serious of the sequence.
 *
 * The "never rewrite a completed row" guard lived in `updRec`, filtering
 * `state.txns` — a snapshot taken at page load, with no realtime subscription
 * behind it. A row another session completed is therefore still `pending` in
 * this tab, passes the filter, and has its **amount** overwritten by the next
 * masterlist keystroke. The exposure is not the 500 ms debounce; it is however
 * long the tab has been open.
 *
 * This drives the browser for the edit and a second Supabase client for the
 * payment, because one session cannot hold a stale view of itself.
 */
test('a masterlist edit cannot rewrite a row another session already paid', async ({ page }) => {
  await signIn(page)
  await go(page, 'Masterlist')

  const desc = D.MARK + ' stale snapshot'
  await page.getByRole('button', { name: '+ Add payable' }).click()
  const modal = page.locator('.modal')
  await modal.getByLabel('Company').selectOption('GTOI')
  await modal.getByLabel('Category').selectOption('Rental Expense')
  await modal.getByLabel('Description').fill(desc)
  await modal.getByLabel('Amount').fill('700')
  await modal.getByRole('button', { name: 'Save', exact: true }).click()
  await expect(modal).toBeHidden()

  await page.getByRole('button', { name: /^Generate / }).click()
  await expect(page.locator('.banner')).toBeVisible()
  await expect.poll(async () => (await D.txnsTagged(desc)).length, { timeout: 10_000 }).toBeGreaterThan(0)
  const [row] = await D.txnsTagged(desc)

  // A second session pays it. The browser tab knows nothing about this.
  const c = await D.db()
  const { error } = await c.from('txns')
    .update({ status: 'completed', done: '2026-09-05', pay_type: 'Cash', amount: 700 })
    .eq('id', row.id)
  expect(error, 'the second session must be able to record the payment').toBeFalsy()

  // Now edit the payable in the stale tab. Its snapshot still says pending.
  const rows = page.locator('.sheet-row')
  await expect(rows).toHaveCount(1)
  await rows.first().getByLabel('Amount').fill('98765')
  await page.waitForTimeout(2000)

  const after = await D.txnById(row.id)
  expect(after.status, 'the row stays completed').toBe('completed')
  expect(Number(after.amount), 'a completed row must keep what was actually paid').toBe(700)

  await D.cleanup()
})

/**
 * Found by the tenth adversarial review — D61's family, but for DELETE, which
 * is worse: there is nothing left to discover afterwards.
 *
 * `undoGenerate` promises in its own toast to keep anything already paid, and
 * filtered `state.txns` to decide. That is a page-load snapshot with no
 * realtime subscription, so a row another session paid was still `pending` here
 * and got deleted along with the rest — payment record and all.
 *
 * The existing spec pays through the UI in the same session, which keeps the
 * snapshot fresh, so it could not see this. This one pays from a second client.
 */
test('Undo cannot delete a row another session paid, however stale this tab is', async ({ page }) => {
  await signIn(page)
  await go(page, 'Masterlist')

  const paidDesc = D.MARK + ' undo cross-session paid'
  const openDesc = D.MARK + ' undo cross-session open'
  for (const [desc, amount] of [[paidDesc, '700'], [openDesc, '800']]) {
    await page.getByRole('button', { name: '+ Add payable' }).click()
    const modal = page.locator('.modal')
    await modal.getByLabel('Company').selectOption('GTOI')
    await modal.getByLabel('Category').selectOption('Rental Expense')
    await modal.getByLabel('Description').fill(desc)
    await modal.getByLabel('Amount').fill(amount)
    await modal.getByRole('button', { name: 'Save', exact: true }).click()
    await expect(modal).toBeHidden()
  }

  await page.getByRole('button', { name: /^Generate / }).click()
  await expect(page.locator('.banner')).toBeVisible()
  await expect.poll(async () => (await D.txnsTagged(paidDesc)).length, { timeout: 10_000 }).toBe(1)
  const [paid] = await D.txnsTagged(paidDesc)
  const [open] = await D.txnsTagged(openDesc)

  // A second session records the payment. This tab never hears about it, and
  // the banner is still up.
  const c = await D.db()
  const { error } = await c.from('txns')
    .update({ status: 'completed', done: '2026-09-05', pay_type: 'Cash' })
    .eq('id', paid.id)
  expect(error, 'the second session must be able to record the payment').toBeFalsy()

  await page.locator('.banner').getByRole('button', { name: 'Undo' }).click()

  // Undo really ran — the untouched row is gone.
  await expect.poll(async () => await D.txnById(open.id), { timeout: 10_000 }).toBe(null)

  const survivor = await D.txnById(paid.id)
  expect(survivor, 'a paid transaction must survive Undo even from a stale tab').toBeTruthy()
  expect(survivor.status).toBe('completed')
  expect(survivor.pay_type, 'and keep its recorded payment').toBe('Cash')

  await D.cleanup()
})

/**
 * Found by the twelfth adversarial review. The unique index from D63 refuses a
 * due date that would collide with another generated row for the same payable
 * — which is a legitimate thing to attempt ("we settled both on the 18th") —
 * and `saveEdit` announced "Transaction updated" regardless, because every
 * write here is fire-and-forget. The screen showed the new deadline, Postgres
 * kept the old one, and the only evidence was a toast overwritten seconds later.
 *
 * The refusal is correct; claiming success is not. This pins both halves.
 */
test('moving a generated row onto a sibling due date is accepted, and changes no identity', async ({ page }) => {
  // This spec used to assert the OPPOSITE. Its refusal came from the old
  // (src, due) unique index, which phase 2 drops on purpose: the visible due is
  // payment timing, and two occurrences of one payable may legitimately fall due
  // on the same day. What must never move is occurrence_due. Pinned here so a
  // regression back to refusing a legal edit fails loudly.
  //
  // Honest surfacing of a write the database DOES refuse is covered by
  // 'a masterlist edit cannot rewrite a row another session already paid' and
  // 'Undo cannot delete a row another session paid, however stale this tab is'.
  await signIn(page)
  await go(page, 'Masterlist')

  const desc = D.MARK + ' collide due date'
  await page.getByRole('button', { name: '+ Add payable' }).click()
  const modal = page.locator('.modal')
  await modal.getByLabel('Company').selectOption('GTOI')
  await modal.getByLabel('Category').selectOption('Rental Expense')
  await modal.getByLabel('How often').selectOption('Weekly')
  await modal.getByLabel('Description').fill(desc)
  await modal.getByLabel('Amount').fill('300')
  await modal.getByRole('button', { name: 'Save', exact: true }).click()
  await expect(modal).toBeHidden()

  await page.getByRole('button', { name: /^Generate/ }).click()
  await expect(page.locator('.banner')).toBeVisible({ timeout: 15_000 })
  await expect.poll(async () => (await D.txnsTagged(desc)).length, { timeout: 10_000 }).toBeGreaterThan(1)

  const generated = (await D.txnsTagged(desc)).sort((a, b) => (a.due < b.due ? -1 : 1))
  const [first, second] = generated
  expect(first.due).not.toBe(second.due)
  expect(first.occurrence_due).toBe(first.due)
  expect(second.occurrence_due).toBe(second.due)

  await go(page, 'Tracker')
  await page.locator('.sheet-row', { hasText: desc }).first().click()
  const form = page.getByRole('dialog')
  await expect(form.getByRole('heading', { name: 'Transaction details' })).toBeVisible()
  await form.getByLabel('Due date').fill(second.due)
  await form.getByRole('button', { name: 'Save', exact: true }).click()
  await expect(form).toBeHidden()

  // The move is legal, so the ledger must actually take it...
  await expect.poll(async () => (await D.txnById(first.id)).due, { timeout: 10_000 }).toBe(second.due)

  // ...while identity stays where it was, on both rows. This is the whole point
  // of the change: two rows may now share a due date and remain two distinct
  // occurrences, so the scheduler still counts them as covered.
  const movedRow = await D.txnById(first.id)
  const otherRow = await D.txnById(second.id)
  expect(movedRow.occurrence_due, 'a visible edit must not alter occurrence identity').toBe(first.due)
  expect(otherRow.occurrence_due, 'the sibling must be untouched').toBe(second.due)
  expect(movedRow.occurrence_due).not.toBe(otherRow.occurrence_due)
  expect(await D.txnsTagged(desc)).toHaveLength(generated.length)

  // The screen must show the date the database actually holds. Targeted by the
  // row's OWN full description, not the shared base: a Weekly payable generates
  // rows whose descriptions differ only by a date suffix, so `.first()` on the
  // base text can land on a row this spec never edited - which is how the first
  // version of this assertion passed against the very defect it was written for.
  //
  // Asserting on the NEW date is what does the work. The old date cannot serve as
  // a negative: buildGeneratedRows bakes the occurrence date into the description,
  // so dstr(first.due) is in that row's text whatever the due cell shows.
  const edited = page.locator('.sheet-row', { hasText: first.description })
  await expect(edited).toHaveCount(1)
  await expect(edited, 'the row must show the date the database actually holds')
    .toContainText(dstr(second.due))

  await D.cleanup()
})

test('a decimal amount can be typed into the masterlist, key by key', async ({ page }) => {
  // The field is controlled from the stored row and the store holds a number,
  // so typing "1250.50" one key at a time used to lose the decimal point the
  // instant it was typed: "1250." parsed to 1250, React restored "1250", and
  // the remaining keys produced 125050 — a hundredfold payable that then pushed
  // down onto every linked Tracker row.
  const desc = D.MARK + ' decimal'
  const payable = await D.makeRecurring({ amount: 100, description: desc })
  await signIn(page)
  await go(page, 'Masterlist')

  // Every column on this screen is an input, so the row cannot be found by its
  // text — match on the Description field's value instead.
  const rows = page.locator('.sheet-row.compact')
  await expect.poll(async () => rows.count(), { timeout: 15_000 }).toBeGreaterThan(0)
  let amount = null
  for (let i = 0; i < await rows.count(); i += 1) {
    const r = rows.nth(i)
    if ((await r.getByLabel('Description').inputValue()) === desc) { amount = r.getByLabel('Amount'); break }
  }
  expect(amount, 'the payable must be on screen').not.toBeNull()

  await amount.fill('')
  await amount.pressSequentially('1250.50', { delay: 40 })
  await expect(amount, 'the field must show what was typed').toHaveValue('1250.50')

  await page.getByRole('heading', { name: 'Masterlist' }).click()   // blur
  await expect.poll(async () => (await D.recurringById(payable.id)).amount,
    { timeout: 10_000 }).toBe(1250.5)
})
