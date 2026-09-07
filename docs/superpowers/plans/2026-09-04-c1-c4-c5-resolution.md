# C1, C4, and C5 Resolution Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

> ## Outcome — read this before executing anything below
>
> **The owner answered all three on 2026-09-04, and most of this plan is deliberately not executed.**
>
> | | Answer | What happened |
> |---|---|---|
> | **C1** | **global**, made explicit | Task 3's `global` branch was executed. `apps/web/src/App.jsx:63` and `apps/web/src/store.jsx:67` now pass `{ scope: 'global' }`; both e2e comment blocks were replaced; the existing test order was kept. Recorded as `docs/Decisions.md` D47 |
> | **C4** | **no external channel** | **Tasks 4 and 5 were NOT executed and must not be** without a fresh request. They are kept as the written specification for a design that was costed and declined. Recorded as D48, which also closes D31 |
> | **C5** | **deferred again** | **Task 2 was NOT executed.** D44 stays active and the reminder stands. The procedure below is ready to run the moment the owner asks |
>
> Task 1 is satisfied. Task 6 was executed for the branches that were taken, and only those.
>
> Two corrections were applied to this document after the revision, both verified by running the
> code rather than reading it: the Task 4 test's `assert.throws` assertions were anchored `^Error: `
> (Node matches a RegExp against the error's string representation, so `^TELEGRAM_CONFIG` can never
> match), and Task 5 Step 5 gained the commit step it needed before pushing a branch. Task 4's
> module and test were extracted to a scratch directory and run offline: 3 tests, 3 pass. So the
> unexecuted half is known-good, not merely written.
>
> Task 1 Step 2 and Task 2 Step 5 carry a claim that has since been refined. At 06:57 UTC on
> 2026-09-04 the FX cron had never produced a scheduled run; at 06:59:08Z it produced its first,
> **4 h 59 min late**, succeeding and correctly writing nothing. The conclusion those steps draw is
> unchanged and still right — a scheduled run is a poor rotation signal, so **Task 2 dispatches a
> run instead** — but the reason is the delay, not an absent scheduler.

**Goal:** Close C1, C4, and C5 only after the owner chooses the sign-out scope and notification policy and authorizes a safely verified FX credential rotation.

**Architecture:** Keep each concern independent. C5 is an operator-only credential rotation on the existing Auth user; C1 makes the owner's chosen Supabase scope explicit in both browser sign-out paths and, for local scope, uses the existing two sessions as the e2e proof; C4's Telegram branch adds one small native-`fetch` sender and an explicit `on`/`off` repository variable while leaving recurrence and report generation unchanged. No dependency, migration, new account, or service-role key is needed.

**Tech Stack:** React 18, Supabase Auth, Node.js 22+ built-ins, GitHub Actions, Telegram Bot API, Playwright, `node:test`.

**Spec:** `handoff/2026-09-04 Exchange Rates, R7, and Two Agent Audits.md` §7 and `docs/Remaining Work and Owner Decisions.md` C1/C4/C5.

## Read First

Read these exact repository-relative paths in order before executing any task:

1. `docs/Remaining Work and Owner Decisions.md` — C1/C4/C5.
2. `handoff/2026-09-04 Exchange Rates, R7, and Two Agent Audits.md` — sections 1, 7, 8, and 11.
3. `docs/Decisions.md` — D26, D31, D34, D41, D42, D44, and D45.
4. `apps/web/src/App.jsx` — lines 57–59.
5. `apps/web/src/store.jsx` — line 62.
6. `apps/web/e2e/app.spec.js` — lines 82–142.
7. `apps/web/scripts/schedule.mjs` — lines 29–102.
8. `apps/web/scripts/fx.mjs` — line 204.
9. `.github/workflows/schedule.yml` — the `dry_run` input and job environment.
10. `.github/workflows/fx.yml` — the two cron entries and `dry_run` input.

## Verified Baseline

- FX authorization is tied to UUID `14f0d1af-f37a-4936-b278-e280bcb25129`, whose `public.profiles` row is `viewer`; preserve that identity.
- `.github/workflows/fx.yml` and `.github/workflows/schedule.yml` already define boolean `dry_run` dispatch inputs and map them to `-- --dry-run`.
- `apps/web/scripts/fx.mjs:204` prints the exact success string `fx dry run complete`.
- The Telegram insertion point after the `GITHUB_STEP_SUMMARY` append has `overdue`, `unliquidated`, `today`, and `dryRun` in scope.
- Do not send the existing `lines` array; it contains company, description, due-date, and per-row amount data.
- Only `.github/workflows/schedule.yml` runs `npm run schedule`; a hard scheduler failure cannot break `ci.yml` or `verify.yml`.
- `AGENTS.md` and `CLAUDE.md` are byte-identical and currently say thirteen repository secrets; the two Telegram secrets make fifteen.
- `apps/web/e2e/app.spec.js` changes Auth sessions but writes no ledger rows.
- The checked-in Node floor is sufficient for `node --env-file=... --input-type=module -e "..."`; Node 24.18.1 was verified during the audit.

