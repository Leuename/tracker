---
title: Supabase Schema
tags: [supabase, migrations, schema, database, tracker]
created: 2026-09-01
status: active
related:
  - "[Backups](../backups/README.md) — the rows; this folder is the shape they go back into"
  - "[Decisions](../docs/Decisions.md) — D8 fixes the shared-workspace access model these policies implement"
  - "[Repository Evidence](../docs/Repository%20Evidence.md) — the factual baseline"
up: "[AI Agent Context](../docs/AI%20Agent%20Context.md)"
---

# Supabase schema

The thirteen migrations that built the hosted project, in the order they were applied.

Until 2026-09-01 these existed **only** inside the Supabase project. The repository had no
schema source of truth, so losing the project lost the shape of the data as well as the
data. They are versioned here now.

| Version | What it does |
|---|---|
| `20260831080433_erp_tracker_schema` | The first schema: four tables, one private copy per account |
| `20260831081217_revoke_anon_from_erp_tables` | Takes back the privileges Supabase grants `anon` by default |
| `20260831085534_shared_workspace_two_users` | Drops per-account ownership; one shared ledger, recreated |
| `20260831155259_lock_server_managed_columns` | Column-level grants, so a client cannot back-date `created_at` |
| `20260831160423_receipt_files` | `receipts.file_path`, the private bucket, and its four storage policies |
| `20260901092715_telegraphic_transfers` | The `transfers` table, its indexes, grants and policy |
| `20260901092751_lock_transfer_server_managed_columns` | Revokes the table-wide grant the previous migration left behind ([D23](../docs/Decisions.md)) |
| `20260901150411_audit_log` | `audit_log`, the `security definer` `log_change()`, and one trigger per table ([D24](../docs/Decisions.md)) |
| `20260901150458_lock_audit_log_truncate` | Revokes the TRUNCATE and TRIGGER grants `revoke insert, update, delete` had left ([D25](../docs/Decisions.md)) |
| `20260901165841_merge_app_config` | `merge_app_config(patch)`, so two people editing different settings stop clobbering each other ([D28](../docs/Decisions.md)) |
| `20260901170544_viewer_role` | `profiles`, `is_viewer()`, and every write policy rewritten behind it ([D29](../docs/Decisions.md)) |
| `20260901170754_harden_merge_app_config` | Makes a refused config merge raise `42501` instead of returning 0 ([D30](../docs/Decisions.md)) |
| `20260903144056_fx_rates` | `fx_rates`, the `fx_latest` view, and `transfers.rate`/`rate_as_of`. No administrator can write a rate — its two write policies name one dedicated account's uid instead of gating on `is_viewer()`, because a rate a user can edit is not a rate |

## How these were produced

Read back out of `supabase_migrations.schema_migrations` in the hosted project and written
here verbatim. Each file was verified byte-for-byte against the stored statement by MD5, so
the text is exactly what was applied — not a re-derivation and not a `db pull` summary.

Re-verify at any time:

```sql
select version, md5(statements[1]) from supabase_migrations.schema_migrations order by version;
```

Compare against `printf '%s' "$(cat <file>)" | md5` — the stored statements carry no trailing
newline, so strip yours before hashing.

## What has been proven

**These replay.** Twice, into empty projects, compared by fingerprint rather than by eye.

| When | Scope | Result |
|---|---|---|
| 2026-09-01 | The first nine | 178 catalogue facts, `a18b5dd26e148a1e216068023b0e4403` on both sides |
| 2026-09-02 | **All twelve**, into `tracker-rehearsal` | **291** facts scoped to `public`, `7d44a32a1ad258f984fb145892e94c97` on both sides |

The 2026-09-02 run is the first replay of `merge_app_config`, `viewer_role` and
`harden_merge_app_config`, which postdate the earlier rehearsal. The fingerprint covers
columns, policies, indexes, triggers, table grants, column grants and function bodies.

Migration 1 creates tables that migration 3 drops and recreates. That is no longer "in
principle": it has been done.

**Scope a catalogue fingerprint to `public`.** An earlier comparison read 177 facts against
176 and looked like drift; the extra was `realtime.subscription.tr_check_filters`, a
Supabase platform trigger, because the query excluded `storage%` but not `realtime%`.

`20260903144056_fx_rates` postdates both replays above and has not been through one: it is
proven live on production — write refused for an administrator, permitted for the rates
account, `fx_latest` readable, all checked directly and via `npm run security` — but not proven
to replay cleanly into an empty project the way the first twelve are. The next full replay
should cover it.

## What has still not been proven

A replayed *schema* is not a restored *database*. The data half has its own failure modes and
two of them were live until 2026-09-02 — the account roster could not be restored at all, and
the `audit_log` sequence fails days after a restore rather than on the next write. Both are
written up in [Backups](../backups/README.md) and [Decisions](../docs/Decisions.md) D33; read that
before rebuilding anything for real.

The Supabase CLI is **not** installed and this folder is not CLI-managed. There is no
`config.toml` and no linked project. Adopting `supabase link` and `supabase db push` is the
natural next step and would make these files executable rather than merely accurate.

## Changing the schema

Migrations are still applied through the Supabase dashboard or MCP, not from here. After
applying one, copy it into this folder with the same `version_name.sql` filename and verify
its MD5. A schema change that never lands here puts the repository back where it was.

