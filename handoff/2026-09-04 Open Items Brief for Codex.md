---
title: Open Items Brief for Codex
tags: [handoff, brief, codex, open-items, supabase, backups, testing, security]
created: 2026-09-04
status: current
kind: technical brief for an external agent — only what is still open, with exact paths
extends: "handoff/2026-09-03 Exchange Rates Shipped, What Is Still Open.md and handoff/2026-09-04 Exchange Rates and R7 Production Rollout.md; stable IDs reused, never renumbered"
---

# Open Items Brief for Codex

**Every path in this file is an exact relative path from the repository root, and no wikilinks are
used.** A previous consultation returned nothing because its code-navigation tooling was
unreachable and its policy forbade falling back to file reads. If any tool you need is unavailable,
say so immediately and read the files directly instead of returning empty.

Repository root: `/Users/itadmin/Desktop/puge`. Everything runnable lives in `apps/web/`.

---

## 0. Read these first, in this order

| Path | Why |
|---|---|
| `handoff/2026-09-03 Ten Closed, and a Backup Nobody Had Deployed.md` | Traps 1–63. All still apply |
| `handoff/2026-09-03 Remediation Brief for an External Agent.md` | The stable R/F/N/Q ids this file reuses |
| `handoff/2026-09-03 Exchange Rates Shipped, What Is Still Open.md` | The fx build, F7, and §4's read-policy note |
| `handoff/2026-09-04 Exchange Rates and R7 Production Rollout.md` | R7 + the backfill, as executed |
| `docs/Decisions.md` | D1–D45. D42–D45 are the newest and govern most of what follows |
| `supabase/README.md` | Fifteen migrations, the rename note, the "new table needs five things" rule |
| `backups/README.md` | The restore procedure |
| `AGENTS.md` and `CLAUDE.md` | Identical by rule. Change both or neither |

## 1. State, verified 2026-09-04

Do not trust this past the moment you start acting. Re-verify with §6.

| | |
|---|---|
| `main` | `485ec25`, `origin/main..HEAD` empty, working tree clean |
| Production Supabase | `jusifpditdigqdjiwdaj` — **15 migrations**, `private.is_viewer` present, `public.is_viewer` **absent** |
| Rehearsal Supabase | `bucmcnsjkuprpojhequy` — 15 migrations, same shape, `audit_log` 252 rows |
| Off limits | `lasycakyudaawrydetnm` (`zone-offices`) — a live CRM belonging to someone else. Paused. Do not touch |
| Accounts | 5 — four `admin`, one `viewer` (the rates account) |
| `txns` | 21 rows, ₱226,000.00, fingerprint `05a080127ca18b46dc693edbd22b5168` |
| `transfers` | 9 — six released and priced at ECB 2026-09-02, three pending and deliberately `null` |
| `fx_rates` | 4 rows |
| `audit_log` | 1,569 |
| Security advisors | **one** `WARN` (leaked-password, Pro-only). The `is_viewer` advisor closed when R7 landed |
| Performance advisors | three `INFO` unused-index. **N2: do not remove them** |
| `npm test` | 66/66 · `npm run security` 56/56 · `npx playwright test --workers=1` 29/29 |

---

## 2. What is open

Ordered by value. IDs are stable across all four briefs — cite them, never renumber them.

### 2.1 — R2/R9 · `audit_log` has never been restored at full volume

**Where:** `backups/README.md`, `backups/audit_log.json`, `backups/verify-restore.sql`

**State:** 252 of 1,569 rows exist on the rehearsal project. The mechanism, the fidelity and the
sequence fix are all proven; **bulk transport is not.** A prior attempt through an agent tool failed
at chunk 5 of ~23 — the file is large and a tool payload is the wrong transport.

**This is an operator job, not an agent job** ([D39](docs/Decisions.md)). Use `psql \copy`. If you
do not have a connection string, you cannot do this item — say so rather than attempting a chunked
workaround, which is the thing that already failed.

**Trap 62 and the sequence trap both live here.** After any restore, `setval` on
`audit_log_id_seq` is mandatory: skipping it was *proven* to produce
`23505 duplicate key value violates unique constraint "audit_log_pkey"` on the next audited write —
and it fails days later, not immediately, which is what makes it dangerous.

