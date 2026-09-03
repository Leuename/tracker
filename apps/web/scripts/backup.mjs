/**
 * Snapshot the whole workspace into `backups/` at the repository root.
 *
 *   BACKUP_EMAIL=… BACKUP_PASSWORD=… npm run backup
 *
 * `--env-file-if-exists` rather than `--env-file`: locally the Supabase URL and
 * key come from .env.local, and in CI that file does not exist — it is
 * gitignored — so they arrive as real environment variables instead. The strict
 * flag aborts on the missing file and takes the nightly backup down with it.
 *
 * Why this exists: the project is on the Supabase free plan, whose backups are
 * not downloadable, and real payables now live in it. This is the restore path.
 *
 * It signs in as an ordinary account and reads through RLS — deliberately. A
 * `service_role` key would have to be stored in GitHub, and a backup is not
 * worth handing a full-access credential to CI.
 *
 * Rows are written in the database's own column shape, not the app's, because
 * that is what can be inserted straight back. Files are written once and then
 * left alone; object keys are unique per upload, so a key that is already on
 * disk cannot have different bytes behind it.
 *
 * One snapshot is kept, overwritten each run. Git is the history: `git log -p
 * backups/` is every past state, and restoring a given day is a checkout.
 */
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { supabase } from '../src/supabase.js'

const HERE = dirname(fileURLToPath(import.meta.url))
const OUT = join(HERE, '..', '..', '..', 'backups')
const BUCKET = 'receipts'
const TABLES = ['txns', 'receipts', 'recurring', 'transfers', 'app_config', 'audit_log', 'profiles']

const email = process.env.BACKUP_EMAIL
const password = process.env.BACKUP_PASSWORD
if (!email || !password) {
  console.error('Set BACKUP_EMAIL and BACKUP_PASSWORD to a real account on this project.')
  process.exit(2)
}

/**
 * Stable output, so an unchanged database produces a byte-identical file and
 * git reports nothing. Without sorted keys the driver's row order alone would
 * manufacture a diff every single day.
 */
const stable = (v) => {
  if (Array.isArray(v)) return v.map(stable)
  if (v && typeof v === 'object') {
    return Object.fromEntries(Object.keys(v).sort().map((k) => [k, stable(v[k])]))
  }
  return v
}
const writeJson = (name, rows) =>
  writeFile(join(OUT, name + '.json'), JSON.stringify(stable(rows), null, 2) + '\n')

const { data: auth, error: authError } = await supabase.auth.signInWithPassword({ email, password })
if (authError) {
  console.error('Sign-in failed: ' + authError.message)
  process.exit(2)
}
console.log('signed in as ' + email)

await mkdir(join(OUT, 'files'), { recursive: true })

/**
 * Read every row, in pages.
 *
 * PostgREST caps a response at 1,000 rows by default and says nothing about it:
 * no error, no flag, just a short array. `audit_log` crossed 1,000 on
 * 2026-09-02 and the snapshot that morning wrote exactly `1000` while the table
 * held 1,129 — a backup missing 129 rows of history, reported as a success.
 *
 * The tell was the round number, and it was read past. So this counts first and
 * then insists on the count: a short read is a failure, not a smaller backup.
 */
async function readAll(table) {
  const { count, error: countError } = await supabase
    .from(table).select('*', { count: 'exact', head: true })
  if (countError) throw new Error('Could not count ' + table + ': ' + countError.message)

  const PAGE = 1000
  const rows = []
  for (let from = 0; from < (count || 0); from += PAGE) {
    const { data, error } = await supabase.from(table).select('*').range(from, from + PAGE - 1)
    if (error) throw new Error('Could not read ' + table + ': ' + error.message)
    rows.push(...data)
  }
  // The assertion is the point of the function. A backup that quietly holds
  // less than the database is worse than one that fails and says so.
  if (rows.length !== (count || 0)) {
    throw new Error('Read ' + rows.length + ' rows from ' + table + ' but it holds ' + count +
      '. Refusing to write a partial backup.')
  }
  return rows
}

