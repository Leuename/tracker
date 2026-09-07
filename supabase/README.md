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

The hosted production project and `tracker-rehearsal` each have nineteen applied migrations. The
two pending occurrence-identity files are listed separately and have run on neither project.

Until 2026-09-01 these existed **only** inside the Supabase project. The repository had no
schema source of truth, so losing the project lost the shape of the data as well as the
data. They are versioned here now.

## Applied migrations

The table lists 19 applied migrations. The two applied R7 migrations are documented in their own
section below; together they make the hosted count of **twenty-one**.

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
| `20260904155131_masterlist_link_and_ecash_fee` | `txns.src` (a foreign key to `recurring`, ON DELETE SET NULL) and `txns.fee`, both added to the column-level insert and update grants ([D50](../docs/Decisions.md)) |
| `20260904204252_transfer_invoice_number` | `transfers.inv`, text NOT NULL defaulting to `''`, modelled on `note`. Its grant is additive only — `transfers` has no table-wide INSERT/UPDATE, so re-listing columns would have risked dropping `rate`/`rate_as_of` ([D51](../docs/Decisions.md)) |
| `20260905094348_one_generated_row_per_due_date` | A partial unique index on `(src, due) where src is not null`, so Postgres refuses a second generated row for the same payable and due date. Deliberately **not** extended to hand-entered rows, whose duplicate warning is advisory by design ([D63](../docs/Decisions.md)) |
| `20260905143255_money_constraints` | Seven CHECK constraints across `txns`, `receipts`, `recurring` and `transfers`. Every money rule had lived only in the browser ([D65](../docs/Decisions.md)); `receipts.amount >= 0` rather than `> 0` so the backup-proof row survives |
| `20260907181000_generated_occurrence_identity` | Adds nullable `txns.occurrence_due`, permits clients to set both identity fields on INSERT, revokes UPDATE only on `occurrence_due`, scrutinizes each linked row's `src`/`due` history and aborts ambiguous mappings, and adds the `(src, occurrence_due)` partial unique index alongside D63's. Deliberately preserves UPDATE(`src`) so the bundle being replaced keeps working ([D79](../docs/Decisions.md)) |
| `20260907182000_enforce_generated_occurrence_identity` | Revokes UPDATE(`src`), validates `src is null or occurrence_due is not null`, and drops D63's `(src, due)` index. **Applied only after the identity-aware deployment was live and verified** ([D80](../docs/Decisions.md)) |

## The occurrence-identity rollout — applied 2026-09-08

Both files are applied. The order was phase 1 → deploy and verify the identity-aware application →
phase 2, and it is load-bearing: deploying first causes PostgREST unknown-column failures, and
applying phase 2 before the deployment rejects stale clients. Each phase was rehearsed on
`tracker-rehearsal` first, and each stored statement's MD5 was read back and matched against its
file — `1d164ba0be70f52f709ec3facef2b48f` and `69cf1c0b932287d1710966c65e375d2e`. Deleting a
recurring parent was confirmed to leave its generated transactions unlinked through
`ON DELETE SET NULL` without a constraint failure. Full record in [D80](../docs/Decisions.md).

**Run the acceptance suite again after phase 2, not only between the phases.** The plan ran e2e once,
before phase 2, and two defects survived it — including a spec whose refusal came from the index
phase 2 drops. Nothing in the prescribed order exercises the application against the final grant set.

The two R7 migrations, `20260903204135` and `20260903204751`, ran between applied versions shown
above and are documented in their own section below rather than in that table. Replay in
**version** order, not table order.

Production has **twenty-one** applied migrations as of 2026-09-08, latest `20260907182000`.
`tracker-rehearsal` carries the same schema, though its own version strings were assigned at apply
time and do not match production's character for character.

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

`tracker-rehearsal` still has all nineteen migrations applied: `fx_rates`,
`private_is_viewer`, and `drop_public_is_viewer` were applied exactly. Production now has
nineteen migrations: `private_is_viewer` and `drop_public_is_viewer` are applied, the public RPC
is absent (`404` / `PGRST202`), the private schema is refused (`406` / `PGRST106`), all 17 write
policies plus `merge_app_config` use `private.is_viewer()`. The current probe has 57 checks: 56 pass
and the generated-identity check is deferred before phase 1. Run it with
`OCCURRENCE_IDENTITY_PHASE=1` both before and after phase 1; once the column exists it must prove
`occurrence_due` refused with exact `42501` while `src` remains allowed. Deferral is permitted only
while phase 1 is unapplied or that compatibility state is being verified. Only after phase 2 set
`OCCURRENCE_IDENTITY_PHASE=2`; the check is then removed from `DEFERRED`, exact `42501` is required
for both, and any failure is fatal/nonzero.
The ledger is unchanged.

The rehearsal leaves the public RPC absent (`404` / `PGRST202`) and the private schema
unexposed (`406` / `PGRST106`). All 17 write policies and `merge_app_config` use
`private.is_viewer()`. Rolled-back administrator and viewer simulations passed with row counts
unchanged, and the deployed production bundle contains zero `is_viewer` RPC calls.

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

## R7 migrations

The two R7 migrations below were applied to production after rehearsal; every file here,
`20260903144056_fx_rates` included, is byte-identical to what was applied to production.

