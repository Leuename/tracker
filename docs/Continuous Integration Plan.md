---
title: Continuous Integration Plan
tags: [plan, ci, github-actions, vercel, deployment, built]
created: 2026-09-01
status: built, not yet active
related:
  - "[Audit Trail Plan](Audit%20Trail%20Plan.md) — the higher-value held-back, built first on 2026-09-01"
  - "[Decisions](Decisions.md) — D19 fixes the release convention this would automate around"
  - "[Repository Evidence](Repository%20Evidence.md) — the factual baseline"
up: "[AI Agent Context](AI%20Agent%20Context.md)"
---

# Continuous Integration Plan

**Built and wired on 2026-09-01. Untested until the first push.** The workflows are checked in as
`.github/workflows/ci.yml` and `.github/workflows/verify.yml`, the prerequisite below is done,
Vercel's automatic deployments for `main` are switched off in `vercel.json`, and all eleven
repository secrets are set — including `VERCEL_TOKEN`, created in the browser as `tracker-ci`.

**It ran, and it worked, first time.** `v0.5.0` was pushed on 2026-09-01 at 16:10 UTC. Run
`33530246170`: `check` green, `deploy` green, 1m11s end to end. Production returned 200 on the new
build.

The part worth recording is what did **not** happen. Vercel's git integration produced **no**
deployment for that commit — exactly one production deployment exists for `b5b238f`, created by the
CLI in the workflow. `git.deploymentEnabled` was honoured on the very push that introduced it,
which had been an open question: the setting is read from the commit being deployed, so it took
effect immediately rather than one push later.

`verify.yml` ran for the first time the same day, by `workflow_dispatch`: run `33530924458`,
3m32s, all three suites green against the deployment — `27 passed`, `41 checks, 0 failed`,
`smoke passed`. The counts are the point. A suite that skipped would have printed `27 skipped` and
still exited 0 before `E2E_REQUIRE_CREDENTIALS` existed, so the log line is the evidence the gate
is real, not the green tick. The ledger was clean afterwards: zero tagged residue on every table,
zero probe accounts, only the owner's 21 transactions.

One annotation, harmless: `actions/checkout@v4` and `actions/setup-node@v4` still target Node 20
and are forced onto Node 24 by the runner. It is a deprecation notice on the actions themselves,
not on this repository's Node version, and needs no change until those actions publish a v5.

1. ~~Turn off automatic deployments for `main`.~~ **Done, in the repository rather than the
   dashboard**: `apps/web/vercel.json` carries `"git": { "deploymentEnabled": { "main": false } }`
   ([Decisions](Decisions.md) D27). It takes effect once pushed — the push carrying it is still
   deployed the old way. The dashboard equivalent, if it is ever wanted instead, is
   <https://vercel.com/grade-fit-s-projects/tracker/settings/git>.
2. ~~Add three repository secrets.~~ **Done — eleven secrets.** `VERCEL_ORG_ID`,
   `VERCEL_PROJECT_ID`, `E2E_EMAIL`, `E2E_PASSWORD`, `SMOKE_EMAIL` and `SMOKE_PASSWORD` were set
   from `apps/web/.env.local`; `VERCEL_TOKEN` was created in the browser as `tracker-ci` and set by
   hand, because it
   cannot be sourced from here. **The Vercel CLI does not help**, and this was tested rather than
   assumed on 2026-09-01: the CLI is installed and logged in, but its credential is a short-lived
   OAuth app token — it expires the same day, and `POST /v3/user/tokens` refuses it outright with
   `403 forbidden — Cannot create tokens for this app.` Vercel does not let an app credential mint
   an account credential. A browser session is the only path.
   Create it at <https://vercel.com/account/tokens>, scoped to `GradeFit's projects`,
   then set it **in the GitHub web UI** — Settings → Secrets and variables → Actions → New
   repository secret — or from your own terminal with
   `gh secret set VERCEL_TOKEN --repo Leuename/tracker`, pasting at the prompt.

   Two ways to get this wrong, both seen on 2026-09-01. The value must never be a command-line
   argument, where it lands in shell history and in any transcript. And it must never go in the
   **name** position: `gh secret set <token> --repo …` creates a secret *named* after the token,
   and secret names are visible to anyone with repository access. That mistake published a live
   account-wide token and cost a revoke-and-reissue.

   **Rotation.** `tracker-ci` has no expiry and no owner recorded anywhere but here. It is
   account-wide — Vercel tokens are not project-scoped — so it is worth revoking and reissuing on
   any cadence at all rather than none, and immediately if it is ever pasted anywhere. The first
   one made on 2026-09-01 was burned within a minute by landing in a secret's *name*; the
   replacement is the live one.

