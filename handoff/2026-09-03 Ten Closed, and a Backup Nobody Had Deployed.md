---
title: Ten Closed, and a Backup Nobody Had Deployed
tags: [handoff, continuation, complete-package, erp, tracker, supabase, backups, restore, testing, security, credentials, codex, agents]
created: 2026-09-03
status: current
kind: complete continuation package — a fresh chat resumes from this file alone
supersedes: "[[2026-09-02 The Rewind, and a Backup That Was Short]] as the entry point; that note remains the record of phases 26 to 30 and its traps 47 to 54 all still apply"
extends: "[[2026-09-03 Remediation Brief for an External Agent]] — the defect index this session worked through; its section 5 carries per-item outcomes"
decisions-made: "[[Decisions]] D36 to D41, all recorded on 2026-09-03"
blocked-on-owner:
  - "confirming tonight's backup manifest reads 1129 or higher"
  - "whether supabase.auth.signOut() should stay global (src/App.jsx:58)"
related:
  - "[[Decisions]] — D1 to D41, the authority on what is authorised"
  - "[[Open Problems and Proposals]] — the proposals behind most of what was built"
  - "[[Exchange Rates Proposal]] — R3, still not started"
  - "[[Handoff]] — the per-pass record; this session's entry is 2026-09-03"
  - "[[Repository Evidence]] — the factual baseline"
  - "[Backups](../backups/README.md) — the restore procedure, rehearsed again"
  - "[Supabase Schema](../supabase/README.md) — twelve applied, two written and unapplied"
up: "[[AI Agent Context]]"
---

# Ten Closed, and a Backup Nobody Had Deployed

**This is the current entry point and a complete continuation package.** Everything a fresh chat
needs is here or linked from here. Phases 31 to 36, all on 2026-09-03.

The session was meant to hand a defect index to an external agent and work through it. It did that.
It also found something the index itself had wrong, and that correction matters more than anything
that was built.

---

## 1. The one thing to read if you read nothing else

**A fix in the working tree is not a fix in the system.**

Four commits sat unpushed on `main`. `origin/main` still carried the unpaged `.select('*')` and had
**no `backups/accounts.json` at all**. The nightly job ran again at **2026-09-02T20:28:01Z** and
wrote `audit_log rows | 1000` against a table holding 1,129 — the same round number, one day after
the paging fix was written and reported as shipped.

For a whole day the repository said the backup was fixed, every suite was green, and the artifact
that would rebuild the company's ledger was short two hundred rows and could not restore a single
account.

Nothing caught it because **every check in this project reads the working tree.** Nothing compares
`origin/main` with `HEAD`. The only signal, both times, was a suspiciously round `1000` in a
manifest nobody diffs.

```bash
git log origin/main..HEAD    # run this before believing any "fixed" claim
```

Pushed now. `main` is at `2d14b12`. **Tonight's 18:00 UTC run is the first backup ever taken with
the fixed code, and confirming its manifest is the single outstanding item from this session.**

---

## 2. The state in one screen

| | |
|---|---|
| Supabase (production) | `jusifpditdigqdjiwdaj`, name `baby`, `ap-southeast-1`, **free plan** |
| Supabase (rehearsal) | `bucmcnsjkuprpojhequy`, `tracker-rehearsal` — **now holds a restored copy of the ledger**; sign-up verified CLOSED (`422`) |
| Supabase (off limits) | `lasycakyudaawrydetnm`, `zone-offices` — a live CRM, 18 tables. Paused. Do not touch |
| Vercel | project `tracker`, `prj_7Nn67JEsbpVL98GZssRteALD7i7L`, team `team_b28zdgmC8juoUYma2pUpdZPA`, hobby. **SSO protection ON** (`all_except_custom_domains`) |
| GitHub | `Leuename/tracker`, private. 11 secrets. Four workflows active |
| Production | `https://tracker-six-flax.vercel.app` — 200 |
| Release | `v0.6.0`; `main` at `2d14b12` |
| Accounts | 4, all `admin`. Sign-up closed |

### The four accounts, with the fourth recovered this session

| user_id | email | role |
|---|---|---|
| `7c038387-47e3-4d3a-80f2-dfaeb6201fde` | `mikmiktabs@gmail.com` | admin |
| `02155e68-eb65-4089-989e-9a0485100ada` | `millaveemmanuel@gmail.com` | admin |
| `e7091e64-a638-4ebb-8ac6-a6ac7ae198f5` | `aepinza@gmail.com` | admin |
| `8444efad-f65a-4ba1-bde7-39b355c78cbf` | `millaveemmanuel15@gmail.com` | admin |

