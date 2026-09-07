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

The database schema **is** checked in as of 2026-09-01. `supabase/migrations/` holds **twenty-one
files, all applied to production** as of 2026-09-08. The last four are
`one_generated_row_per_due_date`, `money_constraints`, `generated_occurrence_identity` and
`enforce_generated_occurrence_identity`. The two 2026-09-07 occurrence-identity files were
rehearsed on `tracker-rehearsal` and then applied to production in the order
[D80](Decisions.md) records, each registered with a stored statement whose MD5 matches its file
byte-for-byte — `1d164ba0be70f52f709ec3facef2b48f` and `69cf1c0b932287d1710966c65e375d2e`. Phase 2
drops `one_generated_row_per_due_date`'s index, so that file remains the record of a constraint
that no longer exists in the hosted schema; the live partial unique index is
`txns_one_generated_row_per_occurrence` on `(src, occurrence_due)`. The twelve that existed on 2026-09-02 were re-verified then,
read back out of `supabase_migrations.schema_migrations` in Supabase project `baby`
(`jusifpditdigqdjiwdaj`) and each verified byte-for-byte by MD5 against the stored statement. They
are a faithful record of what was applied **and** a rebuild that has been replayed twice. On
2026-09-01 the first nine were applied in order to an empty project, producing a `public` schema
identical to production's over 178 catalogue facts, fingerprint
`a18b5dd26e148a1e216068023b0e4403` on both sides. On 2026-09-02 **all twelve** were replayed into
`tracker-rehearsal` (`bucmcnsjkuprpojhequy`) — the first replay of `merge_app_config`,
`viewer_role` and `harden_merge_app_config`, which postdate the earlier rehearsal — and compared
over **291** facts scoped to `public` (columns, policies, indexes, triggers, table grants, column
grants, function bodies): `7d44a32a1ad258f984fb145892e94c97` on both sides. The Supabase CLI is
not installed and the folder is not CLI-managed — see [supabase/README.md](../supabase/README.md).

Four workflows exist in `.github/workflows/`. `backup.yml` snapshots the database into `backups/` nightly at 18:00 UTC and gates nothing. `ci.yml` and `verify.yml` were added on 2026-09-01 to [the CI plan](Continuous%20Integration%20Plan.md): `ci.yml` runs `npm test`, `npm run build` and `npm audit` on every push to `main` and then deploys with the Vercel CLI; `verify.yml` runs the three ledger-writing suites at 16:00 UTC and on demand; `schedule.yml` runs `npm run schedule` at 22:00 UTC, generating the month's recurring payables and reporting overdue rows to the run's job summary. **The gate is active**: `apps/web/vercel.json` carries `"git": { "deploymentEnabled": { "main": false } }`, and Vercel deployed nothing for the commit that introduced it — the setting is read from the commit being deployed, so it applied immediately. Eleven repository secrets exist as of 2026-09-01: `BACKUP_EMAIL`, `BACKUP_PASSWORD`, `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `E2E_EMAIL`, `E2E_PASSWORD`, `SMOKE_EMAIL`, `SMOKE_PASSWORD`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`, `VERCEL_TOKEN`. `ci.yml` first ran on 2026-09-01 for `v0.5.0` (run `33530246170`) and passed both jobs in 1m11s, deploying production through the Vercel CLI; Vercel's git integration created no deployment for that commit, confirming `git.deploymentEnabled` takes effect on the push that introduces it. `verify.yml` first ran on 2026-09-01 by `workflow_dispatch` (run `33530924458`), 3m32s, with `npm run e2e` reporting `27 passed`, `npm run security` `41 checks, 0 failed`, and `npm run smoke` passing against the deployment; the ledger held no tagged residue afterwards.

PostgREST answers an expired token with `{"code":"PGRST303","message":"JWT expired"}` and status 401, confirmed by `curl` on 2026-08-31 against a token past its expiry; because `anon` is revoked, a request with no usable token returns `42501 permission denied` as 401 rather than an empty result. Both are handled by `apps/web/src/errors.js` and the `retryOnce` wrapper in `db.js`.

`apps/web/package.json` and `apps/web/package-lock.json` were added on 2026-08-31 and supply working `dev`, `build`, `preview`, `test`, `e2e`, `security`, `smoke`, `backup`, `schedule` and — since 2026-09-02 — `rewind` commands — **for that directory only**. It declares `engines: { node: ">=22" }`, recorded on 2026-09-01 after a CI run on Node 20 died at import with `Error: Node.js detected but native WebSocket not found`: `supabase-js` reaches for a native WebSocket while constructing its realtime client. There is still no repository-root manifest, workspace, or task runner, so no command is reproducible from the repository root.

The **repository root is the project root** as of 2026-09-01; it was `apps/web/` alone until the re-root. Remote `Leuename/tracker` (private, GitHub Pro), deployed by Vercel to `https://tracker-six-flax.vercel.app` on every push to `main`. Everything except what `.gitignore` names is versioned.

`apps/web/vercel.json` carries `"git": { "deploymentEnabled": { "main": false } }`, added 2026-09-01, which stops Vercel deploying pushes to `main` at all; it governs Git-triggered deployments only, so the CLI deploy in `ci.yml` is unaffected. It also carries `"ignoreCommand": "git diff --quiet HEAD^ HEAD -- ."`, added earlier the same day so the nightly backup commit does not redeploy the site. A skipped build appears in the deployment list as `CANCELED`. The `[skip ci]` marker in those commit subjects is kept for CI added later; **Vercel ignores it**, confirmed against the deployment list on 2026-09-01.

Releases are annotated tags, `v0.2.0` through `v0.6.0`, matching `apps/web/package.json` on the same commit. Nothing enforces that: fourteen commits shipped after `v0.5.0` with the manifest still reading `0.5.0` before an audit caught the drift on 2026-09-02.

**`apps/web/playwright.config.js` sets both `fullyParallel: false` and `workers: 1`** (line 43).
They are not the same thing, and the second is why the suite is safe: `fullyParallel: false`
serialises tests *within* a file, while Playwright still runs separate files on separate workers —
four on an eight-core machine. `e2e/app.spec.js` and `e2e/functional.spec.js` were therefore
executing concurrently against the one shared production ledger until `workers: 1` was applied.
**This paragraph described `workers: 1` as proposed rather than applied until 2026-09-05**, when a
review caught it contradicting `playwright.config.js:43` and both policy files; corrected here rather
than left as a second opinion about a file anyone can open.

**A failed Playwright run writes the shared account password to disk in plaintext.** `trace: 'retain-on-failure'` records every `fill()` call with its value, so `apps/web/test-results/<spec>/trace.zip` carries `E2E_PASSWORD` verbatim, alongside screenshots of the sign-in form. `test-results/` and `playwright-report/` are gitignored and no workflow uploads artifacts, so nothing has left the machine; the artifacts from 2026-09-02 were deleted. The mechanism is unchanged and regenerates them on the next failure.

