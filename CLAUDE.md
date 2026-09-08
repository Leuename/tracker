# Repository Guidelines

Start at [AI Agent Context](docs/AI%20Agent%20Context.md). Treat [Repository Evidence](docs/Repository%20Evidence.md) as the factual baseline and [Decisions](docs/Decisions.md) as the current decision record.

`AGENTS.md` and `CLAUDE.md` are synchronized repository policies. Any shared-policy change must be applied to both files in the same change; neither file has higher authority than the other.

## Scope and Instruction Boundaries

Two classes of file, two rules.

`apps/web/` is authored application source, added on 2026-08-31 under the explicit request [Decisions](docs/Decisions.md) D1 requires. Treat it as ordinary maintainable source and use its own tests and build as the check.

Everything else is unchanged: do not modify generated exports, assets, binaries, dependencies, settings, or tooling without a later explicit request. Within `company_tracker/`, the nearer [company_tracker/AGENTS.md](company_tracker/AGENTS.md) overrides this guide and keeps those exports read-only. Tool-specific files may narrow a workflow but cannot grant authority.

## Repository Structure

Knowledge notes live in `docs/`; handoffs live in `handoff/`, named `YYYY-MM-DD Title.md` so they sort chronologically and resolve as unique Obsidian links. Only `AGENTS.md`, `CLAUDE.md`, and `CLAUDE.local.md` stay at the repository root. `apps/web/` holds the authored React + Vite ERP application and its [README](apps/web/README.md); it persists to a Supabase Postgres project behind an email sign-in, so a hosted database and authentication provider are now real external dependencies rather than deferred ones. There is no `apps/api/`: the empty directory that declared that boundary was removed on 2026-09-04 ([D46](docs/Decisions.md)), and no API implementation exists in this checkout. `company_tracker/` contains static Design Component dashboard exports, not a complete application. `construction_tracker/construction.csv` is a requirements/reference sheet for project, attendance, cash-flow, payroll, payable, debt, expense, and receivable screens; it is not a backend data source. Root ZIP/PDF files are delivery references. `.claude/` contains task adapters. `.obsidian/` is editor configuration and must not contain project notes. Record observed facts, decisions, and continuation state in their canonical notes rather than scattering copies.

## Commands and Verification

`apps/web/` is the only directory with a package manifest, and its commands are the only runnable ones in this repository. Run them from `apps/web/`:

