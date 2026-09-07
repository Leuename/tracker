# C5 to C7 Resolution Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close C5, C6, and C7 without changing the FX account identity, moving deliberate cron slots, or silently rewriting owner data.

**Architecture:** Treat the three items as independent gates. C5 is an owner-operated rotation of one existing Auth user; C6 adds one fail-closed date check to the existing FX script; C7 adds app-side release stamping for usable feedback, repairs the three existing rows only after the owner chooses their historical date, then makes the invariant universal with a Postgres check constraint.

**Tech Stack:** React 18, Supabase Auth/Postgres/RLS, Node.js 22+ built-ins, GitHub Actions, `node:test`.

**Spec:** `handoff/2026-09-04 Owner Decision Brief, C5 to C7.md`

## Global Constraints

- Each branch is independent: start C5, C6, the C7 backfill, C7 automatic stamping, or the C7 database constraint only after the owner explicitly authorizes that branch. Deferring one does not block another.
- Production is the only environment. Do not run `npm run e2e`, `npm run smoke`, `npm run security`, or Playwright.
- Safe offline checks are `npm test`, `npm run build`, and `npm audit`.
- Do not push, tag, deploy, rotate a credential, write ledger data, change a cron, or commit without separate authorization.
- Preserve FX Auth user UUID `14f0d1af-f37a-4936-b278-e280bcb25129`, email, metadata, and `profiles.role = 'viewer'`.
- Never expose a password, token, chat id, or connection string in a command argument, patch, note, log, screenshot, or report.
- Do not add a `service_role` key, widen `fx_rates` grants, use `.upsert()`, edit an applied migration, or copy the UID-specific FX policy to another table.
- Never touch project `lasycakyudaawrydetnm`; production is `jusifpditdigqdjiwdaj` and scratch is `bucmcnsjkuprpojhequy`.
- Preserve all unrelated dirty-tree changes. `AGENTS.md` and `CLAUDE.md` need no change for this work.

## Verified Baseline

- After `git fetch origin`, local `HEAD` is `010294c`, `origin/main` is `f39de07`, and `HEAD..origin/main` contains `f39de07 Back up the workspace [skip ci]`.
- The tree has 15 modified files and 4 untracked files before this plan; integrate remote state only after the owner chooses how to preserve that work.
- `.github/workflows/fx.yml:31-32` declares 02:00 and 08:00 UTC; do not move either slot.
- `apps/web/scripts/fx.mjs:65-82` fetches `/v1/latest` and accepts the returned date without checking that it predates the current UTC day.
- `apps/web/src/actions.js:426-430` centralizes currency/rate field patches, but `apps/web/src/actions.js:460-464` persists inline status changes directly.
- `apps/web/src/actions.js:437-456` and `apps/web/src/actions.js:484-501` persist add/edit forms with whatever rate is present.
- `apps/web/src/logic.js:274-279` makes an unpriced released transfer follow the moving feed.
- `apps/web/src/logic.test.js:213-263` tests valuation precedence but not automatic release stamping.
- Live database counts and run history in the brief were not re-read while writing this offline plan; they are mandatory preflight readings, not assumed invariants.

---

### Task 1: Freeze a Fresh Baseline and Record the Owner Decisions

**Files:**
- Read: `handoff/2026-09-04 Owner Decision Brief, C5 to C7.md`
- Read: `docs/Remaining Work and Owner Decisions.md`
- Read: `docs/Decisions.md`

**Interfaces:**
- Consumes: current Git/database/workflow state and five explicit owner answers.
- Produces: an approved maintenance window and immutable before-state; no mutation.

- [ ] **Step 1: Refresh Git and stop on unexpected overlap**

Run from the repository root:

```bash
git fetch origin
git rev-parse --short HEAD
git rev-parse --short origin/main
git status --short
git log HEAD..origin/main --oneline
git diff -- apps/web/scripts/fx.mjs apps/web/src/actions.js apps/web/src/logic.js apps/web/src/logic.test.js
```

Expected before work: the first four app paths have no local diff. If any does, revise this plan around the owner's changes instead of overwriting them. Do not rebase, merge, commit, or push.

- [ ] **Step 2: Re-read the live baseline without writing**

