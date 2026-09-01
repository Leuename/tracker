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

The five migrations that built the hosted project, in the order they were applied.

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

## What has not been proven

**Nobody has replayed these against an empty project.** They are a faithful record of what
was applied to *this* database, in order, which is not the same as a rebuild that is known
to work. Migration 1 creates tables that migration 3 drops and recreates; that replays in
principle, and in principle is as far as the evidence goes.

The Supabase CLI is **not** installed and this folder is not CLI-managed. There is no
`config.toml` and no linked project. Adopting `supabase link` and `supabase db push` is the
natural next step and would make these files executable rather than merely accurate.

## Changing the schema

Migrations are still applied through the Supabase dashboard or MCP, not from here. After
applying one, copy it into this folder with the same `version_name.sql` filename and verify
its MD5. A schema change that never lands here puts the repository back where it was.

## Guideline Basis

- **PG-02** documents only what checked-in evidence supports; nothing here claims a runnable CLI workflow.
- **DOC-02** separates the verified record from the untested rebuild.
- **PG-04** names the reproducible check behind the byte-for-byte claim.
- **SEC-03** is why no credential or connection string appears here.

implements: [Awesome Guidelines Integration](../docs/Awesome%20Guidelines%20Integration.md)

Related: [Backups](../backups/README.md) · [Decisions](../docs/Decisions.md) · [Handoff](../docs/Handoff.md)
