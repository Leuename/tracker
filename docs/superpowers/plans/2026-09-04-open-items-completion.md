# Open Items Completion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close every actionable item in `handoff/2026-09-04 Open Items Brief for Codex.md`, while stopping cleanly at operator-only work and owner decisions that cannot be inferred.

**Architecture:** Treat database restore, live-storage exercise, schema replay, Playwright hardening, and owner decisions as separate tracks. Each track verifies the external state it changes, records evidence in the canonical notes, and never substitutes a passing command for a state assertion. The already-completed exchange-rate backfill and R7 rollout remain evidence, not work to repeat.

**Tech Stack:** Supabase Postgres, Supabase MCP/dashboard, `psql`, React/Vite, Playwright, Node.js test scripts, GitHub Actions, Markdown evidence notes.

**Spec:** `handoff/2026-09-04 Open Items Brief for Codex.md`

## Global Constraints

- Work from `/Users/itadmin/Desktop/puge`; runnable commands are under `apps/web/`.
- Verify `git fetch origin && git log origin/main..HEAD` before trusting repository or deployment state; do not push.
- `npm run e2e`, `npm run smoke`, and `npm run security` write to production; run them only when the task explicitly needs that evidence and sweep only rows tagged `E2E-`.
- Never modify generated `company_tracker/` artifacts, delete from `audit_log`, revoke authenticated `EXECUTE`, rotate `FX_PASSWORD`, or touch `zone-offices` (`lasycakyudaawrydetnm`).
- Preserve byte identity of the three applied FX/R7 migration files, including their historical filename comments.
- Keep `AGENTS.md` and `CLAUDE.md` byte-identical whenever a shared policy changes.
- Treat a missing connection string, missing real stored document, or missing owner decision as a blocker to that item; do not invent a workaround.

---

### Task 0: Establish the current baseline

**Files:**
- Read: `handoff/2026-09-04 Open Items Brief for Codex.md`
- Read: `handoff/2026-09-04 Exchange Rates and R7 Production Rollout.md`
- Read: `docs/Decisions.md`, `docs/Repository Evidence.md`, `supabase/README.md`, `backups/README.md`, `AGENTS.md`, `CLAUDE.md`

**Interfaces:**
- Consumes: current repository, production Supabase project `jusifpditdigqdjiwdaj`, rehearsal project `bucmcnsjkuprpojhequy`.
- Produces: a dated baseline containing repository, migration, ledger, roster, rates, and backup-manifest state.

- [ ] **Step 1: Fetch and inspect repository state**

  ```bash
  cd /Users/itadmin/Desktop/puge
  git fetch origin
  git log origin/main..HEAD
  git status --short
  ```

  Expected: the divergence is understood before any action; do not assume a clean tree or that `origin/main` is current.

- [ ] **Step 2: Run offline checks**

  ```bash
  cd /Users/itadmin/Desktop/puge/apps/web
  npm test
  npm run build
  npm audit
  ```

  Expected: 66 tests pass, build succeeds, and audit reports zero vulnerabilities. Record any drift before continuing.

- [ ] **Step 3: Read live SQL state without writing**

  Run the SQL in §6 of the brief through an approved read-only Supabase path. Assert, rather than infer, the transaction fingerprint, 15-migration R7 shape, six priced released wires, three null pending wires, and five-account roster.

- [ ] **Step 4: Inspect the backup manifest**

  ```bash
  cd /Users/itadmin/Desktop/puge
  git show origin/main:backups/MANIFEST.md
  ```

  Record whether the manifest is the first post-R7/FX snapshot, whether `audit_log rows` is at least the verified live count, whether the roster is 5, and whether stored files are nonzero. This determines whether Task 2 is still open.

**Checkpoint:** Do not start Tasks 1–4 until the baseline is recorded and any drift is explained as owner activity, a stale snapshot, or a defect.

---

### Task 1: Complete R2/R9 full-volume audit restore and verify-restore

**Files:**
- Read: `backups/README.md`
- Read: `backups/audit_log.json`, `backups/accounts.json`, `backups/verify-restore.sql`, `backups/MANIFEST.md`
- Modify: none unless the restore evidence requires a documentation correction

**Interfaces:**
- Consumes: a supervised `postgres` connection string for the selected empty restore target.
- Produces: a restored target with the complete audit log, correct sequence, disabled/re-enabled triggers, intact roster, and passing `backups/verify-restore.sql`.

- [ ] **Step 1: Confirm the operator credential and target**

  Stop and report `blocked` if a `postgres` connection string is unavailable. Do not use application credentials, Supabase publishable keys, or chunked MCP payloads; the prior chunk-5-of-23 attempt is the known failure mode.

- [ ] **Step 2: Disable self-signup and create/reuse the empty restore target**

  Follow `backups/README.md` steps 1–3 exactly. Preserve original `auth.users` IDs from `backups/accounts.json`; do not store passwords in the repository.

