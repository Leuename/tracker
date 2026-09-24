# Backup manifest

Written by `apps/web/scripts/backup.mjs`. Do not edit by hand.

| | |
|---|---|
| Taken | 2026-09-24T21:06:08.162Z |
| Project | jusifpditdigqdjiwdaj.supabase.co |
| `txns` rows | 49 |
| `receipts` rows | 4 |
| `recurring` rows | 0 |
| `transfers` rows | 12 |
| `app_config` rows | 1 |
| `audit_log` rows | 15380 |
| `profiles` rows | 5 |
| `fx_rates` rows | 16 |
| Accounts in the roster | 5 |
| Stored files | 1 |
| Transactions total | ₱2,226,438.00 |
| Receipts released | ₱15,000.00 |

Restoring means recreating the accounts first, then the rows — see [the README](README.md).
The accounts step is not optional: without it `profiles` cannot be restored, and without
`profiles` every account comes back as a viewer.