## Global Constraints

- Do not execute this plan until the owner explicitly chooses C1 `global` or `local`, chooses C4 Telegram and its recipient/data-processing boundary or explicitly chooses no channel, and authorizes or declines C5 rotation.
- Preserve the existing FX Auth user, email, UUID, `profiles.role = 'viewer'`, and UID-scoped `fx_rates` policies.
- Never print, log, commit, screenshot, pass as a command argument, or paste any credential into chat.
- Never introduce a `service_role` key; use the Supabase Dashboard to update the existing Auth user.
- Send Telegram only aggregate data: date, overdue count and total, and awaiting-liquidation count. Send no company, beneficiary, description, due date, or row-level amount.
- Keep the existing GitHub job summary. Telegram delivery failure must fail the workflow; it must not undo generated payables.
- Keep `workers: 1`; shared-ledger serialization remains required even if C1 stops requiring refresh-before-sign-out ordering.
- C1 covers both browser sign-out paths: `apps/web/src/App.jsx:58` and `apps/web/src/store.jsx:62`. Do not normalize the separate Node-script callers in backup, smoke, schedule, or security; they have different process lifecycles.
- `AGENTS.md` and `CLAUDE.md` must remain byte-identical.
- Do not push, tag, or deploy unless separately requested. A push to `main` deploys production.

---

### Task 1: Lock the three owner decisions and preflight external access

**Files:**
- Read: `docs/Remaining Work and Owner Decisions.md`
- Read: `.github/workflows/fx.yml`
- Read: `.github/workflows/schedule.yml`

**Interfaces:**
- Consumes: the owner's explicit answers for C1, C4, and C5.
- Produces: an approved maintenance window and named Telegram recipient; no repository change.

- [ ] **Step 1: Record the decision package before acting**

Present the alternatives without a preselected answer and record exactly what the owner chooses:

```text
C1 — choose one:
  global: Sign out revokes every refresh-token session for the account.
  local: Sign out ends only the current browser session. A lost phone can no
         longer be revoked from the laptop, so a password reset becomes the
         only lever.
C4 — choose one:
  Telegram: one dedicated bot, one private owner chat, aggregate-only alerts.
  none: GitHub summaries and workflow-failure notifications remain the accepted channels.
C5 — choose one:
  rotate now: preserve the existing Auth user and UUID.
  defer: leave D44 active and record no closure.
```

If C1 is `global`, use Task 3's explicit-global branch and keep the existing e2e order. If C4 is `none`, skip Tasks 4–5 and record that choice. If C5 is deferred, skip Task 2 and leave D44 active.

- [ ] **Step 2: Choose a maintenance window outside the FX schedules**

Avoid 02:00 and 08:00 UTC. Confirm no FX run is active or queued:

```bash
gh run list --repo Leuename/tracker --workflow fx.yml --limit 10
```

Record only the existing account UUID, viewer role, latest `fx_rates` date/count, and last successful FX run. Do not record the password.

The 2026-09-04 live audit found that `.github/workflows/fx.yml` had never produced a scheduled run: its only history was one `workflow_dispatch` run at `2026-09-03T14:52:01Z`. **Two minutes after that reading it produced one** — `2026-09-04T06:59:08Z`, 4 h 59 min after its 02:00 UTC slot, succeeding and correctly writing nothing because the ECB fix was already stored. So the scheduler works; GitHub is queuing this repository's runs 2.5 to 5 hours late. That is an explicitly out-of-scope automation concern, not C5 rotation evidence. Tell the owner about the delay, because both FX slots exist to land before ECB publication at ~14:00 UTC and the real margin is about an hour. Never interpret a late or absent cron run as a failed password rotation.

The separate cron concern is about latency, not absence. This command shows the `schedule` events and how far each ran behind its slot:

```bash
gh run list --repo Leuename/tracker --workflow fx.yml --json event,createdAt,status,conclusion
```