| Command | Purpose |
|---|---|
| `npm install` | Install dependencies pinned by `apps/web/package-lock.json`. |
| `npm run dev` | Vite development server on port 5173. |
| `npm run build` | Production bundle into `apps/web/dist/`. |
| `npm run preview` | Serve the built bundle. |
| `npm test` | `node --test src/logic.test.js src/lookups.test.js src/rows.test.js src/pending.test.js src/masterlist.test.js src/config-save.test.js src/queries.test.js src/errors.test.js scripts/rewind-plan.test.js scripts/schedule-plan.test.js scripts/backup-plan.test.js e2e/held.test.js e2e/network-preflight.test.js`. 237 assertions across 13 files. Offline. No test framework. The preflight tests pin the **failure** paths a live e2e run never reaches — a reachable-but-broken deployment must fail the gate, not clear it. |
| `npm run e2e` | 52 Playwright tests in 3 files — a `setup` project that signs in twice, then 50 specs. The occurrence-identity spec **has run against the hosted column and passes**, and the suite is **52/52**, run against a local dev server before every push and against the deployment after. `workers: 1` **is applied** in `playwright.config.js:43`, because `fullyParallel: false` only serialises within a file and the default four workers raced each other on the one shared ledger. A setup project saves `storageState`, so 48 of the 50 no longer type the password; the two that exercise the sign-in form still do. Session-mutating specs are **ordered**, and that ordering is load-bearing ([D41](docs/Decisions.md)). They drive the UI and read Postgres back, so they need `E2E_EMAIL` and `E2E_PASSWORD`; `E2E_BASE_URL` points them at a deployment. They write to the shared ledger and sweep every `E2E-` tag before and after. Four specs also change the **owner’s live config** — three settings and the shared company/category lists; each calls `hold()` first, which records what was there into `settings.__e2eHeld` so a killed process is recoverable, and both `beforeAll` and every `finally` call `releaseHeld()` ([D71](docs/Decisions.md), [D72](docs/Decisions.md)). Without credentials they skip and exit 0; set `E2E_REQUIRE_CREDENTIALS=1` to make that a failure instead. |
| `npm run security` | 60-check probe: anonymous access, forged tokens, schema exposure, filter injection, mass assignment, audit-log tamper resistance, role integrity, storage, bundle secrets, sign-up, deployment headers. Checks named in `DEFERRED` still run and print, tagged `DEFER`, but do not fail the suite ([D26](docs/Decisions.md)); **the list is empty**. Both rollout phases are applied, and `OCCURRENCE_IDENTITY_PHASE` now **defaults to `2`**, so a bare `npm run security` asserts the current rules: the identity check is not deferred, requires exact `42501` for **both** `occurrence_due` and `src`, and either failure is fatal/nonzero ([D79](docs/Decisions.md)). `=1` remains meaningful only for a pre-phase-2 database, where `src` is still updateable. **60 checks, 0 failed, 0 deferred** at both `=1` (after phase 1) and `=2` (after phase 2). |
| `npm run schedule` | Generate this month's recurring payables and report what is overdue. Idempotence rests on immutable generated-occurrence identity ([D79](docs/Decisions.md)): a partial unique index on `(src, occurrence_due)`, which a visible due-date edit cannot move. Both migrations are **applied** and the identity-aware app is deployed, so D63's `(src, due)` index is gone — it keyed on a column the owner can edit, which is what let one bill be generated twice. `-- --dry-run` writes nothing. Run daily at 22:00 UTC by `.github/workflows/schedule.yml`. Needs `SCHEDULE_EMAIL`/`SCHEDULE_PASSWORD`, named in `.env.example`. |
| `npm run fx` | Fetch the day's ECB reference rates from `frankfurter.dev` (no API key) and store them in `fx_rates`. Idempotent — it writes only when a value differs, so a repeat run writes no row and fires no audit trigger; `-- --dry-run` writes nothing. Run twice daily at 02:00 and 08:00 UTC by `.github/workflows/fx.yml`. **Both runs land before the ECB's ~14:00 UTC publication, so the stored rate is deliberately one working day old** ([D43](docs/Decisions.md)); the second run is a retry, not a second number. Needs `FX_EMAIL`/`FX_PASSWORD` — a dedicated `viewer` account that can write `fx_rates` and nothing else ([D42](docs/Decisions.md)). |
| `npm run rewind -- --since <ISO>` | Reconstruct the ledger as it stood at any second, from `audit_log` ([D32](docs/Decisions.md)). Writes nothing to the database: it prints the plan and emits a `.sql` file to apply as `postgres`. Occurrence identity now exists, so it refuses linked pre-migration `txns` images without `occurrence_due`; use the pre-migration schema or an explicit owner-approved mapping ([D79](docs/Decisions.md)). Generated plans are gitignored. |
| `npm run smoke` | End-to-end check against the live Supabase project, including a receipt document stored, read back and restored byte-for-byte. Needs the network and credentials, so it is not part of `npm test`. |

`apps/web/` now requires `apps/web/.env.local` (`VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`); `.env.example` records the shape and both files are git-ignored. Never place a `service_role` or other secret key there — Vite ships every `VITE_`-prefixed variable to the browser.

**Before pushing a change to `apps/web/src/`, run the Playwright suite against a local dev server** — `E2E_REQUIRE_CREDENTIALS=1 npx playwright test --workers=1` with `E2E_BASE_URL` unset. `npm test` and `npm run build` do not import `store.jsx`, `App.jsx` or any screen, so a `ReferenceError` in a React component passes both and blanks the page for everyone. That happened on 2026-09-08: a bad edit dropped two `const` declarations, the gate went green, and production was broken until the e2e run after the deploy caught it. The suite drives the real UI, which is the only check that does.