`apps/web` will not start without `apps/web/.env.local`, which is git-ignored and therefore absent from any fresh checkout. `apps/web/.env.example` records the two variables the application itself needs; the file also carries `E2E_EMAIL`, `E2E_PASSWORD`, `SMOKE_EMAIL` and `SMOKE_PASSWORD`, which the test commands read. **`npm run e2e` reports its specs skipped and exits 0 when those are absent** — a pass that ran nothing. Setting `E2E_REQUIRE_CREDENTIALS=1`, as `verify.yml` does, turns that skip into a thrown error and a non-zero exit; verified on 2026-09-01 by moving `.env.local` aside, where `playwright test` exited 1. `npm run smoke` and `npm run security` read `.env.local` with `--env-file-if-exists`, so they run from real environment variables where the file is absent. `apps/web/scripts/schedule.mjs` requires `SCHEDULE_EMAIL` and `SCHEDULE_PASSWORD`, which `.env.example` does not name and `.env.local` does not carry; `.github/workflows/schedule.yml` supplies them from the `BACKUP_*` secrets, so the workflow is green while the documented local dry-run exits 2 with `Set SCHEDULE_EMAIL and SCHEDULE_PASSWORD to a real account on this project.` Handed an administrator account on 2026-09-02 it ran clean.

Seven tables exist in the database as of 2026-09-01: `txns`, `receipts`, `recurring`, `transfers`, `app_config`, `audit_log` and `profiles`. Row-level security is enabled on all seven. The five ledger tables each carry a `for select using (true)` policy plus separate insert, update and delete policies predicated on `not public.is_viewer()`, so a `viewer` account reads everything and writes nothing; `audit_log` has a `for select` policy only, and `authenticated` holds `SELECT` on it and nothing else — confirmed against `information_schema.role_table_grants` after the migration, which is how a surviving TRUNCATE grant was caught and revoked. `anon` holds no privilege on any of the six. No server-managed column is writable by a client on any table, verified directly against `information_schema.role_column_grants`.

**Six released wires carry historical exchange-rate provenance as of 2026-09-03.** Guarded,
ID-scoped authenticated updates set their ECB 2026-09-02 PHP-per-unit rates to EUR `72.415`, USD
`62.545345`, or GBP `84.330965`, with `rate_as_of = 2026-09-02`; the trigger recorded the writes as
`audit_log` ids 1475–1480. The other three wires remain pending with both columns null by design.

**Self-serve sign-up is disabled** as of 2026-09-02, closed by the owner in the Supabase dashboard after being open since 2026-08-31. Verified directly rather than through the app: `POST /auth/v1/signup` returns `422 {"error_code":"signup_disabled"}`. This matters more than one check passing — because authorization is "being signed in" and every policy is `using (true)`, account creation is the only boundary the access model has. The security probe no longer mints a `sec-probe-*` account on each run, because it cannot.

A restore was performed on 2026-09-01 into an empty project. Every `txns` row came back byte-for-byte — `md5(string_agg(t::text))` identical at `f95cd619e877916891cb0f6853f9e041`, 21 rows, ₱226,000.00 — with `created_at` and `app_config.updated_at` at their original values rather than `now()`, and a write afterwards produced audit row 223, continuing from the restored maximum. `audit_log` was restored as an 18-row stratified sample rather than all 222. Storage restore is now proven: the 2026-09-03T21:31:08Z manifest held one linked receipt document (`1788471059637/task-2-storage-proof.pdf`), and source, backup and restored-upload SHA-256 were all `c4118bee875d68a04fe1f81b18c5e0da406423fe4a96a9ed1553005e44bf574a`. See [backups/README.md](../backups/README.md) for the procedure and its two non-obvious steps.

**One Supabase security advisor stands open as of 2026-09-04**, `WARN`: leaked-password protection, unavailable on the free plan. The second one closed on its own when R7 landed — the `security definer` advisor on `public.is_viewer()` no longer fires, because the function it named does not exist any more. That is the linter agreeing independently with the policy and PostgREST checks, rather than another restatement of them, and it is the outcome R7 was for. **Re-read on 2026-09-08, after the occurrence-identity DDL**, which is when the linter is worth
running: still that one `WARN` and no new one. The unused-index notices are now **two**, not three —
`txns_co_idx` and `transfers_status_idx`; `transfers_co_idx` has since been used. Both remaining are
expected on a 49-row table and neither is a reason to drop an index (N2). The new
`txns_one_generated_row_per_occurrence` is not flagged.

The history below is kept because the reasoning outlived the advisory. Two Supabase security advisors stood open as of 2026-09-02, both `WARN`. `public.is_viewer()` is a `security definer` function executable by `authenticated` over `/rest/v1/rpc/is_viewer`; it takes no arguments and returns only the caller's own role. **Revoking `EXECUTE` is not available**, tested on 2026-09-02 in a throwaway schema and never against production: with the grant in place a write as `authenticated` succeeds, and with it revoked the same write fails `42501 permission denied for function is_viewer` while reads keep working, because Postgres checks `EXECUTE` on a function used in an RLS policy against the querying role. Moving the function to a schema PostgREST does not expose was tested in the same session and works. See [Decisions](Decisions.md) D34. Leaked-password protection is unavailable on the free plan. Three `INFO` unused-index notices — `txns_co_idx`, `transfers_co_idx`, `transfers_status_idx` — are expected on near-empty tables.

`backups/` contains `profiles.json` and, since 2026-09-02, `accounts.json`. **The `profiles` restore was rehearsed on 2026-09-02 and failed:** `profiles.user_id` references `auth.users(id)` and the snapshot held no `auth.users`, so loading it into a fresh project returned `23503 violates foreign key constraint "profiles_user_id_fkey"`. The accounts can be recreated with their original UUIDs by inserting into `auth.users` as `postgres`, after which the roster restores as four `admin` rows; `accounts.json` now carries `user_id`, `role` and `email`, the emails reconstructed from `audit_log.actor_email` so no new privilege is needed. Three of four are recoverable that way; the fourth account has never made an audited change and `backup.mjs` names it in a warning. [Decisions](Decisions.md) D33.

**The snapshot was also short.** `backup.mjs` read each table with a plain `select`, which PostgREST caps at 1,000 rows silently. The 08:23 UTC manifest on 2026-09-02 recorded `audit_log rows 1000` against a table holding **1,129**. Reads are paged now, counted first, and a short read fails the run.

**The `setval` step in [backups/README.md](../backups/README.md) was wrong about timing**, corrected 2026-09-02 after rehearsal: with the sequence left unfixed the first audited write after a restore **succeeds**, and the `23505 duplicate key value violates unique constraint "audit_log_pkey"` arrives only once the sequence climbs into the restored ids — then on every audited write across all six tables at once.

