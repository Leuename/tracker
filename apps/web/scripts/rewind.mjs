/**
 * Put the ledger back the way it was at a chosen moment.
 *
 *   REWIND_EMAIL=… REWIND_PASSWORD=… npm run rewind -- --since 2026-09-02T01:00:00Z
 *
 * The Supabase free plan has no point-in-time recovery; that is a Pro add-on.
 * But `public.audit_log` has been a write-ahead log since the audit trail was
 * built (Decisions D24) — every trigger stores the whole row `before` and the
 * whole row `after`, on all six tables, `profiles` included — and nobody had
 * ever used it that way. This does.
 *
 * **It writes nothing.** It reads the log, works out the smallest set of
 * statements that restores the state at the cut, prints them, and saves them to
 * a `.sql` file for an operator to apply as `postgres`.
 *
 * That split is deliberate rather than half-finished. `authenticated` holds no
 * INSERT on `audit_log` and only column-list grants elsewhere, so a rewind run
 * through the app's own credentials would silently drop `created_at` and the
 * history — the same reason a restore cannot use them (trap 37). Applying it
 * therefore needs `postgres`, and the alternative to a human running it is a
 * `service_role` key stored somewhere permanent, which is a much larger
 * decision than a rare operator action deserves.
 *
 * What it does not cover, and nothing here pretends otherwise: stored documents
 * in the `receipts` bucket are not audited, so a deleted file does not come
 * back; schema changes are not covered at all; and if the project itself is
 * lost, `audit_log` goes with it. This is an undo, not disaster recovery —
 * `backups/` is still the thing that survives losing the project.
 */
import { writeFile } from 'node:fs/promises'
import { supabase } from '../src/supabase.js'
import { PK, planRewind, toSql } from './rewind-plan.js'
import { pageAll } from '../src/pending.js'

const args = process.argv.slice(2)
const flag = (name) => {
  const i = args.indexOf('--' + name)
  return i === -1 ? null : args[i + 1]
}

const since = flag('since')
if (!since || !/^\d{4}-\d{2}-\d{2}T/.test(since)) {
  console.error('Usage: npm run rewind -- --since 2026-09-02T01:00:00Z [--out plan.sql]')
  console.error('Give the moment to return to, as an ISO timestamp. Everything after it is undone.')
  process.exit(2)
}
const cut = new Date(since)
if (Number.isNaN(cut.getTime())) {
  console.error('Not a timestamp: ' + since)
  process.exit(2)
}
if (cut > new Date()) {
  console.error('That is in the future. Nothing to undo.')
  process.exit(2)
}

const email = process.env.REWIND_EMAIL || process.env.BACKUP_EMAIL
const password = process.env.REWIND_PASSWORD || process.env.BACKUP_PASSWORD
if (!email || !password) {
  console.error('Set REWIND_EMAIL and REWIND_PASSWORD to a real account on this project.')
  process.exit(2)
}

const { error: authError } = await supabase.auth.signInWithPassword({ email, password })
if (authError) {
  console.error('Sign-in failed: ' + authError.message)
  process.exit(2)
}
console.log('signed in as ' + email)

// `authenticated` holds SELECT on audit_log and nothing else (D24), which is
// all the planning half needs.
//
// PAGED, and that is not optional. PostgREST caps a plain `.select()` at 1,000
// rows and reports no error — `backup.mjs` has the scar: `audit_log` crossed a
// thousand on 2026-09-02 and the snapshot wrote exactly `1000` while the table
// held 1,129, reported as a success. This is the *restore* tool, so the same
// truncation is worse here: `planRewind` keys on the first entry per row, so a
// row whose first post-cut change fell past the cut-off produces **no step at
// all**. The plan comes out short, prints a confident count, and the operator
// applies it believing the rewind is complete.
const PAGE = 1000
let entries
let occurrenceIdentity = false
try {
  const probe = await supabase.from('txns').select('occurrence_due').limit(1)
  if (probe.error) {
    if (!['PGRST204', '42703'].includes(String(probe.error.code))) throw probe.error
  } else occurrenceIdentity = true
} catch (e) {
  console.error('Could not determine txns occurrence identity: ' + e.message)
  process.exit(1)
}
try {
  entries = await pageAll((cursor) => supabase
    .from('audit_log')
    .select('id, at, actor_email, tbl, op, before, after')
    .gt('at', cut.toISOString())
    .gt('id', cursor === null ? 0 : cursor)
    .order('id', { ascending: true })
    .limit(PAGE)
    .then(({ data, error }) => { if (error) throw error; return data }), PAGE)
} catch (e) {
  console.error('Could not read audit_log: ' + e.message)
  process.exit(1)
}

console.log('  ' + entries.length + ' changes recorded after ' + cut.toISOString())
if (!entries.length) {
  console.log('\nNothing to undo. The ledger has not changed since then.')
  process.exit(0)
}

const plan = planRewind(entries, { occurrenceIdentity })

console.log('\nWhat this would put back:\n')
for (const tbl of Object.keys(plan.tables).sort()) {
  const t = plan.tables[tbl]
  console.log('  ' + tbl.padEnd(12) +
    String(t.restore).padStart(4) + ' restored   ' +
    String(t.delete).padStart(4) + ' removed')
}
console.log('  ' + ''.padEnd(12) + String(plan.steps.length).padStart(4) + ' rows in total, from ' +
  entries.length + ' logged changes')

// Who did the work being undone. Worth seeing before undoing somebody's day.
const actors = [...new Set(entries.map((e) => e.actor_email).filter(Boolean))]
if (actors.length) console.log('\n  changes were made by: ' + actors.join(', '))

if (plan.unknown.length) {
  console.log('\n  SKIPPED, no key or unrecognised table: ' + plan.unknown.join(', '))
  console.log('  Tables this understands: ' + Object.keys(PK).join(', '))
}

const generatedAt = new Date().toISOString()
const out = flag('out') || 'rewind-' + cut.toISOString().replace(/[:.]/g, '-') + '.sql'
await writeFile(out, toSql(plan, { since: cut.toISOString(), generatedAt }))

console.log('\nWrote ' + out + '. Nothing has been changed.')
console.log('\nTo apply it:')
console.log('  1. Confirm no migration was applied after the cut — the file says how.')
console.log('  2. Take a backup first: npm run backup')
console.log('  3. Run it as `postgres`, in the Supabase SQL editor or through psql.')
console.log('  4. Read the state back afterwards. A blocked statement and a missing')
console.log('     row both leave you with nothing; only one of them is fine.')
