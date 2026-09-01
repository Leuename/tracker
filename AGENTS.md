# Repository Guidelines

Start at [AI Agent Context](docs/AI%20Agent%20Context.md). Treat [Repository Evidence](docs/Repository%20Evidence.md) as the factual baseline and [Decisions](docs/Decisions.md) as the current decision record.

`AGENTS.md` and `CLAUDE.md` are synchronized repository policies. Any shared-policy change must be applied to both files in the same change; neither file has higher authority than the other.

## Scope and Instruction Boundaries

Two classes of file, two rules.

`apps/web/` is authored application source, added on 2026-08-31 under the explicit request [Decisions](docs/Decisions.md) D1 requires. Treat it as ordinary maintainable source and use its own tests and build as the check.

Everything else is unchanged: do not modify generated exports, assets, binaries, dependencies, settings, or tooling without a later explicit request. Within `company_tracker/`, the nearer [company_tracker/AGENTS.md](company_tracker/AGENTS.md) overrides this guide and keeps those exports read-only. Tool-specific files may narrow a workflow but cannot grant authority.

## Repository Structure

Knowledge notes live in `docs/`; handoffs live in `handoff/`, named `YYYY-MM-DD Title.md` so they sort chronologically and resolve as unique Obsidian links. Only `AGENTS.md`, `CLAUDE.md`, and `CLAUDE.local.md` stay at the repository root. `apps/web/` holds the authored React + Vite ERP application and its [README](apps/web/README.md); it persists to a Supabase Postgres project behind an email sign-in, so a hosted database and authentication provider are now real external dependencies rather than deferred ones. `apps/api/` is an empty directory declaring an intended boundary, not an implementation. `company_tracker/` contains static Design Component dashboard exports, not a complete application. `construction_tracker/construction.csv` is a requirements/reference sheet for project, attendance, cash-flow, payroll, payable, debt, expense, and receivable screens; it is not a backend data source. Root ZIP/PDF files are delivery references. `.claude/` contains task adapters. `.obsidian/` is editor configuration and must not contain project notes. Record observed facts, decisions, and continuation state in their canonical notes rather than scattering copies.

## Commands and Verification

`apps/web/` is the only directory with a package manifest, and its commands are the only runnable ones in this repository. Run them from `apps/web/`:

| Command | Purpose |
|---|---|
| `npm install` | Install dependencies pinned by `apps/web/package-lock.json`. |
| `npm run dev` | Vite development server on port 5173. |
| `npm run build` | Production bundle into `apps/web/dist/`. |
| `npm run preview` | Serve the built bundle. |
| `npm test` | `node --test src/logic.test.js src/rows.test.js src/errors.test.js`. 39 assertions. Offline. No test framework. |
| `npm run e2e` | 27 Playwright specs. They drive the UI and read Postgres back, so they need `E2E_EMAIL` and `E2E_PASSWORD`; `E2E_BASE_URL` points them at a deployment. They write to the shared ledger and sweep every `E2E-` tag before and after. Without credentials they skip and exit 0; set `E2E_REQUIRE_CREDENTIALS=1` to make that a failure instead. |
| `npm run security` | 41-check probe: anonymous access, forged tokens, schema exposure, filter injection, mass assignment, audit-log tamper resistance, storage, bundle secrets, sign-up, deployment headers. Checks named in `DEFERRED` still run and print, tagged `DEFER`, but do not fail the suite ([D26](docs/Decisions.md)); the list is empty and all 41 pass. |
| `npm run smoke` | End-to-end check against the live Supabase project. Needs the network and credentials, so it is not part of `npm test`. |

`apps/web/` now requires `apps/web/.env.local` (`VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`); `.env.example` records the shape and both files are git-ignored. Never place a `service_role` or other secret key there — Vite ships every `VITE_`-prefixed variable to the browser.

The repository root is this directory, pushed to `Leuename/tracker` (private). **Vercel's Root Directory must be set to `apps/web`**, because that is where the only package manifest lives; without it every deploy fails looking for a manifest at the top. There is still no repository-root manifest, workspace declaration, or task runner, so nothing runs from the repository root. `.github/workflows/` holds `backup.yml` (nightly snapshot), `ci.yml` (checks then a Vercel CLI deploy on every push to `main`) and `verify.yml` (the three ledger-writing suites, nightly and on demand). Automatic git deployments for `main` are off in `apps/web/vercel.json` (`git.deploymentEnabled`, [D27](docs/Decisions.md)), because GitHub checks do not gate Vercel. All eleven secrets are set and the gate ran green on its first push (`v0.5.0`, run `33530246170`): checks, then a CLI deploy, with **no** competing deployment from Vercel's git integration. No formatter, linter, or type checker is configured. The `dc-runtime` build text inside generated `support.js` points to absent source and is not runnable.

A handoff, recap, or continuation package is incomplete without a `## Resume prompt` section: **one** copy-pasteable prompt that restores the whole state — the document's exact path, the notes to read with it, the constraints and traps that govern changes, what to do next, the checks to run, and an instruction to verify and confirm before acting. Do not split it into per-situation or per-task variants. [handoff/2026-09-01 Telegraphic Transfers and Full-Stack Verification.md](handoff/2026-09-01%20Telegraphic%20Transfers%20and%20Full-Stack%20Verification.md) is the current one and the reference shape.

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
