---
title: Papa Tracker Data Model
tags: [papa, construction, schema, rls, workspace]
created: 2026-09-24
status: draft. The SQL here is a design sketch, not a migration. Nothing is applied.
decisions: "[[Decisions]] D103"
related:
  - "[[PRD]]"
  - "[[Build Plan]]"
---

# Papa Tracker Data Model

## 1. Constraint from the current schema

Every ERP read policy today is `using (true)` for `authenticated`. See
`supabase/migrations/20260901170544_viewer_role.sql` and `20260903204135_private_is_viewer.sql`.
`audit_log` has the same open read policy, and it stores full `before` and `after` row images.

Consequence: the moment a `papa`-only account exists, it can read the whole ERP ledger, and every
ERP account can read Papa's payroll and worker phone numbers, directly or through `audit_log`.

So workspace scoping is not only for the new tables. **The existing ERP policies must change first.**

## 2. Workspace membership

```sql
create table public.workspace_members (
  user_id    uuid not null references auth.users (id) on delete cascade,
  workspace  text not null check (workspace in ('erp', 'papa')),
  role       text not null check (role in ('admin', 'viewer')),
  created_at timestamptz not null default now(),
  primary key (user_id, workspace)
);

-- Seed: every current account keeps exactly the access it has today, in 'erp' only.
insert into public.workspace_members (user_id, workspace, role)
select user_id, 'erp', role from public.profiles;

create or replace function private.is_member(ws text)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.workspace_members m
    where m.user_id = auth.uid() and m.workspace = ws
  );
$$;

create or replace function private.can_write(ws text)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.workspace_members m
    where m.user_id = auth.uid() and m.workspace = ws and m.role = 'admin'
  );
$$;
```

`workspace_members` itself: members read their own rows only. No client writes. Membership is
granted by migration or by an admin-only RPC later.

`profiles.role` and `private.is_viewer()` stay in place during the switch, then retire once no
policy references them. The FX account keeps its single uid-named policy on `fx_rates`.

## 3. ERP policy change (phase 0)

For each of `txns`, `receipts`, `recurring`, `transfers`, `app_config`, `fx_rates` (read side):

```sql
-- before: for select to authenticated using (true)
-- after:
create policy "erp members may read the tracker" on public.txns
  for select to authenticated using (private.is_member('erp'));
-- writes: replace `not private.is_viewer()` with `private.can_write('erp')`
```

Storage bucket `receipts`: same substitution. Papa gets its own bucket, `papa-receipts`.

`audit_log` read policy becomes a mapping from `tbl` to workspace:

```sql
create policy "members may read their workspace's audit rows" on public.audit_log
  for select to authenticated using (
    case when tbl like 'papa\_%' then private.is_member('papa')
         else private.is_member('erp') end
  );
```

## 4. Papa tables

All tables live in `public` with a `papa_` prefix. Money is `numeric(14,2)`, never negative unless
stated. `id` follows the ERP convention. Every table gets the `log_change()` audit trigger and a
server-managed-column lock.

| Table | Key columns | Notes |
|---|---|---|
| `papa_config` | one row, `lists jsonb` | Lookup lists, same pattern as `app_config` |
| `papa_workers` | `name, position, daily_rate, project_id, start_date, status, phone` | Masterlist |
| `papa_projects` | `client_name, location, foreman_id, status, start_date, target_finish, contract_amount, budget_cost` | Billed, collected, actual cost are computed, not stored |
| `papa_billings` | `project_id, date, amount, note` | Source of Amount Billed (Q11) |
| `papa_cash_entries` | `date, direction ('in','out'), category, amount, project_id, worker_id, description, remarks, receipt_path, source, source_id` | One ledger. `worker_id` required when `category = 'Cash Advance'` (Q3). `source` marks rows written by payroll or payables |
| `papa_attendance` | `date, project_id, worker_id, time_in, time_out, remarks` | `unique (date, worker_id)`. `time_out > time_in` |
| `papa_payroll_runs` | `project_id, period_start, period_end, status` | `period_end >= period_start` |
| `papa_payroll_lines` | `run_id, worker_id, position, daily_rate, days_worked, hours_worked, gross, cash_vale, other_deductions, net, payment_status` | Position and rate are snapshots at run time. `net >= 0` |
| `papa_payables` | `creditor_name, debt_type, original_amount, priority, frequency, next_payment, status, contact` | Payables and Debts merged (Q2) |
| `papa_payable_payments` | `payable_id, date, amount, cash_entry_id, receipt_path` | Amount Paid, Balance, Last Payment derive from here |
| `papa_materials` | `project_id, date_requested, material, qty, unit, unit_cost, supplier, status, receipt_path` | Total Cost = qty x unit_cost, computed |

Every `papa_*` table gets the same four policies:

```sql
create policy "papa members read"   on public.papa_projects for select to authenticated using (private.is_member('papa'));
create policy "papa admins insert"  on public.papa_projects for insert to authenticated with check (private.can_write('papa'));
create policy "papa admins update"  on public.papa_projects for update to authenticated using (private.can_write('papa')) with check (private.can_write('papa'));
create policy "papa admins delete"  on public.papa_projects for delete to authenticated using (private.can_write('papa'));
```

## 5. Computed values

| Value | Formula |
|---|---|
| Day ending balance | opening balance + sum(in) - sum(out) for all entries with `date <= day` |
| Day beginning balance | ending balance of the previous day |
| Amount Billed | sum(`papa_billings.amount`) for the project |
| Amount Collected | sum(cash in, category `Client Collection`, for the project) |
| Outstanding | Billed - Collected |
| Actual Cost | sum(cash out for the project). Payroll and materials reach it through the cash entries they write |
| Payable Amount Paid | sum(`papa_payable_payments.amount`) |
| Payable Balance | original_amount - amount paid |
| Payable Status | 0 paid: Pending. Between: Partial Paid (percent). Full: Paid. Hold is manual |
| Payroll Gross | pending Q1 |
| Cash Vale default | sum(Cash Advance entries for the worker in the period not yet deducted) |
| Hours worked | time_out - time_in, break rule pending Q1 |

Implement as SQL views (`papa_daily_summary`, `papa_project_totals`, `papa_payable_totals`) so the
client never recomputes money. Views use `security_invoker = true` so RLS still applies.

Writes that touch two tables (payroll paid, payable payment) go through `security definer` RPCs
that check `private.can_write('papa')` and run in one transaction.

## 6. Backups

`backup.yml` commits a full snapshot into `backups/` in this repository, and the repository is
public. Adding `papa_*` tables to `TABLES` in `apps/web/scripts/backup.mjs` would publish worker
names, phone numbers, daily rates and the family's debts.

The backup account also reads through RLS, so after phase 0 it only sees the workspaces it belongs
to. Papa backups need a destination that is not a public repository before the backup account is
added to `papa`. See [[Build Plan]] phase 0.
