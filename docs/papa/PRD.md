---
title: Papa Tracker PRD
tags: [papa, construction, prd, planning]
created: 2026-09-24
status: draft, awaiting owner answers in section 9
source: "[[construction.csv]] (identical to the `papa` tab of the Google Sheet, verified cell for cell)"
decisions: "[[Decisions]] D102, D103"
related:
  - "[[Data Model]]"
  - "[[App Flows]]"
  - "[[Build Plan]]"
---

# Papa Tracker PRD

## 1. Problem

The family construction business runs projects, a daily crew, cash, payroll and debts from notebooks
and a spreadsheet. Nobody can answer three questions quickly:

1. How much cash is on hand today, and where did it go?
2. Is each project making or losing money against its contract and budget?
3. Who is owed what, and when?

## 2. Users

| User | Needs | Access |
|---|---|---|
| Owner (Papa) | Dashboard, project profit, cash position, debts | Admin in `papa` workspace |
| Bookkeeper (girlfriend) | Enter cash, attendance, payroll, payables | Admin in `papa` and `erp` workspaces |
| Foreman | Record attendance for his project (later phase) | Not in scope for v1 |

Accounts in one workspace must not see the other workspace's data. See D103.

## 3. Goals

- One running cash balance per day, computed, never typed.
- Per-project contract, billed, collected, outstanding, budget and actual cost.
- Payroll computed from attendance and the worker masterlist.
- Every payable and debt visible with its next due date.
- Same money-safety rules as the ERP tracker: `numeric(14,2)`, the D94 and D99 parsing rules, Manila day boundaries (D95), audit log on every table (D24).

## 4. Non-goals for v1

- Foreman or worker self-service logins.
- Bank reconciliation, BIR tax forms, invoices as documents.
- Offline mode.
- Multi-currency. Papa operates in PHP only.

## 5. Sidebar sections

Column A of the sheet defines the sidebar. Columns O to T define lookup lists and extra modules that
the sheet does not place in column A. v1 surfaces them as follows.

| Sidebar item | Source in sheet | v1 |
|---|---|---|
| Dashboard | A3 | Yes |
| Projects | A32, with the Zone CRM Pipeline reference | Yes |
| Cash Flow | A18, plus Expenses fields in S3:T11 | Yes |
| Attendance | A9 | Yes |
| Payroll | A40 | Yes |
| Payables | A48, merged with Debts in S23:T35 (see Q2) | Yes |
| Materials | S12:T22 | Yes, phase 3 |
| Masterlist | Worker Masterlist O40:P47 | Yes |
| Receivables | O57, placeholder | Derived view, phase 3 |
| Forecast | S36:T39 | Phase 4, needs formulas |
| Settings | Lookup lists in O3:P37 | Yes |

## 6. Screen requirements

### 6.1 Dashboard

Shows exactly the four items in A3 to A7. It does not copy the ERP tracker's status tiles.

| Card | Content |
|---|---|
| Projects | Count by status (Active, Complete, Hold, Cancelled). Top active projects with contract, collected, outstanding |
| Daily Cash Flow Summary | Today: beginning balance, cash in, cash out, ending balance. Last 7 days sparkline |
| Payables | Next due dates, overdue first |
| Debts | Open balances by creditor name and amount |

Every card links to its full screen, pre-filtered.

### 6.2 Projects

- List view grouped by status, styled after the Zone CRM Pipeline screen in the CraftUI kit (Q5).
- Detail view fields: Project / Client Name, Location, Foreman Assigned, Project Status, Start Date,
  Target Finish, Contract Amount, Budget Cost.
- Computed, read-only: Amount Billed, Amount Collected, Outstanding, Actual Cost. Formulas in
  [[Data Model]] section 4.
- Detail tabs: Cash entries, Attendance, Payroll runs, Materials for this project.

### 6.3 Cash Flow

- Daily Summary block is read-only: Date, Beginning Balance, Total Cash In, Total Cash Out,
  Ending Balance. Beginning balance of a day equals the ending balance of the previous day.
- `+ Add Transaction` form: Date, Project (dropdown), Category (dropdown), Description (text),
  Cash In or Cash Out, Remarks (text), Receipt (optional upload).
- Category `Cash Advance` requires a Worker. Payroll reads it (Q3).
- Cash In uses income categories, Cash Out uses expense categories (Q4).
- The Expenses fields in S3:T11 map onto cash-out entries. A separate Expenses screen is a filtered
  view, not a second table (Q6).