The repository root is this directory, pushed to `Leuename/tracker` (private). **Vercel's Root Directory must be set to `apps/web`**, because that is where the only package manifest lives; without it every deploy fails looking for a manifest at the top. There is still no repository-root manifest, workspace declaration, or task runner, so nothing runs from the repository root. `.github/workflows/` holds `backup.yml` (a snapshot twice daily, 18:00 and 06:00 UTC — two even 12-hour gaps, [D36](docs/Decisions.md)), `ci.yml` (checks then a Vercel CLI deploy on every push to `main`), `verify.yml` (the three ledger-writing suites, nightly and on demand), `schedule.yml` (generates recurring payables daily and reports what is overdue) and `fx.yml` (fetches exchange rates twice daily). Automatic git deployments for `main` are off in `apps/web/vercel.json` (`git.deploymentEnabled`, [D27](docs/Decisions.md)), because GitHub checks do not gate Vercel. All thirteen secrets are set and the gate ran green on its first push (`v0.5.0`, run `33530246170`): checks, then a CLI deploy, with **no** competing deployment from Vercel's git integration. No formatter, linter, or type checker is configured. The `dc-runtime` build text inside generated `support.js` points to absent source and is not runnable.

A handoff, recap, or continuation package is incomplete without a `## Resume prompt` section: **one** copy-pasteable prompt that restores the whole state — the document's exact path, the notes to read with it, the constraints and traps that govern changes, what to do next, the checks to run, and an instruction to verify and confirm before acting. Do not split it into per-situation or per-task variants. [handoff/2026-09-07 Session Continuation, Rounds One to Twenty-Five.md](handoff/2026-09-07%20Session%20Continuation,%20Rounds%20One%20to%20Twenty-Five.md) is the current entry point and the reference shape, read with [handoff/2026-09-06 The Review Loop, Rounds One to Twenty.md](handoff/2026-09-06%20The%20Review%20Loop,%20Rounds%20One%20to%20Twenty.md) for the round ledger, read with [handoff/2026-09-05 The Design Port, and Three Requirements the File Did Not Show.md](handoff/2026-09-05%20The%20Design%20Port,%20and%20Three%20Requirements%20the%20File%20Did%20Not%20Show.md), which remains the record of the design port and traps 77-107; [handoff/Handoff Index.md](handoff/Handoff%20Index.md) maps every handoff and says which are superseded records rather than entry points.

Documentation checks should verify local links, placeholder removal, scope consistency, and changed paths. Do not fabricate commands to make a template look complete, and do not claim a root-level workflow that no checked-in configuration supports.

## Style and Naming

Write short, imperative, path-specific guidance. Distinguish evidence (“file X contains Y”) from inference and decision. Use Title Case for knowledge-note filenames and preserve exported artifact names. Lowercase kebab-case for CSS custom properties is now active, not conditional, in `apps/web/src/styles.css`. Authored JavaScript under `apps/web/src/` is maintainable source; generated JavaScript under `company_tracker/` remains read-only.

## Reviews, Commits, and Pull Requests

The whole checkout has Git history as of 2026-09-01, when the repository was re-rooted here from `apps/web/`. Use a concise imperative subject, and remember that a push to `main` deploys to production. A review or PR description must identify affected artifacts, cite exact evidence paths, list checks, disclose source gaps, and include screenshots for authorized visual changes.

Releases are annotated tags cut by hand, `vMAJOR.MINOR.PATCH`, matching `apps/web/package.json` on the same commit: `git tag -a v0.2.0 -m "…" && git push origin v0.2.0`. Rolling back is a `git revert` plus a push, or promoting an earlier deployment in Vercel; never move a tag that has been pushed. See [git-workflow](.claude/rules/git-workflow.md).

## External Guidance

Use the adopted principles and activation statuses in [Awesome Guidelines Integration](docs/Awesome%20Guidelines%20Integration.md), not the external index by itself. Enforce nearest-file precedence, evidence-backed commands, generated/source separation, focused reviewable changes, resolvable documentation links, and explicit security trust boundaries. Guidance marked deferred stays inactive until its named source, manifest, configuration, or runtime evidence exists. Guidance marked excluded must not be imported speculatively.

## Guideline Basis

- **AGENT-01** makes the nearest scoped guide authoritative while preserving this root default.
- **PG-02** prohibits invented commands and requires checked-in configuration before a workflow is documented as runnable.
- **PG-03** keeps generated Design Component artifacts separate from the authored source in `apps/web/`.
- **DOC-02** requires facts, decisions, and guidance to remain distinguishable and evidence-backed.

implements: [Awesome Guidelines Integration](docs/Awesome%20Guidelines%20Integration.md)

Related: [Handoff](docs/Handoff.md) · [Turborepo and Turbopack](docs/Turborepo%20and%20Turbopack.md) · [Guideline ledger](docs/Awesome%20Guidelines%20Integration.md)
