/**
 * Turn audit-log entries into the smallest set of statements that puts the
 * ledger back the way it was at a chosen moment.
 *
 * The Supabase free plan has no point-in-time recovery — that is a Pro add-on —
 * but `public.audit_log` has been a write-ahead log all along without anyone
 * using it as one. Every trigger writes the whole row `before` and the whole
 * row `after` (`to_jsonb(old)` / `to_jsonb(new)`), for all six tables including
 * `profiles`, so the state of any row at any second is recoverable from it.
 *
 * The one idea worth understanding: **only the oldest entry after the cut
 * matters.** A row that was inserted, edited four times and deleted needs one
 * statement, not six — its `before` at the first entry after the cut *is* its
 * state at the cut. Walking every entry backwards would reach the same place
 * through five pointless writes and five more chances to get an order wrong.
 *
 * No imports, so this tests offline — the same reason `rows.js` and `logic.js`
 * import nothing.
 */

/**
 * Which column identifies a row, per table.
 *
 * `audit_log.row_id` cannot be used: `log_change()` only fills it when the `id`
 * key is numeric, so it is null for `app_config` (whose key is the boolean
 * `true`) and null for `profiles` (which has no `id` column at all). The key
 * has to come out of the jsonb.
 */
export const PK = {
  txns: 'id',
  receipts: 'id',
  recurring: 'id',
  transfers: 'id',
  app_config: 'id',
  profiles: 'user_id',
}

/**
 * @param {Array<{id:number, tbl:string, op:string, before:object|null, after:object|null, at:string, actor_email:string|null}>} entries
 *   every audit row written after the cut, in any order
 * @returns {{steps:Array, tables:Object, unknown:Array}}
 */
export function planRewind(entries, { occurrenceIdentity = false } = {}) {
  const ordered = [...entries].sort((a, b) => a.id - b.id)
  const seen = new Map()
  const unknown = []

  for (const e of ordered) {
    const pk = PK[e.tbl]
    if (!pk) { unknown.push(e.tbl); continue }
    const row = e.before || e.after || {}
    if (occurrenceIdentity && e.tbl === 'txns' && e.op !== 'INSERT' && row.src != null && row.occurrence_due == null) {
      throw new Error('Cannot rewind a linked txns row without occurrence_due; use the pre-migration schema or provide an explicit occurrence mapping.')
    }
    const key = row[pk]
    // A row with no identifiable key cannot be aimed at, and guessing which
    // row to overwrite is worse than reporting that one entry was skipped.
    if (key === undefined || key === null) { unknown.push(e.tbl + '.' + pk); continue }

    const id = e.tbl + ' ' + String(key)
    if (seen.has(id)) continue // an older entry already fixed this row's state

    seen.set(id, {
      tbl: e.tbl,
      pk,
      key,
      // The row did not exist at the cut, so putting it back means removing it.
      action: e.op === 'INSERT' ? 'delete' : 'restore',
      before: e.op === 'INSERT' ? null : e.before,
      firstEntry: e.id,
      at: e.at,
      by: e.actor_email || null,
    })
  }

  const steps = [...seen.values()]
  const tables = {}
  for (const s of steps) {
    tables[s.tbl] = tables[s.tbl] || { delete: 0, restore: 0 }
    tables[s.tbl][s.action]++
  }
  return { steps, tables, unknown: [...new Set(unknown)] }
}

/** A Postgres literal. Numbers and booleans bare, everything else quoted. */
export const lit = (v) => {
  if (v === null || v === undefined) return 'null'
  if (typeof v === 'number') return String(v)
  if (typeof v === 'boolean') return v ? 'true' : 'false'
  return "'" + String(v).replace(/'/g, "''") + "'"
}

/**
 * The script an operator applies as `postgres`.
 *
 * Emitted rather than executed, deliberately. `authenticated` holds no INSERT
 * on `audit_log` and only column-list grants elsewhere, so a rewind run through
 * the app's credentials would silently drop `created_at` and the history — the
 * same reason a restore cannot use them (trap 37). The alternative is storing a
 * `service_role` key somewhere, and a rare operator action is not worth a
 * full-access credential sitting in a repository.
 */
export function toSql(plan, { since, generatedAt }) {
  const tables = [...new Set(plan.steps.map((s) => s.tbl))].sort()
  const out = [
    '-- Rewind to ' + since,
    '-- Generated ' + generatedAt + ' by apps/web/scripts/rewind.mjs',
    '-- Apply as `postgres`. Read backups/README.md first.',
    '--',
    '-- BEFORE RUNNING: confirm no migration was applied after the cut.',
    '--   select version from supabase_migrations.schema_migrations order by version desc limit 5;',
    '-- Reversing rows into a table whose shape has changed is not a rollback.',
    '',
    'begin;',
    '',
    '-- Triggers off: left on, the undo writes a mirror image of itself into the',
    '-- log and a second rewind would try to undo the undo (trap 36). One marker',
    '-- row at the end records that this happened, which is what you actually want.',
    ...tables.map((t) => 'alter table public.' + t + ' disable trigger ' + t + '_audit;'),
    ...(tables.includes('app_config') ? ['alter table public.app_config disable trigger app_config_touch;'] : []),
    '',
  ]

  for (const s of plan.steps) {
    const where = 'where ' + s.pk + ' = ' + lit(s.key)
    out.push('-- ' + s.tbl + ' ' + s.pk + '=' + s.key + ' — ' +
      (s.action === 'delete' ? 'did not exist' : 'restore state') +
      ' at the cut (audit_log ' + s.firstEntry + ', ' + s.at + (s.by ? ', ' + s.by : '') + ')')
    out.push('delete from public.' + s.tbl + ' ' + where + ';')
    if (s.action === 'restore') {
      out.push('insert into public.' + s.tbl + ' select * from jsonb_populate_record(' +
        'null::public.' + s.tbl + ', ' + lit(JSON.stringify(s.before)) + '::jsonb);')
    }
    out.push('')
  }

  out.push(
    ...(tables.includes('app_config') ? ['alter table public.app_config enable trigger app_config_touch;'] : []),
    ...tables.map((t) => 'alter table public.' + t + ' enable trigger ' + t + '_audit;'),
    '',
    '-- One row saying the rewind happened, rather than a mirror of every undo.',
    'insert into public.audit_log (actor, actor_email, tbl, op, before, after) values (',
    '  null, ' + lit('rewind.mjs') + ', ' + lit('audit_log') + ', ' + lit('UPDATE') + ', null,',
    '  ' + lit(JSON.stringify({
      rewind_to: since,
      generated_at: generatedAt,
      steps: plan.steps.length,
      tables: plan.tables,
    })) + '::jsonb);',
    '',
    'commit;',
    '',
  )
  return out.join('\n')
}