Using the existing approved read-only route, run the exact aggregate SQL in the brief's section 1 and record only counts, totals, hashes, dates, UUIDs, and roles. Require `audit_rows = audit_max_id`; require the C7 predicate to still identify exactly three released rows whose ids are `1788313757081`, `1788318165685`, and `1788318201948` and whose rates are null. A different result stops the backfill branch and requires a new owner review.

Immediately refresh scheduled run history:

```bash
gh run list --repo Leuename/tracker --workflow fx.yml --json event,createdAt,status,conclusion
gh run list --repo Leuename/tracker --workflow backup.yml --json event,createdAt,status,conclusion
```

This is observation only. Do not infer “never ran” from an absent run.

- [ ] **Step 3: Record the three independent decisions**

Require explicit answers to:

```text
C5: rotate the existing FX user's password now, or defer?
C6: add the fail-closed T+0 guard now, or accept the current queue risk?
C7 backfill: use the 2026-09-03 fix that was knowable/displayed at release,
             use the later 2026-09-04 same-day fix, or leave the rows unchanged?
C7 future rule: on the first transition to Released, stamp the current feed
                rate/date and keep manual correction available, or leave manual-only?
C7 database rule: after backfill, require every released row to have a positive
                  rate and rate date at the Postgres boundary, or keep app-only enforcement?
```

Recommended C7 choice: use `2026-09-03` for the three historical rows, because that was the published feed the owner could see at 02:27 UTC; automatically stamp the current feed on future release while retaining the existing manual bank-rate correction field; and add the database constraint so non-UI clients cannot reopen the defect. Do not substitute this recommendation for approval.

---

### Task 2: Rotate C5 Without Changing Identity

**Files:**
- Modify locally, never commit: `apps/web/.env.local`
- Verify: `.github/workflows/fx.yml`
- Verify: `apps/web/scripts/fx.mjs`
- Modify after successful closure: `docs/Decisions.md`
- Modify after successful closure: `docs/Remaining Work and Owner Decisions.md`

**Interfaces:**
- Consumes: the same production Auth user, owner-generated replacement password, GitHub secret `FX_PASSWORD`, local variable `FX_PASSWORD`.
- Produces: the same UID and privileges with a strong secret; no repository credential.

- [ ] **Step 1: Confirm the maintenance window and identity**

Avoid active/queued FX jobs and the 02:00/08:00 UTC slots. In Supabase Dashboard, confirm the existing user still has UUID `14f0d1af-f37a-4936-b278-e280bcb25129`; in the database, confirm exactly one matching profile row with role `viewer`. Stop if either differs.

- [ ] **Step 2: Owner changes only the existing Auth user's password**

The owner generates a unique 32+ character URL-safe password in a password manager and updates that existing user in Supabase Dashboard. Do not delete/recreate the user and do not use the Admin API.

- [ ] **Step 3: Propagate without exposing the secret**

Set GitHub's value interactively:

```bash
gh secret set FX_PASSWORD --repo Leuename/tracker
```

Then the owner updates only `FX_PASSWORD=` in `apps/web/.env.local` using an editor. Do not use `apply_patch`, `sed`, a heredoc, a temp file, or a command argument.

- [ ] **Step 4: Prove local and GitHub credentials separately**

From `apps/web`, run the non-writing local check:

```bash
npm run fx -- --dry-run
```

Require exit 0 and `fx dry run complete`. Then dispatch and watch a GitHub dry run:

```bash
gh workflow run fx.yml --repo Leuename/tracker --ref main -f dry_run=true
gh run list --repo Leuename/tracker --workflow fx.yml --event workflow_dispatch --limit 3 --json databaseId,createdAt,status,conclusion
gh run watch --repo Leuename/tracker <new-run-id> --exit-status
gh run view --repo Leuename/tracker <new-run-id> --log
```

Take `<new-run-id>` from the second command's newest `databaseId`; confirm its `createdAt` is after the dispatch before watching it. It is operator input, not a literal placeholder. Require that exact run to finish green and inspect its log. A local pass does not prove the repository secret.

- [ ] **Step 5: Prove revocation, identity, and the real workflow**

