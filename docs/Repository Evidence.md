---
title: Repository Evidence
tags: [evidence, repository, static-export]
status: verified
---

# Repository Evidence

This note separates observed repository facts from future assumptions.

## Present Artifacts

- `company_tracker/*.dc.html`: exported Design Component CRM/ERP dashboard screens.
- `company_tracker/support.js`: generated browser runtime whose header points to an absent `dc-runtime` source project.
- `company_tracker/_ds/craftui-crm-design-system-2dfce37d-76d0-4306-9635-769d70a72018/_ds_bundle.js`: generated design-system bundle.
- `company_tracker/_ds/**/styles.css` and `tokens/*.css`: CSS import hubs and semantic design tokens.
- `company_tracker/.thumbnail`: export preview metadata. No `company_tracker/uploads/` directory is present in this checkout.
- `construction_tracker/construction.csv`: 57-line requirements/reference sheet describing dashboard areas and fields for projects, attendance, cash flow, payroll, payables, debts, expenses, and receivables. It is product input, not a database or executable data layer.
- `apps/web/`: authored React + Vite application implementing `company_tracker/ERP Prototype.dc.html`. Source, not export. Carries `package.json`, `package-lock.json`, `vite.config.js`, a `node --test` suite, and its own [README](../apps/web/README.md). Since 2026-08-31 it also carries `src/supabase.js`, `src/rows.js`, `src/db.js`, `src/Auth.jsx`, `src/smoke.mjs`, and `.env.example`.
- Root ZIP and PDF: delivery/reference artifacts, not editable source.

`support.js` loads React 18.3.1, ReactDOM 18.3.1, and Babel 7.29.0 from external CDNs with Subresource Integrity metadata. It also relies on an unversioned Google Fonts stylesheet and the versioned Icons8 Line Awesome 1.3.0 stylesheet. Dynamically fetched module text is executed by the runtime, so HTML and scripts remain active content with network and provenance implications beyond SRI coverage.

## Absent Prerequisites

No workspace declaration, `dc-runtime` source, API implementation, or backend service exists in this checkout. The embedded `cd dc-runtime && bun run build` text is export provenance, not a runnable command here.

The database schema **is** checked in as of 2026-09-01. `supabase/migrations/` holds twelve files, read back out of `supabase_migrations.schema_migrations` in Supabase project `baby` (`jusifpditdigqdjiwdaj`) and each verified byte-for-byte by MD5 against the stored statement. They are a faithful record of what was applied **and** a rebuild that has been replayed: on 2026-09-01 all nine were applied in order to an empty project, producing a `public` schema identical to production's over 178 catalogue facts (columns, grants, column grants, RLS, policies, triggers, indexes, function security flags), fingerprint `a18b5dd26e148a1e216068023b0e4403` on both sides. The Supabase CLI is not installed and the folder is not CLI-managed — see [supabase/README.md](../supabase/README.md).

Four workflows exist in `.github/workflows/`. `backup.yml` snapshots the database into `backups/` nightly at 18:00 UTC and gates nothing. `ci.yml` and `verify.yml` were added on 2026-09-01 to [the CI plan](Continuous%20Integration%20Plan.md): `ci.yml` runs `npm test`, `npm run build` and `npm audit` on every push to `main` and then deploys with the Vercel CLI; `verify.yml` runs the three ledger-writing suites at 16:00 UTC and on demand; `schedule.yml` runs `npm run schedule` at 22:00 UTC, generating the month's recurring payables and reporting overdue rows to the run's job summary. **The gate is active**: `apps/web/vercel.json` carries `"git": { "deploymentEnabled": { "main": false } }`, and Vercel deployed nothing for the commit that introduced it — the setting is read from the commit being deployed, so it applied immediately. Eleven repository secrets exist as of 2026-09-01: `BACKUP_EMAIL`, `BACKUP_PASSWORD`, `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `E2E_EMAIL`, `E2E_PASSWORD`, `SMOKE_EMAIL`, `SMOKE_PASSWORD`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`, `VERCEL_TOKEN`. `ci.yml` first ran on 2026-09-01 for `v0.5.0` (run `33530246170`) and passed both jobs in 1m11s, deploying production through the Vercel CLI; Vercel's git integration created no deployment for that commit, confirming `git.deploymentEnabled` takes effect on the push that introduces it. `verify.yml` first ran on 2026-09-01 by `workflow_dispatch` (run `33530924458`), 3m32s, with `npm run e2e` reporting `27 passed`, `npm run security` `41 checks, 0 failed`, and `npm run smoke` passing against the deployment; the ledger held no tagged residue afterwards.

`apps/api/` is an empty directory. It declares an intended boundary, not an implementation.

