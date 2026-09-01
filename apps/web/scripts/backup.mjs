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
const TABLES = ['txns', 'receipts', 'recurring', 'transfers', 'app_config', 'audit_log']

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

const counts = {}
for (const table of TABLES) {
  const { data, error } = await supabase.from(table).select('*')
  if (error) {
    console.error('Could not read ' + table + ': ' + error.message)
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
  '| Stored files | ' + onDisk.length + ' |',
  '| Transactions total | ' + peso(sum(txns, 'amount')) + ' |',
  '| Receipts released | ' + peso(sum(receipts, 'amount')) + ' |',
  '',
  'Restoring is a checkout plus four inserts — see [the README](README.md).',
  '',
].join('\n'))

console.log('backup written to backups/')
await supabase.auth.signOut()
