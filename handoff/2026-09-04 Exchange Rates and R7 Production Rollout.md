---
title: Exchange Rates and R7 Production Rollout
tags: [handoff, supabase, fx, security, migrations, production]
created: 2026-09-04
status: current
kind: technical handoff for Claude Code
---

# Exchange Rates and R7 Production Rollout

## Purpose and scope

Continue from [2026-09-03 Exchange Rates Shipped, What Is Still Open](2026-09-03%20Exchange%20Rates%20Shipped,%20What%20Is%20Still%20Open.md). This session closed the six-wire historical-rate backfill, rehearsed and applied the R7 `is_viewer()` migrations, and made the production-writing security probe part of the human pre-push routine. Read [docs/Decisions.md](../docs/Decisions.md) D45, [docs/Repository Evidence.md](../docs/Repository%20Evidence.md), [supabase/README.md](../supabase/README.md), [.claude/rules/git-workflow.md](../.claude/rules/git-workflow.md), [AGENTS.md](../AGENTS.md), and [CLAUDE.md](/Users/itadmin/Desktop/puge/CLAUDE.md) before acting.

The implementation artifacts are referenced, not copied: `supabase/migrations/20260903144056_fx_rates.sql`, `supabase/migrations/20260903071500_private_is_viewer.sql`, `supabase/migrations/20260903071600_drop_public_is_viewer.sql`, `apps/web/scripts/fx.mjs`, `apps/web/src/db.js`, and `apps/web/security/probe.mjs`. No repository source-code changes were made in this session; this note is the only new file.

## Timeline and evidence

1. The prior handoff was read first. Its open items were the six released-wire backfill, R7 migration rehearsal/application, and the security pre-push decision.
2. Historical rates were fetched from Frankfurter's ECB-derived data for 2026-09-02: PHP/EUR `72.415`, USD/EUR `1.1578`, GBP/EUR `0.8587`. Derived PHP-per-unit values were EUR `72.415`, USD `62.545345`, and GBP `84.330965`.
3. Six released transfer rows (`1788313691178` (EUR), `1788313728904` (EUR), `1788313826422` (USD), `1788313870693` (USD), `1788313906869` (USD), and `1788318122863` (GBP)) were updated by authenticated, ID-scoped calls with `rate_as_of = 2026-09-02`. The three pending wires remained `rate = null` and `rate_as_of = null`. No `txns` rows changed.
4. The database trigger recorded audit IDs `1475–1480`. D45 in [docs/Decisions.md](../docs/Decisions.md) is the authority for the narrow scope and reversal shape.

## Security routine

`npm run security` was added to the human pre-push checklist because it writes production. It was not added to push CI. The check count was synchronised from 47 to 56 in both `AGENTS.md` and `CLAUDE.md`. Verified results: `npm test` 66/66 and `npm run security` 56/56.

## R7 rehearsal

The existing `tracker-rehearsal` project (`bucmcnsjkuprpojhequy`) had 12 migrations. The exact `20260903144056_fx_rates`, `20260903071500_private_is_viewer`, and `20260903071600_drop_public_is_viewer` files were applied there, producing 15 final migrations. Catalog, grant, and policy checks passed; admin/viewer rolled-back simulations passed; PostgREST returned 404/PGRST202 for the public RPC and 406/PGRST106 for the private schema. Counts were unchanged. Production was untouched during rehearsal.

## R7 production rollout

In production project `jusifpditdigqdjiwdaj`, migration 1 was applied atomically. The approved reload window was observed, then migration 2 was applied atomically. Production now has 15 migrations. `public.is_viewer` is absent and `private.is_viewer` is present. All 17 policies and `merge_app_config` are private-backed; grants are correct. Public RPC checks return 404/PGRST202; private-schema checks return 406/PGRST106. Ledger counts and the pre/post fingerprint are unchanged. Final `npm run security` was 56/56.

There was a transient PostgREST schema-cache interval in which `merge_app_config` returned 404. An exact no-op-shaped call subsequently returned 200 with result `1`; no fix was needed. This is observed cache propagation, not a migration defect.

## Current state and traps

- Production has five accounts. The rates-account password was not rotated (D44/N9). Never include keys, passwords, or emails in a handoff.
- Do not run a bulk audit restore, modify generated `company_tracker` artifacts, revoke authenticated `EXECUTE`, reapply migrations, or rotate `FX_PASSWORD`.
- The six released wires retain their 2026-09-02 provenance; pending wires remain unpriced until release.
- There were no application-source changes in this session. Production and rehearsal refs above are safe identifiers, not credentials.

## Checks and open follow-up

Verified in this session: `npm test` 66/66, `npm run security` 56/56, rehearsal and production catalog/grant/policy/PostgREST checks, and unchanged ledger counts/fingerprint. Build and e2e results may be cited only as historical evidence from the prior handoff; they were not run in this session. The backup manifest still needs checking if that has not already been done. Migration files are applied and the corresponding documentation is updated. Verify current state before every future action.

## Suggested skills

- `codex-security:validation`
- `codex-security:verify-fix`
- `engineering:deploy-checklist`
- `handoff`

## Resume prompt

> Resume from `/Users/itadmin/Desktop/puge/handoff/2026-09-04 Exchange Rates and R7 Production Rollout.md`. First read that file, `handoff/2026-09-03 Exchange Rates Shipped, What Is Still Open.md`, `docs/Decisions.md` (especially D44–D45), `docs/Repository Evidence.md`, `supabase/README.md`, `.claude/rules/git-workflow.md`, `AGENTS.md`, and `CLAUDE.md`. Verify current state before acting: production project `jusifpditdigqdjiwdaj` and rehearsal `bucmcnsjkuprpojhequy` are at 15 migrations; `private.is_viewer` exists, `public.is_viewer` does not; the six released wires have 2026-09-02 rates and audit IDs 1475–1480; pending wires remain null; ledger counts/fingerprint are unchanged. Run `npm test` and `npm run security` from `apps/web`; do not claim build/e2e unless run now, and check the backup manifest if still open. Do not bulk-restore audit data, edit generated `company_tracker`, revoke authenticated EXECUTE, reapply migrations, or rotate `FX_PASSWORD`. Never expose credentials or PII. Verify and confirm the evidence and intended scope before making any change.