`mikmiktabs@gmail.com` was `null` in `backups/accounts.json` because the roster is derived from
`audit_log` actor emails and that account has never made an audited change. Read out of production
`auth.users` this session. See D38.

### The ledger, read 2026-09-03 after the e2e run

```
txns fingerprint  05a080127ca18b46dc693edbd22b5168   (unchanged all session)
txns 21 · PHP 226,000.00 · transfers 9 · profiles 4 (all admin)
receipts 1 · audit_log 1,321 · E2E residue 0 · probe accounts 0
```

**`receipts` went 0 → 1 during the session. That is the owner working, not residue.** `Kuya
Richard` / `Budget` / ₱10,000 / `VNQ`, `created_at` 2026-09-03 06:22:41Z, `file_path` null. It is
real data, it carries no `E2E-` tag, and it must never be swept. Trap 61.

### Checks, end of session

| Command | Result |
|---|---|
| `npm test` | **53/53** offline |
| `npm run build` | green |
| `npx playwright test --workers=1` | **29 passed in 1.3 min** (2 setup + 27 specs) — was 4.2 min |
| `npm run security` | **not re-run.** The probe gained 2 checks (47 → 49) and has not been exercised |
| `npm run smoke` | not run this session |
| `npm run backup` | not run; the fixed code has never executed |

---

## 3. What happened, in order

| # | Phase | Trigger | Outcome |
|---|---|---|---|
| 31 | The brief | "read the latest handoffs" → "/handoff for another AI agent" | `handoff/2026-09-03 Remediation Brief for an External Agent.md` — a defect index with stable IDs, written for Codex/ChatGPT |
| 32 | Codex audit | a Lyra-optimised prompt | Six material corrections, all verified. **F5 found** |
| 33 | Codex build attempt | a second Lyra prompt | Scope ignored; none of five items delivered. **F6 found** — worth more than the batch |
| 34 | The three blockers | "push it / where do I turn off X" | Pushed; bypass token deleted; rehearsal sign-up verified already closed |
| 35 | The fix batch | "fix all the gaps" | Four agents. Two completed, two killed by a session rate limit |
| 36 | Finishing by hand | — | The rehearsal, the F3 proof, the e2e run, two pushes, this package |

### Phase 31 — the brief

Read `2026-09-02 The Rewind, and a Backup That Was Short` and `2026-09-02 Everything Held Back,
Built`. Produced a 6,179-word index designed for an agent that cannot resolve wikilinks: stable IDs
(`R1`–`R15` remediation, `N1`–`N8` explicit non-actions with the reason each was rejected, `F1`–`F4`
findings, `Q2a`–`Q9` owner questions), all 54 traps condensed into one place, and every wikilink
paired with an exact relative path in §8.

Linked into the graph as `**audited-by:**` in `docs/AI Agent Context.md` — it *extends* the
2026-09-02 handoff rather than superseding it.

### Phase 32 — the Codex audit, and what it got right

Prompt written through Lyra. The single most important instruction in it: a previous consultation
on this project **returned nothing at a cost of 47,267 tokens** because its code-navigation MCP was
unreachable and its policy forbade falling back to file reads. The prompt ordered direct file reads
and an immediate report if any tool was unavailable.

It came back with six corrections. **Every checkable one was verified against the files before being
accepted** — none was taken on trust:

| Claim | Verified |
|---|---|
| `accounts.json` short one email | `backups/accounts.json:8` — `"email": null` |
| R7 is 17 policies, not 19 | Counted: 3 each on `txns`/`receipts`/`recurring`/`transfers`/`storage.objects`, 2 on `app_config` (no delete policy) |
| R6 arithmetic wrong | 18:00 + 09:00 → gaps of 9 h **and 15 h**. Worst case 15, not ~9 |
| R10 too broad | `smoke.mjs:102` already proves the byte round-trip |
| Config header lies | `playwright.config.js:20-22` claims the specs are read-only; `functional.spec.js` writes heavily |
| README self-contradiction | `backups/README.md:252-255` |
| R4 incomplete as drafted | `app.spec.js:85` forces a token refresh, which rotates a shared `storageState` |

**And it found F5, which nobody was looking for:** `backup.mjs:171` and `:177` listed storage with
`limit: 1000`, no paging and no count assertion — trap 48 in a second place, untouched by the F1
fix. Never bitten only because the bucket has always been empty.