const counts = {}
for (const table of TABLES) {
  let data
  try {
    data = await readAll(table)
  } catch (e) {
    console.error(e.message)
    process.exit(1)
  }
  // Sorted by primary key so row order never depends on how Postgres felt.
  //
  // Numerically when the key is a number, which every table here uses. String
  // comparison put audit_log in the order 1, 10, 100, 101, ... 2, 20 — so each
  // night's new rows landed scattered through the file rather than at the end,
  // and one snapshot rewrote 6,342 lines and "deleted" 236 in a table nothing
  // can delete from. Sorted properly the file only ever grows at the bottom and
  // `git log -p backups/` stays readable.
  const rows = [...data].sort((a, b) =>
    typeof a.id === 'number' && typeof b.id === 'number'
      ? a.id - b.id
      : String(a.id).localeCompare(String(b.id)))
  await writeJson(table, rows)
  counts[table] = rows.length
  console.log('  ' + table + ': ' + rows.length + ' rows')
}

// ---- the accounts themselves -----------------------------------------
// `profiles` records who is an administrator. It does NOT record that they
// exist: `profiles.user_id` references `auth.users(id)`, and auth.users is
// deliberately unreachable from a client — the security probe asserts it and
// that must stay true. Restoring profiles.json into a fresh project therefore
// failed outright, proven on 2026-09-02:
//
//   23503 violates foreign key constraint "profiles_user_id_fkey"
//
// Worse than a hard failure would have been a soft one: an account with no
// profile row is a viewer (D29), so a restore that skipped the roster hands
// back a ledger nobody can write to, and throws nothing.
//
// The ids are already in profiles.json. What was missing is the email each id
// belongs to — and that is recoverable without any new privilege, because
// `log_change()` resolves actor_email at write time and audit_log is readable.
// So the roster is reconstructed from data this backup already holds, rather
// than by handing CI a service_role key that D13 deliberately refused.
// Read from the file just written rather than the network: it is the same rows,
// already paged and already checked against the table's own count.
const auditRows = JSON.parse(await readFile(join(OUT, 'audit_log.json'), 'utf8'))
const emailOf = new Map(
  auditRows.filter((a) => a.actor && a.actor_email).map((a) => [a.actor, a.actor_email]))

// An account that has never made an audited change is named nowhere in the log,
// so this run cannot derive its email — and never will, because the script signs
// in as `authenticated`, which cannot read `auth.users`. Deriving alone would
// therefore keep overwriting a known address with null on every single run, and
// an account with no address cannot be recreated at all: the restore comes back
// three of four, silently, with the fourth person locked out.
//
// So the previous snapshot is a source too. Whatever this run can derive wins —
// an email that changed must not be pinned to a stale one — and anything it
// cannot derive is carried forward from the file already on disk. A known email
// is never replaced with null.
const previous = new Map()
try {
  for (const a of JSON.parse(await readFile(join(OUT, 'accounts.json'), 'utf8'))) {
    if (a.email) previous.set(a.user_id, a.email)
  }
} catch { /* no snapshot yet, or an unreadable one: derive what we can */ }

const roster = JSON.parse(await readFile(join(OUT, 'profiles.json'), 'utf8'))
const accounts = [...roster]
  .sort((a, b) => String(a.user_id).localeCompare(String(b.user_id)))
  .map((p) => ({
    user_id: p.user_id,
    role: p.role,
    email: emailOf.get(p.user_id) || previous.get(p.user_id) || null,
  }))
await writeJson('accounts', accounts)

// Warn only about what is still missing after the merge — an address recovered
// from the previous snapshot is not a hole, and reporting it as one would train
// everyone to ignore the line.
const nameless = accounts.filter((a) => !a.email)
console.log('  accounts: ' + accounts.length + ' in the roster, ' +
  (accounts.length - nameless.length) + ' with a known email')
if (nameless.length) {
  console.log('  WARNING: no email for ' + nameless.map((a) => a.user_id).join(', '))
  console.log('           never named in audit_log and not in the previous snapshot; read the')
  console.log('           address out of the Auth dashboard by hand. See backups/README.md.')
}