### 2.2 — `backups/verify-restore.sql` has never been executed

**Where:** `backups/verify-restore.sql` (7,062 bytes, written 2026-09-03)

Its assertions were transliterated into individual `execute_sql` calls and each passed. **The file
itself has never run through `psql`.** It fails on a short count, a roster that is not all admin, a
sequence left behind, a disabled trigger, or a write that is not logged. Same blocker as 2.1 — needs
a connection string. Folds naturally into that work.

### 2.3 — F5/R10 · storage paging has never met a live bucket

**Where:** `apps/web/scripts/backup.mjs` (the `listAll(prefix)` helper), `backups/files/`

`storage.list()` carries the same silent 1,000-row ceiling that truncated `audit_log`, **but offers
no count**, so the strongest available assertion is "a full page means keep going; only a short page
proves the end." That helper is unit-tested against a fake at the 1000/1001 boundary and has
**never run against a non-empty bucket** — the manifest still reads `Stored files | 0`.

**Blocked on a fact, not on permission:** it needs a real stored document at backup time. The
liquidation-upload path in the app is what creates one. Note `cleanupOrphanFiles()` deletes any
stored file no `receipts` row points at — do not leave a dangling object expecting it to survive.

### 2.4 — `fx_rates` has never been through a schema replay

**Where:** `supabase/migrations/20260903144056_fx_rates.sql`, `supabase/README.md` §"What has been proven"

Both recorded replays (2026-09-01, 2026-09-02) predate it. It is proven **live** — administrator
refused on insert and update, rates account permitted, `fx_latest` readable, 56/56 probe — but not
proven to **rebuild into an empty project** the way the first twelve are. The next full replay
should cover it, along with the two R7 migrations.

**Read `supabase/README.md`'s rename note before touching migration filenames.** Those two R7 files
were renamed on 2026-09-04 to the versions MCP actually assigned; their *contents* are byte-identical
to what was applied (`eb46987e91c5de212e224e0f2ade1052`, `c606df3049aa21748e7b9aa1e9e6cbcb`) and must
stay that way. They still cross-reference their old filenames in comments. **That is deliberate** —
byte-identity is evidence of what ran; a tidy comment is not worth destroying it.

### 2.5 — R8 · no network preflight, no retry policy

**Where:** `apps/web/playwright.config.js`

Proposed, deliberately deferred until `workers: 1` had been proven in the wild. It now has been
(29/29, ~1.3 min, repeatedly). Shape proposed: three uncached `GET`s of `baseURL` failing fast with
`NETWORK_PREFLIGHT_SLOW`, plus `retries: process.env.CI ? 0 : 1`.

**N3 still binds: do not raise the Playwright timeouts.** Longer budgets hide the signal instead of
classifying it.

### 2.6 — Owner decisions. Do not act on these unasked

| Item | Where | Note |
|---|---|---|
| `signOut()` scope | `apps/web/src/App.jsx:58` | Defaults to `scope: 'global'`, so signing out on one device revokes that account's session **everywhere**. `{ scope: 'local' }` is a one-word fix. It is live, user-visible behaviour nobody requested changing, and on a shared financial ledger "sign out everywhere" may well be intentional. It also currently underwrites the e2e spec ordering in [D41](docs/Decisions.md) |
| `FX_PASSWORD` rotation | Supabase auth, GitHub secret | **N9 / [D44](docs/Decisions.md). Explicitly deferred by the owner, who asked to be reminded rather than overridden. Do not rotate it.** The rates account is `admin@admin.com`; it can write only `fx_rates`, but every read policy is `using(true)`, so it can read the whole ledger |
| R12 notifications | `.github/workflows/schedule.yml` | Reports only to the Actions job summary. Needs a provider, recipients and an owner decision ([D31](docs/Decisions.md)) |
| R14 `apps/api/` | `apps/api/` | Still an empty directory declaring an intent. Delete it or justify it. Five minutes either way |
| R11 human viewer | Supabase auth | A `viewer` account now exists, but it is a robot credential nobody signs into. If the intent was proving the read-only **UI** path with a person, that is still not done |
| Leaked-password protection | Supabase dashboard | Pro-only. The one remaining advisor |