- [ ] **Step 3: Load all row files with triggers disabled**

  Use the SQL-editor/`psql` procedure in `backups/README.md` for every table, including `profiles.json` and `audit_log.json`. Transport the large audit file with `psql \copy` or the documented SQL-file path, never an agent-tool payload.

- [ ] **Step 4: Repair and assert the audit sequence**

  Execute the documented `setval(pg_get_serial_sequence(...))`, then assert `last_value >= max(id)` before any audited write. A successful first write is insufficient: the failure to catch is the delayed `23505 audit_log_pkey` collision.

- [ ] **Step 5: Re-enable triggers and run the verification file itself**

  ```bash
  psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f backups/verify-restore.sql
  ```

  Expected: the file itself passes, not merely its assertions transliterated into MCP calls. Capture its output and the target manifest/fingerprints.

- [ ] **Step 6: Verify the failure conditions explicitly**

  The restore is incomplete if any of these fail: full `audit_log` count, `audit_log_id_seq` safety, all triggers enabled, 21 transaction rows and the expected fingerprint, five roster rows with four administrators and one viewer, or an audited write that is absent from the log.

- [ ] **Step 7: Record evidence**

  Update `docs/Repository Evidence.md` only with observed target/count/fingerprint evidence. Add no new command to `backups/README.md`; its operator procedure is already the source of truth.

**Checkpoint:** This task is complete only when the full audit count and sequence assertion pass. A partial restore or a successful first write does not count.

---

### Task 2: Exercise storage paging against a non-empty bucket (F5/R10)

**Files:**
- Read: `apps/web/scripts/backup.mjs` (`listAll(prefix)`, `cleanupOrphanFiles()`)
- Read: `backups/files/`, `backups/MANIFEST.md`, `backups/README.md`
- Test: existing `npm run smoke` path and backup workflow

**Interfaces:**
- Consumes: one real receipt document created through the normal liquidation-upload path and its linked `receipts` row.
- Produces: a backup containing the stored object and a byte-for-byte restore check.

- [ ] **Step 1: Recheck whether the current manifest already proves a non-empty bucket**

  If a recent manifest contains a real stored file and the corresponding bytes are present in `backups/files/`, do not create another document; verify its receipt link and proceed to Step 4.

- [ ] **Step 2: Create one linked document through the UI/smoke path**

  Use the existing liquidation-upload path or `npm run smoke`. Keep the generated receipt and object tagged/linked so `cleanupOrphanFiles()` cannot classify it as orphaned.

- [ ] **Step 3: Run the backup workflow and inspect the manifest**

  Run the checked-in backup command/workflow with its documented credentials. Assert that `files` is nonzero and the expected object exists under `backups/files/`; do not infer completeness from a successful process exit.

- [ ] **Step 4: Prove the bytes survive both hops**

  Compare the source, downloaded backup, and restored/uploaded object SHA-256 values. The check fails if `listAll()` stops after a full page, if the object is omitted, or if cleanup deletes the linked file.

- [ ] **Step 5: Record F5/R10 evidence**

  Update `docs/Repository Evidence.md` with the observed nonzero manifest and byte comparison. Preserve the existing `listAll()` boundary unit tests; no new dependency is needed.

**Checkpoint:** A non-empty bucket and a byte-for-byte restore are required. An empty `files: 0` manifest remains unproven.

---

### Task 3: Finish the full schema replay evidence for FX/R7

**Files:**
- Read: `supabase/README.md`
- Read: `supabase/migrations/20260903144056_fx_rates.sql`
- Read: `supabase/migrations/20260903071500_private_is_viewer.sql`
- Read: `supabase/migrations/20260903071600_drop_public_is_viewer.sql`
- Modify: `docs/Repository Evidence.md` and `supabase/README.md` only if a genuinely empty-project replay is performed

**Interfaces:**
- Consumes: a disposable empty Supabase target and the exact 15 migration files in version order.
- Produces: a schema fingerprint proving all 15 migrations rebuild cleanly, including FX column grants, RLS, views, private function, and policy dependencies.

- [ ] **Step 1: Reconcile existing evidence**

  The FX and R7 migrations have already been replayed on `tracker-rehearsal`; do not reapply them there. This task remains open only for a genuinely empty-target replay if the brief’s stronger claim is required.

- [ ] **Step 2: Confirm a disposable target without touching `zone-offices`**

  If no existing empty target and no approved disposable project/connection string exist, mark this task blocked. Do not create a paid project or branch without explicit owner cost approval.

- [ ] **Step 3: Apply all 15 migrations in repository/MCP-assigned order**

  Preserve the exact contents and historical comments of the applied FX/R7 files. Let Supabase assign migration versions; read `supabase_migrations.schema_migrations` back rather than trusting `success: true`.