// ---- stored documents ------------------------------------------------
/**
 * List a storage prefix, in pages.
 *
 * `storage.list()` carries the same silent 1,000-row ceiling that truncated
 * `audit_log` (see readAll above): ask for 1,000, get exactly 1,000, and there
 * is no error and no flag to say more were waiting. Both listings below used to
 * pass `{ limit: 1000 }` once and take whatever came back, which is F1 one
 * directory over — it has never bitten only because the bucket has been empty
 * at every backup ever taken.
 *
 * `readAll`'s shape cannot be reused here: it counts first with PostgREST's
 * `{ count: 'exact', head: true }` and pages with `.range()`, and the storage
 * API offers neither — there is no way to ask how many objects a prefix holds.
 * So the assertion is the weaker one available: a full page means there may be
 * more, and only a short page proves the end. Both call sites go through this
 * function so a fix cannot reach one and miss the other again.
 */
const PAGE = 1000
async function listAll(prefix) {
  const all = []
  for (let offset = 0; ; offset += PAGE) {
    const { data, error } = await supabase.storage.from(BUCKET)
      .list(prefix, { limit: PAGE, offset })
    if (error) throw new Error('Could not list storage at "' + prefix + '": ' + error.message)
    all.push(...(data || []))
    if (!data || data.length < PAGE) return all
  }
}

// Objects sit one folder per receipt id, so listing has to walk two levels.
const listed = []
try {
  for (const folder of await listAll('')) {
    if (folder.id) { listed.push(folder.name); continue } // a file at the root
    for (const f of await listAll(folder.name)) listed.push(folder.name + '/' + f.name)
  }
} catch (e) {
  console.error(e.message)
  process.exit(1)
}

let fetched = 0
for (const path of listed) {
  const target = join(OUT, 'files', path.replace(/\//g, '__'))
  if (existsSync(target)) continue
  const { data, error } = await supabase.storage.from(BUCKET).download(path)
  if (error) {
    console.error('Could not download ' + path + ': ' + error.message)
    process.exit(1)
  }
  await writeFile(target, Buffer.from(await data.arrayBuffer()))
  fetched++
}
const onDisk = (await readdir(join(OUT, 'files'))).filter((f) => f !== '.gitkeep')
console.log('  files: ' + listed.length + ' stored, ' + fetched + ' newly downloaded, ' + onDisk.length + ' held')

// ---- manifest --------------------------------------------------------
// The timestamp changes every run, so there is always something to commit.
// That is on purpose: GitHub disables a scheduled workflow after 60 days
// without a commit, and a backup that quietly stops is worse than none.
const peso = (n) => '₱' + Number(n || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })
const txns = JSON.parse(await readFile(join(OUT, 'txns.json'), 'utf8'))
const receipts = JSON.parse(await readFile(join(OUT, 'receipts.json'), 'utf8'))
const sum = (rows, k) => rows.reduce((a, r) => a + Number(r[k] || 0), 0)

await writeFile(join(OUT, 'MANIFEST.md'), [
  '# Backup manifest',
  '',
  'Written by `apps/web/scripts/backup.mjs`. Do not edit by hand.',
  '',
  '| | |',
  '|---|---|',
  '| Taken | ' + new Date().toISOString() + ' |',
  '| Project | ' + (process.env.VITE_SUPABASE_URL || '').replace(/^https:\/\//, '') + ' |',
  ...TABLES.map((t) => '| `' + t + '` rows | ' + counts[t] + ' |'),
  '| Accounts in the roster | ' + accounts.length +
    (nameless.length ? ' (' + nameless.length + ' with no recoverable email)' : '') + ' |',
  '| Stored files | ' + onDisk.length + ' |',
  '| Transactions total | ' + peso(sum(txns, 'amount')) + ' |',
  '| Receipts released | ' + peso(sum(receipts, 'amount')) + ' |',
  '',
  'Restoring means recreating the accounts first, then the rows — see [the README](README.md).',
  'The accounts step is not optional: without it `profiles` cannot be restored, and without',
  '`profiles` every account comes back as a viewer.',
  '',
].join('\n'))

console.log('backup written to backups/')
await supabase.auth.signOut()
