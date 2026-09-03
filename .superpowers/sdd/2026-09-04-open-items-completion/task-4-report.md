# Task 4 report — Playwright network preflight and retry policy

## Implemented

- Added `apps/web/e2e/network-preflight.js` as Playwright `globalSetup`.
- Before browser projects start, it issues three unique, uncached `GET` requests to the configured `baseURL` in parallel.
- Network and timeout failures are classified with the literal `NETWORK_PREFLIGHT_SLOW` error prefix.
- Each request uses the existing 30-second request budget; no Playwright timeout was increased.
- Set `retries: process.env.CI ? 0 : 1`.
- Preserved `workers: 1`, `fullyParallel: false`, and the existing web-server timeout.

## Verification

1. Direct helper success/failure assertions passed:
   - success made exactly three unique requests with `cache: 'no-store'`;
   - unreachable URL rejected with `NETWORK_PREFLIGHT_SLOW`.
2. Real negative Playwright path:

   ```text
   E2E_BASE_URL=http://127.0.0.1:1 npx playwright test --workers=1
   exit=1
   Error: NETWORK_PREFLIGHT_SLOW: fetch failed
   ```

   No browser specs started (the output contained no `Running ... tests` line).
3. Required success path:

   ```text
   npx playwright test --workers=1
   29 passed (1.5m)
   ```

4. `git diff --check` passed.

## Scope

Changed only `apps/web/playwright.config.js` and the focused preflight support module. No production deployment was pushed.