- [ ] **Step 3: Confirm all required control-plane access before mutation**

Confirm access to:

```text
Supabase project jusifpditdigqdjiwdaj → Authentication → Users
GitHub Leuename/tracker → Settings → Secrets and variables → Actions
apps/web/.env.local through a local editor
Telegram BotFather and the intended recipient's private chat
```

Stop only the branch whose required surface is unavailable; do not let unavailable Telegram access block an authorized C5 rotation, or vice versa.

---

### Task 2: Rotate C5 on the existing FX Auth user

**Files:**
- Modify locally, never commit: `apps/web/.env.local`
- Verify: `apps/web/scripts/fx.mjs`
- Verify: `.github/workflows/fx.yml`
- Modify after verification: `docs/Decisions.md`

**Interfaces:**
- Consumes: existing Auth user UUID `14f0d1af-f37a-4936-b278-e280bcb25129`, GitHub secret `FX_PASSWORD`, local variable `FX_PASSWORD`.
- Produces: the same identity and authorization with a new secret known only to the owner-controlled password manager, Supabase, GitHub, and `.env.local`.

- [ ] **Step 1: Generate and retain one replacement secret safely**

Generate a unique 32+ character URL-safe password in a password manager. Do not use a shell command, clipboard history, temporary plaintext file, repository patch, or chat message.

- [ ] **Step 2: Change only the existing Supabase Auth user's password**

In the Supabase Dashboard, update the password for the existing production Auth user. Do not delete/recreate it and do not change its email, UUID, metadata, or profile role. The Admin API alternative is intentionally excluded because it requires a server-side `service_role` key that this repository does not hold.

- [ ] **Step 3: Propagate immediately to GitHub and local configuration**

Update GitHub interactively so the value is not placed on the command line:

```bash
gh secret set FX_PASSWORD --repo Leuename/tracker
```

Then use a local editor to replace only `FX_PASSWORD=` in `apps/web/.env.local`. Do not use `apply_patch`, `sed`, shell history, or a temporary file for the secret.

- [ ] **Step 4: Verify the local and GitHub paths independently**

From `apps/web`, verify the local credential without writing rates:

```bash
npm run fx -- --dry-run
```

Require successful authentication/read and `fx dry run complete`. Then verify the GitHub secret path:

```bash
gh workflow run fx.yml --repo Leuename/tracker --ref main -f dry_run=true
gh run list --repo Leuename/tracker --workflow fx.yml --limit 3
```

Watch the new run and require green. A local pass does not prove the GitHub secret, and a queued workflow reads repository secrets at queue time.

- [ ] **Step 5: Verify revocation, preserved identity, and the non-dry GitHub path**

In a clean private browser, attempt the obsolete password once and require rejection. Confirm the user UUID and viewer role are unchanged. Confirm `git status --short` does not list `.env.local` and review command/workflow output for accidental disclosure.

Dispatch a non-dry run instead of waiting for the unproven cron:

```bash
gh workflow run fx.yml --repo Leuename/tracker --ref main -f dry_run=false
gh run list --repo Leuename/tracker --workflow fx.yml --limit 3
```

Require the newly dispatched run to finish green. If rates changed, require `fx.mjs`'s existing readback to confirm the write; if unchanged, require the existing idempotent no-write result. A missing or failed dispatched run fails C5 closure. It says nothing about the separate, still-open cron prerequisite recorded in Task 1.

Treat the rotation as fully settled only after the project's configured access-token lifetime has passed, because an already-issued access JWT can remain valid until expiry. Do not wait for a scheduled workflow run as rotation evidence.

- [ ] **Step 6: Use safe rollback rules**

```text
Supabase update fails → stop; change neither GitHub nor local state.
GitHub/local propagation fails → keep the new Supabase password and retry propagation.
New password is lost → reset the same Auth user to another new strong password.
UUID changes → stop the FX workflow; do not edit policies until identity is reconciled.
Never restore the obsolete weak password.
```

---

### Task 3: Make the owner's C1 scope explicit in both browser paths

**Files:**
- Modify: `apps/web/src/App.jsx:57-59`
- Modify: `apps/web/src/store.jsx:57-63`
- Modify/Test: `apps/web/e2e/app.spec.js:82-142`
- Modify: `docs/Decisions.md` D41

**Interfaces:**
- Consumes: the existing independent `SHARED_STATE` and `REFRESH_STATE` sessions from `e2e/auth.setup.js`.
- Produces: explicit, consistent browser sign-out semantics; for local scope, current-browser logout plus a forced refresh in the other session.

