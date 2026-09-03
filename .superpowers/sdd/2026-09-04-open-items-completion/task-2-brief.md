### Task 2: Exercise storage paging against a non-empty bucket (F5/R10)

**Files:**
- Read: `apps/web/scripts/backup.mjs` (`listAll(prefix)`, `cleanupOrphanFiles()`)
- Read: `backups/files/`, `backups/MANIFEST.md`, `backups/README.md`
- Test: existing `npm run smoke` path and backup workflow

**Interfaces:**
- Consumes: one real receipt document created through the normal liquidation-upload path and its linked `receipts` row.
- Produces: a backup containing the stored object and a byte-for-byte restore check.

- [ ] **Step 1: Recheck whether the current manifest already proves a non-empty bucket**

  If a recent manifest contains a real stored file and the corresponding bytes are present in `backups/files/`, do not create another document; verify its receipt link and proceed to Step 4.

- [ ] **Step 2: Create one linked document through the UI/smoke path**

  Use the existing liquidation-upload path or `npm run smoke`. Keep the generated receipt and object tagged/linked so `cleanupOrphanFiles()` cannot classify it as orphaned.

- [ ] **Step 3: Run the backup workflow and inspect the manifest**

  Run the checked-in backup command/workflow with its documented credentials. Assert that `files` is nonzero and the expected object exists under `backups/files/`; do not infer completeness from a successful process exit.

- [ ] **Step 4: Prove the bytes survive both hops**

  Compare the source, downloaded backup, and restored/uploaded object SHA-256 values. The check fails if `listAll()` stops after a full page, if the object is omitted, or if cleanup deletes the linked file.

- [ ] **Step 5: Record F5/R10 evidence**

  Update `docs/Repository Evidence.md` with the observed nonzero manifest and byte comparison. Preserve the existing `listAll()` boundary unit tests; no new dependency is needed.

**Checkpoint:** A non-empty bucket and a byte-for-byte restore are required. An empty `files: 0` manifest remains unproven.

---