Attempt the obsolete password once in a clean private browser and require rejection. Re-read the UUID/profile role. Confirm `git status --short` does not list `.env.local` and scan outputs for accidental disclosure.

Dispatch a non-dry run rather than waiting for cron:

```bash
gh workflow run fx.yml --repo Leuename/tracker --ref main -f dry_run=false
gh run list --repo Leuename/tracker --workflow fx.yml --event workflow_dispatch --limit 3 --json databaseId,createdAt,status,conclusion
gh run watch --repo Leuename/tracker <new-run-id> --exit-status
gh run view --repo Leuename/tracker <new-run-id> --log
```

Require green. If nothing changed, require the script's explicit no-write result; if rates changed, require its existing readback verification. Treat existing JWT sessions as valid until the configured access-token lifetime expires.

- [ ] **Step 6: Apply the rollback rules exactly**

```text
Supabase update fails          -> stop; change neither GitHub nor local state.
Propagation fails              -> keep the new password; retry propagation.
Replacement password is lost  -> reset the same user to another new password.
UUID changes                   -> stop the FX workflow; do not edit RLS policies.
Never restore the obsolete password.
```

Only after every check passes, update D44/C5 documentation from deferred to closed, recording no secret.

---

### Task 3: Make C6 Fail Closed if a Late Run Crosses Publication

**Files:**
- Modify: `apps/web/src/logic.js:254-279`
- Modify: `apps/web/src/logic.test.js:213-263`
- Modify: `apps/web/scripts/fx.mjs:82-84`
- Modify after verification: `docs/Decisions.md` D43
- Modify after verification: `docs/Remaining Work and Owner Decisions.md` C6

**Interfaces:**
- Produces: `isPriorUtcDate(asOf: string, now?: Date): boolean`.
- Consumes: the provider's `payload.date` before any Supabase read or write.

- [ ] **Step 1: Add failing date-boundary assertions**

Import `isPriorUtcDate` in `apps/web/src/logic.test.js` and add:

```js
test('FX storage accepts only a date before the current UTC day', () => {
  const now = new Date('2026-09-04T14:30:00Z')
  assert.equal(isPriorUtcDate('2026-09-03', now), true)
  assert.equal(isPriorUtcDate('2026-08-31', now), true)
  assert.equal(isPriorUtcDate('2026-09-04', now), false)
  assert.equal(isPriorUtcDate('2026-09-05', now), false)
  assert.equal(isPriorUtcDate('2026-02-31', now), false)
  assert.equal(isPriorUtcDate('not-a-date', now), false)
})
```

Run `npm test` from `apps/web`; require failure because the export does not exist.

- [ ] **Step 2: Add the smallest pure guard**

Add beside the transfer-rate helpers in `apps/web/src/logic.js`:

```js
export const isPriorUtcDate = (asOf, now = new Date()) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(asOf))) return false
  const parsed = new Date(asOf + 'T00:00:00Z')
  return !Number.isNaN(parsed.valueOf()) && parsed.toISOString().slice(0, 10) === asOf &&
    asOf < now.toISOString().slice(0, 10)
}
```

This deliberately enforces the D43 ceiling—never store T+0—without guessing ECB holidays or changing cron behavior.

- [ ] **Step 3: Stop before any database operation on a same-day payload**

Import the helper in `apps/web/scripts/fx.mjs` and, immediately after the existing missing-date/PHP guard, add:

```js
if (!isPriorUtcDate(asOf)) fail('Rate API returned ' + asOf + '; refusing a same-day or future FX fix')
```

Do not change `API`, either cron, write grants, or insert/update behavior. This makes an excessively late run visibly fail instead of silently changing D43 semantics.

- [ ] **Step 4: Verify offline**

Run from `apps/web`:

```bash
npm test
npm run build
npm audit
```

Require all three to pass. Do not run `npm run fx` here: even `--dry-run` is a live external check and belongs only in an explicitly approved maintenance window. Update D43/C6 documentation to state that GitHub delay remains external, while T+0 storage now fails closed.

---

### Task 4: Enforce C7 at the Shared Transfer Boundary