**A fix in the working tree was not a fix in the system.** Observed 2026-09-03: four commits carrying the paging and roster fixes sat unpushed on `main` while `origin/main` still held the unpaged `.select('*')` and **no `backups/accounts.json` at all`**. The scheduled job ran again at 2026-09-02T20:28:01Z (`119c615`) and wrote `audit_log rows 1000` against 1,129. Every suite was green throughout, because every check in this repository reads the working tree and nothing compares `origin/main` with `HEAD`. Pushed 2026-09-03.

**The storage listing carried the same 1,000-row ceiling**, found 2026-09-03. `backup.mjs` called `storage.list()` twice with `limit: 1000`, no paging, no assertion, and the inner call discarded its error entirely. Both call sites go through one paging helper now. The storage API exposes **no count**, so the `{ count: 'exact', head: true }` assertion used for table reads cannot be copied to it — the strongest available assertion is that a full page means more may follow. Exercised against a linked non-empty bucket on 2026-09-04: the backup reported `Stored files | 1`, downloaded `backups/files/1788471059637__task-2-storage-proof.pdf`, and the three-way byte comparison passed. **That proves the round-trip, not the ceiling.** `listAll()` returns as soon as a page is shorter than 1,000, so a single object never makes the loop iterate; the paging path itself is still covered only by a unit test against a fake at the 1000/1001 boundary. Proving it live needs a bucket holding more than 1,000 objects, which nothing has yet required.

**The storage-restore proof is retained intentionally.** On 2026-09-04, an authenticated read of
receipt `1788471059637` returned `DO NOT DELETE — backup proof`, `released`, and ₱0.00; its linked
object remained present and downloaded successfully. The receipt is deliberately untagged so the
`E2E-` sweep cannot orphan the only live storage round-trip evidence. `apps/api/` was empty and was
removed the same day; no API implementation exists in this checkout.

**An account with no audited change had no recoverable email.** `backup.mjs` derives the roster's addresses from `audit_log`, so `mikmiktabs@gmail.com` was written as `null` on every run and could never be recovered by any future run. Read out of production `auth.users` on 2026-09-03; the script now carries known addresses forward between runs.

**`supabase.auth.signOut()` defaults to `scope: 'global'`**, confirmed 2026-09-03 in the installed dependency at `node_modules/@supabase/auth-js/dist/main/GoTrueClient.js:3405`, which carries its own warning comment. `apps/web/src/App.jsx:58` calls it with no argument, so signing out on one device revokes every refresh token that account holds. Unchanged; it is a live behavioural question for the owner.

**R7 is applied to production.** The rehearsal and production projects now have 15 migrations:
`fx_rates`, `private_is_viewer`, and `drop_public_is_viewer` were applied exactly. In production,
the public RPC is absent (`404` / `PGRST202`), the private schema is refused (`406` / `PGRST106`),
all 17 write policies plus `merge_app_config` use `private.is_viewer()`. The security probe
now has 57 checks, all passing and none deferred, since the generated-identity rollout landed
([D80](Decisions.md)). Rolled-back
administrator and viewer simulations passed with row counts unchanged;
the ledger is unchanged. The deployed production bundle contains zero `is_viewer` RPC calls.

The safe order was migration 1, confirm the deployment and reload open tabs, then migration 2 and
`npm run security`; the probe has 57 checks, all passing and none deferred since [D80](Decisions.md).

**The sequence failure was reproduced rather than described**, 2026-09-03 on the rehearsal project: with `audit_log_id_seq` left behind, an audited write failed `23505 duplicate key value violates unique constraint "audit_log_pkey"`; after the prescribed `setval` the same write was accepted.

**`delete from auth.users` is blocked in the agent environment**, even scoped to explicit ids, so the account-recreation half of a restore has still never been exercised.

**State read live on 2026-09-04**, ~06:50–07:00 UTC and again at ~11:00 UTC, each time before and after ledger-writing suites. `main` was at `010294c`, equal to `origin/main`. The `txns` fingerprint was `6fc52ee3f41d2ffd0e9292d8dc4f015d` (23 rows, ₱269,317.00) at 07:00 and `21a63ffeb6368cd06257f17a9aa01a49` (49 rows, ₱2,226,438.00) at 11:00; the owner entered 26 payables between 09:29 and 10:52 UTC, `audit_log` 1819–1854, all attributed and none `E2E-` tagged. Each fingerprint held unchanged across the suites run against it — which is what it is for. `audit_log` ran 1,760 → 1,818 (two suites) → 1,854 (the owner) → 1,912 (two more suites), all append-only, `max(id)` equal to the count. Zero `E2E-` residue in `txns`, `receipts` or `transfers`; `recurring` empty. Fifteen migrations; `private.is_viewer` present, `public.is_viewer` absent, zero policies referencing the public function and 17 referencing the private one. Roster 5 — four `admin`, one `viewer` (`14f0d1af-f37a-4936-b278-e280bcb25129`). `receipts` 3, with `1788471059637` intact and still linked to its stored object. `fx_rates` 4 rows, `as_of 2026-09-03`. One Supabase advisor `WARN` (leaked-password, Pro-only). `npm test` 77/77, `npm run build` green, `npm run security` 56 checks 0 failed, `npx playwright test --workers=1` 29 passed. **`npm audit` ran clean at 0 vulnerabilities in the morning window and could not be run again in the afternoon one** — three attempts ended in `503 Service Unavailable` and a network timeout at `registry.npmjs.org/-/npm/v1/security/advisories/bulk`. The lockfile did not change between them. The later reading is recorded as **unrun**, not inherited from the earlier one. Deployment `200`.

**State read live on 2026-09-05**, before and after the design port below. `origin/main` was
`f39de07`, one ahead of the local branch — the backup job's 11:09:48Z snapshot, touching `backups/`
only. `npm test` 77/77, `npm run build` green, `npm audit` **0 vulnerabilities and actually run this
time** (the registry outage that made the 2026-09-04 afternoon reading unrun had cleared), `npm run
security` 56 checks 0 failed, `npx playwright test --workers=1` 29 passed with
`E2E_REQUIRE_CREDENTIALS=1` set so a silent skip could not pass for a run. `txns` read
`21a63ffeb6368cd06257f17a9aa01a49` (49 rows, ₱2,226,438.00) — unchanged from 2026-09-04 11:15 UTC,
and unchanged again across those suites. `transfers` released 9 / priced 6, `receipts` 3 with
`1788471059637` intact, `recurring` 0, `audit_log` append-only with `max(id)` equal to the count.
Scheduled runs are still landing late: `fx.yml`'s 02:00 slot ran at 06:59:08Z (4 h 59 m) and its
08:00 slot at 12:37:12Z (4 h 37 m), `backup.yml`'s 06:00 slot at 11:04:28Z (5 h 04 m),
`schedule.yml`'s 22:00 slot at 23:44:55Z (1 h 45 m). Both FX runs correctly wrote nothing — ECB had
not published — leaving `fx_rates` on `as_of 2026-09-03`, a second and third demonstration of D43's
idempotence on the scheduled path. The 12:37 run landed **1 h 23 m** before ECB's ~14:00 UTC
publication, the narrowest margin measured so far.

### The `txns` fingerprint moved for a shape reason, not a data one

`21a63ffeb6368cd06257f17a9aa01a49` → **`f9f84adad1c9b5c4fa3e3495712ac09f`**, with `count(*)` still
49 and `sum(amount)` still ₱2,226,438.00. The fingerprint is `md5(string_agg(t::text, chr(10) order by t.id))` — spelled out
in full here, because a baseline a future session cannot recompute from this note is not a
baseline — and `t::text` serialises the whole row, so adding `src` and `fee`
(`20260904155131_masterlist_link_and_ecash_fee`, [D50](Decisions.md)) changed every row's text while
changing no row's data. `select count(*) from public.txns where src is not null or fee is not null`
returned **0** immediately after, which is the assertion that separates the two cases. A future
session comparing against the older value will see a difference that is not drift; the new baseline
is the one above.

### The design port of 2026-09-05

An updated `ERP Prototype.dc.html` was read from the Claude Design project
`9996e477-0bfc-4941-a9dc-affa12f70bcf` (1,906 lines) and diffed against
`company_tracker/ERP Prototype.dc.html`, the 2026-08-31 export the app was transcribed from: 549
changed lines, much of it already shipped because the app had been built past that export. What was
genuinely new is recorded in [D49](Decisions.md), and the schema it needed in [D50](Decisions.md).
After the port `npm test` reads **91/91** (was 77), `npx playwright test --workers=1` **31 passed**
(was 29), `npm run build` green at 457.67 kB / 127.02 kB gzip, `npm run security` 56 checks 0
failed, and `txns` was back at `f9f84adad1c9b5c4fa3e3495712ac09f` with zero `E2E-` residue. One
existing e2e spec was **rewritten rather than deleted**: it pinned the check number as mandatory,
which the design deliberately reverses, so it now asserts that a number typed is a number stored,
and a second spec pins the reversed rule on its own row.

### Three requirements the prototype diff had missed

Later on 2026-09-05 the owner supplied the **client's written requirements**, the source the
prototype had been drawn from. Nine of twelve were already delivered; three were not, and are
recorded in [D51](Decisions.md): the `Inv No` column on the wire sheet, PNG export beside PDF, and a
space bar that opened a transaction while the user was typing into a sheet note. A fourth item —
"mapindot ko lang yung outside ng box, nag-eexit agad" — turned out to be the backdrop-close removal
already shipped under D49 as a design change; it is a bug report.

The gap is itself the evidence worth keeping: a prototype file shows what a screen looks like, never
what was asked for. The `Inv No` column was missed because the prototype draws a whole Telegraphic
screen, the app already had one, and the block was triaged as shipped without reading down its
columns.

After closing all three: `npm test` **94/94**, `npx playwright test --workers=1` **34 passed**,
`npm run build` green (entry 461.39 kB / 128.39 kB gzip at this commit, plus a separate 199.49 kB
`html2canvas` chunk only fetched on Export), `npm audit` **0 vulnerabilities**, `npm run security` 56 checks 0
failed. `txns` `f9f84adad1c9b5c4fa3e3495712ac09f`, 49 rows, ₱2,226,438.00. `transfers` 9, all
`released`, 6 priced — C7 untouched — and `inv` empty on all nine. Zero `E2E-` residue in `txns` or
`transfers`. 24 policies, 13 triggers, 0 `anon` grants, all unchanged.

**The space-bar regression test was proven, not assumed.** The guard was removed, the spec was run
and failed with the reported symptom (`a space must not open the transfer`, a dialog resolving to 1
element), and the guard was restored and the spec re-run green. A test that passes against both the
fixed and the broken code proves nothing, so it was checked against the broken one.

### A fresh-context review found a money defect, and it was real

A verifier with no session context was asked to refute eight claims about the work above. It
confirmed seven and **refuted the one that mattered most**: the money path. `payFee` was seeded at
two of the payment dialog's three openers, so reopening a paid row through the "change" link on the
edit form carried the previous dialog's value — empty after a reload, another row's charge
mid-session. It reproduced both against production with a temporary `E2E-`-tagged spec and swept it
afterwards. Full account and fix in [D52](Decisions.md).

The defect was mine, introduced by the D51 e-cash work, and no spec caught it because none reopened
a paid row through that link. It is fixed by making `paySeedFor` the single seeding point rather
than by patching the third call site, and the new spec was proven by restoring the defective opener
and watching it fail (`Expected: "25" / Received: ""`).

The same review closed two smaller things: `modals/Filters.jsx` still dismissed on a backdrop click
after every other dialog had stopped, and `supabase/README.md`'s own `-- rollback:` convention had
been failed by its first two test cases. Both are recorded in D52.

### A second review found a worse defect underneath the first

The fix above was then put to a fresh verifier, which confirmed it and found the defect it had been
sitting on. Dialogs stack — the edit form opens the payment dialog — and both listened for Escape on
the window; the outer one won because it mounted first. Escape closed the form and orphaned the
payment dialog over an empty screen, and confirming from that orphan wrote **nothing**, because the
edit path stages into the form and `saveEdit` is what saves. Reproduced against production: a ₱500
row, E-cash, a ₱100 charge, "Recorded amount ₱600" on screen, and a database still reading
`pending / 500 / null`. Recorded as [D53](Decisions.md) and fixed with a modal stack, so only the
innermost dialog answers Escape. It predates this session, and D49's backdrop-close removal had made
the orphan harder to dismiss rather than easier.

The same review found the **second instance** of D52's trap 78 — `setReceiptStatus` seeding the
Liquidate dialog without `liqFile` — latent rather than exploitable, and now closed. It also
corrected three inaccuracies in these notes: a resume prompt still saying D1-D51 after D52 existed,
three different byte counts quoted for one build artifact, and a fingerprint recipe printed with a
literal ellipsis that could not be recomputed from this file. All three are fixed above. An
`npm install` reformat of `engines` in `apps/web/package.json` was reverted, so that file's diff is
now exactly one line — the dependency.

### And a third review found a third one, in the fix that was chosen rather than copied

The one departure from the prototype recorded in [D51](Decisions.md) — subtracting the e-cash charge
when a row leaves `completed` — was right about the problem and wrong about where to solve it. It
subtracted at save time, which assumes `amount` still contains the charge, and the user can retype
Amount in between. Reproduced against production: a ₱550 row (₱500 + a ₱50 charge) set back to
Pending with the amount retyped as `2000` saved **1950**, under a success toast. A number the screen
never displayed. Fixed in [D54](Decisions.md) by taking the charge off in `setEditStatus`, where the
field updates in front of the user, so `saveEdit` does no arithmetic at all.

Three reviews, three instances of one family: **state that outlives the thing it was a component
of.** `payFee` outliving its dialog, the payment dialog outliving the form that saves it, and
`edit.fee` outliving the amount it was part of. That is trap 80.

The same review refuted part of D53: `modals/Filters.jsx` is a dialog with its own shell, and the
`Escape` handler added to it bound `window` by hand, leaving it outside the modal stack and
reintroducing the swallowed-Escape bug through the one remaining door. No money loss, but the D53
claim that the payment pair was the only stack was false, and it is corrected in place.
`useEscapeToClose` is now shared, and nothing binds `Escape` on `window` by hand.

### A fourth review found two more, one of them inside the third fix

D54's fix reintroduced D54's symptom. `setEditStatus` subtracted the charge from whatever the Amount
field held, which can be empty or smaller than the charge, producing a negative — and `amountOf`
stripped the minus, so a screen reading `-50` stored **50**. Sign-stripping is also why nothing
caught it: a negative could never reach Postgres, so `amount < fee` stayed at 0 and every suite
stayed green. Separately, `undoGenerate` deleted by id with no check, so Generate → **Review them**
(the banner's own link, which does not dismiss the banner) → Mark as paid → Undo deleted a paid
transaction and reported "Generated rows removed". Both in [D55](Decisions.md).

`amountOf` now keeps a leading minus so a negative survives to be **rejected**; all five amount
validators require `> 0` rather than truthiness; `setEditStatus` removes the charge only from an
amount that still contains it; and `undoGenerate` keeps anything completed and says so.

One spec had to be written three times. The first Undo spec **passed against the defect**, because
it read the database immediately after clicking Undo and the delete is fire-and-forget. It now
generates two payables, pays one, and polls until the untouched one is gone before asserting the
paid one survived. Passing is not evidence; failing for the right reason is.

### A fifth pass, run by hand, found the defect the fourth fix created

The fifth verifier terminated on a session rate limit before it read any code, so **round 5 was run
directly instead** — the checks below are the main session's own, not a subagent's report of them.

D55 made `amountOf` sign-aware so a negative could be rejected. It guarded two call sites and left
seven, and before that change sign-stripping had made a negative structurally impossible at all of
them. Three were live money paths: a negative e-cash charge **reduced** a payable, a negative
liquidation actual was storable, and a negative masterlist amount pushed down onto linked Tracker
rows. All three confirmed by running them. Fixed in [D56](Decisions.md) with one helper,
`positiveAmountOf`, that every writer taking a typed amount now calls.

That is three consecutive fixes each introducing the next defect (D54→D55→D56), which is itself the
most important observation in this record.

Also this pass: the ten broken links in
[2026-09-04 Open Items Brief for Codex](../handoff/2026-09-04%20Open%20Items%20Brief%20for%20Codex.md)
were repaired — they were repo-root-relative `docs/…` paths written inside `handoff/`. **Zero broken
relative links and zero unresolved wikilinks now exist across the whole vault**, verified by walking
every `.md` outside `node_modules`, `dist` and `company_tracker`.

### A sixth round found three more, including one in its own first fix

Two money, one accessibility, all in [D57](Decisions.md).

**Generate wrote duplicate ledger rows.** `buildGeneratedRows` and `forecast` keyed "already on the
sheet?" on the row's description, which carries a date suffix for multi-occurrence payables — while
the Masterlist push-down writes the *bare* description onto linked rows. The suffix vanished, the key
stopped matching, and re-running Generate wrote a second copy: a bi-monthly ₱5,000 payable produced
`written = 2, skipped = 0`, **₱10,000 of phantom liability**, with the sync line reporting rows that
were already present. Fixed by `alreadyOnSheet`, shared by both callers, keyed on `src` and the due
date — the first thing `txns.src` has been load-bearing for beyond the dot on the sheet.

**A fortnightly payable was not fortnightly.** Weekly and Bi-weekly shared a branch that reset the
phase every month. Verified against the committed original rather than a mutation: an anchor of
Friday 2026-09-11 generated `09-04 09-18 10-02 10-16 10-30 11-06` — a **7-day gap** at the month
boundary, and the owner's own date never generated.

**The reminder controls were mouse-only — and the first fix kept them that way.** They rendered only
on `onMouseEnter`, so they were absent from the DOM. The first fix rendered them always and hid them
with `visibility: hidden`, which **removes an element from the accessibility tree and the tab
order** — the same defect in CSS. Caught because Playwright's `getByRole` found zero buttons while a
raw DOM query found sixteen; the discrepancy was the evidence. `opacity: 0` is the correct tool.
That is trap 82.

That makes **four** fixes in this sequence that introduced the next defect.

### A parallel sweep by the main session, on surfaces the round-6 agent was fenced off from

Run concurrently and deliberately non-overlapping: the read-only role and the export path. **No
defect found**, and the attempts are recorded because a clean result without them is worthless.
Config auto-save is gated on `state.readOnly`; every action added to `VIEWER_MAY` writes only local
state outside `CONFIG_KEYS`; all twelve write policies across the four tables are gated on
`is_viewer`, and policies are row-level, so the new columns inherit the gate — no additional probe
check is warranted. `summaryHTML` survives an empty ledger, all statuses off, undefined `recurring`,
both sortings, a `</table><script>` search string and a unicode company name, throwing nothing and
escaping everything.

Three things nobody had checked, now checked. **Rehearsal and production schemas are byte-identical**
— fingerprint `0fa3b0d5c77b189a8a10832651695ab4` over **311 catalogue facts** covering columns,
column grants, policies and foreign-key delete rules. **`ON DELETE SET NULL` was exercised**, not
assumed: on `tracker-rehearsal`, deleting a payable left its child row alive with `src` NULL, and the
project was verified empty afterwards. **The nightly scheduler was traced end to end** — it feeds
`buildGeneratedRows` straight into `insertTxns` at 22:00 UTC unattended, every column it sends is in
the INSERT grant, and nothing tested that; a test now pins the app's insert shape against the
migration's grant list and was falsified by adding a fake column. Blast radius of the `logic.js`
changes is exactly one script: `fx.mjs`, `backup.mjs`, `rewind.mjs` and `security/probe.mjs` import
none of the changed functions, and `smoke.mjs` asserts field-by-field with no exact-shape check.

### Rounds 16 to 18, run by hand, and four more findings

Round 16 was dispatched to a subagent **twice and died both times** — first on the session rate
limit, then on the **weekly** limit, having output only *"I'll start by reading the actual code
under verification."* Neither attempt mutated anything, verified against `git diff` and a green
suite. With subagents unavailable, **rounds 16, 17 and 18 were run by the main session by hand**:
the same context checking its own work, which is weaker evidence and is recorded as such.

They found four defects, **each one inside the fix the round before it had just written**
([D71](Decisions.md), traps 94-95):

- The D70 fix for trap 93 forced `ackRequirePhoto: false` at the start of every run, which would
  have silently overridden an owner who had deliberately turned that policy on.
- Mutation testing of D70's twelve new tests found **three surviving mutants** — `keyOf` could drop
  the table name and still pass every test.
- The replacement wrote its marker with a whole-document read-modify-write, the lost update
  `merge_app_config` exists to prevent.
- Two silent no-op paths in the new `hold`, either of which reproduces trap 93.

`npm test` reached **134 assertions across six files** at this point — 147 across seven after
round 19 ([D72](Decisions.md)). The e2e suite still passes 48. The ledger
fingerprint `f9f84adad1c9b5c4fa3e3495712ac09f` was unchanged across every run.

### Round 19: a fresh context refuted three rounds of self-review in one pass

Round 19 was the first fresh-context `verifier` subagent available after the weekly rate limit
reset. Rounds 16-18 had been run by the main session by hand and had reported the work green.
**Round 19 refuted that with six findings** ([D72](Decisions.md), traps 96-97), five of them inside
the fixes those three rounds had just written:

- A **third** spec changed `dashWindow` in the owner's live config without holding it; a killed run
  left the dashboard stuck on `Next 7 days`, hiding everything due 8-30 days out.
- A **fourth** added an `E2E###` code to the shared `companies` list — unrecoverable by design,
  because `hold` recorded settings only and `cleanup` never touches `app_config`.