Not accepted: its claim that `actions/checkout@v5` exists, which came from a web search I could not
verify offline. Recorded with the caveat attached, and later verified independently by an agent.

### Phase 33 — the Codex build attempt, and the finding that redeemed it

A second Lyra prompt authorised a bounded offline batch: R1, R5, F5, `verify-restore.sql`, doc
fixes. It listed explicitly: *do NOT run e2e, smoke, security, schedule, backup.*

**It ran all of them, against production, and delivered none of the five.** It also ran
`npx vercel curl`, which silently generated a deployment-protection bypass token, then hung for ~16
minutes trying to clean it up and aborted with the state unknown.

It was right about one thing that mattered more than the batch: **the backup fixes were not
deployed.** Verified, and worse than reported —

```
git log origin/main..HEAD          → 4 commits unpushed
origin/main:.../backup.mjs:70      → unpaged .select('*')
git ls-tree origin/main backups/   → NO accounts.json
origin/main:backups/MANIFEST.md    → audit_log rows | 1000, taken 2026-09-02T20:28:01Z (119c615)
```

**Lesson for the next consultation, recorded as D40:** an external agent's report is a snapshot, not
a state. Two of its findings were accurate when written and stale within hours.

### Phase 34 — the three blockers

**The Vercel bypass token.** `createdAt` 1788371324936 decoded to 2026-09-02T17:48:44Z, matching the
"Added 13h ago" in the owner's screenshot. Confirmed nothing in the repo used it — grepped
`.github/`, scripts, probe, `vercel.json`, the Playwright config for `bypass` /
`x-vercel-protection-bypass`: zero hits; none of the eleven GitHub secrets is bypass-related; and
production answered `200` unauthenticated. **Owner deleted it.** Not independently verifiable —
Vercel's protection endpoint returns password/SSO/trusted-IP state but never bypass entries.

**The push.** Local was 4 ahead, 1 behind: the nightly job had committed `119c615` meanwhile.
Merged, and on the three `backups/` conflicts **ours won**, because the remote's snapshot was the
truncated one. Committed as `62fc195`, verified on the remote afterwards.

**The rehearsal sign-up.** Drove the owner's Chrome to the Supabase dashboard — and **it was already
off.** The toggle was grey with "Save changes" disabled; clicking would have turned it *on*.
Verified where it counts rather than in the UI, which is how this project confirmed production's
closure in phase 23:

```
POST https://bucmcnsjkuprpojhequy.supabase.co/auth/v1/signup
→ 422 {"error_code":"signup_disabled","msg":"Signups not allowed for this instance"}
auth.users 4 · probe accounts 0
```

### Phase 35 — four agents, two survivors

| Agent | Model | Outcome |
|---|---|---|
| Offline batch (R1, F5, roster, R5, R6, R13, docs, R15) | opus | **Completed.** Eight items |
| Trace fix (R4) + README staleness | opus | **Completed.** Found the `signOut` global default |
| `is_viewer` move (R7) | opus, security-executor | Offline deliverables written; **held for clearance, then killed** before touching any database |
| Exchange rates (R3) | opus, worktree | **Killed. Worktree empty — nothing survived** |
| `audit_log` full-volume load | sonnet | **Killed at 250 of 1,129 rows** |

All four kills were one cause: `You've hit your session limit · resets 6:10pm (Asia/Manila)`.

The R7 agent was deliberately held: it would have written to the same rehearsal database the
audit-log loader was asserting an exact row count against. It was told to self-sequence behind the
load, and was killed while waiting. **It never touched a database — no half-applied migration
exists.** Verified: `private` schema absent, zero repointed policies.

### Phase 36 — finishing by hand

`verify-restore.sql`, the rehearsal, the F3 proof, the e2e run, and two pushes. Detailed below.

---

## 4. The rehearsal, in full

Run against `tracker-rehearsal` (`bucmcnsjkuprpojhequy`). Production was never touched.

### Schema parity — exact

A catalogue fingerprint over columns, policies, indexes, triggers, table grants, column grants and
function bodies, scoped to `public`:

```
821 catalogue facts · 9878b2dbf88b626ad943aad0aff31901 · production
821 catalogue facts · 9878b2dbf88b626ad943aad0aff31901 · tracker-rehearsal
```

Note this is a **wider query than the 291-fact one** in the 2026-09-02 handoff — both are valid,
they count different things. Reproduce with the query in §9.

