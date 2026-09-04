# Remaining Work Implementation Handoff

## Purpose

This handoff records the work completed from `docs/Remaining Work and Owner Decisions.md`, the executable plan, verification, and the items that still require either database access or an explicit owner decision.

## Read first

- [AI Agent Context](../docs/AI%20Agent%20Context.md)
- [Repository Evidence](../docs/Repository%20Evidence.md)
- [Decisions](../docs/Decisions.md)
- [Remaining Work and Owner Decisions](../docs/Remaining%20Work%20and%20Owner%20Decisions.md)
- [Executable plan](../docs/superpowers/plans/2026-09-04-remaining-work-decisions.md)
- [Second-pass brief](2026-09-04%20Open%20Items%20Brief%20for%20Codex,%20Second%20Pass.md)

## Completed implementation

### Storage-proof receipt

Receipt `1788471059637` was checked through the existing authenticated application path. It already had the deliberate label `DO NOT DELETE — backup proof`, so no second production write was necessary. Verification confirmed:

- status remains `released`;
- amount remains ₱0.00;
- the linked storage object remains present and downloadable;
- the recorded backup/source/restored SHA-256 evidence remains consistent.

The receipt is intentionally untagged so automated `E2E-` cleanup cannot orphan the only live storage round-trip proof. This decision and evidence are recorded as D46 in [Decisions.md](../docs/Decisions.md) and in [Repository Evidence.md](../docs/Repository%20Evidence.md).

### Empty API boundary

`apps/api/` was confirmed empty and removed. It contained no implementation and no tracked files. The repository documentation now states that the directory should be recreated only when an actual backend implementation is needed.

### Plan

The implementation plan is saved at [docs/superpowers/plans/2026-09-04-remaining-work-decisions.md](../docs/superpowers/plans/2026-09-04-remaining-work-decisions.md). It deliberately separates safe completed work from connection-gated and owner-gated work; it does not invent credentials, projects, or notification recipients.

## Verification

- `npm test` from `apps/web`: **77/77 passed**.
- `git diff --check`: passed.
- `apps/api/`: absent after removal.
- Final working tree contains only the intended documentation edits plus the new plan; no generated exports, assets, dependencies, or tooling were changed.

The live receipt/object verification was performed without recording credentials or other secrets in the repository.

## Still open

### Requires supervised Postgres access

- A1: full-volume `audit_log` restore using the checked-in backup artifacts and `psql`.
- A2: execute `backups/verify-restore.sql` through the same direct Postgres connection.

No direct Postgres connection string was available during this session. Do not substitute app credentials, use chunked MCP writes, or claim a full restore from the rehearsal subset.

### Deliberately deferred environment work

- B1: live proof of the storage paging ceiling above 1,000 objects. Do not manufacture 1,001 production objects; the current one-object round trip proves storage integrity, not the live ceiling.
- B2: blank-target schema replay. The rehearsal target is not blank, and no approved disposable project exists. Do not create a paid project or touch unrelated environments.

### Explicit owner choices still required

- C1: decide whether `supabase.auth.signOut()` remains global or changes to local scope. This is a user-visible behavior change.
- C4: choose a notification provider and recipients for scheduled-payables output, or explicitly defer notifications. Current schedule behavior writes only the GitHub job summary.
- C5: decide whether to rotate the deferred rates-account password now. Never reproduce the prior credential in notes or logs; rotation must update the local environment and matching GitHub secret together.

## Important traps

- A resolved `fetch` promise is not evidence of a healthy response; status and body must be validated. The Playwright preflight regression tests cover healthy, timeout, unreachable, malformed URL, and bad-status paths.
- The proof receipt is evidence, not disposable test data. Do not tag or delete it without preserving an independently verified backup and receiving an explicit owner decision.
- `npm run security` has 56 checks and belongs in the normal pre-push routine, but it exercises live trust boundaries. Run it from `apps/web` and report it as a live check.
- Do not push or tag from this handoff session unless separately requested.

## Suggested skills

- `handoff` — maintain continuation packages like this one.
- `codex-security:security-scan` or `codex-security:validation` — for the 56-check security routine and any credential/policy change.
- `engineering:deploy-checklist` — before any production deployment or live database operation.
- `superpowers:verification-before-completion` — after implementing an owner-approved choice.
- `caveman:investigate-first` — before attempting the blocked restore or disposable-environment work.

## Resume prompt

Read `handoff/2026-09-04 Remaining Work Implementation Handoff.md`, then read `docs/AI Agent Context.md`, `docs/Repository Evidence.md`, `docs/Decisions.md`, `docs/Remaining Work and Owner Decisions.md`, and `docs/superpowers/plans/2026-09-04-remaining-work-decisions.md`. Verify the current git status and diff before acting. Preserve the retained proof receipt `1788471059637` and do not expose credentials. Treat A1/A2 as blocked until the owner supplies a supervised direct Postgres connection string; leave B1/B2 deferred without manufacturing production objects or creating a paid project. Ask the owner to choose C1 sign-out scope, C4 notification channel/recipients or defer, and whether C5 password rotation is now authorized. For any authorized change, make the smallest scoped edit, run the relevant checks from `apps/web` (including `npm run security` when live security behavior changes), verify the result independently, and report evidence before pushing or tagging.