---

## 3. Non-actions. Each was considered and rejected

`N1`–`N8` are in `handoff/2026-09-03 Remediation Brief for an External Agent.md` §5 and all still
bind. Repeated here only where the reason is easy to lose:

- **N1** — Do **not** revoke `EXECUTE` on any `is_viewer`. Postgres checks it against the *querying*
  role, so every write fails `42501` while reads keep working: the app looks *almost* fine, which is
  worse than an outage ([D34](docs/Decisions.md)). R7 solved this by relocating the function, which
  is the correct fix and is already applied.
- **N2** — Do **not** remove the three unused indexes.
- **N4** — Do **not** reimplement recurrence in SQL ([D31](docs/Decisions.md)).
- **N5** — Do **not** add a credential fallback for `SCHEDULE_*` or `FX_*`. Each credential's
  privilege must stay legible.
- **N7** — Do **not** modify anything under `company_tracker/`. Generated exports, read-only.
- **N8** — Do **not** clean up `audit_log`. Nothing may delete from it, by design.
- **N9** — Do **not** rotate the rates-account password (§2.6).

Also: **never delete a failing security check to make the suite green** ([D26](docs/Decisions.md)),
and **do not copy `fx_rates`'s policy shape onto an ordinary table** — naming one uid instead of
gating on `not private.is_viewer()` is a deliberate one-off ([D42](docs/Decisions.md)).

---

## 4. Traps most likely to bite this specific work

Full list is traps 1–63 across the earlier handoffs. These are the ones that apply to §2:

- **Trap 55 — a fix in the working tree is not a fix in the system.** Nothing here compares
  `origin/main` with `HEAD`. This project has now hit it three times, most recently on 2026-09-04
  when an entire session's R7 documentation sat uncommitted while production had already moved.
  Run `git log origin/main..HEAD` before believing any "shipped" claim, and `git fetch` before
  reading anything off `origin/main` — a stale read caused a false alarm in the same session.
- **Trap 60 — an external agent's report is a snapshot, not a state.** Including this one.
- **Trap 61 — `receipts` growing is the owner working, not residue.** Check for an `E2E-` tag
  before calling anything test data. Never sweep a row that lacks one.
- **`{"success": true}` proves the SQL ran, not that it achieved anything** ([D23](docs/Decisions.md),
  [D25](docs/Decisions.md)). Read `information_schema` back. `TRUNCATE` ignores RLS.
- **Assert the refusal, not the absence of an error.** A blocked policy and a missing row both give
  `row_count = 0`.
- **F7 — `.upsert()` breaks against column-scoped grants.** It compiles `ON CONFLICT DO UPDATE SET`
  naming every payload column including the primary key, and Postgres checks privilege on each one
  even when the value is unchanged. The error is `permission denied for table …`, which is
  grant-shaped, not the RLS-shaped `new row violates row-level security policy`. Split into an
  explicit insert plus a targeted update; do **not** widen the grant.
- **A new table needs five things it does not inherit** — `supabase/README.md` lists them:
  revoke-then-grant, a `for select` policy plus write policies gated on `not private.is_viewer()`,
  an entry in `TABLES` in `apps/web/scripts/backup.mjs`, its own probe checks, and its own
  `log_change()` trigger.

---

## 5. Ground rules

- **There is no staging environment.** `npm run e2e`, `npm run smoke` and `npm run security` all
  **write to production**. The owner uses this system daily during Manila working hours.
- **A push to `main` starts the CI gate; a green gate deploys to production.** Run `npm test`,
  `npm run build`, `npx playwright test --workers=1` and `npm run security` *before* pushing.
- `AGENTS.md` and `CLAUDE.md` are synchronised policies of equal authority. **A shared-policy change
  goes into both in the same commit**, and they must stay byte-identical.
- Migrations are applied through MCP or the dashboard. **MCP assigns the version, not you** — read
  `supabase_migrations.schema_migrations` back afterwards and name the local file to match.