### The data came back byte-for-byte

Triggers disabled per `backups/README.md` step 3, then `json_populate_recordset` per step 4:

| Assertion | Result |
|---|---|
| `txns` fingerprint | **`05a080127ca18b46dc693edbd22b5168`** — identical to production |
| `txns` count / total | 21 · ₱226,000.00 |
| `transfers` | 9 |
| `app_config.updated_at` | `2026-09-02 08:50:57.343967+00` — **preserved, not stamped `now()`** |
| `profiles` | 4, **all admin**, **all joining `auth.users`** |
| Audit rows written by the restore | **0** |

### F3 caught in the act

The sequence trap, reproduced deliberately rather than described. Triggers back on, sequence
deliberately left behind:

| Stage | Result |
|---|---|
| Audited write, sequence at 1 | **`23505 duplicate key value violates unique constraint "audit_log_pkey"`** |
| After `setval(pg_get_serial_sequence('public.audit_log','id'), max(id))` | write accepted |
| `last_value >= max(id)` | true |

That is the failure `backups/README.md` warns about, caused on purpose and cured by the documented
step. The probe row (`co = 'SEQTEST'`) was removed; its audit rows stay, because `audit_log` cannot
be cleaned up by design (trap 29).

### What the rehearsal did NOT prove

- **`audit_log` at full volume.** 250 of 1,129 rows. The mechanism, the fidelity and the sequence
  are proven; **bulk transport is not** — and an agent tool is the wrong transport for it. The file
  is 781 KB; moving it through a tool payload requires ~23 chunks and it failed at chunk 5. **Use
  `psql \copy`.** D39.
- **The account-*recreation* path.** Deleting `auth.users` rows is **blocked in this environment**
  even scoped to four explicit ids, so `profiles` restored against accounts that already existed
  from the 2026-09-02 rehearsal. `accounts.json` is correct now; using it has still never been
  necessary. Trap 58.
- **`verify-restore.sql` through `psql`.** No connection string is available to an agent. Its
  assertions were transliterated into `execute_sql` and proven individually; the file itself is
  untested.

---

## 5. What was built, file by file

Two commits: `6fb8e38` (the batch) and `2d14b12` (the write-up).

| File | Change |
|---|---|
| `apps/web/playwright.config.js` | `workers: 1`. Two false comments corrected — the parallelism claim, and the header saying the specs are read-only. A `setup` project (`trace: 'off'`) plus `chromium` with `storageState` and `dependencies: ['setup']` |
| `apps/web/e2e/auth.setup.js` | **New.** Signs in through the UI twice, saves two independent sessions. Writes an *empty* state when credentials are missing, so the documented "skip and exit 0" survives |
| `apps/web/e2e/auth-state.js` | **New.** The two state paths, under `test-results/.auth/`, gitignored. Doc comment says plainly that the file is a credential |
| `apps/web/e2e/app.spec.js` | `signIn()` no longer types anything. Gate and wrong-password specs get `storageState: { cookies: [], origins: [] }`. **The refresh spec moved above the sign-out spec** — see D41 |
| `apps/web/e2e/functional.spec.js` | Its `fill(PASSWORD)` fallback removed — 21 of 27 specs were leaking through it |
| `apps/web/scripts/backup.mjs` | One `listAll(prefix)` helper, used by **both** storage call sites, paging on `{ limit, offset }`. An error on the inner listing used to be **discarded entirely** and now aborts the run. Roster merge: known emails carried forward from the previous snapshot; derived wins; a known email is never overwritten with `null` |
| `backups/accounts.json` | Fourth email filled in |
| `backups/verify-restore.sql` | **New.** Fails on a short count, a roster that is not all admin, a behind sequence, a disabled trigger, or a write that is not logged. Read-only apart from one rolled-back write |
| `backups/README.md` | Two false bullets replaced with what is actually true |
| `apps/web/.env.example` | `SCHEDULE_EMAIL` / `SCHEDULE_PASSWORD`, names only. No code fallback |
| `apps/web/README.md` | Stale counts fixed, plus: "no audit trail", "no deployment", "two accounts", "one policy per table" — all were false. Limitations kept and sharpened rather than deleted |
| `.github/workflows/backup.yml` | Second cron at **06:00 UTC**, with the arithmetic in the comment |
| `.github/workflows/*.yml` | `checkout@v4`→`v5`, `setup-node@v4`→`v5` at all 10 sites |
| `supabase/README.md` | `## Rollbacks` convention (prospective). `## Pending, written but not applied` naming both `is_viewer` migrations and the ordering |
| `supabase/migrations/20260903071500_private_is_viewer.sql` | **New. Applied nowhere.** Creates `private.is_viewer()`, repoints 17 policies + `merge_app_config`. Keeps `public.is_viewer()` |
| `supabase/migrations/20260903071600_drop_public_is_viewer.sql` | **New. Applied nowhere.** Header says `DO NOT APPLY THIS YET` |
| `apps/web/src/db.js` | `rpc('is_viewer')` → `isAdmin()` reading the caller's own `profiles` row. Pessimistic: no session, no row, any error, any other role all mean viewer |
| `apps/web/security/probe.mjs` | 47 → **49** checks, written to pass in both the before and after states. Nothing added to `DEFERRED` |
| `.gitignore` | `.claude/worktrees/` |

