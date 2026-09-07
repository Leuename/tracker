/**
 * The scheduled work the app describes but nobody performs: `npm run schedule`.
 *
 *   SCHEDULE_EMAIL=… SCHEDULE_PASSWORD=… npm run schedule
 *   npm run schedule -- --dry-run      # report, write nothing
 *
 * Two jobs, and they are deliberately different in kind.
 *
 * **Generating recurring payables** writes. It reuses `buildGeneratedRows` from
 * `src/logic.js` — the same function the Tracker's Generate button calls —
 * rather than reimplementing the recurrence rules in SQL or here. Two
 * implementations of "which payables are due this month" is one more than a
 * ledger should have, and the second would drift silently.
 *
 * It is idempotent by occurrence identity: `buildGeneratedRows` skips rows
 * whose parent and immutable scheduled occurrence are already represented.
 * Running it daily therefore catches a rule added mid-month without creating
 * a second liability when an editable due date or period was moved.
 *
 * **Reminders** only read, and report to whatever channel is available: the
 * GitHub Actions job summary when running there, stdout otherwise. There is
 * still no email or SMS provider on this project, and inventing one is a
 * decision rather than an implementation — see Decisions D31. What exists here
 * is the part that does not depend on that choice: knowing what is overdue.
 *
 * Why a scheduled workflow rather than `pg_cron`, which is available: the
 * recurrence logic already exists in JavaScript, tested, and this way there is
 * one copy of it. `pg_cron` would mean a second.
 */
import { appendFileSync } from 'node:fs'
import { supabase } from '../src/supabase.js'
import { db, load } from '../src/db.js'
import { buildGeneratedRows, eff, monthLabel, occurrences, unpricedFor } from '../src/logic.js'
import { classifySchedule, formatScheduleOutcome } from './schedule-plan.js'

const dryRun = process.argv.includes('--dry-run')
const email = process.env.SCHEDULE_EMAIL
const password = process.env.SCHEDULE_PASSWORD
if (!email || !password) {
  console.error('Set SCHEDULE_EMAIL and SCHEDULE_PASSWORD to a real account on this project.')
  process.exit(2)
}

const today = new Date().toISOString().slice(0, 10)
const monthKey = today.slice(0, 7)

const lines = []
const say = (s) => { console.log(s); lines.push(s) }

const { error: authError } = await supabase.auth.signInWithPassword({ email, password })
if (authError) {
  console.error('Sign-in failed: ' + authError.message)
  process.exit(2)
}

const state = await load()

// ---- generate this month's recurring payables ------------------------
const { rows, skipped, label, unresolved } = buildGeneratedRows(state.recurring, state.txns, monthKey)

let generateFailed = false
let generationError = null

// A payable with no amount cannot become a Tracker row — `txns.amount > 0`
// (D65/D66) — so `buildGeneratedRows` skips it. Silently, which for an
// unattended job means reporting a month as complete when the only payable in
// the masterlist was dropped. Named here so the run says what it did not do.
const unpriced = unpricedFor(state.recurring, monthKey)
const dueCount = state.recurring.filter((p) => occurrences(p, monthKey).length > 0).length

if (dryRun && rows.length) {
  for (const line of formatScheduleOutcome(classifySchedule({ recurring: state.recurring, rows, skipped, dueCount, unpriced, unresolved }), label, { dryRun: true })) say(line)
  for (const r of rows) say(`  - ${r.co} · ${r.cat} · ${r.desc} · due ${r.due}`)
} else if (rows.length) {
  // Generation is one of two jobs this script does, and it must not take the
  // other one down with it.
  //
  // `insertTxns` is a single multi-row statement, so the unique index added by
  // `20260905094348_one_generated_row_per_due_date` aborts the whole batch when
  // any row collides — which is exactly what a concurrent writer produces. A
  // bare `await` here meant one such collision exited the process before the
  // overdue report, the job summary and the sign-out ever ran: the 22:00 job
  // lost its entire purpose over a row that was already correct in the ledger.
  //
  // 23505 is reported as the benign outcome it is — somebody else generated
  // this month — and the exit code stays 0. Anything else still fails the run,
  // loudly, because an unexplained write failure is not benign.
  try {
    await db.insertTxns(rows)
    say(`- Added ${rows.length} payable(s) for ${label}${skipped ? `, skipping ${skipped} duplicate(s)` : ''}:`)
    for (const r of rows) say(`  - ${r.co} · ${r.cat} · ${r.desc} · due ${r.due}`)
  } catch (e) {
    if (String(e && e.code) === '23514') {
      for (const line of formatScheduleOutcome(classifySchedule({ error: e }), label)) say(line)
      throw e
    }
    if (String(e && e.code) !== '23505') {
      for (const line of formatScheduleOutcome(classifySchedule({ error: e }), label)) say(line)
      throw e
    }
    generateFailed = true
    generationError = e
  }
}

if ((!dryRun || !rows.length) && !generationError) {
  for (const line of formatScheduleOutcome(classifySchedule({ recurring: state.recurring, rows, skipped, dueCount, unpriced, unresolved }), label, { dryRun })) say(line)
} else if (generationError) {
  for (const line of formatScheduleOutcome(classifySchedule({ recurring: state.recurring, rows, skipped, dueCount, unpriced, unresolved, error: generationError }), label)) say(line)
}

// ---- what somebody should look at ------------------------------------
// Read-only. `eff` is the same rule the Tracker colours a row by, so this
// cannot disagree with what the screen shows.
const fresh = rows.length && !dryRun && !generateFailed ? await load() : state
const overdue = fresh.txns.filter((t) => eff(t, today) === 'overdue')
const unliquidated = fresh.receipts.filter((r) => r.status === 'released')

say('')
say(overdue.length
  ? `- **${overdue.length} overdue payable(s)**, ₱${overdue.reduce((a, t) => a + Number(t.amount || 0), 0).toLocaleString('en-PH')} in total:`
  : '- No overdue payables.')
for (const t of overdue.slice(0, 20)) say(`  - ${t.co} · ${t.desc} · due ${t.due} · ₱${Number(t.amount || 0).toLocaleString('en-PH')}`)
if (overdue.length > 20) say(`  - …and ${overdue.length - 20} more.`)

say(unliquidated.length
  ? `- **${unliquidated.length} released receipt(s) awaiting liquidation.**`
  : '- No receipts awaiting liquidation.')
for (const r of unliquidated.slice(0, 20)) say(`  - ${r.co} · ${r.name} · ₱${Number(r.amount || 0).toLocaleString('en-PH')}`)

// ---- deliver ---------------------------------------------------------
// The job summary is the only channel this project actually has. It is a real
// one — it lands in the Actions run and in the notification email GitHub sends
// on failure — and it needs no provider, no secret and no address list.
if (process.env.GITHUB_STEP_SUMMARY) {
  appendFileSync(process.env.GITHUB_STEP_SUMMARY,
    [`## Scheduled run — ${today}`, '', ...lines, ''].join('\n'))
}

await supabase.auth.signOut()
console.log(dryRun ? '\nschedule dry run complete' : '\nschedule complete')
