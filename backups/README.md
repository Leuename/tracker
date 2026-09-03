---
title: Backups
tags: [backup, supabase, restore, operations, tracker]
created: 2026-09-01
status: active
related:
  - "[Decisions](../docs/Decisions.md) — the decision record this serves"
  - "[Repository Evidence](../docs/Repository%20Evidence.md) — the factual baseline"
  - "[Seeded Data Backup](../docs/seeded-data-backup/README.md) — the cleared demo rows, a different thing entirely"
up: "[AI Agent Context](../docs/AI%20Agent%20Context.md)"
---

# Backups

The Supabase project is on the free plan. It takes backups; it will not let you download
them, and it pauses a project after seven quiet days. Real payables now live in it. This
folder is the restore path.

## What is here

| Path | Holds |
|---|---|
| `txns.json`, `receipts.json`, `recurring.json`, `transfers.json`, `app_config.json`, `audit_log.json`, `profiles.json` | Every row, in database column shape |
| `accounts.json` | The roster as `user_id`, `role`, `email` — what a restore needs to recreate the accounts themselves |
| `files/` | Every liquidation document, one file per stored object |
| `MANIFEST.md` | Row counts, totals and the time the snapshot was taken |

Rows are written in the **database's** column shape — `due_date`, `file_path` — not the
app's. That is deliberate: the shape here is the shape that inserts straight back.

## What has been verified

**The restore was performed on 2026-09-01**, into an empty Supabase project
(`tracker-restore-test`), and compared against production by fingerprint rather than by eye.

| Claim | Evidence |
|---|---|
| The nine migrations replay into an empty project | All nine applied clean, in order |
| The rebuilt schema *is* production's schema | Identical fingerprint over 178 facts — columns, grants, column grants, RLS, policies, triggers, indexes, function security flags: `a18b5dd26e148a1e216068023b0e4403` on both |
| The ledger comes back byte-for-byte | `md5(string_agg(t::text))` over every `txns` row identical on both: `f95cd619e877916891cb0f6853f9e041`, 21 rows, ₱226,000.00 |
| Server-managed columns survive | `created_at` and `app_config.updated_at` restored to their original values, not to `now()` |
| The restored database still works | A write after restore produced audit row **223**, continuing from the restored maximum |
| The nightly job covers all six tables | Workflow run `33531626080`, `audit_log` at 222 rows |

### Rehearsed again on 2026-09-02, and it failed

The 2026-09-01 rehearsal predates `profiles`, so it proved a restore of a schema that had no
roster. Repeated on `tracker-rehearsal` against all twelve migrations, it found three things the
procedure above now carries — and they are the reason this section is not a victory lap.

| Claim | Evidence |
|---|---|
| The **twelve** migrations replay into an empty project | Identical fingerprint over **291** facts, `public` only: `7d44a32a1ad258f984fb145892e94c97` on both. First replay of `merge_app_config`, `viewer_role` and `harden_merge_app_config` |
| The ledger still comes back byte-for-byte | `f95cd619e877916891cb0f6853f9e041`, 21 rows, ₱226,000.00; `app_config.updated_at` preserved; **zero** rows written into `audit_log` by the restore |
| **The roster could not be restored at all** | `23503` on `profiles_user_id_fkey` — the backup held no `auth.users`. Fixed by `accounts.json` and step 2 |
| **The sequence trap fires late, not next** | First write after a restore succeeded; the duplicate key came only once the sequence reached the restored ids. Step 5 rewritten |
| The rewind is real | 11 logged changes → 11 statements; `txns`, `transfers` and `app_config` fingerprints all back to their pre-damage values, one marker row, zero mirror rows |

**And the snapshot itself was short.** `backup.mjs` read every table with a plain `select`, which
PostgREST caps at 1,000 rows without saying so. The morning's manifest read `audit_log rows 1000`
against a table holding **1,129** — a backup missing 129 rows, reported as a success, with a round
number as the only clue. It pages now and refuses to write a partial snapshot.