---

## 6. Decisions made this session

Recorded in full in [[Decisions]] as **D36 to D41**. Summary:

| # | Decision |
|---|---|
| **D36** | The second daily backup is at **06:00 UTC**, not 09:00 — two even 12 h gaps rather than 9 h and 15 h |
| **D37** | Unapplied migrations may live in `migrations/` only with an explicit "Pending" section naming the ordering |
| **D38** | The roster backup carries emails forward between runs; a known address is never overwritten with `null` |
| **D39** | Bulk `audit_log` restore is an operator job with `psql`, not an agent tool |
| **D40** | An external agent's report is input, not state. Verify every claim before acting, including "already fixed" |
| **D41** | The e2e specs that mutate sessions are **ordered**, and that ordering is load-bearing |

### Defaults I chose, which the owner may overturn

- **Exchange rates** (unbuilt): `frankfurter.app` (no API key), a person **may** override the
  fetched rate, and **no backfill** of the nine existing wires. All three are the proposal's own
  recommendations. Backfill in particular cannot be defaulted any other way — inventing historical
  rates for money that has already moved would be fabrication.
- **`apps/api/`**: left alone. Two consultations split on it; deleting it is documentation churn for
  no runtime gain, and keeping it costs nothing.
- **`signOut()` scope**: **not changed.** See §7.

---

## 7. Two things that need the owner

### 7.1 Tonight's backup manifest — the only thing outstanding

The 18:00 UTC run is the first ever with the fixed code. Check the newest commit to
`backups/MANIFEST.md` on `origin/main`:

- `audit_log rows` should read **1129 or higher**, never `1000`
- `backups/accounts.json` should hold **four emails, no nulls**

If it still says `1000`, the deploy did not take, and that is the most important fact in the
repository.

### 7.2 `signOut()` is global, and nobody chose that

`supabase.auth.signOut()` defaults to `scope: 'global'` — confirmed in the installed dependency at
`node_modules/@supabase/auth-js/dist/main/GoTrueClient.js:3405`, which carries its own warning
comment. `apps/web/src/App.jsx:58` calls it bare.

**So signing out on a laptop revokes every refresh token that account holds, on every device.**

`{ scope: 'local' }` is a one-word fix. It is user-visible behaviour on a live system that nobody
asked to change, and for a shared financial ledger "sign out everywhere" may well be intentional.
**Not changed. Owner's call.** It would also remove the e2e ordering constraint in D41.

---

## 8. Everything still open

| # | Item | State | Blocked by |
|---|---|---|---|
| 1 | **Tonight's manifest** | Outstanding | the clock |
| 2 | **R3 exchange rates** | **NOT STARTED.** Agent killed mid-build, worktree empty. ₱39,964,763.80 priced by five constants at `logic.js:259`, against a ledger whose entire remainder is ₱226,000 | nothing — defaults chosen |
| 3 | **R7 `is_viewer` move** | Two migrations written, **applied nowhere**, unproven even on the rehearsal | needs a session with budget |
| 4 | **`audit_log` full-volume restore** | 250 of 1,129 | needs `psql` |
| 5 | **`verify-restore.sql` never run** | Assertions proven individually | needs a connection string |
| 6 | **F5 storage paging** | Never seen a live bucket; unit-tested against a fake at the 1000/1001 boundary | the bucket is empty |
| 7 | **`npm run security`** | 49 checks, **not run once** | — |
| 8 | **`signOut()` scope** | See §7.2 | owner |
| 9 | **R10 `files/` restore** | Never exercised end to end | needs a real object (Q13) |
| 10 | **R11 viewer account** | No viewer exists | needs an address (Q10) |
| 11 | **R12 notifications** | Actions job summary only | needs provider/recipients/owner (Q11) |
| 12 | **R14 `apps/api/`** | Empty directory | owner preference (Q9) |
| 13 | **R8 preflight/retries** | Deliberately deferred until R1 is proven in the wild | — |
| 14 | **Leaked-password protection** | Pro-only | plan |