- `actions.js` built the push-down key **by hand** while both cancel paths used the exported
  `pushKey`, so a format change silently broke both cancels with the suite green — reinstating two
  money-path defects.
- Two more surviving mutants in `pending.js`.
- `hold` and `releaseHeld` had **zero tests**: deleting either body left the suite green.
- `updRec`'s push-down guard covered only `amount`, so clearing a Description wrote `''` onto live
  ledger rows and the toast claimed they matched.

All six are fixed. `restoreConfig` is deleted, `hold` takes config paths rather than setting names,
`e2e/held.test.js` is new, and `pushable` moved to `src/logic.js`. `npm test` reached **169 assertions
across seven files** at that point; it is 179 across nine after D77.

### Round 20: and then it refuted round 19

Round 20 was dispatched against round 19's six fixes and came back **REFUTED with five findings**,
four of them inside those fixes ([D73](Decisions.md), trap 98):

- `&& pushable` and `if (!pushable) cancelPush(id, k)` could each be **deleted from `updRec` with
  `npm test` green**. Round 19 had extracted `pushable` and tested it in `logic.js` — the predicate
  was proved right while nothing proved the caller consulted it.
- `hold(['settings'])` validated, because `'settings' in cfg` is true, and `releaseHeld` then wrote
  the held settings object over its own `__e2eHeld: null` clear — **restoring the marker forever
  while reporting success**.