**Files:**
- Modify: `apps/web/src/logic.js:274-279`
- Modify: `apps/web/src/logic.test.js:213-263`
- Modify: `apps/web/src/actions.js:426-501`
- Modify: `apps/web/src/smoke.mjs:63-82`
- Modify after verification: `docs/Decisions.md` D45

**Interfaces:**
- Produces: `stampReleasedRate(before: object, after: object, rates: object): object | null`.
- Consumes: the pre-change transfer, proposed transfer, and `state.fxRates`.
- `null` means release must be refused because no dated feed rate exists.

- [ ] **Step 1: Add failing invariant tests**

Add to `apps/web/src/logic.test.js`:

```js
test('first release stamps the dated feed and never silently reprices it', () => {
  const rates = { USD: { rate: 62.5, as_of: '2026-09-03' } }
  const pending = { id: 1, cur: 'USD', status: 'pending', rate: null, rate_as_of: null }
  assert.deepEqual(stampReleasedRate(pending, { ...pending, status: 'released' }, rates), {
    ...pending, status: 'released', rate: 62.5, rate_as_of: '2026-09-03',
  })

  const released = { ...pending, status: 'released', rate: 61, rate_as_of: '2026-09-02' }
  assert.deepEqual(stampReleasedRate(released, { ...released, note: 'sent' }, rates), {
    ...released, note: 'sent',
  })
})

test('release is refused when no dated feed exists', () => {
  const pending = { id: 1, cur: 'JPY', status: 'pending', rate: null, rate_as_of: null }
  assert.equal(stampReleasedRate(pending, { ...pending, status: 'released' }, {}), null)
  assert.equal(stampReleasedRate(pending, { ...pending, status: 'released' }, {
    JPY: { rate: 0.41, as_of: null },
  }), null)
  assert.equal(stampReleasedRate(pending, { ...pending, status: 'released', rate: 1 }, {}), null)
  assert.equal(stampReleasedRate(pending, { ...pending, status: 'released', rate: 0, rate_as_of: '2026-09-03' }, {}), null)
  assert.equal(stampReleasedRate(pending, { ...pending, status: 'released', rate: Infinity, rate_as_of: '2026-09-03' }, {}), null)
  assert.equal(stampReleasedRate(pending, { ...pending, status: 'released', rate: NaN, rate_as_of: '2026-09-03' }, {}), null)
})

test('an existing released wire cannot be saved without its rate provenance', () => {
  const released = { id: 1, cur: 'USD', status: 'released', rate: 61, rate_as_of: '2026-09-02' }
  assert.equal(stampReleasedRate(released, { ...released, rate: '', rate_as_of: '' }, {}), null)
})
```

Import `stampReleasedRate`; run `npm test` and require failure because it does not exist.

- [ ] **Step 2: Implement one pure rule**

Add to `apps/web/src/logic.js`:

```js
export const stampReleasedRate = (before, after, rates) => {
  if (after?.status !== 'released') return after
  const entered = Number(after.rate)
  if (Number.isFinite(entered) && entered > 0 && after.rate_as_of) return after
  if (before?.status === 'released') return null
  const live = rates?.[after.cur]
  const fetched = Number(live?.rate)
  if (!Number.isFinite(fetched) || fetched <= 0 || !live.as_of) return null
  return { ...after, rate: fetched, rate_as_of: live.as_of }
}
```

This stamps only the first release, preserves an already entered bank rate, never uses constants as historical evidence, and leaves the existing manual correction path intact.

- [ ] **Step 3: Route all three persistence paths through the rule**

Import `stampReleasedRate` in `apps/web/src/actions.js`.

For `saveTransfer`, build the proposed row as today, then call:

```js
const stamped = stampReleasedRate({ status: '' }, row, state.fxRates)
if (!stamped) { set({ telError: 'A dated exchange rate is required before release.' }); return }
```

Persist and store `stamped`, not `row`.

For `updTel`, replace the raw proposed row with:

```js
const current = state.transfers.find((w) => w.id === id)
const proposed = { ...current, ...telPatch(k, v, current.cur) }
const next = stampReleasedRate(current, proposed, state.fxRates)
if (!next) { flash('A dated exchange rate is required before release.'); return }
```