Every one of those was read straight out of `apps/web/.env.local` with
`gh secret set --body "$(grep …)"` and never pasted — a `…` from a truncated paste cost a release
earlier the same day. `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` were already set for
the backup.

**One consequence worth naming.** The shared five-character password is now in GitHub secrets as
well as in four people's hands. That does not make it weaker, but it widens who can reach it — any
future collaborator with write access to this repository can exfiltrate it through a workflow.
Password rotation was already a deferred open item; this makes it a slightly sharper one.

## Read this before designing anything

Two facts sink the obvious version of this plan. Both were established on 2026-09-01.

**GitHub checks do not gate Vercel.** Vercel deploys on push, independently, and does not wait for
an Actions run. The external consultation filed this as a "risk"; it is not a risk, it is the
default behaviour, and a plan that adds a workflow and stops there produces a green checkmark
beside a deployment that already went out. `[skip ci]` does not help either — that was tried on
2026-09-01 and Vercel deployed the commit anyway.

**`npm run e2e` exits 0 having run nothing when credentials are absent.** It prints `N skipped` and
succeeds. Any gate built on it in that state is worthless, and worse than worthless, because it
reports safety it does not provide.

## Prerequisite: make a skipped suite fail

Before any workflow exists, `apps/web/e2e/db.js` must stop treating missing credentials as a reason
to skip quietly.

The current `haveCredentials()` gate is right for a developer laptop and wrong for CI. The fix is
an explicit signal — an environment variable such as `E2E_REQUIRE_CREDENTIALS=1`, set in the
workflow, that turns the skip into a hard failure. A developer without credentials still gets a
skip; CI gets a red build.

Do this first. It is small, and everything below is unsound without it.

**Done.** `haveCredentials()` in `apps/web/e2e/db.js` now names the missing variables and throws
when `E2E_REQUIRE_CREDENTIALS` is set. `app.spec.js` had a *second*, separate gate reading
`E2E_EMAIL` and `E2E_PASSWORD` directly; it calls the shared one now, so there is one gate rather
than two that can disagree. Verified by moving `.env.local` aside and running the suite:
`playwright test` exits **1** with `Refusing to skip`, where it previously printed `27 skipped` and
exited 0.

`npm run smoke` and `npm run security` were also changed from `--env-file` to
`--env-file-if-exists`. Both would have aborted with `node: .env.local: not found` in CI, where the
file is gitignored and the variables arrive as real environment variables — the same defect that
took the backup workflow down on 2026-09-01.

## Design: take deployment away from Vercel's git integration

The only arrangement that actually gates production:

1. **Turn off Vercel's automatic git deployments** for `main`. Two ways: the dashboard at
   Project → Settings → Git, or — the way it was actually done, because it is then versioned and
   reviewable — `"git": { "deploymentEnabled": { "main": false } }` in `apps/web/vercel.json`.
   The key governs Git-triggered deployments only; a CLI deploy is unaffected, which is what makes
   the pairing work.
2. The workflow runs the checks.
3. The workflow deploys with the Vercel CLI, on success only.

```yaml
name: CI
on:
  push:
    branches: [main]
  workflow_dispatch:

permissions:
  contents: read

jobs:
  check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '24'          # 22+ required; supabase-js needs a native WebSocket
          cache: npm
          cache-dependency-path: apps/web/package-lock.json
      - run: npm ci
        working-directory: apps/web
      - run: npm test
        working-directory: apps/web
      - run: npm run build
        working-directory: apps/web
      - run: npm audit --audit-level=high
        working-directory: apps/web

  deploy:
    needs: check
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npx vercel deploy --prod --yes --token "$VERCEL_TOKEN"
        working-directory: apps/web
        env:
          VERCEL_TOKEN: ${{ secrets.VERCEL_TOKEN }}
          VERCEL_ORG_ID: ${{ secrets.VERCEL_ORG_ID }}
          VERCEL_PROJECT_ID: ${{ secrets.VERCEL_PROJECT_ID }}
```