- [ ] **Step 1: Select the owner's branch and its exact caller edits**

Do not edit either caller yet if the owner chose `local`; Step 3 needs the old global behavior for its red check. For a `global` decision, Step 4 will make the existing behavior explicit in both browser callers:

```jsx
// apps/web/src/App.jsx
onClick={() => supabase.auth.signOut({ scope: 'global' })}>

// apps/web/src/store.jsx
if (e.sessionExpired) { supabase.auth.signOut({ scope: 'global' }); return }
```

Keep the current refresh-before-sign-out order. Revise both e2e comment blocks at `apps/web/e2e/app.spec.js:82-94` and `apps/web/e2e/app.spec.js:125-130` so they say the scope is explicit rather than a library default. Do not use the local-branch reorder below.

Replace `apps/web/e2e/app.spec.js:82-94` with:

```js
// This isolated REFRESH_STATE runs before the global sign-out test for two
// reasons. Forcing a refresh rotates this state's token, so no later test may
// reuse the saved file. The later explicit global sign-out revokes every
// refresh token for the account, so this forced refresh must happen first.
```

Replace `apps/web/e2e/app.spec.js:125-130` with:

```js
// Last in this file on purpose: the app's explicit global sign-out revokes
// every refresh token for the account, including both saved test sessions.
// Nothing after it may force a refresh. Later specs survive only on access
// tokens minted by setup and will fail if they outlive the token's one hour.
```

For a `local` decision, Step 4 will change both browser callers instead:

```jsx
// apps/web/src/App.jsx
onClick={() => supabase.auth.signOut({ scope: 'local' })}>

// apps/web/src/store.jsx
if (e.sessionExpired) { supabase.auth.signOut({ scope: 'local' }); return }
```

The session-expiry path has low practical global impact because the failed session has no usable refresh token left, but it is the same browser and user behavior. Keeping one explicit scope in both places avoids two accidental policies.

- [ ] **Step 2: For local scope, replace both e2e comment blocks and reorder the existing cases**

Move `the session survives a reload, and signing out ends it` before the `token refresh` describe block. Keep the sign-out test on the default `SHARED_STATE` and keep the refresh test on `REFRESH_STATE`.

Replace the old `apps/web/e2e/app.spec.js:125-130` “Last in this file” block with this block immediately before the moved sign-out test:

```js
// First of the two session-mutating checks on purpose. This test uses the
// default SHARED_STATE. Local sign-out still revokes that session's refresh
// token, so later specs using SHARED_STATE survive only while its access JWT
// remains valid. If the suite grows past the token's one-hour lifetime, or a
// later spec forces a refresh, give this sign-out spec a third isolated state.
// The next test uses REFRESH_STATE and proves this logout spared other sessions.
```

Replace the entire old `apps/web/e2e/app.spec.js:82-94` “ordered ahead of the sign-out spec” block with this block immediately before `test.describe('token refresh', ...)`:

```js
// This independently saved REFRESH_STATE runs after the SHARED_STATE logout
// above and forces a real refresh-token exchange. It passes only if local
// sign-out spared the account's other sessions. The refresh rotates this
// state's token, so no later test may reuse the saved REFRESH_STATE file.
```

This ordering deliberately leaves one narrower dependency: the remaining 25+ specs reuse the revoked `SHARED_STATE` refresh token and currently finish on its still-valid access JWT. If the suite ever exceeds the access-token lifetime, or a later spec forces refresh, those specs fail even though local sign-out itself is correct. The upgrade trigger and fix are explicit: add a third sign-out-only storage state when either condition appears.

- [ ] **Step 3: For local scope, run the focused red check before changing the two callers**

```bash
cd apps/web
npx playwright test e2e/app.spec.js --workers=1
```

Expected before the app change: the later forced-refresh test fails because global sign-out revoked `REFRESH_STATE`.

- [ ] **Step 4: Apply the two exact caller edits from the chosen branch**

Edit both `apps/web/src/App.jsx:58` and `apps/web/src/store.jsx:62` to use the same explicit `global` or `local` snippet selected in Step 1. Do not change the Node-script callers.

- [ ] **Step 5: Run the chosen branch's focused checks**

```bash
cd apps/web
npx playwright test e2e/app.spec.js --workers=1
npm run build
```

For local scope, expected: the current browser is signed out after reload and the independent `REFRESH_STATE` completes a forced refresh afterward. For global scope, expected: the existing refresh-before-sign-out sequence remains green.