Routing inline currency changes through the existing `telPatch` is required: it discards the old currency's rate and defaults the new currency's feed. A raw `{ [k]: v }` patch can mislabel a USD rate as EUR and still satisfy the release constraint.

For `saveTransferEdit`, call the same helper with the stored transfer as `before` and the fully built proposal as `after`; on `null`, set `telEditError` to the same message and do not close or save. This covers add, modal edit, and inline status changes without putting business rules in JSX or the database serializer.

- [ ] **Step 4: Keep the live smoke path valid**

In `apps/web/src/smoke.mjs`, require a dated GBP feed row and stamp the test wire before releasing it:

```js
const gbp = first.fxRates.GBP
assert.ok(gbp && gbp.rate > 0 && gbp.as_of, 'smoke needs a dated GBP rate')
const released = { ...wire, status: 'released', note: 'smoke wire released', rate: gbp.rate, rate_as_of: gbp.as_of }
```

Add round-trip assertions for `backWire.rate` and `backWire.rate_as_of`. Do not run smoke during offline implementation; its next authorized live run will verify the database constraint path.

- [ ] **Step 5: Verify offline**

Run from `apps/web`:

```bash
npm test
npm run build
```

Require both to pass. Do not use Playwright or a live ledger to prove this logic. Update D45 to name `stampReleasedRate` as the enforcement point and state that manual correction remains intentional.

---

### Task 5: Backfill the Three Existing C7 Rows Through an Attributed Admin Session

**Files:**
- Modify live only after approval: `public.transfers` rows `1788313757081`, `1788318165685`, `1788318201948`
- Verify live: `public.audit_log`
- Create after MCP assigns the version: `supabase/migrations/{mcp-version}_require_released_transfer_rate.sql`
- Modify after successful closure: `docs/Remaining Work and Owner Decisions.md`

**Interfaces:**
- Consumes: the owner's chosen `as_of`, the exact published EUR/PHP and USD/PHP rates for that date, an authenticated administrator session, and the Task 1 baseline.
- Produces: exactly three guarded transfer updates and exactly three attributed audit rows.

- [ ] **Step 1: Resolve exact values without inventing a rate**

If the owner chooses `2026-09-03`, use the already stored feed values EUR `72.605000` and USD `62.509686`, but re-read them before writing. If the owner chooses `2026-09-04`, first require an `fx_rates` row for that exact date and read its EUR and USD values. If either currency/date is absent, stop; do not use `TRANSFER_RATES` or extrapolate.

- [ ] **Step 2: Capture the immediate before-state**

Read the three complete transfer rows, the transfer count/priced count, the transaction count/total/hash, and `max(audit_log.id)`. Require all three target rates still null and all three statuses still `released`. Any mismatch stops the write.

- [ ] **Step 3: Update one row at a time through an authenticated administrator**

Use an authenticated administrator Supabase client and update each row separately with both `.eq('id', id)` and `.is('rate', null)`, requesting the updated row with `.select('id,rate,rate_as_of')`. Require exactly one returned row before continuing. Do not use the current transfer modal: it exposes no `rate_as_of` input and its update is guarded only by id. Do not use the rates account, SQL Editor `postgres`, a bulk update, or an unguarded script.

The existing UI write must be equivalent to this guard for each id:

```sql
update public.transfers
   set rate = :approved_rate, rate_as_of = :approved_date
 where id = :one_approved_id and rate is null;
```

The named parameters are review notation, not a command to paste. The three approved ids are fixed above; the rate/date come only from Step 1.

- [ ] **Step 4: Assert the exact outcome and attribution**

Re-read all three rows and require the chosen date and exact currency-specific rates. Re-run status/count(rate) and require `released = 9`, `priced = 9` if Task 1 still found nine released transfers. Require exactly three new `audit_log` rows after the captured baseline, each `tbl = 'transfers'`, each target id once, and `actor is not null`.

Require the transaction count/total/hash to equal the immediate pre-write baseline. A changed owner baseline before this step is normal; only a change across this step fails the check.

- [ ] **Step 5: Add the separately approved database invariant after the backfill**

Prepare and review this exact migration body, including its rollback:

```sql
alter table public.transfers
  add constraint released_transfer_has_rate
  check (
    status <> 'released' or
    (rate is not null and rate > 0 and rate::text not in ('NaN', 'Infinity', '-Infinity') and rate_as_of is not null)
  )
  not valid;

alter table public.transfers
  validate constraint released_transfer_has_rate;

-- rollback:
--   alter table public.transfers drop constraint if exists released_transfer_has_rate;
```

Apply the reviewed body only after Step 4 proves all released rows are valid, using Supabase MCP `apply_migration` against production project `jusifpditdigqdjiwdaj` with migration name `require_released_transfer_rate`. Do not use the unconfigured CLI. MCP assigns the timestamp: read the new row from `supabase_migrations.schema_migrations`, write its exact `version_name.sql` filename under `supabase/migrations/`, and verify the local body MD5 against `statements[1]` as described in `supabase/README.md`. Read `pg_constraint` back and require `convalidated = true`.

Then, through an authenticated administrator, create one disposable `E2E-C7-CONSTRAINT-` pending transfer and require four separate release updates to be refused: null rate/null date, null rate/populated date, string payload `'NaN'`/populated date, and string payload `'Infinity'`/populated date. Use strings for the special values because JavaScript numeric `NaN` and `Infinity` serialize to JSON null; PostgREST coerces the strings to PostgreSQL `numeric` special values. Delete only that exact disposable row afterward. This live negative probe needs separate owner approval because it writes production. Verify the failed updates created no transfer audit rows and the cleanup created the expected attributed delete row.

- [ ] **Step 6: Close C7 only after all layers are proven**

Mark C7 closed only when Task 4's offline checks pass, the three attributed rows are verified, and the database constraint is validated. If the owner declines backfill, the constraint cannot be added while invalid released rows remain; document the exception and leave C7 open.

---

### Task 6: Final Review and Handoff

**Files:**
- Modify: `docs/Decisions.md`
- Modify: `docs/Remaining Work and Owner Decisions.md`
- Modify: `handoff/2026-09-04 Three Answers, and a Finding That Corrected Itself.md`
- Modify: `handoff/Handoff Index.md`

**Interfaces:**
- Consumes: evidence from Tasks 2-5.
- Produces: accurate closure status and one current resume prompt.

- [ ] **Step 1: Run the full safe gate**

From `apps/web`:

```bash
npm test
npm run build
npm audit
```

Require all pass. Search the changed documentation for secrets and placeholders; verify local Markdown links and changed paths. Do not claim live checks that were not actually run.

- [ ] **Step 2: Re-check drift and review only this work**

```bash
git status --short
git diff -- apps/web/scripts/fx.mjs apps/web/src/actions.js apps/web/src/logic.js apps/web/src/logic.test.js apps/web/src/smoke.mjs supabase/migrations docs/Decisions.md 'docs/Remaining Work and Owner Decisions.md' 'handoff/2026-09-04 Three Answers, and a Finding That Corrected Itself.md' 'handoff/Handoff Index.md'
```

Confirm no workflow cron, applied migration file, grant, generated export, secret file, or unrelated user edit changed. The only allowed schema diff is the newly assigned constraint migration.

- [ ] **Step 3: Obtain a fresh-context verifier pass**

The verifier must try to refute: same-day or malformed FX dates are rejected before database access; app release paths stamp a dated feed or refuse; direct clients cannot store an invalid released row; the smoke path supplies provenance; existing rates never silently re-price; only the three approved live rows changed; all new audit rows are attributed.

- [ ] **Step 4: Stop before integration or release**

Report separately what was verified offline, what was verified live, what remains owner-blocked, and current Git drift. Ask before integrating `origin/main`, committing, pushing, tagging, or deploying.

## Self-Review Result

- C5 is fully specified but correctly blocked at the owner-only Dashboard action.
- C6 preserves both deliberate cron slots and adds only the fail-closed invariant the brief proposes.
- C7 separates the historical date choice from future enforcement and covers add, modal edit, and inline status paths through one helper.
- Failure checks cover stale Git overlap, missing feed/date, same-day FX, absent rate, changed target rows, policy no-ops, missing attribution, and unrelated transaction drift.
- No production-writing test suite, service-role key, new dependency, migration edit, grant widening, cron change, push, tag, or commit is proposed.
