# Task 0 baseline — 2026-09-04

Repository root: `/Users/itadmin/Desktop/puge`  
Production project: `jusifpditdigqdjiwdaj`  
Rehearsal project: `bucmcnsjkuprpojhequy`

This is a read-only baseline. No migrations, database writes, production-writing security/e2e suites, or source changes were performed.

## Inputs read

Read the task brief and the requested current-state references:

- `handoff/2026-09-04 Open Items Brief for Codex.md`
- `handoff/2026-09-04 Exchange Rates and R7 Production Rollout.md`
- `docs/Decisions.md`
- `docs/Repository Evidence.md`
- `supabase/README.md`
- `backups/README.md`
- `AGENTS.md`
- `CLAUDE.md`

The open-items brief also identifies the earlier handoffs as governing context. The applicable constraints were preserved: do not touch `company_tracker/`, do not bulk-restore audit data through a chunked tool workaround, do not rerun migrations, do not rotate the rates-account password, do not remove unused indexes, and do not start Tasks 1–4 before this checkpoint.

## Step 1 — repository state

Command:

```text
git fetch origin && { echo '--- git log origin/main..HEAD'; git log --oneline origin/main..HEAD; echo '--- git status --short'; git status --short; }
```

Output:

```text
--- git log origin/main..HEAD
--- git status --short
?? docs/superpowers/
```

Finding: `origin/main..HEAD` is empty after fetching, so there is no local commit divergence. The working tree is not clean: `docs/superpowers/` is an unrelated untracked owner/agent path and was preserved. No assumption of a clean tree was made.

## Step 2 — offline checks

Run from `apps/web/`.

### `npm test`

Command:

```text
npm test
```

Result: pass, 66 tests, 66 passed, 0 failed, 0 skipped, duration 219.45481 ms.

```text
> @puge/web@0.6.0 test
> node --test src/logic.test.js src/rows.test.js src/errors.test.js scripts/rewind-plan.test.js

ℹ tests 66
ℹ suites 0
ℹ pass 66
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 219.45481
```

### `npm run build`

Command:

```text
npm run build
```

Result: pass. Vite transformed 88 modules and built successfully in 326 ms.

```text
> @puge/web@0.6.0 build
> vite build

vite v8.2.2 building client environment for production...
transforming...
✓ 88 modules transformed.
rendering chunks...
computing gzip size...
dist/index.html                                0.66 kB │ gzip:   0.37 kB
dist/assets/tracker-background-BtmuNw7u.jpg  177.76 kB
dist/assets/index-D6qXjmue.css                18.83 kB │ gzip:   4.26 kB
dist/assets/index-fiLNyer8.js                444.40 kB │ gzip: 123.18 kB

✓ built in 326ms
```

### `npm audit`

Command:

```text
npm audit
```

Output:

```text
found 0 vulnerabilities
```

## Step 3 — live read-only SQL

All queries below were executed through the approved read-only Supabase SQL interface. No SQL write statements were used.

### Production transaction fingerprint

Query:

```sql
select md5(string_agg(t::text, chr(10) order by t.id)) fingerprint, count(*), sum(amount)::text from public.txns t;
```

Result:

```text
[{"fingerprint":"05a080127ca18b46dc693edbd22b5168","count":21,"sum":"226000.00"}]
```

### Production R7 catalog/policy shape

Query:

```sql
select (select count(*) from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='private' and p.proname='is_viewer') as private_fn,
       (select count(*) from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname='is_viewer') as public_fn,
       (select count(*) from pg_policies where (coalesce(qual,'')||coalesce(with_check,'')) like '%public.is_viewer%') as stale_policies;
```

Result:

```text
[{"private_fn":1,"public_fn":0,"stale_policies":0}]
```

Query for private-backed policies:

```sql
select schemaname, count(*) from pg_policies
 where (coalesce(qual,'')||coalesce(with_check,'')) like '%private.is_viewer%'
 group by 1 order by 1;
```

Result:

```text
[{"schemaname":"public","count":14},{"schemaname":"storage","count":3}]
```

The asserted 17 write policies are present as 14 in `public` plus 3 in `storage`.

### Production rates and transfers

Rates query result:

```text
[{"cur":"AUD","as_of":"2026-09-03","rate":"44.965009","source":"ECB via frankfurter.dev"},
 {"cur":"EUR","as_of":"2026-09-03","rate":"72.605000","source":"ECB via frankfurter.dev"},
 {"cur":"GBP","as_of":"2026-09-03","rate":"84.370461","source":"ECB via frankfurter.dev"},
 {"cur":"USD","as_of":"2026-09-03","rate":"62.509686","source":"ECB via frankfurter.dev"}]
```