- Both `app_config` reads discarded `error`, so a transient failure made `releaseHeld()` return null
  and the spec pass green, leaving a setting on in the owner's live config.
- The whole-document config write that `restoreConfig` was deleted for **survived inline in a spec**.

All five fixed and falsified. `pushPlan` now returns the whole push decision; `hold` refuses the
settings section; both reads throw; the spec uses the merge RPC; the fake client gained a failure
channel; and `keyOf`, duplicated between the PNG export and the Tracker screen, is one `groupKey`.

### Rounds 22: the fix that moved a guard out of its coverage

Round 22 **REFUTED** round 21 ([D75](Decisions.md), traps 100-101). Three findings:

- **A source-text pin proves a line exists, not that it runs.** `retract` and a null `patch` are the
  same predicate, so swapping two adjacent statements in `updRec` made the push-down cancellation
  dead code for every input — with all four pinning assertions still matching.
- **Round 21's own fix moved the whole-ledger write guard into the one layer with no coverage.**
  Nothing imports `src/db.js`, which builds the live client at module scope; deleting both
  `.eq('src', src)` and `.neq('status','completed')` left the suite green, and in that state a
  single masterlist keystroke issues `PATCH /txns` with **no filter at all**.
- The tag-scoped storage sweep leaks orphans permanently — the deliberate trade, now documented.

