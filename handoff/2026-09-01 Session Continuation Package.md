---
title: Session Continuation Package 2026-09-01
tags: [handoff, continuation, erp, tracker, supabase, vercel, testing, security, decisions]
created: 2026-09-01
status: current
supersedes: none
related:
  - "[Handoff](../docs/Handoff.md) — the per-pass record; this note indexes it, it does not replace it"
  - "[Decisions](../docs/Decisions.md) — D1 to D11, the authority on what is authorised"
  - "[Repository Evidence](../docs/Repository%20Evidence.md) — the factual baseline"
  - "[AI Agent Context](../docs/AI%20Agent%20Context.md) — navigation hub"
up: "[AI Agent Context](../docs/AI%20Agent%20Context.md)"
---

# Session Continuation Package 2026-09-01

**Purpose.** A fresh chat, with no memory of this session, can read this note and resume without
losing context. It is a *map and an index*, not a copy. Where a fact already lives in a canonical
note, this points at it rather than restating it.

**Read in this order.**

1. This note, sections *Where everything lives* and *Open items awaiting your decision*.
2. [Decisions](../docs/Decisions.md) — D1 through D11. Nothing may be built that these do not authorise.
3. [Handoff](../docs/Handoff.md) — the dated pass records. Each session appended one; do not rewrite them.
4. [Repository Evidence](../docs/Repository%20Evidence.md) — what is observed versus inferred.
5. `apps/web/README.md` — how the app actually works.

---

## The arc of this session, in order

The session opened with **"resume what we are building"** and ran through nine distinct phases.
Each is written up in [Handoff](../docs/Handoff.md) under its own dated heading; the value here is the *sequence*,
because several later decisions only make sense against an earlier one.

| # | Phase | Trigger (the owner's words) | Outcome |
|---|---|---|---|
| 1 | Orientation | "resume what we are building" | Established state: `apps/web` existed, in-memory only, 14 tests passing. Presented the open forks. |
| 2 | Persistence | "use supabase for the persistence storage" | Supabase project created, schema, RLS, auth gate. [Decisions](../docs/Decisions.md) D7. |
| 3 | Auth unblocking | three rounds of settings fixes | Email provider on, confirmation off. Sign-up worked. |
| 4 | Two-user rebuild | "2 users will only use this... admin... executive" | **Superseded D7's ownership model.** One shared ledger. [Decisions](../docs/Decisions.md) D8. |
| 5 | Deployment | "Deploy the code in vercel and name it `tracker`" | Git repo, GitHub, Vercel. [Decisions](../docs/Decisions.md) D9. |
| 6 | Expired-token bug | "It failed... 401" | Root cause `PGRST303`, refresh-and-retry. |
| 7 | Visual work | photo background, then dialogs, then wash | Three passes, each tuned by the owner. |
| 8 | Third account | "another user... make it an admin, too" | Nothing to grant; roles do not exist. |
| 9 | Full testing | the `/goal` directive | Two suites, ten defects fixed. [Decisions](../docs/Decisions.md) D10, D11. |

**The single most important sequencing fact:** phase 4 superseded phase 2. D7 gave every account
its own private copy of the data; D8 replaced that with one shared ledger. A reader who finds D7
alone will build the wrong thing.

---

## Where everything lives

Nothing below is guessable from the repository. Losing this table is the expensive loss.

### Services

| Thing | Value | Notes |
|---|---|---|
| Supabase project | `jusifpditdigqdjiwdaj`, name `baby`, region `ap-southeast-1` | Free plan, org `bpkoylosrtxrpprgjuug` |
| Supabase API URL | `https://jusifpditdigqdjiwdaj.supabase.co` | Also in `apps/web/.env.production` |
| Vercel project | `tracker`, id `prj_7Nn67JEsbpVL98GZssRteALD7i7L` | Team `team_b28zdgmC8juoUYma2pUpdZPA`, hobby plan |
| Production URL | `https://tracker-six-flax.vercel.app` | Redeploys on every push to `main` |
| GitHub repo | `Leuename/tracker`, **private** | Whole project since 2026-09-01. **Vercel Root Directory must be `apps/web`** |
| Storage bucket | `receipts` — private, 10 MB, images + PDF | Created in migration `receipt_files` |

### Accounts

