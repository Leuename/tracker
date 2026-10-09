# Backup manifest

Written by `apps/web/scripts/backup.mjs`. Do not edit by hand.

| | |
|---|---|
| Taken | 2026-10-09T13:03:21.603Z |
| Project | jusifpditdigqdjiwdaj.supabase.co |
| `txns` rows | 49 |
| `receipts` rows | 4 |
| `recurring` rows | 0 |
| `transfers` rows | 12 |
| `app_config` rows | 1 |
| `audit_log` rows | 18154 |
| `profiles` rows | 6 |
| `fx_rates` rows | 60 |
| Accounts in the roster | 6 |
| Stored files | 1 |
| Transactions total | ₱2,226,438.00 |
| Receipts released | ₱15,000.00 |

Restoring means recreating the accounts first, then the rows — see [the README](README.md).
The accounts step is not optional: without it `profiles` cannot be restored, and without
`profiles` every account comes back as a viewer.
