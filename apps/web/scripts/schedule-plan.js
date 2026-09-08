/**
 * The calendar date the owner is living in, not the one the server is.
 *
 * `new Date().toISOString().slice(0,10)` is the **UTC** date. `schedule.yml`
 * fires at 22:00 UTC, which is 06:00 the NEXT day in Manila — so the job's idea
 * of "today" was one Manila day behind on every single run, all year. Two
 * consequences, both found by round 41:
 *
 *   - The overdue digest was chronically blind to anything due "yesterday" by
 *     the owner's clock: the script called it pending while the owner's own
 *     Dashboard already showed it overdue.
 *   - Worse, at a month end the run that lands on Manila's 1st generated for the
 *     PREVIOUS month. September's payables were not created until 06:00 Manila
 *     on the 2nd — a full day late — and a payable due on the 1st was therefore
 *     inserted already satisfying `due < TODAY`, i.e. **overdue at the instant it
 *     was created**. Every month, including the year boundary.
 *
 * The zone is named rather than assumed, and overridable, because "where the
 * owner is" is a fact about the business and not about the code. `en-CA` is the
 * locale trick that yields `YYYY-MM-DD` directly.
 */
export const ZONE = process.env.SCHEDULE_TZ || 'Asia/Manila'

export const todayIn = (zone = ZONE, now = new Date()) => {
  const d = now.toLocaleDateString('en-CA', { timeZone: zone })
  // `en-CA` gives YYYY-MM-DD, but an unknown zone throws rather than lying, and
  // a silently wrong date here writes money rows into the wrong month.
  if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) throw new Error('todayIn: unusable date for zone ' + zone)
  return d
}

export const classifySchedule = ({ recurring = [], rows = [], skipped = 0, dueCount = 0, unpriced = [], unresolved = [], error = null } = {}) => {
  if (error?.code === '23514') return [{ outcome: 'contract-23514', error }]
  if (error && error.code !== '23505') return [{ outcome: 'failed', error }]
  const out = error?.code === '23505' ? [{ outcome: 'concurrent-23505', error }] : []
  if (!recurring.length) out.push({ outcome: 'not-due', count: 0 })
  if (rows.length && error?.code !== '23505') out.push({ outcome: 'generated', count: rows.length, skipped })
  if (!rows.length && recurring.length && dueCount > 0 && !unpriced.length && !unresolved.length) out.push({ outcome: 'covered', count: skipped })
  if (unpriced.length) out.push({ outcome: 'unpriced', count: unpriced.length, rows: unpriced })
  if (unresolved.length) out.push({ outcome: 'unresolved-identity', count: unresolved.length, rows: unresolved })
  if (!out.length) out.push({ outcome: 'not-due', count: 0 })
  return out
}

export const formatScheduleOutcome = (outcome, label, { dryRun = false } = {}) => outcome.map((x) => {
  if (x.outcome === 'generated') return `- ${dryRun ? 'Would add' : 'Added'} ${x.count} payable(s) for ${label}${x.skipped ? `, skipping ${x.skipped} already there` : ''}.`
  if (x.outcome === 'covered') return `- Every recurring payable already exists for ${label} (${x.count} already there).`
  if (x.outcome === 'unpriced') return `- ${x.count} masterlist payable(s) have no amount and were skipped, not generated.`
  if (x.outcome === 'unresolved-identity') return `- ${x.count} linked row(s) have no occurrence identity; generation was refused for those payables.`
  if (x.outcome === 'concurrent-23505') return '- Nothing was generated: another writer covered the occurrence. The ledger is correct.'
  if (x.outcome === 'contract-23514') return '- Generation failed: the database rejected the row contract (23514).'
  if (x.outcome === 'failed') return '- Generation failed: ' + (x.error?.message || x.error)
  return '- No recurring payable is due, so nothing to generate.'
})

/**
 * The whole report for one run, in order: summary first, then the row detail
 * that hangs off it.
 *
 * Both callers in `schedule.mjs` used to build this by hand, and after round 27
 * removed a duplicated summary line they disagreed: the dry run printed
 * summary-then-rows while the live 22:00 job printed rows-then-summary, so in
 * the GitHub job summary — the only channel this project has — the indented
 * rows rendered as a nested list hanging off whatever came before, and their
 * header arrived after them. `schedule.mjs` is not in `npm test`, so nothing
 * could catch that. The order lives here now, where a test can hold it.
 */
export const formatScheduleReport = (outcome, label, rows = [], { dryRun = false, detail = true } = {}) =>
  outcome.flatMap((x) => {
    const [line] = formatScheduleOutcome([x], label, { dryRun })
    // The rows belong to the `generated` line specifically, not to the end of
    // the report. `classifySchedule` routinely returns more than one outcome —
    // `generated` alongside `unpriced` or `unresolved-identity` — and appending
    // to the whole list put the generated rows underneath "have no amount and
    // were skipped", which is the same misreading in the job summary that
    // splitting this out was supposed to fix. Round 29.
    if (!detail || x.outcome !== 'generated' || !rows.length) return [line]
    return [line, ...rows.map((r) => `  - ${r.co} · ${r.cat} · ${r.desc} · due ${r.due}`)]
  })