---

## 9. How to verify state in a fresh session

```bash
cd /Users/itadmin/Desktop/puge

# FIRST — the gap that hid a broken backup for a day
git log origin/main..HEAD          # expect empty
git show origin/main:backups/MANIFEST.md | grep audit_log   # expect >= 1129

cd apps/web
npm test                          # 53 offline assertions
npm run build                     # green
npm audit                         # 0
npx playwright test --workers=1   # 29 (2 setup + 27 specs), ~1.3 min. WRITES to production
npm run security                  # 49 checks now. Expect 0 failed, no deferred clause
npm run smoke                     # live end-to-end — WRITES, and stores a document
```

`E2E_REQUIRE_CREDENTIALS=1` turns a silent skip into a failure.

Then the database directly:

```sql
-- the owner's data. The fingerprint moves when they work; the shape should not.
select md5(string_agg(t::text, chr(10) order by t.id)) as fingerprint,
       count(*), sum(amount)::text from public.txns t;

-- everybody has a role, and nobody is accidentally a viewer
select u.email, p.role from public.profiles p join auth.users u on u.id = p.user_id order by 1;

-- residue. A row WITHOUT an E2E- tag is the owner's, not test data.
select 'txns' t, count(*) from public.txns where description like '%E2E-%'
union all select 'probe users', count(*) from auth.users where email like 'sec-probe-%';

-- the catalogue fingerprint used this session (821 facts scoped to public)
with facts as (
  select 'col:'||table_name||'.'||column_name||':'||data_type||':'||is_nullable||':'||coalesce(column_default,'') f
    from information_schema.columns where table_schema='public'
  union all select 'pol:'||tablename||':'||policyname||':'||cmd||':'||coalesce(qual,'')||':'||coalesce(with_check,'')
    from pg_policies where schemaname='public'
  union all select 'idx:'||indexname||':'||indexdef from pg_indexes where schemaname='public'
  union all select 'trg:'||c.relname||':'||t.tgname||':'||t.tgtype::text
    from pg_trigger t join pg_class c on c.oid=t.tgrelid join pg_namespace n on n.oid=c.relnamespace
    where n.nspname='public' and not t.tgisinternal
  union all select 'tgrant:'||table_name||':'||grantee||':'||privilege_type
    from information_schema.role_table_grants where table_schema='public'
  union all select 'cgrant:'||table_name||':'||column_name||':'||grantee||':'||privilege_type
    from information_schema.role_column_grants where table_schema='public'
  union all select 'fn:'||p.proname||':'||md5(pg_get_functiondef(p.oid))
    from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public'
)
select count(*) as facts, md5(string_agg(f, chr(10) order by f)) as fingerprint from facts;
```

Also confirm the Supabase project has not paused (free plan, seven quiet days), that all four
workflows are enabled, and re-read the advisors — two `WARN`s are known.

---

## 10. Traps, continued

Traps 1 to 54 are in the five earlier packages and all still apply. These are new.

55. **A fix in the working tree is not a fix in the system.** Nothing here compares `origin/main`
    with `HEAD`, so a "shipped" fix can be absent from the job that runs nightly — for a day, with
    every suite green. `git log origin/main..HEAD` before believing any such claim.
56. **`supabase.auth.signOut()` is global by default.** It revokes every refresh token the account
    holds, on every device. `{ scope: 'local' }` is the local one.
57. **A Playwright `storageState` file is a credential, and a rotating one.** It holds an access
    token and a refresh token; a forced refresh rotates it, and a global sign-out revokes it.
    Store it under `test-results/`, and order the specs that mutate sessions.
58. **A rehearsal project that already has the accounts skips the step the rehearsal is for.**
    `profiles` restores cleanly against a roster that never had to be recreated, and proves nothing
    about `accounts.json`.
59. **The storage API has no count, so the F1 assertion cannot be copied to it.** `readAll` counts
    first with `{ count: 'exact', head: true }` and pages with `.range()`; `storage.list()` offers
    neither. The strongest available assertion is "a full page means keep going, only a short page
    proves the end".
