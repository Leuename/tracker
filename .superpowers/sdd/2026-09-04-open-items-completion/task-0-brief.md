### Task 0: Establish the current baseline

**Files:**
- Read: `handoff/2026-09-04 Open Items Brief for Codex.md`
- Read: `handoff/2026-09-04 Exchange Rates and R7 Production Rollout.md`
- Read: `docs/Decisions.md`, `docs/Repository Evidence.md`, `supabase/README.md`, `backups/README.md`, `AGENTS.md`, `CLAUDE.md`

**Interfaces:**
- Consumes: current repository, production Supabase project `jusifpditdigqdjiwdaj`, rehearsal project `bucmcnsjkuprpojhequy`.
- Produces: a dated baseline containing repository, migration, ledger, roster, rates, and backup-manifest state.

- [ ] **Step 1: Fetch and inspect repository state**

  ```bash
  cd /Users/itadmin/Desktop/puge
  git fetch origin
  git log origin/main..HEAD
  git status --short
  ```

  Expected: the divergence is understood before any action; do not assume a clean tree or that `origin/main` is current.

- [ ] **Step 2: Run offline checks**

  ```bash
  cd /Users/itadmin/Desktop/puge/apps/web
  npm test
  npm run build
  npm audit
  ```

  Expected: 66 tests pass, build succeeds, and audit reports zero vulnerabilities. Record any drift before continuing.

- [ ] **Step 3: Read live SQL state without writing**

  Run the SQL in §6 of the brief through an approved read-only Supabase path. Assert, rather than infer, the transaction fingerprint, 15-migration R7 shape, six priced released wires, three null pending wires, and five-account roster.

- [ ] **Step 4: Inspect the backup manifest**

  ```bash
  cd /Users/itadmin/Desktop/puge
  git show origin/main:backups/MANIFEST.md
  ```

  Record whether the manifest is the first post-R7/FX snapshot, whether `audit_log rows` is at least the verified live count, whether the roster is 5, and whether stored files are nonzero. This determines whether Task 2 is still open.

**Checkpoint:** Do not start Tasks 1–4 until the baseline is recorded and any drift is explained as owner activity, a stale snapshot, or a defect.

---

