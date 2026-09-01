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
| `txns.json`, `receipts.json`, `recurring.json`, `transfers.json`, `app_config.json`, `audit_log.json` | Every row, in database column shape |
| `files/` | Every liquidation document, one file per stored object |
| `MANIFEST.md` | Row counts, totals and the time the snapshot was taken |

Rows are written in the **database's** column shape — `due_date`, `file_path` — not the
app's. That is deliberate: the shape here is the shape that inserts straight back.

## What has been verified, and what has not

**Verified on 2026-09-01**, against the live database rather than by reading the script:

- The nightly workflow runs green with all six tables, `audit_log` included — run
  `33531626080`, 24 seconds. That mattered because `audit_log` was added to `TABLES` after
  the previous run, and a table missing from that list is invisible until a restore.
- Every file parses, and every table's column set matches `information_schema` for the live
  schema, column for column. Nothing in a backup would be rejected on insert, and no live
  column is absent from a backup.
- Row counts and money match production exactly: 21 transactions, ₱226,000.00 on both sides.

**Not verified: the restore itself.** Nobody has rebuilt an empty project from this folder.
Everything above says the data is *shaped* to go back; none of it proves the nine migrations
replay cleanly into an empty project, which is the other half. Attempted on 2026-09-01 and
blocked — a Supabase free plan allows two active projects and both slots are taken, by this
one and by `zone-offices`. Freeing one is the owner's call.

To do it when a slot exists: create an empty project, apply
[the nine migrations](../supabase/README.md) in version order, insert each JSON file into its
table, then compare counts and `sum(amount)` against `MANIFEST.md`. Restore `audit_log` last
— its triggers fire on the other tables, so restoring in the wrong order writes audit rows
for the restore itself and mixes them with the history being restored.

## A cost that is growing faster than it looks

`audit_log.json` is **226 KB of the folder's 235 KB** and climbing. At roughly 1 KB a row, a
single nightly `verify.yml` run adds about 70 rows — some 71 KB a night, 25 MB of new JSON a
year, and git keeps every version of it.

[Decisions](../docs/Decisions.md) D24 records audit retention as unbounded and "years away
from mattering". That is true of the *table*; it is **not** true of this folder, where the log
is rewritten whole every night into version control. `git log -p backups/` becomes unreadable
long before the database notices. Nothing is broken today, and no change is proposed here —
but the first person to find this folder large should look at `audit_log.json` and not be
surprised.

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
- **Accounts.** Supabase Auth users are not exported. They are recreated in the dashboard.
- **A tested restore.** Nobody has performed one against an empty project. Until somebody
  has, this is a backup that is *believed* to work.

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
