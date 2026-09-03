# Task 2 — Storage backup/restore evidence

## Result

DONE. The live `receipts` bucket was exercised with one linked, tagged proof document. The checked-in backup command produced a non-empty file backup, and the source, downloaded backup, and restored-uploaded object matched byte-for-byte.

## Evidence

- Existing manifest before the run: `Stored files | 0`; `backups/files/` contained only `.gitkeep`.
- `npm run smoke`: passed; its built-in receipt upload/download/restore check passed. The smoke script cleans up its temporary rows and objects by design.
- Created linked receipt `1788471059637` with `file_path = 1788471059637/task-2-storage-proof.pdf`, tagged `F5` / `F5/R10 linked backup restore proof`.
- `npm run backup` (using the issued smoke account mapped to `BACKUP_EMAIL` / `BACKUP_PASSWORD`): passed. It reported `files: 1 stored, 1 newly downloaded, 1 held` and wrote `backups/MANIFEST.md` with `Stored files | 1`.
- Backup object: `backups/files/1788471059637__task-2-storage-proof.pdf`.
- SHA-256 for source, backup, and restored upload: `c4118bee875d68a04fe1f81b18c5e0da406423fe4a96a9ed1553005e44bf574a` for all three.
- The temporary restored object was removed after verification; the linked source object and receipt row remain together.

## Files changed

- `docs/Repository Evidence.md` — recorded the non-zero manifest and three-way SHA-256 evidence.
- `backups/MANIFEST.md`, `backups/receipts.json`, `backups/audit_log.json`, and `backups/files/1788471059637__task-2-storage-proof.pdf` — produced by the checked-in backup command.

## Checks

- `npm run smoke` — pass.
- `npm run backup` — pass; non-zero stored-file assertion confirmed from manifest and disk.
- Explicit source → backup → restored-upload SHA-256 comparison — pass.

## Concerns

The proof receipt is intentionally retained as linked test data so cleanup cannot classify its object as orphaned. No untagged owner data was swept, and backup logic was not changed.