New `src/queries.js` + `src/queries.test.js` put both many-row writes where a recorder can assert
their exact filter chain.

### Round 23: the repair tool could not read past a thousand rows

Round 23 **REFUTED** round 22 ([D76](Decisions.md), traps 102-103), five findings, two of them in
code no round had ever examined:

- **`scripts/rewind.mjs` read `audit_log` unpaged.** The restore tool, silently capped at 1,000
  rows. Measured against production, a cut at `2026-09-01T20:00:00Z` qualifies **7,419** rows; it
  reported **1000** and emitted a plan missing 6,419 changes while printing a confident count.
  `backup.mjs` documents this exact scar and pages; `src/db.js` pages everything.
- The round-22 recorder inspected only `select()`'s first argument, so `select('id', {head:true})`
  passed while making both builders return nothing.
- The `indexOf` ordering assertion was defeated by a comment.
- Three more `updRec` mutants, one of which put a **negative payable** in the ledger and the totals.
- The "bloat versus data loss" dichotomy D75 accepted was false: removing files *before* deleting
  the rows that name them leaks nothing and risks nothing.

`npm test` is **183 assertions across nine files**.

### Round 24: the backup was paged the way this codebase calls broken

Round 24 **REFUTED** round 23 ([D77](Decisions.md), traps 104-105), six findings:

- **`scripts/backup.mjs` paged by OFFSET with no `ORDER BY`.** Round 23 patched the *restore* tool
  and left the *backup* tool on the method `src/pending.js` describes as broken in its own comment,
  including the clause that matters — *"an exact count still matches"* — which is why the snapshot's
  own count assertion could not catch it. A real run now reads 7,902 audit rows with zero duplicates.
- `pageAll` hard-coded `row.id`, so paging `profiles` (keyed `user_id`) looped forever.
- **The source-text pins were defeated three ways** — a commented-out copy, a string literal, an
  `if` prefix — each leaving the suite green while a money-path guard became unreachable. The
  decisions moved into `src/masterlist.js` where a test can drive them, and **both pins were
  deleted**.
- The query recorder was blind to appended builder methods (`.single()`, `.limit(1)`).
- **The Masterlist Amount field could not accept a typed decimal.** `1250.50` typed key by key
  became **125050** — a hundredfold payable that then pushed down onto every linked Tracker row.
  Pasting worked, so twenty-three rounds of review never saw it: no test had ever typed.

`npm test` is **183 assertions across nine files**; the e2e suite is **49**.

**Twenty-four rounds have run and all twenty-four found something. The loop has never returned
clean, and no round has yet survived the next one.**
Two comparisons worth recording. Three rounds of main-session self-review produced four findings and
a green report; one fresh context produced six, including the money-path one, in a single pass. And
round 20 then refuted round 19 in turn — **no round has yet survived the next one**.

