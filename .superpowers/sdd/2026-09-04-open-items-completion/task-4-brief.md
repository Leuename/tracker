### Task 4: Implement R8 Playwright network preflight and retry policy

**Files:**
- Modify: `apps/web/playwright.config.js`
- Test: existing Playwright suite run with `npx playwright test --workers=1`
- Read: `handoff/2026-09-04 Open Items Brief for Codex.md` §2.5 and N3

**Interfaces:**
- Consumes: configured `baseURL` and the current single-worker Playwright run.
- Produces: a fail-fast preflight that classifies unreachable/slow deployments as `NETWORK_PREFLIGHT_SLOW`, plus CI-only retry policy.

- [ ] **Step 1: Add the smallest preflight helper in the existing config**

  Before tests start, issue three uncached `GET` requests to `baseURL`. Fail with the literal `NETWORK_PREFLIGHT_SLOW` classification when the deployment cannot respond within the existing timeout budget. Do not raise Playwright timeouts.

- [ ] **Step 2: Set retries by environment**

  Set `retries: process.env.CI ? 0 : 1`. CI remains deterministic; local runs get one retry for transient deployment noise.

- [ ] **Step 3: Exercise the failure path**

  Run the preflight against an unreachable/invalid local base URL and assert the process fails with `NETWORK_PREFLIGHT_SLOW` before browser specs start. Do not point any test at production for this negative check.

- [ ] **Step 4: Exercise the success path**

  ```bash
  cd /Users/itadmin/Desktop/puge/apps/web
  npx playwright test --workers=1
  ```

  Expected: 29/29 against the configured deployment, with no timeout inflation and no worker parallelism change.

- [ ] **Step 5: Review and commit the focused source change**

  ```bash
  git diff -- apps/web/playwright.config.js
  git diff --check
  git add apps/web/playwright.config.js
  git commit -m "test: preflight Playwright deployment"
  ```

  Do not push; a push deploys production.

**Checkpoint:** The negative path must fail with the named classification, and the normal path must retain 29/29 single-worker behavior.

---