Three, all with **identical full rights**. There is no role column anywhere. Addresses are in
Supabase → Authentication → Users; they are deliberately not written here.

- **Account 1** — created first, admin.
- **Account 2** — the owner's own address; the one the tests authenticate as.
- **Account 3** — added late in the session; needed nothing done to it, see phase 8.

**Credentials are not recorded in this vault and must not be.** All three currently share one
short password. Rotating it is [open item 3](#Open%20items%20awaiting%20your%20decision).

### Auth settings that took three attempts to get right

Both are on the same dashboard page and do opposite jobs. This tripped the session up twice.

- **Email provider — must be ON.** Off returns `email_provider_disabled` on sign-in *and* sign-up.
- **Confirm email — must be OFF.** On, the built-in SMTP rate limit (~2/hour) returns
  `over_email_send_rate_limit` and no account is created.
- **Allow new users to sign up — must be OFF.** This is the entire access-control perimeter
  under D8. The app having no sign-up form is cosmetic; the server setting is the control.

### Database migrations, in order

| Version | Name | What it did |
|---|---|---|
| `20260831080433` | `erp_tracker_schema` | First schema, per-account ownership |
| `20260831081217` | `revoke_anon_from_erp_tables` | Closed a privilege hole Supabase's defaults opened |
| `20260831085534` | `shared_workspace_two_users` | **Dropped ownership.** One shared ledger |
| `20260831155259` | `lock_server_managed_columns` | Column-level grants; `created_at` no longer client-settable |
| `20260831160423` | `receipt_files` | `file_path` column, storage bucket, storage policies |

**No migration files are checked in.** The schema exists only in the Supabase project. Recreating
this project from the repository alone is not currently possible — that is a real gap, listed in
*Held back*.

---

## Codebase map

`apps/web/src/` — every file, what it is for, and what breaks if you misunderstand it.

| File | Role | The thing to know |
|---|---|---|
| `main.jsx` | Entry | `AuthGate` wraps `StoreProvider` wraps `App`. Order matters: the store assumes a session. |
| `Auth.jsx` | Sign-in gate | Sign-in only, no sign-up. Exports `Splash`, used by the store for loading and error states. |
| `store.jsx` | State + hydration | One reducer taking patch objects. Applies `openingView(settings)` after load. Debounced config save. |
| `actions.js` | Every mutation | Screens read state and call these; nothing else writes. Optimistic: reducer first, `save()` after. |
| `db.js` | Every query | `retryOnce` wraps all of them — refresh token once, repeat. Also storage upload and signed URLs. |
| `rows.js` | Mapping | App vocabulary (`desc`, `payType`, `''`) ↔ database (`description`, `pay_type`, `NULL`). Imports nothing, so it tests offline. |
| `errors.js` | Auth-error classifier | Tells a recoverable expired session from a real failure. Imports nothing. |
| `logic.js` | Pure helpers | Recurrence, periods, formatting, `openingView`, `windowDays`, `addDays`. No React. |
| `data.js` | Constants + seed | `TODAY` is now the **real** date. `SEED_TODAY` keeps the demo's original anchor. |
| `ui.jsx` | Primitives | `Field` generates an id and ties a real `<label>` to its child. Do not revert this. |
| `supabase.js` | Client | Throws at boot if env vars are missing. Has a `process.env` fallback so Node scripts can import it. |
| `App.jsx` | Shell | Rail, settings flyout, all six modals mounted conditionally. |
| `screens/` | Five screens | Dashboard, Tracker, AckRec, Masterlist, Settings. |
| `modals/` | Seven dialogs | Add/Edit transaction, PayMethod, Liquidate, AddRecurring, **AddReceipt** (new this session), Filters. |
| `assets/tracker-background.jpg` | Photo | EXIF stripped. Served publicly as a hashed asset. |

Tests and probes:

| File | What it proves |
|---|---|
| `src/logic.test.js`, `rows.test.js`, `errors.test.js` | 33 offline assertions, no network |
| `e2e/app.spec.js` | Gate, session, expired-token recovery. Read-only |
| `e2e/functional.spec.js` | Every write path, UI-driven then verified in Postgres. Writes, then sweeps |
| `e2e/db.js` | Test-side database access and the cleanup sweep |
| `security/probe.mjs` | 33 checks across nine areas |
| `src/smoke.mjs` | Live end-to-end against the real project |

---

## Knowledge graph — how the notes relate

Since 2026-09-01 the notes live in `docs/` and handoffs in `handoff/`, both versioned. Only
`AGENTS.md`, `CLAUDE.md` and `CLAUDE.local.md` remain at the root, where tooling looks for them.
Obsidian resolves links vault-wide, so the folder move changed no link target names.

```
[AI Agent Context](../docs/AI%20Agent%20Context.md)  ← navigation hub, entry point
      │
      ├── [Repository Evidence](../docs/Repository%20Evidence.md)   observed facts only; corrected when a prerequisite arrives
      │        └── evidences → [Decisions](../docs/Decisions.md)
      │
      ├── [Decisions](../docs/Decisions.md)             D1..D11; authorises or forbids work
      │        ├── D7 superseded by D8
      │        ├── D8 depends on the sign-up setting staying off
      │        ├── D9 depends on D8 (public URL + shared ledger)
      │        └── D10, D11 arose from the testing pass
      │
      ├── [Handoff](../docs/Handoff.md)               dated pass records, append-only
      │        └── indexed by → this note
      │
      ├── [Awesome Guidelines Integration](../docs/Awesome%20Guidelines%20Integration.md)   the guideline ledger; every note cites IDs from it
      ├── [Turborepo and Turbopack](../docs/Turborepo%20and%20Turbopack.md)          still gated, unchanged all session
      │
      └── .claude/rules/*.md        thirteen scoped rules, each linking up to Decisions
```

**Relationship semantics used in this vault** (stated, not merely linked):

- *supersedes* — D8 supersedes D7's ownership model.
- *depends on* — D9 depends on D8; the deployment is only safe because sign-up is closed.
- *implements* — every note carries `implements: [Awesome Guidelines Integration](../docs/Awesome%20Guidelines%20Integration.md)`.
- *evidences* — [Repository Evidence](../docs/Repository%20Evidence.md) evidences claims that [Decisions](../docs/Decisions.md) relies on.
- *blocked by* — backups are blocked by the Supabase free plan, not by any code.

Rules edited this session: `.claude/rules/git-workflow.md` (history now exists),
`.claude/rules/dependency-management.md` (D7 overtook its "do not add packages").

---

## Open items awaiting your decision

Consolidated. Nothing here is a defect; every check is green. These are scope and operations.

| # | Item | Why it needs you | Cost of waiting |
|---|---|---|---|
| 1 | **Demo data** — 32 invented rows still in the ledger | You said you would delete them by hand. Also: drop the `seed()` call so it can never re-seed? | Rises once real payables sit beside them; only the amounts distinguish them |
| 2 | **Backups** | Supabase docs, verified: free-plan backups are *not downloadable*, and free projects pause after a 7-day low-activity window. Upgrade to Pro, or I script an export | **Highest.** No restore path today |
| 3 | **Password rotation** | Deferred by you twice. Now the only thing in front of a public URL, shared across all three accounts | Compounding |
| 4 | **`ackRequirePhoto`** — I set it **off** in your live config | It was stored `true` while it did nothing; now it genuinely blocks. Leaving it on would have started rejecting saves nobody chose | None |
| 5 | **Receipt deletion does not exist** | Transactions can be deleted; receipts cannot, anywhere in the UI. A mistyped receipt is permanent | Low until someone mistypes |
| 6 | **Roles, with three accounts** | You chose "same as admin" when it was two people. All three can delete any row | Grows with headcount |
| 7 | **Company codes and categories** | The 21 codes and 13 categories came from the prototype, not from you. They feed every dropdown | Must be right *before* real data |
| 8 | ~~Notes are not backed up~~ — **done 2026-09-01** | The repository was re-rooted at the project root; `docs/` and `handoff/` are versioned and pushed | Resolved |

---

## Held back deliberately

Not forgotten. Each was a decision, with a reason.

- **`autoGen` and `ackAutoNotify` were removed, not built.** Both describe work that must happen
  while nobody has the app open. No scheduler exists. They return the day one does — Supabase cron
  plus an edge function, or the empty `apps/api/`. Recorded in [Decisions](../docs/Decisions.md) D10.
- **No audit trail.** Three equal accounts, nothing records who changed what. Rows carry
  `created_at`, no `updated_by`.
- **No CI.** A push to `main` deploys unchecked. Every test runs from a developer's machine.
- **Last write wins.** No conflict detection, no realtime. Two people editing the same row silently
  overwrite; neither screen updates when the other writes.
- **No migration files in the repo.** Schema lives only in the Supabase project.
- **`apps/api/` is still an empty directory.** No decision has ever been recorded about it.
- **The construction tracker screens were never built** — `construction_tracker/construction.csv`
  specifies attendance, payroll, cash-flow, debts, expenses and receivables. Only ERP payables exist.

---

## Defects found and fixed this session

Full write-ups with evidence are in [Handoff](../docs/Handoff.md) under the dated headings. Summarised so a fresh
agent does not re-investigate a solved problem.

**Functional** — notes dropped by `commit()`; add-receipt did nothing; liquidation drop zone
accepted nothing; the settings flyout's scrim made its own screen unclickable; `dashWindow`
relabelled without filtering; `trkGroupDefault` and `dashDefaultScope` ignored; `TODAY` frozen at
`2026-08-30`; add-form period hardcoded to `Aug 2026`; `addDays` lost a day in UTC+8.

**Security** — a client could back-date `created_at` (proven by writing a row dated 1999); no CSP,
`X-Frame-Options`, `nosniff` or `Referrer-Policy`; a high-severity Vite dev-server advisory.

**Reliability** — an hour-old tab stranded on `401 PGRST303 JWT expired`, because revoking `anon`
turned an empty result into a hard failure and `load()` had no retry.

**Accessibility** — no form control in any dialog had an accessible name.

### What testing confirmed already worked

Do not re-test these without reason: anonymous refusal at privilege level; `alg:none`, replaced
signature and rewritten claims all rejected; `auth.users`, OpenAPI and RPC unreachable; SQL in a
filter rejected not executed; stored XSS payload kept verbatim, rendered as text, never executed;
no `dangerouslySetInnerHTML` anywhere; no privileged key in the bundle; storage refuses unsigned
reads and tampered signatures.

---

## Traps for the next agent

Hard-won. Each cost real time in this session.

1. **An update must never send the primary key.** `UPDATE` on `id` is not granted. `forUpdate()`
   in `rows.js` strips it; `rows.test.js` pins it. Symptom: every edit silently fails to save.
2. **`app_config` cannot be upserted.** Upsert carries `id` into its `DO UPDATE`. `saveConfig`
   updates, then inserts only if no row exists.
3. **React StrictMode double-invokes effects in dev**, so `load()` runs twice. This *masked a bug
   and made a regression test pass with the fix removed*. Never gate a dev-mode test on a request
   count; gate it on an observable event.
4. **The Supabase SQL tool does not roll back a `do $$ … $$` block.** A probe here committed and
   left `notes = 'policy probe'` on transaction 1. Use read-only probes, or explicit
   `begin … rollback`, and verify afterwards.
5. **Writes are fire-and-forget.** A test that queries immediately after a UI action races the
   write. Poll.
6. **Playwright `hasText` does not see input values.** Masterlist rows hold their description in an
   `<input>`; locate by field value, not text.
7. **`locator.isVisible()` does not wait.** Use `expect(...).toBeVisible()`.
8. **Vercel's Security Checkpoint** appears under automated traffic, 403s scripts, clears itself.
   Not an outage. Wait.
9. **Vite dev-server console noise** on cold start is not an app error. Confirmed by running the
   whole suite against `vite preview` three times.
10. **The completed filter is off by default**, so a row marked paid leaves the Tracker view. This
    is correct behaviour, not a lost row.

---

## How to verify the state in a fresh session

```bash
cd /Users/itadmin/Desktop/puge/apps/web
npm test                                      # 33 offline assertions
E2E_EMAIL=… E2E_PASSWORD=… npm run e2e        # 24 specs; writes then sweeps
E2E_EMAIL=… E2E_PASSWORD=… npm run security   # 33 checks
npm audit                                     # expect 0
npm run build
```

Credentials come from Supabase → Authentication → Users; `apps/web/.env.local` supplies the two
`VITE_` variables and is git-ignored, so a fresh checkout needs it recreated from `.env.example`.

**Expected ledger baseline afterwards:** 20 transactions, 6 receipts, 6 recurring rules, one
config row, zero stored files, and no row tagged `E2E-` or carrying a probe note. If a run leaves
residue, `e2e/db.js` `cleanup()` sweeps every `E2E-` tag and orphaned storage objects.

**Last verified green:** 2026-09-01 — 33 unit, 24 e2e (local, `vite preview`, and production),
33 security against production, `npm audit` clean. Head commit `5b17d29`.

---

## Resume prompts

Paste one of these into a fresh chat. Each is self-contained: it names the file to read first, so
the new session does not have to be told the history.

### Straight continuation

```
Read "handoff/2026-09-01 Session Continuation Package.md" in /Users/itadmin/Desktop/puge,
then docs/Decisions.md and docs/Handoff.md. Confirm the current state back to me in a few lines —
including anything you find stale — before doing any work. Then wait.
```

### Work the open items

```
Read "handoff/2026-09-01 Session Continuation Package.md" in /Users/itadmin/Desktop/puge.
Work its "Open items awaiting your decision" list. Ask me the ones that need a decision,
in one batch, and do not start building until I answer. Backups (item 2) first.
```

### Pick up a specific piece of work

```
Read "handoff/2026-09-01 Session Continuation Package.md" in /Users/itadmin/Desktop/puge
for context, then <TASK>. Respect docs/Decisions.md — D8 (one shared ledger, no roles) and
D10 (a control either works or is removed) constrain most changes. Run npm test,
npm run e2e and npm run security in apps/web before telling me it is done.
```

### Something is broken in production

```
Read "handoff/2026-09-01 Session Continuation Package.md" in /Users/itadmin/Desktop/puge,
especially "Traps for the next agent". <SYMPTOM>. Reproduce it before proposing a fix,
and tell me the root cause, not the symptom.
```

### After a long gap

```
Read "handoff/2026-09-01 Session Continuation Package.md" in /Users/itadmin/Desktop/puge.
Then verify the state still matches: run npm test, npm run e2e and npm run security in
apps/web, and check the Supabase project is not paused. Report what drifted.
```

**Two things every resume prompt must carry**, if you write your own: the **path to this file**,
and an instruction to **verify before acting**. A fresh session that trusts this note without
re-running the checks is trusting a snapshot — the free-plan Supabase project can pause, and
these notes are not under version control.

---

## Suggested skills for the next session

| Skill | When |
|---|---|
| `superpowers:systematic-debugging` | Any reported failure. This session's two hardest bugs were both misdiagnosed on first pass |
| `superpowers:test-driven-development` | Before touching `logic.js`, `rows.js` or `errors.js` — all three are pinned by tests |
| `superpowers:verification-before-completion` | Before reporting anything done; twice this session a "pass" was not one |
| `security-review` (project) | Anything touching grants, policies, storage or headers |
| `obsidian-vault` | Before writing any note here — resolve the vault, do not assume |
| `supabase` | Any schema, RLS, storage or auth change. Check the changelog first; it caught two behaviour changes this session |
| `database-design` | If backups, migrations-in-repo, or an audit trail get built |

Do **not** reach for `Turborepo`/`Turbopack` — still gated, see [Turborepo and Turbopack](../docs/Turborepo%20and%20Turbopack.md).

---

## Guideline Basis

- **PG-04** requires a continuation record naming scope, checks, limitations and unresolved evidence.
- **DOC-02** keeps observed facts, decisions and open questions separately labelled.
- **MD-02** requires descriptive, resolvable links; every wikilink here targets an existing note.
- **DOC-03** keeps terminology and relationship labels consistent with the rest of the vault.
- **SEC-03** is why no credential appears in this note.

implements: [Awesome Guidelines Integration](../docs/Awesome%20Guidelines%20Integration.md)

Related: [Handoff](../docs/Handoff.md) · [Decisions](../docs/Decisions.md) · [Repository Evidence](../docs/Repository%20Evidence.md) · [AI Agent Context](../docs/AI%20Agent%20Context.md) · [Awesome Guidelines Integration](../docs/Awesome%20Guidelines%20Integration.md) · [Turborepo and Turbopack](../docs/Turborepo%20and%20Turbopack.md)