Separately, on 2026-09-06, `npm test` went **118/118 → 117/118 overnight with no code change and no
commit**: a unit test read the wall clock, so `eff({due: '2026-09-05'})` was `pending` on the 5th and
`overdue` on the 6th ([D69](Decisions.md), trap 92). **Fifteen rounds of adversarial review did not
find it; one day of real time did.** That is the argument for running this suite repeatedly over
time rather than only under scrutiny — and it would have failed the CI gate on the first push after
midnight, with a diff touching nothing related.

### Rounds 11 to 15: five more rounds, and a ratio worth reading twice

Recorded here because this file is the factual baseline and had fallen three rounds behind — the
third time in this session that this note has drifted, which is itself the finding.

Rounds 11 through 15 produced findings 18 to 41. The largest was **Generate's dedupe living only in
JavaScript with no unique index behind it** — the scheduler writes a month unattended and a stale
tab could duplicate the lot ([D63](Decisions.md)). The most instructive is that
**`20260905143255_money_constraints` and its own predecessor disagreed about zero**: `recurring.amount
>= 0` permits it, `txns.amount > 0` refuses it, and nothing reconciled the two until D66 — after
which D67 and this round found the same rule missing from four more siblings.

**Thirteen of the fixes in this sequence introduced the next defect.** That is more than a third,
and it is the single most useful number in this record: a fix here is a change like any other and
earns the same suspicion.

### Rounds 9 and 10: two guards that were never guards

Round 9 found that `updRec`'s "never rewrite a completed row" rule read `state.txns`, **a page-load
snapshot with no realtime subscription behind it** — so a row another session had paid was still
`pending` in this tab and had its amount overwritten by the next Masterlist keystroke. Exposure was
the age of the tab, not the 500 ms debounce. Round 10 then found the **same shape in
`undoGenerate`**, which is a DELETE and therefore worse: it promises in its own toast to keep
anything already paid, filtered the same stale snapshot, and deleted a completed transaction with
its payment record. Both are now enforced in the statement that writes — `.neq('status',
'completed')` on the update and on the delete, each returning the rows it actually touched so the
screen and the toast are painted from the database rather than from belief.
[D61](Decisions.md) and [D62](Decisions.md); trap 88.

The existing Undo spec could not have caught round 10's case: it pays through the UI in the same
session, which keeps the snapshot fresh. The new one pays from a second client.

After all fifteen code fixes — the tally is settled in [D60](Decisions.md), [D61](Decisions.md) and
[D62](Decisions.md) — `npm test` **119/119**, `npx playwright test --workers=1` **48 passed**, `npm run
build` green (entry 461.39 kB / 128.39 kB gzip at this commit, plus a separate 199.49 kB
`html2canvas` chunk only fetched on Export), `npm audit` **0**, `npm run security` **56 checks, 0
failed**. `txns`
`f9f84adad1c9b5c4fa3e3495712ac09f`, 49 rows, ₱2,226,438.00. Ledger invariants asserted directly
rather than inferred: rows with `fee` set but not completed → **0**; rows where `amount < fee` →
**0**; `E2E-` residue in `txns` and `transfers` → **0**; `transfers` 9, all released, 6 priced, `inv`
empty on all nine; `receipts` 3; 24 policies.

**Two facts found the same day that no earlier note records.** First, `.github/workflows/fx.yml` produced its **first ever scheduled run** at `2026-09-04T06:59:08Z`, **4 h 59 min after its 02:00 UTC slot**, and succeeded. Read twenty minutes earlier the same workflow had no `schedule` run at all, which is recorded here deliberately: a scheduler that has not run *yet* and one that never runs are indistinguishable until you wait. That run wrote nothing and fired no audit trigger, correctly — the ECB's 2026-09-03 fix was already stored, so `fx_rates.fetched_at` remains `2026-09-03 14:43:59Z`; this is the first demonstration of [Decisions](Decisions.md) D43's idempotence on the scheduled path. What remains is the delay itself: GitHub is queuing this repository's scheduled runs 2.5 to 5 hours late, and `backup.yml`'s 06:00 UTC run had still not appeared by 11:03 UTC. Both FX slots exist to land before the ECB's ~14:00 UTC publication, so a five-hour delay on the 08:00 UTC slot leaves roughly an hour of margin rather than six. Second, `select status, count(*), count(rate) from public.transfers` returns `released 9, priced 6`: the owner moved the last three wires from `pending` to `released` at 2026-09-04 02:26:59–02:27:03 UTC (`audit_log` 1697–1699) and all three carry `rate` and `rate_as_of` null, because nothing in the application stamps a rate when the status changes. Both are recorded as open items C6 and C7 in [Remaining Work and Owner Decisions](Remaining%20Work%20and%20Owner%20Decisions.md); neither was acted on.

**Both browser sign-out call sites now pass `scope: 'global'` explicitly**, `apps/web/src/App.jsx:63` and `apps/web/src/store.jsx:67`, replacing the library default they had inherited ([Decisions](Decisions.md) D47). Runtime behaviour is unchanged, so this is verified by inspection plus an unchanged suite rather than by a new assertion: `npm test` 77/77 and `npx playwright test e2e/app.spec.js --workers=1` 8 passed with the existing refresh-before-sign-out order intact. No `TELEGRAM_*` secret, variable or code path exists; the scheduler's only delivery paths remain `GITHUB_STEP_SUMMARY` and stdout (D48), and the repository secret count stays at thirteen.

## Interpretation Boundary

Names and mock data in the exported CRM interface are presentation evidence only, and the same holds for the seed rows transcribed into `apps/web/src/data.js`.

`docs/seeded-data-backup/seed-data.json` archives the cleared demo rows in database column shape, generated from `apps/web/src/data.js`. Its totals match what was read from the live database immediately before the delete, so it is a verified copy rather than a reconstruction. It contains invented data only.

The ledger was cleared of demo data on 2026-09-01. Read back at 15:10 UTC that day it held 21 transactions, zero receipts, zero recurring rules and zero transfers — real rows entered by the owner, and already drifted from the 1 transaction and 1 receipt recorded eleven hours earlier, so any count here is a timestamp and not a constant. One `app_config` row remains, carrying 21 company codes, 13 categories, empty notes and the settings; it is kept deliberately, since `load()` treats its absence as a never-used workspace.

As of 2026-09-01 the schema also holds `public.audit_log` and the `security definer` trigger function `public.log_change()`, with one `after insert or update or delete` row trigger on each of the other five tables; a client delete was observed producing an audit row carrying the actor's uuid and email. It also holds a `receipts.file_path` column and a private `receipts` storage bucket (10 MB, images and PDF only), with column-level grants that keep `created_at`, `app_config.updated_at` and `id` out of a client's reach. Two settings, `autoGen` and `ackAutoNotify`, were removed from the app and from the stored config because nothing performs the scheduled work they described.

