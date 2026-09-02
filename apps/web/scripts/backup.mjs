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

const roster = JSON.parse(await readFile(join(OUT, 'profiles.json'), 'utf8'))
const accounts = [...roster]
  .sort((a, b) => String(a.user_id).localeCompare(String(b.user_id)))
  .map((p) => ({ user_id: p.user_id, role: p.role, email: emailOf.get(p.user_id) || null }))
await writeJson('accounts', accounts)

// An account that has never written anything has never been named in the log,
// so its email cannot be recovered this way. Say so loudly rather than shipping
// a roster with a quiet hole in it: restoring that account needs its address
// read out of the dashboard by hand.
const nameless = accounts.filter((a) => !a.email)
console.log('  accounts: ' + accounts.length + ' in the roster, ' +
  (accounts.length - nameless.length) + ' with a recoverable email')
if (nameless.length) {
  console.log('  WARNING: no email recoverable for ' + nameless.map((a) => a.user_id).join(', '))
  console.log('           these accounts have never made an audited change. See backups/README.md.')
}

// ---- stored documents ------------------------------------------------
// Objects sit one folder per receipt id, so listing has to walk two levels.
const listed = []
const { data: folders, error: listError } = await supabase.storage.from(BUCKET).list('', { limit: 1000 })
if (listError) {
  console.error('Could not list storage: ' + listError.message)
  process.exit(1)
}
for (const folder of folders || []) {
  if (folder.id) { listed.push(folder.name); continue } // a file at the root
  const { data: inner } = await supabase.storage.from(BUCKET).list(folder.name, { limit: 1000 })
  for (const f of inner || []) listed.push(folder.name + '/' + f.name)
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
