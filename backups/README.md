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
| `txns.json`, `receipts.json`, `recurring.json`, `app_config.json` | Every row, in database column shape |
| `files/` | Every liquidation document, one file per stored object |
| `MANIFEST.md` | Row counts, totals and the time the snapshot was taken |

Rows are written in the **database's** column shape — `due_date`, `file_path` — not the
app's. That is deliberate: the shape here is the shape that inserts straight back.

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