Then run the static consistency check. It fails if either same-browser caller is still bare or carries the other scope:

```bash
rg -n "auth\.signOut\(" apps/web/src/App.jsx apps/web/src/store.jsx
```

Require both matches to contain the owner's chosen explicit scope. Do not add a logout wrapper for two one-line calls.

For the local branch, also fail review if either contradicting old comment survives:

```bash
if rg -n "ordered ahead of the sign-out spec|sign-out spec below|Last in this file on purpose" apps/web/e2e/app.spec.js; then exit 1; fi
```

---

### Task 4: Add a tested Telegram transport for C4

**Files:**
- Create: `apps/web/scripts/telegram.mjs`
- Create/Test: `apps/web/scripts/telegram.test.js`
- Modify: `apps/web/package.json:11`

**Interfaces:**
- Consumes: `TELEGRAM_NOTIFICATIONS`, `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`, a plain-text message, and optional injected environment/`fetchImpl` values for offline tests.
- Produces: `telegramConfig(env): { enabled, token, chatId }` and `sendTelegram(text, options): Promise<void>` with token-safe classified failures.

- [ ] **Step 1: Write the offline configuration and transport failure checks**

```js
import assert from 'node:assert/strict'
import test from 'node:test'
import {
  CONFIG,
  TIMEOUT,
  UNREACHABLE,
  sendTelegram,
  telegramConfig,
} from './telegram.mjs'

const throws = (error) => async () => { throw error }

test('telegramConfig has an explicit off switch and rejects partial configuration', () => {
  assert.equal(telegramConfig({}).enabled, false)
  assert.equal(telegramConfig({ GITHUB_ACTIONS: 'true', TELEGRAM_NOTIFICATIONS: 'off' }).enabled, false)
  assert.throws(() => telegramConfig({ GITHUB_ACTIONS: 'true' }), new RegExp('^Error: ' + CONFIG))
  assert.throws(() => telegramConfig({
    TELEGRAM_NOTIFICATIONS: 'off',
    TELEGRAM_BOT_TOKEN: 'test-token',
  }), new RegExp('^Error: ' + CONFIG))
  assert.throws(() => telegramConfig({
    TELEGRAM_NOTIFICATIONS: 'on',
  }), new RegExp('^Error: ' + CONFIG))
})

test('sendTelegram accepts only HTTP and Telegram success', async () => {
  const calls = []
  await sendTelegram('test', {
    token: 'test-token',
    chatId: '123',
    fetchImpl: async (url, options) => {
      calls.push({ url, options })
      return { ok: true, status: 200, json: async () => ({ ok: true }) }
    },
  })
  assert.equal(calls.length, 1)
  assert.equal(JSON.parse(calls[0].options.body).text, 'test')

  await assert.rejects(sendTelegram('test', {
    token: 'test-token', chatId: '123',
    fetchImpl: async () => ({ ok: false, status: 503 }),
  }), /HTTP 503/)

  await assert.rejects(sendTelegram('test', {
    token: 'test-token', chatId: '123',
    fetchImpl: async () => ({ ok: true, status: 200, json: async () => ({ ok: false, description: 'chat not found' }) }),
  }), /chat not found/)
})

test('sendTelegram classifies failures without echoing the token-bearing URL', async () => {
  let called = false
  await assert.rejects(sendTelegram('test', {
    token: 'unit-fixture',
    chatId: '',
    fetchImpl: async () => { called = true },
  }), (error) => {
    assert.match(error.message, new RegExp('^' + CONFIG))
    assert.doesNotMatch(error.message, /unit-fixture/)
    return true
  })
  assert.equal(called, false, 'missing configuration must fail before fetch')

  for (const transportError of [
    new Error('ECONNREFUSED at token-bearing URL'),
    new TypeError('ENOTFOUND at token-bearing URL'),
  ]) {
    await assert.rejects(sendTelegram('test', {
      token: 'test-token', chatId: '123',
      fetchImpl: throws(transportError),
    }), (error) => {
      assert.match(error.message, new RegExp('^' + UNREACHABLE))
      assert.doesNotMatch(error.message, /test-token|token-bearing URL/)
      return true
    })
  }

  const timeout = Object.assign(new Error('timed out at token-bearing URL'), { name: 'TimeoutError' })
  await assert.rejects(sendTelegram('test', {
    token: 'test-token', chatId: '123',
    fetchImpl: throws(timeout),
  }), (error) => {
    assert.match(error.message, new RegExp('^' + TIMEOUT))
    assert.doesNotMatch(error.message, /test-token|token-bearing URL/)
    return true
  })
})
```