Node 24 is not arbitrary. The backup workflow shipped on Node 20 and died at import with
`Error: Node.js detected but native WebSocket not found` — `supabase-js` needs 22 or newer.
`apps/web/package.json` records `engines: { node: '>=22' }` for exactly this reason.

Existing secrets: `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `BACKUP_EMAIL`,
`BACKUP_PASSWORD`. New ones needed: `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`, and — if
the suites below are ever run in CI — `E2E_EMAIL` and `E2E_PASSWORD`.

## What must NOT run on every push

`npm run e2e` and `npm run security` both **write to the production ledger.** There is one Supabase
project; `E2E_BASE_URL` changes which site the tests drive, not which database they hit. Running
them on every push means test rows appearing in real data all day.

Worse, the security probe creates a real account each run — `sec-probe-<ts>@zoneoffice.ph` — which
survives the run and accumulates while self-serve sign-up stays open.

So:

| Check | When |
|---|---|
| `npm test`, `npm run build`, `npm audit` | Every push. Offline, no side effects |
| `npm run e2e`, `npm run security` | `workflow_dispatch` and a nightly schedule, never on push |
| `npm run smoke` | Same as e2e; it writes too |

A second Supabase project as a test environment would remove this constraint entirely, and is the
right answer if the team grows. It costs a project, not money, on the free plan — but it also means
a second schema to keep in step, which is a real cost. Not proposed, only noted.

## What was built, against what was designed

Two departures from the sketch above, both in `ci.yml`:

- **The deploy step runs from the repository root, not `apps/web`.** The Vercel project's Root
  Directory is already `apps/web`; deploying from inside it would make Vercel look for
  `apps/web/apps/web`. The sketch above has `working-directory: apps/web` on the deploy step and
  that would have failed every build.
- **The push trigger carries `paths-ignore: backups/**`.** The nightly backup commits to `main`,
  and a snapshot must never redeploy production. Its commit message already carries `[skip ci]`,
  which GitHub Actions honours even though Vercel never did; the path filter is the second lock on
  the same door.

The suites that write to the ledger went into a separate `verify.yml` on a 16:00 UTC schedule —
two hours before the backup, so a night's residue is swept before the snapshot is taken — plus
`workflow_dispatch`. It builds first, because the probe's section 7 scans `dist/assets` for a
leaked key.

## Ordering against the audit trail

Build [the audit trail](Audit%20Trail%20Plan.md) first. It captures history that is being lost
every day; CI prevents a category of mistake that has not yet happened, on a repository with one
committer. If only one gets built, it should be the audit trail.

CI also becomes more valuable **after** the audit trail exists, because there will then be more
schema-and-trigger machinery whose breakage a test run would catch.

## Cost

Free. The repository is private, so Actions minutes are metered, but the account is on GitHub Pro
(3,000 minutes a month, confirmed 2026-09-01) and a check-and-deploy run is two to four minutes.
Even at twenty pushes a day this stays inside the allowance.

## What this does not solve

There is one branch and one committer. CI catches a broken build before it reaches production; it
does not review anything, and it is not a substitute for the checks being run by whoever is making
the change. The value here is the day someone pushes tired.

## Guideline Basis

- **PG-02** keeps this a plan: no workflow is documented as runnable until it is checked in.
- **GIT-04** requires a recoverable release path, which is why deployment moves behind a gate.
- **PG-04** names the prerequisite that makes the gate meaningful rather than decorative.
- **SEC-03** is why every credential here is a secret reference and never a value.

implements: [Awesome Guidelines Integration](Awesome%20Guidelines%20Integration.md)

Related: [Audit Trail Plan](Audit%20Trail%20Plan.md) · [Decisions](Decisions.md) · [Handoff](Handoff.md) · [Repository Evidence](Repository%20Evidence.md)