- Never put a credential in a note, a commit message, or `AGENTS.md`/`CLAUDE.md`. Project refs and
  uuids are safe identifiers; passwords and keys are not.

---

## 6. Verify before planning anything

```bash
cd /Users/itadmin/Desktop/puge
git fetch origin && git log origin/main..HEAD    # expect empty; fetch FIRST
git status --short                               # expect clean

cd apps/web
npm test                          # expect 66
npm run build
npm audit                         # expect 0
npm run security                  # expect 56, 0 failed, no DEFERRED entry — WRITES to production
npx playwright test --workers=1   # expect 29 in ~1.3 min — WRITES to production
```

```sql
-- the owner's data. The fingerprint moves when they work; the shape should not.
select md5(string_agg(t::text, chr(10) order by t.id)) fingerprint, count(*), sum(amount)::text
  from public.txns t;   -- expect 05a080127ca18b46dc693edbd22b5168, 21, 226000.00

-- R7 landed: private present, public absent, nothing left pointing at the old function
select (select count(*) from pg_proc p join pg_namespace n on n.oid=p.pronamespace
          where n.nspname='private' and p.proname='is_viewer') as private_fn,
       (select count(*) from pg_proc p join pg_namespace n on n.oid=p.pronamespace
          where n.nspname='public'  and p.proname='is_viewer') as public_fn,
       (select count(*) from pg_policies
          where (coalesce(qual,'')||coalesce(with_check,'')) like '%public.is_viewer%') as stale_policies;
-- expect 1, 0, 0

-- 17 write policies private-backed: 14 in public + 3 in storage
select schemaname, count(*) from pg_policies
 where (coalesce(qual,'')||coalesce(with_check,'')) like '%private.is_viewer%'
 group by 1 order by 1;

-- rates and the backfill
select cur, as_of, rate, source from public.fx_rates order by cur;
select status, count(*), count(rate) priced from public.transfers group by 1;
-- expect released 6/6 priced, pending 3/0 priced

-- residue. A row WITHOUT an E2E- tag is the owner's, not test data.
select count(*) from public.txns where description like '%E2E-%';
```

Then read `backups/MANIFEST.md` on `origin/main` (after fetching) and confirm it is recent, that
`audit_log rows` is not a suspiciously round `1000`, and that the roster reads `5`.

---

## 7. What a good plan from you looks like

1. Names the IDs it addresses, from §2.
2. States, per item, whether you can actually do it in your environment — 2.1 and 2.2 need `psql`;
   2.3 needs a real stored file. **Saying "blocked, and here is why" is a correct answer.** Producing
   a chunked workaround for 2.1 is not.
3. Cites exact paths and line numbers, and separates what you *verified* from what you *inferred*.
4. Proposes checks that would fail if the change were wrong — not just checks that pass.
5. Touches nothing in §3.
6. Does not push. A push deploys to production; that decision is the owner's.

---

## Resume prompt

