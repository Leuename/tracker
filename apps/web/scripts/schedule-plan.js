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