### 6.4 Attendance

- Pick Date and Project.
- Worker list fills from the masterlist: active workers assigned to that project. Position fills
  automatically.
- Per worker: Time In, Time Out, Remarks. Hours are computed.
- One record per worker per date.

### 6.5 Payroll

- Pick Pay Period (date range) and Project (Client Name, Location).
- One line per worker with attendance in the period: Position, Rate per day, Days/Hrs Worked,
  Gross Pay, Cash Vale, Other Deductions, Net Pay, Payment Status.
- Gross Pay formula pending Q1. The sheet's `Rate * Total work hours` multiplies a daily rate by
  hours and is not used as written.
- Cash Vale defaults to the worker's unrecovered cash advances in the period. Editable.
- Net Pay = Gross Pay minus Cash Vale minus Other Deductions. Must not go below zero.
- Marking a line Paid writes one cash-out entry, category `Salary`, linked to the project.

### 6.6 Payables (Payables and Debts merged, pending Q2)

- Fields: Creditor Name, Debt Type (Supplier, Worker, Personal, Loan), Original Amount, Amount Paid,
  Balance, Priority, Frequency of Payment, Last Payment, Next Payment, Status, Contact, receipt uploads.
- Amount Paid is the sum of recorded payments. Balance is computed. Status is computed from the
  payments: Pending, Partial Paid (shows percent), Paid. Hold is set by hand.
- Recording a payment writes one cash-out entry.

### 6.7 Materials

- Fields: Project, Date Requested, Material, Qty, Unit, Unit Cost, Total Cost (computed), Supplier,
  Status, Receipt.
- Status list is missing from the sheet (Q7).

### 6.8 Masterlist

- Worker Name, Position, Daily Rate, Project Assigned, Start Date, Status, Phone Number.
- Positions come from Settings.

### 6.9 Settings

Editable lookup lists: Project Status, Expense Categories, Income Categories, Worker Positions,
Debt Types, Materials Status. Same edit pattern as the ERP Settings screen.

## 7. Rules carried over from the ERP tracker

These are not optional. Each exists because a review round found money written wrong.

- Amounts parse through the same guarded path (D93, D94, D99).
- Lookups index through `bare()` objects (D90).
- Dates are Manila calendar days (D95).
- Every table gets the audit trigger (D24).
- Server-managed columns are locked (the `lock_*_server_managed_columns` pattern).

## 8. Acceptance criteria for v1

1. A `papa`-only account cannot read any ERP table, any ERP receipt file, or any ERP audit row, and the reverse holds. Proven by `npm run security`.
2. Cash Flow ending balance for any day equals opening balance plus all cash in minus all cash out up to and including that day.
3. A payroll line's Net Pay matches the agreed Q1 formula for every test worker.
4. Recording a payable payment updates Amount Paid, Balance, Status and the day's cash out in one transaction.
5. Project Outstanding equals Billed minus Collected.
6. Existing ERP screens behave exactly as before for existing accounts. `npm test` and `npm run e2e` stay green.

## 9. Open questions (owner answers required)

Each question has a proposed default. Nothing in the proposal is confirmed.

| # | Question | Proposed default |
|---|---|---|
| Q1 | Payroll: daily rate times days, or hourly? Is lunch deducted? Half days? | Gross = Daily Rate x Days Worked. A day with 4 hours or more counts as 1, under 4 counts as 0.5. Hours shown for reference only |
| Q2 | Are Payables (A48) and Debts (S23) the same thing? | Yes, one table. Dashboard shows it two ways: by due date and by creditor |
| Q3 | Should cash advances be tied to a worker? | Yes, required when category is Cash Advance |
| Q4 | What are the Cash In categories? | Client Collection, Capital Infusion, Loan Proceeds, Refund, Other Income |
| Q5 | Does "Opportunity (ref. Zone CRM)" mean the Pipeline board layout? | Yes, status columns with project cards |
| Q6 | Is an Expense the same as a Cash Out entry? | Yes. Unpaid bills go to Payables |
| Q7 | Materials status values? | Requested, Ordered, Delivered, Cancelled |
| Q8 | What is the opening cash balance, and from what date? | Owner enters once in Settings |
| Q9 | Forecast formulas for Expected Collection, Estimated Payroll, Estimated Materials? | Deferred to phase 4 |
| Q10 | Who gets `papa` access, and with which role? | Owner and bookkeeper as admin |
| Q11 | Where does Amount Billed come from? | A billing entry per project (date, amount, note) |
