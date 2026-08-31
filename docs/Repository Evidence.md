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

No workspace declaration, `dc-runtime` source, CI workflow, deployment configuration, API implementation, or backend service exists in this checkout. A database schema does now exist, but **outside** it: Supabase project `baby` (`jusifpditdigqdjiwdaj`) holds it, and no migration file is checked in here. The embedded `cd dc-runtime && bun run build` text is export provenance, not a runnable command here.

`apps/api/` is an empty directory. It declares an intended boundary, not an implementation.

PostgREST answers an expired token with `{"code":"PGRST303","message":"JWT expired"}` and status 401, confirmed by `curl` on 2026-08-31 against a token past its expiry; because `anon` is revoked, a request with no usable token returns `42501 permission denied` as 401 rather than an empty result. Both are handled by `apps/web/src/errors.js` and the `retryOnce` wrapper in `db.js`.

`apps/web/package.json` and `apps/web/package-lock.json` were added on 2026-08-31 and do supply working `dev`, `build`, `preview`, `test`, `e2e`, and `smoke` commands — **for that directory only**. There is still no repository-root manifest, workspace, or task runner, so no command is reproducible from the repository root.

`apps/web/` is also a Git repository as of 2026-08-31, remote `Leuename/tracker` (private), deployed by Vercel to `https://tracker-six-flax.vercel.app` on every push to `main`. Nothing outside `apps/web/` is under version control, and no CI workflow exists — Vercel builds what is pushed, unchecked.

`apps/web` will not start without `apps/web/.env.local`, which is git-ignored and therefore absent from any fresh checkout. `apps/web/.env.example` records which two variables it needs.

## Interpretation Boundary

Names and mock data in the exported CRM interface are presentation evidence only, and the same holds for the seed rows transcribed into `apps/web/src/data.js`.

The ledger was cleared of demo data on 2026-09-01 and now holds zero transactions, receipts and recurring rules. One `app_config` row remains, carrying 21 company codes, 13 categories, empty notes and the settings; it is kept deliberately, since `load()` treats its absence as a never-used workspace.

As of 2026-09-01 the schema also holds a `receipts.file_path` column and a private `receipts` storage bucket (10 MB, images and PDF only), with column-level grants that keep `created_at`, `app_config.updated_at` and `id` out of a client's reach. Two settings, `autoGen` and `ackAutoNotify`, were removed from the app and from the stored config because nothing performs the scheduled work they described.

`apps/web` proves only what its own build and test run demonstrate. As of 2026-09-01 that is: it compiles, 33 offline assertions pass, 24 Playwright specs pass against the dev server, a preview of the production build and the deployment itself, a 33-check security probe passes, `npm audit` is clean, and `npm run smoke` completes against the live project — sign-up, seed of 20 transactions, 6 receipts and 6 recurring rules, then a payment, an insert, a liquidation, a config change, a full reload that read every one of them back, and a delete. The account it created was removed afterwards.

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