`apps/web` proves only what its own build and test run demonstrate. As of 2026-09-02 that is: it compiles, **53** offline assertions pass (43 before `scripts/rewind-plan.test.js` added ten), 27 Playwright specs pass **when the suite is run with one worker**, and previously across three consecutive runs against the dev server, a preview of the production build and the deployment itself, a 47-check security probe reports 0 failures and 0 deferred, `npm audit` is clean, and `npm run smoke` completes against the live project — sign-up, seed of 20 transactions, 6 receipts and 6 recurring rules, then a payment, an insert, a liquidation, a config change, a full reload that read every one of them back, and a delete. The account it created was removed afterwards.

The schema was rebuilt the same day for two users sharing one ledger ([Decisions](Decisions.md) D8), so the per-account findings from the first schema no longer describe it. Verified by SQL against the rebuilt schema, in transactions that were rolled back: a row written under one account's JWT is read and updated under a different account's; `app_config` rejects a second row, so the shared settings row is a genuine singleton; row-level security is on for all four tables; and `anon` holds no privilege on any of them.

Being signed in is now the entire authorization. Nothing in the database distinguishes the admin from the executive.

Email sign-up was blocked until the owner turned off *Confirm email* on 2026-08-31. Two settings were involved and only the second is the one that matters: the Email provider itself must stay enabled, and *Confirm email* under it must be off, or the built-in SMTP rate limit rejects every sign-up.

`npm run smoke` passes against the shared schema, signed in as the first issued account: it seeded the ledger, wrote a payment, an insert, a liquidation and a config change, reloaded from scratch and read every one back, then deleted a row and confirmed it stayed deleted.

Both accounts now exist in `auth.users`, and the two-user model was verified with real sessions rather than simulated JWTs: signed in as the executive, an edit to a payable was immediately visible to the admin, and the admin's revert was immediately visible to the executive. Neither account has any capability the other lacks. Self-serve sign-up is disabled, so those are the only accounts that can ever sign in until the owner adds another. The ledger now holds the seeded demo rows — 20 transactions, 6 receipts, 6 recurring rules, and one shared config row — all invented, none of it company data.

Partly verified: the browser path. The sign-in gate renders and the running app reaches it, observed at `http://localhost:5173/`. The signed-in screens have not been observed against live data, because no session was established through a browser. `npm run smoke` issues the same queries those screens make, so the gap is rendering, not the data path.

**Occurrence-identity closure was written on 2026-09-07 and applied to production on 2026-09-08
([D80](Decisions.md)).** Source inspection
shows generated rows carry `occurrenceDue`, `src/rows.js` maps it to `occurrence_due` on insert and
omits it from update payloads, coverage treats a linked row without identity as unresolved rather
than guessing from editable dates, and the scheduler reports that state. `rewind-plan.js` refuses a
linked pre-migration before-image when the hosted schema has the identity column. The backup query
plan also has executable coverage for its key guard and `fx_rates` ordering. `npm test` passes
**197 assertions across 11 files**. The probe enumerates **57 checks** and the
generated-identity privilege check is no longer deferred. Its staged contract remains explicit:
`OCCURRENCE_IDENTITY_PHASE=1` describes a database between the two phases, where exact `42501` is
required for `occurrence_due` while `src` remains updateable; `OCCURRENCE_IDENTITY_PHASE=2`
describes the current one, requires exact `42501` for both, and makes either failure fatal/nonzero.
Phase 1 revokes authenticated UPDATE only on `occurrence_due`, phase 2 revokes it on `src`, and the
identity-aware `forUpdate` omits both. The e2e manifest has **51 tests: two setup tests and 49
specs**.

**Read live on 2026-09-08, before and after every production-writing check.** Twenty-one migrations
applied, latest `20260907182000`. `txns.occurrence_due` exists; authenticated holds INSERT but not
UPDATE on it, and after phase 2 no UPDATE on `src` either. `txns_one_generated_row_per_occurrence`
present, `txns_one_generated_row_per_due_date` dropped, CHECK
`txns_generated_occurrence_has_identity` validated. Deployment moved from `index-DQlFRu57.js` to
`index-D1mhlrBq.js`. `npm test` **191/191 across 11 files**, `npm run build` green at `vite v8.2.2`,
`npm audit` **0 vulnerabilities**, `OCCURRENCE_IDENTITY_PHASE=2 npm run security` **57 checks, 0
failed, 0 deferred**, `npx playwright test --workers=1` **51 passed** — the suite was run before phase 2, again after it
(which is the only reason two spec defects were caught, D80), and again after the round-27 fixes. `txns` 49 rows,
₱2,226,438.00, `id:amount:status` fingerprint `a76686384422360d47403627c35f4f7f` unchanged
throughout; the whole-row fingerprint moved to `08a747319f890079f3e107ec258bec51` because a column
was added. `app_config` settings at rest, `__e2eHeld` null, 19 categories — `Refund` was added to
production on 2026-09-07, closing the one open masterlist gap — 21 companies, zero `E2E-` residue,
receipt `1788471059637` intact with its stored object, `recurring` empty, `audit_log` 8508 and
append-only. `apps/web/test-results` deleted after every Playwright run; the password appeared in
zero files, which is the tracing-off setup project working as designed.

The phase-1 preflight recorded **43 historical `src` transitions and zero currently linked
production rows** on 2026-09-07, re-confirmed immediately before application on 2026-09-08, so the
backfill was a no-op and `audit_log` did not move across it. The migration scrutinizes `src`/`due`
history for every row that is linked when it runs; transitions on now-unlinked rows do not block.
These values must be read again in any future environment rather than treated as invariants.

**Corrected 2026-09-04.** This sentence read "The app still has no server component, no CI, no deployment, no logging or telemetry…" and had been false since 2026-09-01, contradicting this note's own CI and deployment paragraph above. What is actually still absent: a server component, logging or telemetry, conflict detection between concurrent editors, and a realtime subscription. CI and deployment exist — five workflows, a gate on every push to `main`, and a live Vercel deployment. `TODAY` remains frozen at `2026-08-30` in `src/data.js`, so completion dates it writes carry that date rather than the real one.

## Guideline Basis

- **PG-01** requires this inventory to describe the structure that actually exists, including missing prerequisites, and to be corrected when one of them arrives.
- **PG-03** separates exported artifacts and delivery references from maintainable source.
- **DOC-02** labels observations as evidence and prevents interface text from becoming assumed architecture.
- **SEC-01** records active-content and network trust boundaries without executing the exports.
- **SEC-02** records the Supabase client as a versioned dependency with a named provenance, unlike the export's CDN loads.
- **PG-04** requires each claim above to name the check that produced it, and to name what stayed unverified.

implements: [Awesome Guidelines Integration](Awesome%20Guidelines%20Integration.md)

Related: [AI Agent Context](AI%20Agent%20Context.md) · [Decisions](Decisions.md) · [company_tracker scope](../company_tracker/AGENTS.md) · [Guideline ledger](Awesome%20Guidelines%20Integration.md)
