---
title: Seeded Data Backup
tags: [backup, demo-data, seed, erp, tracker]
created: 2026-09-01
status: archived
related:
  - "[Decisions](../Decisions.md) — D12 is the decision that made this folder necessary"
  - "[Handoff](../Handoff.md) — the dated record of the clear"
up: "[AI Agent Context](../AI%20Agent%20Context.md)"
---

# Seeded Data Backup

The demo rows that filled the ledger from **2026-08-31** until the owner cleared it on
**2026-09-01**. Kept as an archive so the pre-clear state is recoverable and so nobody has to
reconstruct what "the demo data" was.

**None of this is real.** Every company, person, amount and date here was invented for the
prototype. It must never be restored into a ledger holding genuine payables — invented rows
beside real ones are told apart only by their amounts.

## What is here

`seed-data.json` — the complete seed, in **database column shape** (`description`, `pay_type`,
`due_date`), not the app's shape (`desc`, `payType`, `dueDate`). That is deliberate: the objects
can be inserted directly without translation.

| Table | Rows | Total |
|---|---:|---:|
| `txns` | 20 | ₱1,142,100 |
| `receipts` | 6 | ₱210,000 |
| `recurring` | 6 | ₱440,200 |
| `app_config` | 1 | 3 notes, 21 companies, 13 categories, settings |

Those totals were read from the live database immediately before the delete and match this file
exactly, which is what establishes it as a faithful copy rather than an approximation.

## Where it came from

`apps/web/src/data.js` → `initialState`, mapped through `apps/web/src/rows.js`. The seed arrays
are still in `data.js`; what was removed on 2026-09-01 was the `seed()` **call** in
`apps/web/src/db.js`, not the data. A new workspace now opens empty via `start()`.

Two small drifts existed in the live copy at delete time and are **not** reproduced here, because
they were test residue rather than seed: one transaction had been marked paid by check, and one
receipt liquidated at ₱999. Both came from earlier test runs.

## Restoring it

Only ever into an empty or throwaway workspace.

```bash
# From apps/web, with .env.local present.
node --env-file=.env.local -e "
import('./src/supabase.js').then(async ({ supabase }) => {
  await supabase.auth.signInWithPassword({ email: process.env.E, password: process.env.P })
  const seed = require('../docs/seeded-data-backup/seed-data.json')
  await supabase.from('txns').insert(seed.txns)
  await supabase.from('receipts').insert(seed.receipts)
  await supabase.from('recurring').insert(seed.recurring)
  await supabase.from('app_config').update({ data: seed.app_config }).eq('id', true)
})"
```

Two things that will bite:

- **`created_at` is not in this file and cannot be set by a client.** Migration
  `lock_server_managed_columns` revoked that grant. Restored rows carry today's timestamp.
- **The `app_config` row must already exist**, or use `insert` with `id: true` instead of
  `update`. `load()` reads a missing config row as "never used".

## Why this folder exists at all

The owner asked for it when clearing the demo data. It also stands in, partially, for something
the project does not yet have: the Supabase project is on the free plan, where **database backups
are not available for download** and projects pause after a 7-day low-activity window. This file
is a snapshot of invented data, not a backup strategy — see the open items in
[the continuation package](../../handoff/2026-09-01%20Repository%20Restructure%20and%20Data%20Clear.md).

## Guideline Basis

- **PG-03** keeps this archived export separate from the authored source it was derived from.
- **DOC-02** records what was observed at delete time and distinguishes it from the reconstruction.
- **SEC-03** applies by absence: this file holds invented data only, and no credential.

implements: [Awesome Guidelines Integration](../Awesome%20Guidelines%20Integration.md)

Related: [Decisions](../Decisions.md) · [Handoff](../Handoff.md) · [Repository Evidence](../Repository%20Evidence.md)