**Scope, stated precisely.** `txns`, `app_config`, `receipts`, `recurring` and `transfers` were
restored in full. `audit_log` was restored as an **18-row stratified sample** — every operation,
every table, both null and populated `row_id`, the largest jsonb payloads, and the lowest and
highest ids — rather than all 222 rows, because moving 153 KB through a chat session proves nothing
the sample does not. The statement is the same one either way.

**`files/` is now covered too.** `npm run smoke` stores a receipt document of random bytes behind a
PDF header, downloads it and compares SHA-256, uploads the held copy back under a second key and
compares again — the two hops a backup and a restore actually make. Added 2026-09-01, after the
bucket had been empty at every backup taken until then, which meant `files: 0 stored` had never said
anything about whether a document would survive one.

## The audit log is also a per-row undo

Worth knowing before reaching for this folder. `audit_log` stores the complete `before` image of
every update and delete, so a single row destroyed by accident comes back without a restore:

```sql
insert into public.txns
select * from jsonb_populate_record(null::public.txns,
  (select before from public.audit_log
    where tbl = 'txns' and op = 'DELETE' and row_id = <id>
    order by at desc limit 1));
```

Used in anger on 2026-09-01, when a probe script deleted a real transaction: the row came back with
`created_at` intact and the table's fingerprint matched its pre-incident value exactly. This folder
is for losing the project; the audit log is for losing a row.

## How to restore

Run this as `postgres`, through the SQL editor, MCP or `psql`. **Not through the application's
credentials** — that path cannot work, and it is worth knowing why: `authenticated` holds no INSERT
on `audit_log` at all, and only column-list grants elsewhere, so a client-credentialed restore
silently drops `created_at` and the entire audit history. The security model that protects the
ledger also forbids restoring it.

**Turn self-serve sign-up off on the new project before any of this.** A fresh Supabase project
allows registration by default, every read policy here is `using (true)`, and what you are about to
load is the real ledger. Proven on 2026-09-02 by registering against a rehearsal project that was
holding a copy: it succeeded. Close the door first.

1. Create an empty project and apply [the twelve migrations](../supabase/README.md) in version
   order.
2. **Recreate the accounts, with their original ids.** This step did not exist until 2026-09-02 and
   without it the restore cannot proceed: `profiles.user_id` references `auth.users(id)`, so
   loading `profiles.json` into a project with no accounts fails with
   `23503 violates foreign key constraint "profiles_user_id_fkey"`. Skipping `profiles` instead is
   worse and silent — an account with no profile row is a **viewer**, so the ledger comes back
   read-only for everyone and nothing throws.

   `accounts.json` holds the ids and emails. The ids must be preserved exactly: `profiles` and
   `audit_log.actor` both point at them.

   ```sql
   insert into auth.users (id, instance_id, aud, role, email, encrypted_password,
                           email_confirmed_at, created_at, updated_at,
                           raw_app_meta_data, raw_user_meta_data)
   values ('<user_id from accounts.json>', '00000000-0000-0000-0000-000000000000',
           'authenticated', 'authenticated', '<email>', '!password-reset-required',
           now(), now(), now(), '{"provider":"email","providers":["email"]}', '{}');
   ```

   Passwords are **not** in the backup and must not be: storing them would put credential hashes
   into version control. Every account therefore needs its password set again afterwards, from the
   dashboard. That is the right outcome for a restore anyway.

   An account that has never made an audited change has no recoverable email — `log_change()` is
   where the addresses come from — and `backup.mjs` prints a warning naming it. Read that address
   out of the old project's dashboard, or from whoever owns it.

