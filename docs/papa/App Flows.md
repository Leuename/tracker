---
title: Papa Tracker App Flows
tags: [papa, construction, flows, ux]
created: 2026-09-24
status: draft
related:
  - "[[PRD]]"
  - "[[Data Model]]"
---

# Papa Tracker App Flows

## 1. Sign-in and workspace check

`apps/papa` and `apps/web` are separate deployments on the same Supabase project (D103). Each app
checks membership for its own workspace only.

```mermaid
flowchart TD
  A[Sign in to apps/papa] --> B{Member of papa?}
  B -- yes --> D[Papa Dashboard]
  B -- no --> F[No access screen, sign out]
```

The check is for the user's benefit. It is not the security boundary: RLS filters every query,
so an account without `papa` membership gets zero rows even if it bypasses the screen.

## 2. Daily bookkeeping loop

```mermaid
flowchart LR
  A[Open Cash Flow] --> B[+ Add Transaction]
  B --> C{Cash In or Cash Out}
  C -- In --> D[Income category, project, amount]
  C -- Out --> E[Expense category, project, amount]
  E --> F{Category is Cash Advance?}
  F -- yes --> G[Worker required]
  F -- no --> H[Save]
  G --> H
  D --> H
  H --> I[Daily Summary recomputes]
  I --> J[Dashboard cash card updates]
```

## 3. Attendance to payroll

```mermaid
flowchart TD
  A[Attendance: pick date and project] --> B[Worker list fills from masterlist]
  B --> C[Enter time in and time out per worker]
  C --> D[Save day]
  D --> E[Payroll: pick period and project]
  E --> F[Lines built from attendance in the period]
  F --> G[Cash Vale defaults from unrecovered cash advances]
  G --> H[Review and edit deductions]
  H --> I[Mark line Paid]
  I --> J[RPC writes cash out, category Salary]
  J --> K[Project Actual Cost and Daily Summary update]
```

## 4. Payable lifecycle

```mermaid
stateDiagram-v2
  [*] --> Pending: payable created
  Pending --> PartialPaid: payment less than balance
  PartialPaid --> PartialPaid: another partial payment
  PartialPaid --> Paid: balance reaches 0
  Pending --> Paid: full payment
  Pending --> Hold: set by hand
  PartialPaid --> Hold: set by hand
  Hold --> Pending: released, nothing paid
  Hold --> PartialPaid: released, some paid
  Paid --> [*]
```

Each payment: amount, date, optional receipt. The RPC writes the payment row and a cash-out entry in
one transaction.

## 5. Project lifecycle

```mermaid
stateDiagram-v2
  [*] --> Active: project created
  Active --> Hold
  Hold --> Active
  Active --> Complete
  Active --> Cancelled
  Hold --> Cancelled
  Complete --> [*]
  Cancelled --> [*]
```

Project detail money flow:

```mermaid
flowchart LR
  B[Billing entries] --> BL[Amount Billed]
  CI[Cash in, Client Collection] --> CO[Amount Collected]
  BL --> OS[Outstanding = Billed - Collected]
  CO --> OS
  X[Cash out for project] --> AC[Actual Cost]
  P[Payroll paid] --> X
  M[Materials paid] --> X
  AC --> V[Budget variance = Budget - Actual]
```

## 6. Dashboard drill-down

| Card | Click opens |
|---|---|
| Projects count by status | Projects board filtered to that status |
| Daily Cash Flow Summary | Cash Flow on today |
| Payables due date row | Payables filtered to that payable |
| Debts creditor row | Payables filtered to that creditor |
