# Backup manifest

Written by `apps/web/scripts/backup.mjs`. Do not edit by hand.

| | |
|---|---|
| Taken | 2026-09-02T11:15:59.739Z |
| Project | jusifpditdigqdjiwdaj.supabase.co |
| `txns` rows | 21 |
| `receipts` rows | 0 |
| `recurring` rows | 0 |
| `transfers` rows | 9 |
| `app_config` rows | 1 |
| `audit_log` rows | 1129 |
| `profiles` rows | 4 |
| Accounts in the roster | 4 (1 with no recoverable email) |
| Stored files | 0 |
| Transactions total | ₱226,000.00 |
| Receipts released | ₱0.00 |

Restoring means recreating the accounts first, then the rows — see [the README](README.md).
The accounts step is not optional: without it `profiles` cannot be restored, and without
`profiles` every account comes back as a viewer.