3. **Disable the triggers**, or the restore writes history *about itself* and mixes it with the
   history being restored:

   ```sql
   alter table public.txns       disable trigger txns_audit;
   alter table public.receipts   disable trigger receipts_audit;
   alter table public.recurring  disable trigger recurring_audit;
   alter table public.transfers  disable trigger transfers_audit;
   alter table public.app_config disable trigger app_config_audit;
   alter table public.profiles   disable trigger profiles_audit;
   alter table public.app_config disable trigger app_config_touch;  -- else updated_at becomes now()
   ```

4. Load each file, `profiles.json` included. `json_populate_recordset` maps the saved column shape
   straight onto the table:

   ```sql
   insert into public.txns select * from json_populate_recordset(null::public.txns, '<txns.json>'::json);
   ```

5. **Fix the sequence, and check that you did.** `audit_log.id` is a `bigserial`, and inserting
   explicit ids does not advance it.

   ```sql
   select setval(pg_get_serial_sequence('public.audit_log','id'), (select max(id) from public.audit_log));
   -- then prove it, because the failure this prevents is invisible for a while:
   select last_value >= (select max(id) from public.audit_log) as sequence_is_safe
     from public.audit_log_id_seq;
   ```

   **This step used to say the next audited write would die if you skipped it. That is wrong, and
   the truth is more dangerous.** Rehearsed on 2026-09-02: with the sequence left at 1, the first
   write after a restore **succeeds**, because id 1 is free. So does the second, and the hundredth.
   The collision arrives whenever the sequence finally climbs into the restored block —

   ```
   23505 duplicate key value violates unique constraint "audit_log_pkey"
   ```

   — and then it hits *every* audited write on *all six* tables at once, days later, in production,
   with an error naming a table nobody was touching. A restore rehearsal that ends with "can I
   still write? yes" **passes while broken.** Assert the sequence, not the write.

6. Re-enable every trigger disabled in step 3.
7. Verify against `MANIFEST.md`, and compare fingerprints with the source if it still exists:

   ```sql
   select md5(string_agg(t::text, chr(10) order by t.id)), count(*), sum(amount) from public.txns t;
   -- and the one whose absence is silent:
   select count(*) filter (where role = 'admin') as admins, count(*) as roster from public.profiles;
   ```

   Assert the roster came back **and that its members are administrators**. Four rows of `viewer`
   and no rows at all leave the application looking identical.

Restoring `audit_log` last is not required once the triggers are off, but it keeps the ids
contiguous and makes step 5 obviously correct.

## The audit log in this folder

`audit_log.json` is the biggest file here — 226 KB of the folder's 235 KB — and it only grows,
since nothing may delete from the table.

That is fine, now. It briefly was not: rows were sorted with
`String(a.id).localeCompare(String(b.id))`, which orders ids `1, 10, 100, 101, … 2, 20`, so every
night's new rows landed scattered through the file instead of at the end. One snapshot rewrote
6,342 lines and reported 236 *deletions* in a table nothing can delete from. Fixed on 2026-09-01 by
sorting numerically; a night's rows now append and the diff shows **zero deletions**, so git deltas
stay small and `git log -p backups/` stays readable.

Volume alone is not a problem worth solving yet. At roughly 1 KB a row and an append-only diff, the
folder can carry years of history before anyone notices. If it ever does matter, `pg_cron` 1.6.4 is
available on the project and a monthly delete of rows older than some horizon is the whole job —
see [Decisions](../docs/Decisions.md) D24.

## How it is written

`.github/workflows/backup.yml` runs `apps/web/scripts/backup.mjs` nightly at 18:00 UTC,
02:00 in Manila, and commits whatever changed.

The script signs in as an ordinary account and reads through RLS, rather than using a
`service_role` key. A backup is not worth storing a full-access credential in GitHub for,
and this credential can do nothing the three people cannot already do by hand.

Run it yourself from `apps/web/`:

```bash
BACKUP_EMAIL=… BACKUP_PASSWORD=… npm run backup
```

### One snapshot, not one per night