Add `scripts/telegram.test.js` to the explicit `npm test` command in `package.json`.

`assert.throws(fn, regexp)` tests the regexp against the error's **string
representation** — `Error: TELEGRAM_CONFIG: …` — not against `error.message`. An
anchored `^TELEGRAM_CONFIG` therefore never matches, and every one of these
assertions would fail against a correct implementation. Verified by running it.
Keep the `^Error: ` prefix here, or switch to the validation-function form used
in the third test, which asserts on `error.message` directly. Do not "simplify"
the anchor away.


- [ ] **Step 2: Run the test and require failure because the module is absent**

```bash
cd apps/web
node --test scripts/telegram.test.js
```

Expected: FAIL with module-not-found for `scripts/telegram.mjs`.

- [ ] **Step 3: Implement explicit configuration and classified native transport failures**

```js
export const CONFIG = 'TELEGRAM_CONFIG'
export const TIMEOUT = 'TELEGRAM_TIMEOUT'
export const UNREACHABLE = 'TELEGRAM_UNREACHABLE'

export function telegramConfig(env = process.env) {
  const mode = env.TELEGRAM_NOTIFICATIONS || (env.GITHUB_ACTIONS ? '' : 'off')
  const token = env.TELEGRAM_BOT_TOKEN
  const chatId = env.TELEGRAM_CHAT_ID

  if (!['on', 'off'].includes(mode)) {
    throw new Error(`${CONFIG}: set TELEGRAM_NOTIFICATIONS to on or off.`)
  }
  if (!!token !== !!chatId) {
    throw new Error(`${CONFIG}: set both TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID, or neither.`)
  }
  if (mode === 'on' && !token) {
    throw new Error(`${CONFIG}: notifications are on but Telegram credentials are missing.`)
  }
  return { enabled: mode === 'on', token, chatId }
}

export async function sendTelegram(text, {
  token = process.env.TELEGRAM_BOT_TOKEN,
  chatId = process.env.TELEGRAM_CHAT_ID,
  fetchImpl = fetch,
} = {}) {
  if (!token || !chatId) throw new Error(`${CONFIG}: set TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID.`)

  let response
  try {
    response = await fetchImpl(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text }),
      signal: AbortSignal.timeout(20_000),
    })
  } catch (error) {
    // Do not include the cause: Telegram puts the bot token in the URL path,
    // and some runtimes repeat that URL in the thrown error.
    throw new Error(error && error.name === 'TimeoutError'
      ? `${TIMEOUT}: Telegram did not answer within 20000 ms.`
      : `${UNREACHABLE}: Telegram could not be reached.`)
  }

  if (!response.ok) throw new Error(`Telegram answered HTTP ${response.status}.`)
  const result = await response.json()
  if (!result.ok) throw new Error(`Telegram rejected the message: ${result.description || 'unknown error'}`)
}
```

This mirrors `apps/web/e2e/network-preflight.js`: `TimeoutError` is distinct from other transport failures such as DNS or refused connections, while the original cause is deliberately discarded so a token-bearing URL cannot reach logs. Do not log the request URL. Omit `parse_mode`; plain text avoids escaping user-controlled Markdown.

- [ ] **Step 4: Run the focused and full offline checks**

```bash
node --test scripts/telegram.test.js
npm test
```

Expected: PASS. No network call occurs because the test injects `fetchImpl`.

The negative checks must fail if missing configuration reaches `fetchImpl` or repeats the supplied token fixture, a timeout is reported as unreachable, a throwing transport is reported as timeout, either transport error repeats the test token/cause, an HTTP `503` passes, or Telegram returns JSON `{ ok: false }` without rejection.

---

### Task 5: Connect aggregate-only Telegram alerts to the scheduler

**Files:**
- Modify: `apps/web/scripts/schedule.mjs:29-102`
- Modify: `.github/workflows/schedule.yml:54-62`
- Modify: `apps/web/.env.example:8-24`
- Modify: `apps/web/README.md:31,54-66,258-262`

**Interfaces:**
- Consumes: Task 4's `telegramConfig` and `sendTelegram`, existing `overdue` and `unliquidated` arrays, repository variable `TELEGRAM_NOTIFICATIONS`, and repository secrets `TELEGRAM_BOT_TOKEN` and `TELEGRAM_CHAT_ID`.
- Produces: one aggregate-only alert when action is required; a manual dry run always sends an aggregate report when enabled so the complete GitHub path can be tested; `off` disables delivery without a code revert.