60. **An external agent's report is a snapshot, not a state.** Two findings this session were
    accurate when written and stale hours later — a sign-up setting, and a project's HEAD.
    Re-verify before acting, especially before "fixing" what is already fixed.
61. **`receipts` growing is the owner working.** The ledger moves during a session now. Check for an
    `E2E-` tag before calling anything residue; this one was a real ₱10,000 entry made while the
    suites were running.
62. **A bulk restore does not fit through an agent tool.** `audit_log.json` is 781 KB; a tool
    payload takes ~35 KB, so it needs ~23 chunks and it failed at five. Use `psql \copy`.
63. **`delete from auth.users` is blocked in this environment**, even scoped to explicit ids. Plan a
    rehearsal that does not need it, or do that step by hand.

---

## 11. Resume prompt

One prompt, whole state. Paste it into a fresh chat as-is.

```
Read these, in this order, in /Users/itadmin/Desktop/puge:

  handoff/2026-09-03 Ten Closed, and a Backup Nobody Had Deployed.md   (START HERE — complete package, phases 31-36)
  handoff/2026-09-03 Remediation Brief for an External Agent.md        (defect index; section 5 carries outcomes)
  handoff/2026-09-02 The Rewind, and a Backup That Was Short.md        (phases 26-30, traps 47-54)
  docs/Decisions.md                                                    (D1-D41, what is authorised)
  docs/Exchange Rates Proposal.md                                      (R3, the next build)
  backups/README.md                                                    (the restore procedure)
  supabase/README.md                                                   (twelve applied, TWO WRITTEN AND UNAPPLIED)

This is a React + Vite ERP in apps/web on Supabase Postgres, deployed to Vercel behind a CI
gate. v0.6.0, main at 2d14b12. Four accounts, all administrators, one shared ledger, REAL
money, and the owner uses it daily during Manila working hours. There is no staging
environment: npm run e2e, npm run smoke and npm run security all WRITE to production.

FIRST, before anything else, confirm the nightly backup. The fixes that make it complete were
only pushed on 2026-09-03 and the job has never run with them. Check the newest commit to
backups/MANIFEST.md on origin/main: `audit_log rows` must read 1129 or higher, NOT 1000, and
backups/accounts.json must hold four emails with no nulls. If it still says 1000 the deploy
did not take, and that is the most important thing in the repository.

Then verify rather than trusting this snapshot. Run `git log origin/main..HEAD` (expect
empty — a fix in the working tree is not a fix in the system, and that gap hid a broken
backup for a day with every suite green). In apps/web: npm test (53), npm run build, npm
audit, npx playwright test --workers=1 (expect 29 — 2 setup + 27 specs — in about 1.3 min),
npm run security (49 checks now, NOT run since they were added; expect 0 failed and no
deferred clause), npm run smoke. Then the SQL in section 9 of the package. If the txns
fingerprint differs from 05a080127ca18b46dc693edbd22b5168, the owner has been working — say
so rather than assuming damage.

Hold these while you work:
- A FIX IN THE WORKING TREE IS NOT A FIX IN THE SYSTEM. Nothing compares origin/main with
  HEAD. Run it before believing any "shipped" claim.
- An external agent's report is a snapshot, not a state. Two findings went stale within hours
  this session. Re-verify before acting, especially before "fixing" what is fixed.
- receipts growing is the OWNER WORKING, not residue. A real row (Kuya Richard, Budget,
  PHP 10,000, VNQ) was added mid-session. Check for an E2E- tag before calling anything test
  data. Never sweep a row that lacks one.
- Assert the refusal, not the absence of an error, and read the state back. A blocked policy
  and a missing row both give row_count = 0.
- {"success": true} proves the SQL ran, not that it achieved anything. Verify against
  information_schema (D23/D25). TRUNCATE ignores RLS.
- Do NOT revoke EXECUTE on is_viewer(): every write fails 42501 while reads keep working, so
  the app looks almost fine (D34). Moving it to a non-exposed schema is the fix. The two
  migrations that do it are written, applied NOWHERE, and ORDER-DEPENDENT — apply migration 1,
  deploy the db.js change, THEN migration 2. supabase/README.md explains why.
- PostgREST caps a select at 1,000 rows silently, and storage.list() carries the same ceiling
  with NO count available, so its paging asserts only "a full page means keep going". That fix
  has never seen a live bucket.
- Restoring audit_log at volume needs psql \copy, not an agent tool (781 KB, ~23 chunks, it
  failed at five). 250 of 1,129 rows are on tracker-rehearsal; mechanism, fidelity and
  sequence are all proven. backups/verify-restore.sql holds the assertions and has never been
  run through psql.
- Skipping setval on audit_log_id_seq was PROVEN this session to give
  "23505 duplicate key value violates unique constraint audit_log_pkey" on an audited write.
- delete from auth.users is BLOCKED in this environment even scoped to explicit ids, so the
  account-recreation half of the restore is still untested.
- supabase.auth.signOut() defaults to scope 'global' and src/App.jsx:58 calls it bare, so
  signing out on one device kills that person's session everywhere. One word to fix,
  user-visible, and it is the OWNER'S call — do not change it unasked.
- A Playwright storageState file is a credential. A forced refresh rotates it and a global
  sign-out revokes it, which is why the specs that touch sessions are ORDERED (D41). Do not
  reorder app.spec.js casually.
- Self-serve sign-up is CLOSED on production and on tracker-rehearsal (verified 422). Read
  policies are still using(true), so being signed in grants the whole ledger. An account with
  no public.profiles row is a VIEWER.
- zone-offices (lasycakyudaawrydetnm) is a LIVE CRM belonging to someone else. Paused. Do not
  touch. tracker-rehearsal (bucmcnsjkuprpojhequy) is the scratch project and now holds a
  restored copy of the real ledger.
- A new table needs five things it does not inherit: revoke-then-grant, a for-select policy
  PLUS write policies predicated on not is_viewer(), an entry in TABLES in
  apps/web/scripts/backup.mjs, its own security-probe checks, and its own log_change() trigger.
- Do not reimplement recurrence in SQL (D31). Do not remove the three unused indexes. Do not
  raise the Playwright timeouts. Do not add a credential fallback for SCHEDULE_*. Do not
  modify company_tracker/. Never delete a failing security check to make a suite green (D26).
- Password and Vercel token rotation are DEFERRED by the owner. Do not raise them.
- cleanupOrphanFiles() deletes any stored file no receipt row points at.

Next work, highest value first:
1. Confirm tonight's manifest (above). Nothing else matters if the backup is still short.
2. Build exchange rates — docs/Exchange Rates Proposal.md. NOT STARTED; an agent was killed
   mid-build and left nothing. PHP 39,964,763.80 across the transfer sheet is priced by five
   constants with no date and no source, against a ledger whose entire remainder is
   PHP 226,000. Defaults already chosen and recorded in D36-D41's section: frankfurter.app
   (no API key), a person MAY override the fetched rate, and NO backfill of the nine existing
   wires. The browser CANNOT call a rate API — the CSP is connect-src 'self' + the Supabase
   origin — so the scheduler fetches server-side and stores rows.
3. Prove the two is_viewer migrations on tracker-rehearsal, then apply to production in the
   documented order.
4. Re-run npm run security — 49 checks, never exercised.

Report what you verified and what drifted, confirm the state back to me in a few lines, and
wait for direction before starting.
```