```
Read these, in this order, in /Users/itadmin/Desktop/puge (exact relative paths, no wikilinks):

  handoff/2026-09-04 Open Items Brief for Codex.md                      (START HERE — only what is open)
  handoff/2026-09-04 Exchange Rates and R7 Production Rollout.md        (R7 and the backfill, as executed)
  handoff/2026-09-03 Exchange Rates Shipped, What Is Still Open.md      (the fx build, F7)
  handoff/2026-09-03 Ten Closed, and a Backup Nobody Had Deployed.md    (traps 1-63, all still apply)
  handoff/2026-09-03 Remediation Brief for an External Agent.md         (stable R/F/N/Q ids)
  docs/Decisions.md                                                     (D1-D45; D42-D45 are newest)
  supabase/README.md                                                    (fifteen migrations, the rename note)
  backups/README.md                                                     (the restore procedure)

React + Vite ERP in apps/web on Supabase Postgres, deployed to Vercel behind a CI gate. main
is at 485ec25. Five accounts: four administrators and one dedicated viewer account that
writes exchange rates and nothing else. ONE shared ledger holding REAL money, used daily by
the owner during Manila working hours. There is NO staging environment: npm run e2e, npm run
smoke and npm run security all WRITE to production.

VERIFY BEFORE PLANNING. Run `git fetch origin && git log origin/main..HEAD` (expect empty —
and fetch FIRST; a stale read of origin/main caused a false alarm on 2026-09-04). Then in
apps/web: npm test (66), npm run build, npm audit (0), npm run security (56, 0 failed),
npx playwright test --workers=1 (29, ~1.3 min). Then the SQL in section 6 of the brief. If
the txns fingerprint differs from 05a080127ca18b46dc693edbd22b5168, the owner has been
working — say so rather than assuming damage.

What is open is section 2 of the brief: the audit_log full-volume restore and
backups/verify-restore.sql (both need psql \copy and a connection string — if you do not have
one, say "blocked" rather than attempting a chunked workaround, which already failed once at
chunk 5 of 23); storage paging that has never met a non-empty bucket; fx_rates never having
been through a schema replay; the deferred Playwright preflight and retry policy; and a set
of owner-only decisions you must not act on unasked.

Hold these while you work:
- A FIX IN THE WORKING TREE IS NOT A FIX IN THE SYSTEM. This project has hit that three
  times. Run git log origin/main..HEAD before believing any "shipped" claim.
- An external agent's report is a snapshot, not a state — including this brief. Re-verify.
- {"success": true} proves the SQL ran, not that it achieved anything. Read information_schema
  back. Assert the refusal, not the absence of an error: a blocked policy and a missing row
  both give row_count = 0.
- receipts or txns growing may be the OWNER WORKING, not residue. Check for an E2E- tag
  before calling anything test data. Never sweep a row that lacks one.
- Do NOT revoke EXECUTE on any is_viewer (N1/D34) — every write fails 42501 while reads keep
  working, so the app looks almost fine. R7 already solved this by relocating the function.
- Do NOT rotate FX_PASSWORD (N9/D44) — the owner deferred it deliberately and asked to be
  reminded, not overridden.
- Do NOT change supabase.auth.signOut() at apps/web/src/App.jsx:58, remove the three unused
  indexes, raise the Playwright timeouts, reimplement recurrence in SQL, add a credential
  fallback for SCHEDULE_*/FX_*, modify company_tracker/, delete from audit_log, or delete a
  failing security check to make a suite green.
- fx_rates' write policies name ONE account's uid instead of gating on not private.is_viewer()
  (D42). That is a deliberate one-off. Do not copy it onto an ordinary table, and do not
  "fix" it toward the usual pattern.
- The two R7 migration files cross-reference their OLD filenames in comments. That is
  deliberate: their contents are byte-identical to what was applied and that identity is the
  evidence. Do not tidy those comments.
- zone-offices (lasycakyudaawrydetnm) is a LIVE CRM belonging to someone else. Paused. Do not
  touch. tracker-rehearsal (bucmcnsjkuprpojhequy) is the scratch project.
- Do NOT push. A push to main deploys to production; that is the owner's decision.

Produce a plan that names the IDs from section 2 it addresses, states per item whether you
can actually execute it in your environment ("blocked, and here is why" is a correct and
valued answer), cites exact paths and line numbers, separates what you verified from what you
inferred, and proposes checks that would FAIL if the change were wrong.

Report what you verified and what drifted, confirm the state back, and wait for direction
before changing anything.
```

## Guideline Basis

- **PG-04** names the reproducible check behind every claim here; nothing is asserted that was not read live on 2026-09-04.
- **DOC-02** keeps verified state, open items, decisions and non-actions separately labelled.
- **MD-02** uses exact relative paths throughout, because the intended reader cannot resolve wikilinks.
- **DOC-03** reuses the established R/F/N/Q ids rather than renumbering them.
- **SEC-03** is why no credential value appears here, only the names of the variables that hold them.

implements: [Awesome Guidelines Integration](../docs/Awesome%20Guidelines%20Integration.md)

Related: [Decisions](../docs/Decisions.md) · [Supabase Schema](../supabase/README.md) · [Backups](../backups/README.md) · [Repository Evidence](../docs/Repository%20Evidence.md) · [AI Agent Context](../docs/AI%20Agent%20Context.md)