- [ ] **Step 1: Use the tested explicit on/off configuration**

Import both Task 4 helpers and resolve the mode once:

```js
import { sendTelegram, telegramConfig } from './telegram.mjs'

const telegram = telegramConfig()
```

An ordinary local run defaults to `off`. GitHub Actions must receive an explicit `on` or `off` repository variable; a missing/invalid mode fails. `off` succeeds with both Telegram secrets absent, so it is the kill switch. Exactly one missing secret fails in either mode, and `on` with both missing fails.

- [ ] **Step 2: Keep the private job summary, then send only aggregates**

After appending `GITHUB_STEP_SUMMARY`, add:

```js
if (telegram.enabled && (dryRun || overdue.length || unliquidated.length)) {
  await sendTelegram([
    `Tracker ${dryRun ? 'dry-run report' : 'alert'} — ${today}`,
    `${overdue.length} overdue payable(s), ₱${overdue.reduce((sum, row) => sum + Number(row.amount || 0), 0).toLocaleString('en-PH')} total.`,
    `${unliquidated.length} released receipt(s) awaiting liquidation.`,
    'Open the tracker for details.',
  ].join('\n'), { token: telegram.token, chatId: telegram.chatId })
}
```

Do not pass the existing `lines` array. It contains company, beneficiary, description, due-date, and per-row amount data. Let a thrown Telegram error fail the process and turn the workflow red; do not catch it as success.

- [ ] **Step 3: Wire secret names, not values**

Map one repository variable and two repository secrets in `.github/workflows/schedule.yml`:

```yaml
          TELEGRAM_NOTIFICATIONS: ${{ vars.TELEGRAM_NOTIFICATIONS }}
          TELEGRAM_BOT_TOKEN: ${{ secrets.TELEGRAM_BOT_TOKEN }}
          TELEGRAM_CHAT_ID: ${{ secrets.TELEGRAM_CHAT_ID }}
```

Add the explicit local default and empty secret names to `.env.example`, and document the same switch in `apps/web/README.md`. Never use a `VITE_` prefix.

```dotenv
TELEGRAM_NOTIFICATIONS=off
TELEGRAM_BOT_TOKEN=
TELEGRAM_CHAT_ID=
```

In GitHub Settings, create the Actions repository variable `TELEGRAM_NOTIFICATIONS` with value `on`. Turning the notifier off later means changing that variable to `off`; after that, both Telegram secrets may be removed without making the scheduler fail. Removing only one secret remains a configuration error.

- [ ] **Step 4: Provision and prove the channel before ledger output uses it**

Create one dedicated bot through BotFather and have the intended owner initiate one private chat. After placing both values in `.env.local` through an editor, send one fixed message through the tested helper without ledger data:

```bash
cd apps/web
node --env-file=.env.local --input-type=module -e "const { sendTelegram } = await import('./scripts/telegram.mjs'); await sendTelegram('Scheduler notification test — no ledger data')"
```

Confirm the bot identity and exact recipient, then install `TELEGRAM_BOT_TOKEN` and `TELEGRAM_CHAT_ID` as repository secrets and confirm the `TELEGRAM_NOTIFICATIONS` repository variable is `on`. Never put the token in a browser URL or command argument.

- [ ] **Step 5: Verify the complete workflow path without ledger writes**

GitHub can run only the workflow revision present on a remote ref, and only a
**committed** revision can be pushed. No earlier task commits anything, so commit
the work locally first — on a branch, never on `main`:

```bash
git switch -c c1-c4-c5-resolution
git add -A -- ':!apps/web/.env.local'
git commit
```

Confirm `.env.local` is absent from the commit before continuing:

```bash
git show --stat --name-only HEAD | grep -q '\.env\.local' && exit 1
```

After separate authorization to push a non-production branch, publish it without merging:

```bash
git push origin HEAD:refs/heads/c1-c4-c5-resolution
```

Then dispatch that exact revision:

```bash
gh workflow run schedule.yml --repo Leuename/tracker --ref c1-c4-c5-resolution -f dry_run=true
gh run list --repo Leuename/tracker --workflow schedule.yml --limit 3
```

Require: zero ledger writes, the existing GitHub summary, one aggregate-only Telegram message to the intended private chat, no row details, and a green run. Then run:

```bash
cd apps/web
npm test
npm run build
```

