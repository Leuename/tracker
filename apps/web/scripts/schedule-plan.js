export const classifySchedule = ({ recurring = [], rows = [], skipped = 0, dueCount = 0, unpriced = [], unresolved = [], error = null } = {}) => {
  if (error?.code === '23514') return [{ outcome: 'contract-23514', error }]
  if (error && error.code !== '23505') return [{ outcome: 'failed', error }]
  const out = error?.code === '23505' ? [{ outcome: 'concurrent-23505', error }] : []
  if (!recurring.length) out.push({ outcome: 'not-due', count: 0 })
  if (rows.length && error?.code !== '23505') out.push({ outcome: 'generated', count: rows.length })
  if (!rows.length && recurring.length && dueCount > 0 && !unpriced.length && !unresolved.length) out.push({ outcome: 'covered', count: skipped })
  if (unpriced.length) out.push({ outcome: 'unpriced', count: unpriced.length, rows: unpriced })
  if (unresolved.length) out.push({ outcome: 'unresolved-identity', count: unresolved.length, rows: unresolved })
  if (!out.length) out.push({ outcome: 'not-due', count: 0 })
  return out
}

export const formatScheduleOutcome = (outcome, label, { dryRun = false } = {}) => outcome.map((x) => {
  if (x.outcome === 'generated') return `- ${dryRun ? 'Would add' : 'Added'} ${x.count} payable(s) for ${label}.`
  if (x.outcome === 'covered') return `- Every recurring payable already exists for ${label} (${x.count} already there).`
  if (x.outcome === 'unpriced') return `- ${x.count} masterlist payable(s) have no amount and were skipped, not generated.`
  if (x.outcome === 'unresolved-identity') return `- ${x.count} linked row(s) have no occurrence identity; generation was refused for those payables.`
  if (x.outcome === 'concurrent-23505') return '- Nothing was generated: another writer covered the occurrence. The ledger is correct.'
  if (x.outcome === 'contract-23514') return '- Generation failed: the database rejected the row contract (23514).'
  if (x.outcome === 'failed') return '- Generation failed: ' + (x.error?.message || x.error)
  return '- No recurring payable is due, so nothing to generate.'
})