**MCP assigns the version, not you.** `apply_migration` stamps its own timestamp, so read
`supabase_migrations.schema_migrations` back and rename the local file to match rather than
naming it in advance — otherwise the folder and the database disagree about what a version is.

**A new table needs five things it does not inherit**: `revoke all` then grant back only what
is intended (D23, D25); its own RLS policies — and since D29 that means a `for select` policy
plus separate write policies predicated on `not public.is_viewer()`, because a single
`for all using (true)` would hand a viewer full write access; an entry in `TABLES` in
`apps/web/scripts/backup.mjs`; its own checks in `apps/web/security/probe.mjs`; and its own
`log_change()` trigger (D24).

`fx_rates` is the one deliberate exception to the `not is_viewer()` write pattern: a rate a
user can edit is not a rate, so its write policies name one dedicated account's uid instead of
gating on role at all. Copying that shape onto an ordinary table would be a mistake — it exists
because no administrator should be able to write here, which is not true of `txns`,
`receipts`, `recurring` or `transfers`.

## Pending, written but not applied

Two migrations sit in `migrations/` that **no database has ever run**. Every other file here,
`20260903144056_fx_rates` included, is byte-identical to what was applied; these two are not, and
the folder's usual invariant — apply in version order and the schema rebuilds — does **not** hold
while they are present.

| File | State |
|---|---|
| `20260903071500_private_is_viewer.sql` | Moves `is_viewer()` into a non-exposed `private` schema and repoints all 17 write policies plus `merge_app_config`. Keeps `public.is_viewer()` deliberately. Unapplied, and unproven even on the rehearsal project |
| `20260903071600_drop_public_is_viewer.sql` | Drops `public.is_viewer()`. **Do not apply it out of order** |

`fx_rates` needed the same kind of gate while it was unapplied — its two write policies name one
dedicated account's uid, so the account had to exist first — but that account was created on
2026-09-03 and the migration has since been applied and proven live, so it moved up into the main
table above. It is independent of the two `is_viewer` migrations below and was applied without
touching either.

**The ordering is load-bearing.** While a deployed frontend still calls `/rest/v1/rpc/is_viewer`,
dropping the function breaks sign-in for everybody. The sequence is: apply migration 1 → deploy the
`apps/web/src/db.js` change that reads `public.profiles` directly → *then* apply migration 2. The
`db.js` change is already in the tree and is safe on its own, because it needs no privilege the app
did not already hold.

Prove both on `tracker-rehearsal` before either reaches production, and read the catalogue back
afterwards: `{"success": true}` proves the SQL ran, not that it achieved anything.

## Rollbacks

**Every new migration ships a `-- rollback:` block in the same file.** This is prospective, and
it says nothing about the twelve already here: none of them is reversible, none is being
retrofitted, and pretending otherwise would be worse than the gap. The convention starts with the
next migration written.

One file, both directions. A rollback kept in a second file drifts from the change it undoes, or
is written months later by somebody reconstructing what the first one did — which is the moment a
rollback is least trustworthy. Written beside the forward statements it is reviewed with them.

The block goes at the end of the file, entirely inside SQL comments so the migration itself still
applies as one statement list:

```sql
create table public.fx_rates (
  code       text        primary key,
  rate       numeric     not null,
  fetched_at timestamptz not null default now()
);

revoke all on public.fx_rates from anon, authenticated;
grant select on public.fx_rates to authenticated;

-- rollback:
--   drop table if exists public.fx_rates;
```

Say what cannot be undone rather than leaving it out. A `drop column` loses its data, and a
rollback block that recreates the column returns the schema and not the rows:

```sql
-- rollback:
--   alter table public.txns add column note text;
--   -- The column comes back empty. The values are only in backups/txns.json
--   -- and audit_log; see backups/README.md.
```

### Applying one

Rolling back is as manual as applying: there is no CLI, no linked project and no `supabase db
push` here (see above), so this is a supervised operation, not a command.

1. Read the block out of the migration file. **Read it, do not run it blind** — check it against
   what the forward migration actually did, because the schema has moved since.
2. Run the statements as `postgres` in the Supabase SQL editor. `authenticated` cannot drop or
   alter these objects, and a client-credentialed attempt fails in ways that look like something
   else.
3. Delete the version row so the folder and the database agree again:

   ```sql
   delete from supabase_migrations.schema_migrations where version = '20260901170544';
   ```

4. **Verify against the catalogue.** `{"success": true}` proves the SQL ran, not that it achieved
   anything — read `information_schema` (or the fingerprint query used for a replay) and confirm
   the objects are actually gone. This has misled this project before.
5. Delete the migration file, or write a new forward migration that supersedes it. Leaving a
   rolled-back file in the folder puts the repository back where it started: a folder that no
   longer describes the database.

A rolled-back migration whose table held rows is a data loss as well as a schema change. Take a
`npm run backup` first — it is a minute — and check the counts in `backups/MANIFEST.md` before
and after.

## Guideline Basis

- **PG-02** documents only what checked-in evidence supports; nothing here claims a runnable CLI workflow.
- **DOC-02** separates the verified record from the untested rebuild.
- **PG-04** names the reproducible check behind the byte-for-byte claim.
- **SEC-03** is why no credential or connection string appears here.

implements: [Awesome Guidelines Integration](../docs/Awesome%20Guidelines%20Integration.md)

Related: [Backups](../backups/README.md) · [Decisions](../docs/Decisions.md) · [Handoff](../docs/Handoff.md)