Exercise the kill switch without deleting credentials: set the repository variable to `off`, dispatch the same dry run, and require a green scheduler run with its GitHub summary and no Telegram message. Restore the variable to the owner-approved `on` state afterward. The offline Task 4 tests are the negative proof that `off` also succeeds with both secrets absent and that exactly one missing secret fails loudly.

---

### Task 6: Record closure and perform final verification

**Files:**
- Modify: `docs/Decisions.md`
- Modify: `docs/Remaining Work and Owner Decisions.md`
- Modify: `docs/Repository Evidence.md`
- Modify: `docs/AI Agent Context.md`
- Modify: `handoff/2026-09-04 Exchange Rates, R7, and Two Agent Audits.md`
- Modify together: `AGENTS.md`, `CLAUDE.md`

**Interfaces:**
- Consumes: verified results from Tasks 2–5.
- Produces: current evidence and decisions with C1/C4/C5 closed and one complete resume prompt.

- [ ] **Step 1: Record decisions separately from evidence**

Append decision entries only for choices the owner actually approved. Use the title matching the chosen branch:

```text
D47 — Browser Sign-Out Is Explicitly Global
or
D47 — Browser Sign-Out Is Local

D48 — Scheduler Alerts Use One Private Telegram Chat and Aggregate Data Only
or
D48 — The Scheduler Has No External Notification Channel by Owner Decision

D49 — The Existing FX Account Credential Was Rotated Without Changing Identity
```

Do not add D49 when rotation remains deferred. Do not describe a skipped Telegram or C1 branch as implemented.

Record observed test/run results in `docs/Repository Evidence.md`; never record secret values, bot tokens, private chat identifiers, or the replacement password.

- [ ] **Step 2: Retire the open-item wording everywhere current**

Mark only the owner-approved, implemented, and verified C1/C4/C5 branches resolved in `docs/Remaining Work and Owner Decisions.md`; leave every deferred branch open. Update `docs/AI Agent Context.md` and the current handoff's frontmatter, state table, open-items section, decisions, and single `## Resume prompt`. Correct the old C1 statement that one existing e2e assertion needed changing: for local scope, the proof is the reordered sign-out followed by the independent forced refresh.

Update `AGENTS.md` and `CLAUDE.md` together so the schedule command names Telegram requirements and the repository-secret count reflects the two additions. Confirm equality:

```bash
cmp -s AGENTS.md CLAUDE.md
```

Update documented offline/e2e totals only to the numbers produced by the completed runs; do not guess the new count after adding `telegram.test.js`.

- [ ] **Step 3: Run the final local and live checks proportionately**

```bash
cd apps/web
npm test
npm run build
npm audit
npx playwright test e2e/app.spec.js --workers=1
```

Run `npm run security` only with explicit awareness that it probes production and does not verify the FX password rotation. The FX local dry run, FX workflow dry run, obsolete-password rejection, and explicitly dispatched non-dry FX run are the C5 evidence; the schedule workflow dry run, received aggregate message, and explicit-off dry run are the C4 evidence. The absent FX cron remains a separate unresolved automation prerequisite.

- [ ] **Step 4: Review the exact change set**

```bash
git diff --check
git status --short
git diff -- AGENTS.md CLAUDE.md apps/web/src/App.jsx apps/web/src/store.jsx apps/web/e2e/app.spec.js apps/web/scripts/telegram.mjs apps/web/scripts/telegram.test.js apps/web/scripts/schedule.mjs apps/web/package.json apps/web/.env.example apps/web/README.md .github/workflows/schedule.yml docs/Decisions.md docs/Remaining\ Work\ and\ Owner\ Decisions.md docs/Repository\ Evidence.md docs/AI\ Agent\ Context.md handoff/2026-09-04\ Exchange\ Rates,\ R7,\ and\ Two\ Agent\ Audits.md
```

Require no credential value, unrelated file, migration, generated artifact, or `.env.local` in the diff. Do not push or tag without a separate instruction.

## External References

- [Supabase sign-out scopes](https://supabase.com/docs/guides/auth/signout)
- [Supabase update user by ID](https://supabase.com/docs/reference/javascript/auth-admin-updateuserbyid)
- [Supabase sessions](https://supabase.com/docs/guides/auth/sessions)
- [GitHub Actions secrets](https://docs.github.com/en/actions/how-tos/write-workflows/choose-what-workflows-do/use-secrets)
- [Telegram Bot API `sendMessage`](https://core.telegram.org/bots/api#sendmessage)
- [Telegram bot security](https://core.telegram.org/bots/features)