Transfer status query result:

```text
[{"status":"pending","count":3,"priced":0},{"status":"released","count":6,"priced":6}]
```

This asserts six released wires are priced and three pending wires are unpriced/null as required.

### Production residue and supporting counts

E2E residue query result:

```text
[{"count":0}]
```

Supporting count query result:

```text
[{"audit_rows":1569,"accounts":5,"fx_rows":4,"transfers":9}]
```

Production migration catalog query result (15 rows):

```text
20260831080433 erp_tracker_schema
20260831081217 revoke_anon_from_erp_tables
20260831085534 shared_workspace_two_users
20260831155259 lock_server_managed_columns
20260831160423 receipt_files
20260901092715 telegraphic_transfers
20260901092751 lock_transfer_server_managed_columns
20260901150411 audit_log
20260901150458 lock_audit_log_truncate
20260901165841 merge_app_config
20260901170544 viewer_role
20260901170754 harden_merge_app_config
20260903144056 fx_rates
20260903204135 private_is_viewer
20260903204751 drop_public_is_viewer
```

### Rehearsal state

The same read-only catalog checks were run against `bucmcnsjkuprpojhequy`.

R7 result:

```text
[{"private_fn":1,"public_fn":0,"stale_policies":0}]
```

Supporting count result:

```text
[{"audit_rows":252,"accounts":5,"fx_rows":0,"transfers":9}]
```

The rehearsal migration catalog has 15 rows, including `fx_rates`, `private_is_viewer`, and `drop_public_is_viewer`, with MCP-assigned rehearsal versions:

```text
20260902105826 erp_tracker_schema
20260902105848 revoke_anon_from_erp_tables
20260902105907 shared_workspace_two_users
20260902105925 lock_server_managed_columns
20260902105941 receipt_files
20260902105959 telegraphic_transfers
20260902110011 lock_transfer_server_managed_columns
20260902110035 audit_log
20260902110051 lock_audit_log_truncate
20260902110105 merge_app_config
20260902110137 viewer_role
20260902110153 harden_merge_app_config
20260903154844 fx_rates
20260903155001 private_is_viewer
20260903160225 drop_public_is_viewer
```

The rehearsal has the expected 252-row partial audit restore and five accounts; it has no `fx_rates` data because it is a schema/rehearsal project rather than the production ledger.

## Step 4 — backup manifest

Command:

```text
git show origin/main:backups/MANIFEST.md
```

Output:

```text
# Backup manifest

Written by `apps/web/scripts/backup.mjs`. Do not edit by hand.

| | |
|---|---|
| Taken | 2026-09-03T20:27:03.655Z |
| Project | jusifpditdigqdjiwdaj.supabase.co |
| `txns` rows | 21 |
| `receipts` rows | 1 |
| `recurring` rows | 0 |
| `transfers` rows | 9 |
| `app_config` rows | 1 |
| `audit_log` rows | 1556 |
| `profiles` rows | 5 |
| `fx_rates` rows | 4 |
| Accounts in the roster | 5 |
| Stored files | 0 |
| Transactions total | ₱226,000.00 |
| Receipts released | ₱10,000.00 |
```

Assessment:

- The roster is 5, matching live production.
- Stored files are zero, so the non-empty storage paging item remains unproven/open (F5/R10).
- The snapshot has four FX rows and the expected ledger shape, but it is dated 2026-09-03 and records 1,556 audit rows versus the verified live count of 1,569. It predates the 2026-09-04 R7 production rollout, so it is not a first post-R7 snapshot.
- `audit_log rows` is not the suspicious round value 1,000, but it is stale by 13 rows relative to current production and therefore does not establish a current full-volume backup.
- The manifest does not establish Task 2 as complete. R2/R9 and execution of `backups/verify-restore.sql` remain open pending the operator `psql \copy` restore/verification workflow described in the handoff.

## Baseline checkpoint

Offline checks and read-only live-state assertions meet the expected baseline. Production is at the expected 15-migration R7/FX shape with the expected ledger fingerprint, rates, wire pricing, five-account roster, and 1,569 audit rows. Rehearsal is at the expected 15-migration shape with 252 audit rows and five accounts. The backup manifest is stale/pre-R7 with zero stored files, so backup/storage follow-up remains open.

Tasks 1–4 were not started. No production-writing security/e2e checks were rerun, per the task instruction and current verified handoff results.