The files are overwritten each run. **Git is the history.** `git log -p backups/` is every
state the workspace has been in, and restoring a particular day is a checkout of that
commit. Keeping a dated copy per night would bloat the repository to say the same thing.

Stored documents are the exception: they are downloaded once and then left alone, because
an object key is unique per upload and cannot have different bytes behind it later.

## Restoring

Restoring is rare, destructive and supervised, so it is written down rather than scripted —
a restore script nobody has ever run is not a safety net.

1. Find the commit you want: `git log --oneline backups/MANIFEST.md`.
2. Get its files: `git checkout <commit> -- backups/`.
3. Read `backups/MANIFEST.md` and confirm the counts and totals are the ones you expect.
4. Insert the rows back, `app_config` **last** — the app treats a missing config row as a
   never-used workspace, so writing it first makes the app think the restore is finished.
5. Re-upload `files/` into the `receipts` bucket. A filename `1788…__1756…jpg` maps back to
   the object key `1788…/1756…jpg`: the first `__` is the folder separator.
6. Sign in and check the Dashboard totals against the manifest before telling anyone it is
   done.

## What this does not cover

- **Schema.** The tables, policies and grants live in `supabase/migrations/`, versioned
  separately. A full rebuild is migrations first, then these rows.
- **The Auth users themselves.** `accounts.json` exports the roster — `user_id`, `role` and
  the email each id belongs to — but not `auth.users` rows, and not passwords. The accounts are
  still recreated by hand, from that file, with their original ids (step 2). And the file can
  only recreate an account whose **email is known**: an address is recovered from `audit_log`,
  where an account that has never made an audited change is never named. The backup carries the
  last known address forward rather than replacing it with null, so a gap has to be filled once,
  by hand, from the Auth dashboard — but until it is filled that account cannot be restored at
  all, and the roster comes back short without saying so.
- **A re-rehearsed restore.** One rehearsal has been performed, on 2026-09-02 against
  `tracker-rehearsal` — the table above is its record. It proved the twelve migrations rebuild
  production exactly and that the ledger returns byte-for-byte. It **failed** to restore the
  roster (`23503`, because `backups/` held no `auth.users`) and it showed that the `audit_log`
  sequence fails days later rather than on the next write.

  The three fixes that came out of it — the paged reads with their count assertion, this
  `accounts.json`, and the `setval` step with its assertion — have **not been exercised since
  they were written.** So what is proven is the schema and the row data; the roster and the
  sequence are a corrected procedure that nobody has yet run end to end.

A push to `main` is a production deploy, so the nightly commit would rebuild the site every night
for nothing. `apps/web/vercel.json` therefore carries:

```json
"ignoreCommand": "git diff --quiet HEAD^ HEAD -- ."
```

Vercel runs that from the Root Directory, which is `apps/web`, so `-- .` means the application
folder. Exit 0 skips the build; anything else builds. A git error is non-zero, so an unexpected
state still deploys rather than silently skipping a real change.

The commit also carries `[skip ci]`, but **Vercel ignores that marker** — it was tried first and
deployed anyway. It is kept only for CI added later. No comment explains this inside `vercel.json`
itself, because JSON here is strict: no comment keys.

## The trap

GitHub disables a scheduled workflow after 60 days without a commit to the repository. The
manifest therefore carries the run timestamp, so every night produces a real commit and the
schedule stays alive. If you ever make the manifest deterministic, you reintroduce the
failure it was written to prevent.

## Guideline Basis

- **PG-04** requires a documented, reproducible check behind any claimed capability.
- **DOC-02** separates what is verified here from what is only believed.
- **SEC-03** is why no credential appears in this note.
- **MD-02** requires descriptive, resolvable links.

implements: [Awesome Guidelines Integration](../docs/Awesome%20Guidelines%20Integration.md)

Related: [Decisions](../docs/Decisions.md) · [Handoff](../docs/Handoff.md) · [Repository Evidence](../docs/Repository%20Evidence.md)