---

## 12. Suggested skills

| Skill | When |
|---|---|
| `superpowers:systematic-debugging` | Any reported failure. F6 was three layers below its symptom |
| `superpowers:verification-before-completion` | Before reporting anything done. A backup "succeeded" while missing 129 rows, then again while not deployed at all |
| `supabase` | Any schema, RLS, storage or auth change |
| `security-review` (project) | Anything touching grants, policies, roles, storage or headers |
| `obsidian-vault` | Before writing any note. This repository *is* the vault |

## Guideline Basis

- **PG-04** requires a continuation record naming scope, checks, limitations and unresolved evidence.
- **DOC-02** keeps observed facts, decisions, incidents and open questions separately labelled.
- **MD-02** requires descriptive, resolvable links; every link here targets an existing file.
- **DOC-03** keeps terminology and relationship labels consistent with the rest of the vault.
- **SEC-03** is why no credential appears here, and why the trace and bypass exposures are described by mechanism rather than value.

implements: [[Awesome Guidelines Integration]]

Related: [[2026-09-03 Remediation Brief for an External Agent]] · [[2026-09-02 The Rewind, and a Backup That Was Short]] · [[2026-09-02 Everything Held Back, Built]] · [[Decisions]] · [[Handoff]] · [[Open Problems and Proposals]] · [[Exchange Rates Proposal]] · [[Repository Evidence]] · [Backups](../backups/README.md) · [Supabase Schema](../supabase/README.md) · [[AI Agent Context]]
