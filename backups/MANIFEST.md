# Backup manifest

Written by `apps/web/scripts/backup.mjs`. Do not edit by hand.

| | |
|---|---|
| Taken | 2026-09-03T11:02:55.538Z |
| Project | jusifpditdigqdjiwdaj.supabase.co |
| `txns` rows | 21 |
| `receipts` rows | 1 |
| `recurring` rows | 0 |
| `transfers` rows | 9 |
| `app_config` rows | 1 |
| `audit_log` rows | 1389 |
| `profiles` rows | 4 |
| Accounts in the roster | 4 |
| Stored files | 0 |
| Transactions total | ₱226,000.00 |
| Receipts released | ₱10,000.00 |

Restoring means recreating the accounts first, then the rows — see [the README](README.md).
The accounts step is not optional: without it `profiles` cannot be restored, and without
`profiles` every account comes back as a viewer.