- [ ] **Step 4: Assert schema and authorization facts**

  Compare the empty target with production for columns, grants, column grants, RLS, policies, triggers, indexes, function security flags, and the exposed-schema boundary. Assert public RPC absence and private-schema refusal, not merely a missing result row.

- [ ] **Step 5: Record replay evidence or the blocker**

  Update the two canonical notes only after the fingerprint and catalog queries pass. If blocked, record the missing target/credential and leave the claim explicitly open.

**Checkpoint:** Existing rehearsal proof closes replay of the new files into the 12-migration baseline; only a blank-target fingerprint closes the stronger full-rebuild claim.

---

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

### Task 5: Resolve owner-only decisions without defaulting them

**Files:**
- Read: `apps/web/src/App.jsx:58`
- Read: `.github/workflows/schedule.yml`
- Read: `apps/api/`
- Read: `docs/Decisions.md` D31, D36, D44
- Modify: only the file named by an explicit owner decision

**Interfaces:**
- Consumes: explicit owner choices for behavior, credentials, notification provider, API boundary, and human viewer testing.
- Produces: one small implementation or a recorded decision per selected item.

- [ ] **Step 1: Present the decisions as separate yes/no choices**

  Ask for choices on `signOut()` scope, human viewer account, R12 notification provider/recipients, and whether to delete or retain `apps/api/`. Remind but do not rotate `FX_PASSWORD`; leaked-password protection remains Pro-only.

- [ ] **Step 2: Apply only selected choices**

  - If local sign-out is selected, change only `apps/web/src/App.jsx:58` to pass `{ scope: 'local' }`, then update the e2e assertion that proves the intended scope.
  - If a human viewer is selected, create it through the approved Auth path, verify read-only UI affordances, and record no password in notes.
  - If R12 is selected, add only the owner-approved provider/recipient secret names to the workflow; do not invent a fallback credential path.
  - If `apps/api/` is selected for deletion or retention, record the decision and touch no generated artifacts.

- [ ] **Step 3: Verify each selected change at its trust boundary**

  A sign-out change must prove session scope, a viewer change must prove navigation plus blocked mutations, notifications must prove delivery without secret leakage, and an API-boundary change must pass the repository documentation checks.

- [ ] **Step 4: Leave unselected items explicitly deferred**

  Update `docs/Decisions.md` only for decisions the owner actually makes. Do not silently convert a reminder (N9) into authorization.

**Checkpoint:** No owner-only item is changed because it appeared in the open-items list.

---

### Task 6: Final verification, evidence, and handoff

**Files:**
- Modify: `docs/Repository Evidence.md`, `docs/Decisions.md`, and a new dated handoff only when the completed work changes current state
- Read: all files listed in Task 0

**Interfaces:**
- Consumes: outputs from Tasks 1–5 and their external-state evidence.
- Produces: a clean, evidence-backed continuation state with no unsupported “done” claims.

- [ ] **Step 1: Run the checks appropriate to the completed tracks**

  ```bash
  cd /Users/itadmin/Desktop/puge/apps/web
  npm test
  npm run build
  npm audit
  npm run security
  npx playwright test --workers=1
  ```

  Run production-writing commands only with the owner’s explicit scope and record their exact counts; otherwise mark them unrun rather than substituting stale output.

- [ ] **Step 2: Re-read live state and compare fingerprints**

  Re-run the SQL assertions from the brief, including transaction fingerprint, six/three transfer pricing split, private/public function counts, 17 policy dependencies, sequence safety, roster, and audit volume.

- [ ] **Step 3: Update canonical notes**

  Separate observed evidence, owner decisions, blockers, and non-actions. Link to implementation files instead of copying their contents. Keep `AGENTS.md` and `CLAUDE.md` synchronized if touched.

- [ ] **Step 4: Review the final diff and stop before push**

  ```bash
  cd /Users/itadmin/Desktop/puge
  git diff --check
  git status --short
  git log origin/main..HEAD
  ```

  Expected: every modified path is intentional, no secrets/PII are present, and no push occurs without owner approval.

**Checkpoint:** The work is complete only when each ID in §2 is either closed with a failing-if-wrong check, blocked with its concrete prerequisite, or explicitly deferred by an owner decision.

## Coverage Review

- R2/R9: Task 1 covers full-volume audit transport, sequence repair, and `verify-restore.sql` execution.
- F5/R10: Task 2 covers a non-empty storage bucket, paging, backup, and byte restoration.
- FX replay: Task 3 distinguishes the already-proven rehearsal replay from the still-stronger blank-target claim.
- R8: Task 4 covers the named preflight and retry behavior without raising timeouts.
- Owner decisions: Task 5 preserves the brief’s “do not act unasked” boundary.
- Verification/traps: Tasks 0 and 6 enforce fetch-first, evidence-back, no-push behavior.

## Suggested skills

- `superpowers:subagent-driven-development` or `superpowers:executing-plans`
- `codex-security:validation`
- `engineering:deploy-checklist`
- `handoff`