**Both were renamed on 2026-09-04 to the versions MCP actually assigned** — `20260903204135` and
`20260903204751`, read back out of `supabase_migrations.schema_migrations`. They had been written
in advance as `20260903071500` and `20260903071600`, which is the exact mistake the rule above
warns about: the folder and the database disagreed about what a version is, and worse, the invented
timestamps sorted the two files *before* `20260903144056_fx_rates` when the database applied them
*after* it. A replay in filename order would not have reproduced the sequence that was proven.

Only the filenames changed. Their contents still reference each other by the old names in comments,
and were deliberately left alone: the byte-for-byte match against the stored statement
(`eb46987e91c5de212e224e0f2ade1052` and `c606df3049aa21748e7b9aa1e9e6cbcb`) is evidence of what
actually ran, and editing a comment to tidy a cross-reference would destroy it. Byte-identity is
the stronger invariant; a stale comment is the cheaper cost.

| File | State |
|---|---|
| `20260903204135_private_is_viewer.sql` | Moves `is_viewer()` into a non-exposed `private` schema and repoints all 17 write policies plus `merge_app_config`. Proven on rehearsal and applied to production |
| `20260903204751_drop_public_is_viewer.sql` | Drops `public.is_viewer()`. Proven on rehearsal and applied to production. **Do not apply it out of order** |

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

The safe production order was migration 1, confirm the deployed frontend and reload open tabs,
then migration 2 followed by `npm run security`. The probe now has 57 checks: 56 pass and the
generated-identity check is deferred until phase 1. Read the catalogue back after
each application: `{"success": true}`
proves the SQL ran, not that it achieved anything.

## Rollbacks

**Every new migration ships a `-- rollback:` block in the same file.** This is prospective, and
it says nothing about the twelve already here: none of them is reversible, none is being
retrofitted, and pretending otherwise would be worse than the gap. The convention starts with the
next migration written.

**The convention has been honoured twice and missed six times.** Only `20260903204135` and
`20260903204751` carry the block. `masterlist_link_and_ecash_fee`, `transfer_invoice_number`,
`one_generated_row_per_due_date`, `money_constraints`, `generated_occurrence_identity` and
`enforce_generated_occurrence_identity` do not. They are applied, and an applied migration is not
edited, so the gap is recorded here rather than papered over. The reversal for the
occurrence-identity pair is written out below; the other four are additive and reverse by dropping
what they added.

### Reversing the occurrence-identity rollout

Undo in the opposite order to the rollout, and stop after phase 2 unless you truly intend to lose
the identities. **Phase 2's reversal is safe. Phase 1's destroys data.**

Phase 2 — restores D63's `(src, due)` uniqueness and the client's ability to write `src`:

```sql
begin;
alter table public.txns drop constraint txns_generated_occurrence_has_identity;
grant update (src) on public.txns to authenticated;
create unique index txns_one_generated_row_per_due_date
  on public.txns (src, due)
  where src is not null;
commit;
```

That `create unique index` fails if any payable already has two generated rows sharing a due date —
which phase 2 legalised, and which is the whole reason the index was dropped. Reconcile those rows
by hand first; do not widen the index to make the statement pass.

Phase 1 — **drops the column, and every occurrence identity with it**:

```sql
begin;
drop index public.txns_one_generated_row_per_occurrence;
alter table public.txns drop column occurrence_due;   -- takes its column grants with it
commit;
```

There is no way back from this one. `occurrence_due` is not derivable from the ledger afterwards:
the audit trail can reconstruct a row's original due date only while its history is intact, and a
rescheduled row's visible `due` is by definition not its occurrence. Take a backup first, and
redeploy the pre-identity bundle before running it, or every write from the live application will
fail on an unknown column.

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

### The convention's first two test cases both failed it

`20260904155131_masterlist_link_and_ecash_fee` and `20260904204252_transfer_invoice_number` are the
first two migrations written after the rule above, and **neither carries a `-- rollback:` block**.
Found by adversarial review on 2026-09-05, recorded here rather than quietly corrected.

They are not being retrofitted, because this folder's stronger rule wins: a migration file is
byte-identical to the statement stored in `supabase_migrations.schema_migrations`, and that identity
*is* the evidence of what ran. Editing either file — even to add a comment — destroys the MD5 match
that makes it evidence, which is the same reasoning that left the R7 files' stale cross-references
alone. The rollbacks are therefore recorded here, where they can be read without touching the files:

```sql
-- 20260904155131_masterlist_link_and_ecash_fee
-- rollback:
--   alter table public.txns drop column src, drop column fee;
--   revoke insert, update on public.txns from authenticated;
--   grant insert (id, co, cat, description, period, due, amount, status, done, pay_type, check_no, notes)
--     on public.txns to authenticated;
--   grant update (co, cat, description, period, due, amount, status, done, pay_type, check_no, notes)
--     on public.txns to authenticated;
--   -- The columns come back empty if re-added. Every masterlist link is
--   -- forgotten and every recorded e-cash charge is lost. No money figure
--   -- moves: `amount` already includes the charge, so what is lost is the
--   -- ability to say how much of it was one. Values survive only in
--   -- backups/txns.json and audit_log.

-- 20260904204252_transfer_invoice_number
-- rollback:
--   alter table public.transfers drop column inv;
--   -- No re-grant: the forward migration revoked nothing, so the column's
--   -- privileges go with the column. Dropping it discards every recorded
--   -- invoice number; they survive only in backups/transfers.json and
--   -- audit_log.
```

The convention still stands for the next migration written, and it now has a worked example of what
skipping it costs: a rollback that lives somewhere other than beside the change it undoes, which is
precisely what the rule exists to prevent.

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
