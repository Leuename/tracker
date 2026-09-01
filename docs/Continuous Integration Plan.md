---
title: Continuous Integration Plan
tags: [plan, ci, github-actions, vercel, deployment, deferred]
created: 2026-09-01
status: planned
related:
  - "[Audit Trail Plan](Audit%20Trail%20Plan.md) — build that first; it is the higher-value held-back"
  - "[Decisions](Decisions.md) — D19 fixes the release convention this would automate around"
  - "[Repository Evidence](Repository%20Evidence.md) — the factual baseline"
up: "[AI Agent Context](AI%20Agent%20Context.md)"
---

# Continuous Integration Plan

**Not built.** A push to `main` still deploys to production unchecked.

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

## Design: take deployment away from Vercel's git integration

The only arrangement that actually gates production:

1. **Turn off Vercel's automatic git deployments** for `main` (Project → Settings → Git).
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
