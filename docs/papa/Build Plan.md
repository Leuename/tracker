---
title: Papa Tracker Build Plan
tags: [papa, construction, plan, phases]
created: 2026-09-24
status: draft. Phase 0 needs owner answers Q10 and a backup destination. Phase 2 needs Q1 to Q4.
decisions: "[[Decisions]] D102, D103"
related:
  - "[[PRD]]"
  - "[[Data Model]]"
  - "[[App Flows]]"
---

# Papa Tracker Build Plan

Branch: `feature/papa-tracker`. Each phase merges only when its exit check passes.

## Phase 0: Isolation first (touches the live ERP database)

Nothing Papa-specific gets created until the ERP ledger is closed to non-members.

| Step | Work | Exit check |
|---|---|---|
| 0.1 | Migration: `workspace_members`, `private.is_member`, `private.can_write`, seed every current profile into `erp` with its current role | Row count in `workspace_members` equals row count in `profiles` |
| 0.2 | Migration: swap every ERP policy from `true` or `is_viewer()` to `is_member('erp')` or `can_write('erp')`, including storage and `audit_log` | `npm run security` passes, plus new probe: an account with no membership reads 0 rows from every table |
| 0.3 | Extend `security/probe.mjs` with cross-workspace checks | Probe fails when any policy is reverted (mutation check, per D100) |
| 0.4 | Decide the Papa backup destination. Not the public repository | Owner decision recorded |
| 0.5 | Fix or work around C9 so the ERP app can deploy again | `verify.yml` runs a job with steps |

Risk: 0.2 changes access to production money tables. Take a manual backup first (`npm run backup`),
apply during a quiet hour, and run `npm run e2e` against production read paths right after.
Rollback is a migration that restores the previous policies, written and tested before 0.2 runs.

## Phase 1: Skeleton and masters

| Step | Work |
|---|---|
| 1.1 | `apps/papa`: Vite + React 18, same Supabase client, own Vercel project, own CSP |
| 1.2 | Copy the proven modules from `apps/web/src` (money parsing, `bare()`, errors, ui primitives). Extracting a shared package touches the ERP app and waits until later |
| 1.3 | Migrations: `papa_config`, `papa_workers`, `papa_projects`, `papa_billings`, audit triggers, locks, RLS |
| 1.4 | Screens: Settings, Masterlist, Projects board and detail (static totals) |
| 1.5 | Membership check screen |

Exit: a `papa` admin can manage workers and projects. An `erp`-only account sees nothing.

## Phase 2: Money (blocked on Q1 to Q4)

| Step | Work |
|---|---|
| 2.1 | `papa_cash_entries`, `papa_daily_summary` view, Cash Flow screen |
| 2.2 | `papa_attendance`, Attendance screen |
| 2.3 | `papa_payroll_runs`, `papa_payroll_lines`, pay RPC, Payroll screen |
| 2.4 | `papa_payables`, `papa_payable_payments`, payment RPC, Payables screen |
| 2.5 | `papa_project_totals` view, live project totals |

Exit: PRD acceptance criteria 2 to 5 pass as unit tests on the formulas and e2e tests on the RPCs.

## Phase 3: Dashboard, materials, receivables

| Step | Work |
|---|---|
| 3.1 | Dashboard with the four cards and drill-downs |
| 3.2 | `papa_materials`, Materials screen (needs Q7) |
| 3.3 | Receivables view derived from billings and collections |

## Phase 4: Forecast (blocked on Q9)

Expected Collection, Estimated Payroll Costs, Estimated Materials Costs. No formulas exist yet.

## What is not reused from the ERP process

The ERP tracker ran 47 adversarial review rounds. Papa inherits the fixes those rounds produced
(section 7 of the PRD), not the loop. Each phase gets one review pass focused on money paths and
RLS. If a pass finds a money-path defect, the phase gets another pass.