PostgREST answers an expired token with `{"code":"PGRST303","message":"JWT expired"}` and status 401, confirmed by `curl` on 2026-08-31 against a token past its expiry; because `anon` is revoked, a request with no usable token returns `42501 permission denied` as 401 rather than an empty result. Both are handled by `apps/web/src/errors.js` and the `retryOnce` wrapper in `db.js`.

`apps/web/package.json` and `apps/web/package-lock.json` were added on 2026-08-31 and supply working `dev`, `build`, `preview`, `test`, `e2e`, `security`, `smoke` and `backup` commands — **for that directory only**. It declares `engines: { node: ">=22" }`, recorded on 2026-09-01 after a CI run on Node 20 died at import with `Error: Node.js detected but native WebSocket not found`: `supabase-js` reaches for a native WebSocket while constructing its realtime client. There is still no repository-root manifest, workspace, or task runner, so no command is reproducible from the repository root.

The **repository root is the project root** as of 2026-09-01; it was `apps/web/` alone until the re-root. Remote `Leuename/tracker` (private, GitHub Pro), deployed by Vercel to `https://tracker-six-flax.vercel.app` on every push to `main`. Everything except what `.gitignore` names is versioned.

`apps/web/vercel.json` carries `"git": { "deploymentEnabled": { "main": false } }`, added 2026-09-01, which stops Vercel deploying pushes to `main` at all; it governs Git-triggered deployments only, so the CLI deploy in `ci.yml` is unaffected. It also carries `"ignoreCommand": "git diff --quiet HEAD^ HEAD -- ."`, added earlier the same day so the nightly backup commit does not redeploy the site. A skipped build appears in the deployment list as `CANCELED`. The `[skip ci]` marker in those commit subjects is kept for CI added later; **Vercel ignores it**, confirmed against the deployment list on 2026-09-01.

Releases are annotated tags, `v0.2.0` through `v0.4.1`, matching `apps/web/package.json` on the same commit.

`apps/web` will not start without `apps/web/.env.local`, which is git-ignored and therefore absent from any fresh checkout. `apps/web/.env.example` records the two variables the application itself needs; the file also carries `E2E_EMAIL`, `E2E_PASSWORD`, `SMOKE_EMAIL` and `SMOKE_PASSWORD`, which the test commands read. **`npm run e2e` reports its specs skipped and exits 0 when those are absent** — a pass that ran nothing. Setting `E2E_REQUIRE_CREDENTIALS=1`, as `verify.yml` does, turns that skip into a thrown error and a non-zero exit; verified on 2026-09-01 by moving `.env.local` aside, where `playwright test` exited 1. `npm run smoke` and `npm run security` read `.env.local` with `--env-file-if-exists`, so they run from real environment variables where the file is absent.

Seven tables exist in the database as of 2026-09-01: `txns`, `receipts`, `recurring`, `transfers`, `app_config`, `audit_log` and `profiles`. Row-level security is enabled on all seven. The five ledger tables each carry a `for select using (true)` policy plus separate insert, update and delete policies predicated on `not public.is_viewer()`, so a `viewer` account reads everything and writes nothing; `audit_log` has a `for select` policy only, and `authenticated` holds `SELECT` on it and nothing else — confirmed against `information_schema.role_table_grants` after the migration, which is how a surviving TRUNCATE grant was caught and revoked. `anon` holds no privilege on any of the six. No server-managed column is writable by a client on any table, verified directly against `information_schema.role_column_grants`.

**Self-serve sign-up is disabled** as of 2026-09-02, closed by the owner in the Supabase dashboard after being open since 2026-08-31. Verified directly rather than through the app: `POST /auth/v1/signup` returns `422 {"error_code":"signup_disabled"}`. This matters more than one check passing — because authorization is "being signed in" and every policy is `using (true)`, account creation is the only boundary the access model has. The security probe no longer mints a `sec-probe-*` account on each run, because it cannot.

A restore was performed on 2026-09-01 into an empty project. Every `txns` row came back byte-for-byte — `md5(string_agg(t::text))` identical at `f95cd619e877916891cb0f6853f9e041`, 21 rows, ₱226,000.00 — with `created_at` and `app_config.updated_at` at their original values rather than `now()`, and a write afterwards produced audit row 223, continuing from the restored maximum. `audit_log` was restored as an 18-row stratified sample rather than all 222; restoring `files/` remains untested, there being no stored documents. See [backups/README.md](../backups/README.md) for the procedure and its two non-obvious steps.

## Interpretation Boundary

Names and mock data in the exported CRM interface are presentation evidence only, and the same holds for the seed rows transcribed into `apps/web/src/data.js`.

`docs/seeded-data-backup/seed-data.json` archives the cleared demo rows in database column shape, generated from `apps/web/src/data.js`. Its totals match what was read from the live database immediately before the delete, so it is a verified copy rather than a reconstruction. It contains invented data only.

The ledger was cleared of demo data on 2026-09-01. Read back at 15:10 UTC that day it held 21 transactions, zero receipts, zero recurring rules and zero transfers — real rows entered by the owner, and already drifted from the 1 transaction and 1 receipt recorded eleven hours earlier, so any count here is a timestamp and not a constant. One `app_config` row remains, carrying 21 company codes, 13 categories, empty notes and the settings; it is kept deliberately, since `load()` treats its absence as a never-used workspace.

As of 2026-09-01 the schema also holds `public.audit_log` and the `security definer` trigger function `public.log_change()`, with one `after insert or update or delete` row trigger on each of the other five tables; a client delete was observed producing an audit row carrying the actor's uuid and email. It also holds a `receipts.file_path` column and a private `receipts` storage bucket (10 MB, images and PDF only), with column-level grants that keep `created_at`, `app_config.updated_at` and `id` out of a client's reach. Two settings, `autoGen` and `ackAutoNotify`, were removed from the app and from the stored config because nothing performs the scheduled work they described.

`apps/web` proves only what its own build and test run demonstrate. As of 2026-09-01 that is: it compiles, 43 offline assertions pass, 27 Playwright specs pass against the dev server, a preview of the production build and the deployment itself, a 47-check security probe reports 0 failures and 0 deferred, `npm audit` is clean, and `npm run smoke` completes against the live project — sign-up, seed of 20 transactions, 6 receipts and 6 recurring rules, then a payment, an insert, a liquidation, a config change, a full reload that read every one of them back, and a delete. The account it created was removed afterwards.

The schema was rebuilt the same day for two users sharing one ledger ([Decisions](Decisions.md) D8), so the per-account findings from the first schema no longer describe it. Verified by SQL against the rebuilt schema, in transactions that were rolled back: a row written under one account's JWT is read and updated under a different account's; `app_config` rejects a second row, so the shared settings row is a genuine singleton; row-level security is on for all four tables; and `anon` holds no privilege on any of them.

Being signed in is now the entire authorization. Nothing in the database distinguishes the admin from the executive.

Email sign-up was blocked until the owner turned off *Confirm email* on 2026-08-31. Two settings were involved and only the second is the one that matters: the Email provider itself must stay enabled, and *Confirm email* under it must be off, or the built-in SMTP rate limit rejects every sign-up.

`npm run smoke` passes against the shared schema, signed in as the first issued account: it seeded the ledger, wrote a payment, an insert, a liquidation and a config change, reloaded from scratch and read every one back, then deleted a row and confirmed it stayed deleted.

Both accounts now exist in `auth.users`, and the two-user model was verified with real sessions rather than simulated JWTs: signed in as the executive, an edit to a payable was immediately visible to the admin, and the admin's revert was immediately visible to the executive. Neither account has any capability the other lacks. Self-serve sign-up is disabled, so those are the only accounts that can ever sign in until the owner adds another. The ledger now holds the seeded demo rows — 20 transactions, 6 receipts, 6 recurring rules, and one shared config row — all invented, none of it company data.

Partly verified: the browser path. The sign-in gate renders and the running app reaches it, observed at `http://localhost:5173/`. The signed-in screens have not been observed against live data, because no session was established through a browser. `npm run smoke` issues the same queries those screens make, so the gap is rendering, not the data path.

The app still has no server component, no CI, no deployment, no logging or telemetry, no conflict detection between concurrent editors, and no realtime subscription. `TODAY` remains frozen at `2026-08-30` in `src/data.js`, so completion dates it writes carry that date rather than the real one.

## Guideline Basis

- **PG-01** requires this inventory to describe the structure that actually exists, including missing prerequisites, and to be corrected when one of them arrives.
- **PG-03** separates exported artifacts and delivery references from maintainable source.
- **DOC-02** labels observations as evidence and prevents interface text from becoming assumed architecture.
- **SEC-01** records active-content and network trust boundaries without executing the exports.
- **SEC-02** records the Supabase client as a versioned dependency with a named provenance, unlike the export's CDN loads.
- **PG-04** requires each claim above to name the check that produced it, and to name what stayed unverified.

implements: [Awesome Guidelines Integration](Awesome%20Guidelines%20Integration.md)

Related: [AI Agent Context](AI%20Agent%20Context.md) · [Decisions](Decisions.md) · [company_tracker scope](../company_tracker/AGENTS.md) · [Guideline ledger](Awesome%20Guidelines%20Integration.md)
