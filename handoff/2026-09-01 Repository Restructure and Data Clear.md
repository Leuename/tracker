---
title: Repository Restructure and Data Clear
tags: [handoff, continuation, erp, tracker, supabase, vercel, restructure, obsidian]
created: 2026-09-01
status: current
supersedes: "[Session Continuation Package](2026-09-01%20Session%20Continuation%20Package.md) as the entry point; that note is still the record of phases 1–9 and is not duplicated here"
related:
  - "[Decisions](../docs/Decisions.md) — D1 to D12, the authority on what is authorised"
  - "[Handoff](../docs/Handoff.md) — the per-pass record"
  - "[Repository Evidence](../docs/Repository%20Evidence.md) — the factual baseline"
  - "[Seeded Data Backup](../docs/seeded-data-backup/README.md) — the cleared demo rows"
up: "[AI Agent Context](../docs/AI%20Agent%20Context.md)"
---

# Repository Restructure and Data Clear

**This is the current entry point.** It covers phases 10 to 13 and carries the live facts. Phases
1 to 9 are in [Session Continuation Package](2026-09-01%20Session%20Continuation%20Package.md),
which stays as the record of how the app was built and is **not** repeated here — read it second,
for the story and for the traps that still apply.

**Read in this order.**

1. This note — *Where everything lives*, *What changed*, *Open items*.
2. [Session Continuation Package](2026-09-01%20Session%20Continuation%20Package.md) — phases 1–9,
   the codebase map, and traps 1 to 12.
3. [Decisions](../docs/Decisions.md) — D1 to D12.
4. [Handoff](../docs/Handoff.md) — dated pass records.

---

## What changed since the first package

Four phases, in order. Each is written up in [Handoff](../docs/Handoff.md); this is the sequence
and the reasoning.

| # | Phase | Trigger | Outcome |
|---|---|---|---|
| 10 | Documentation pass | "map, note, write, everything that happened" | The first continuation package; hub and handoff rewired |
| 11 | Resume prompts | "make sure to include resume prompts… globally" | Global `## Handoff Policy`; project rule; five prompts added |
| 12 | Repository re-root | "back up the notes to the tracker repo" | Repo root moved to the project root; `docs/`, `handoff/`; Vercel Root Directory set to `apps/web` |
| 13 | Demo data clear | "now clear the demo data" | Ledger emptied, seed removed, suite made self-sufficient |

---

## Where everything lives — the current picture

Superseding the equivalent table in the first package where they disagree.

### Layout

```
puge/                        ← repository root AND Obsidian vault root
├── AGENTS.md  CLAUDE.md     ← synchronised, byte-identical, must change together
├── CLAUDE.local.md          ← gitignored, machine-local
├── docs/                    ← the knowledge notes
│   ├── AI Agent Context.md          navigation hub
│   ├── Decisions.md                 D1..D12
│   ├── Handoff.md                   dated pass records
│   ├── Repository Evidence.md       observed facts
│   ├── Awesome Guidelines Integration.md
│   ├── Turborepo and Turbopack.md
│   └── seeded-data-backup/          the cleared demo rows + how to restore
├── handoff/                 ← YYYY-MM-DD Title.md, chronological
├── apps/web/                ← the app. Vercel's Root Directory points here
├── apps/api/                ← still empty, still undecided
├── company_tracker/         ← the read-only Design Component exports
├── construction_tracker/    ← construction.csv, never built
└── .obsidian/               ← gitignored: 16 MB of plugin bundles, editor state
```

### Services

| Thing | Value |
|---|---|
| Supabase project | `jusifpditdigqdjiwdaj`, name `baby`, `ap-southeast-1`, **free plan** |
| Vercel project | `tracker`, `prj_7Nn67JEsbpVL98GZssRteALD7i7L`, team `team_b28zdgmC8juoUYma2pUpdZPA`, hobby |
| **Vercel Root Directory** | **`apps/web`** — set by the owner on 2026-09-01. Unsetting it breaks every build |
| Production | `https://tracker-six-flax.vercel.app` |
| GitHub | `Leuename/tracker`, private, now the whole project |
| Storage bucket | `receipts` — private, 10 MB, images + PDF |

### Ledger, as of the clear

| Table | Rows |
|---|---:|
| `txns`, `receipts`, `recurring` | **0** |
| `app_config` | 1 — 21 companies, 13 categories, 0 notes, settings |
| storage objects | 0 |

The config row is **kept deliberately**. `load()` reads its absence as "never used", so deleting
*it* — not the payables — is what makes a workspace start over. The company and category lists
survived the clear because emptying them would blank every dropdown; they are configuration, not
content, and they are still the prototype's lists.

---

## Phase 12 in detail — the re-root

The repository held `apps/web` alone, so the notes existed on one machine and nowhere else.
Losing that disk lost every reason behind the code.

**What was done.** `.git` moved up to the project root. Notes moved to `docs/`, the handoff to
`handoff/` renamed chronologically. 46 application files recorded as renames, so history follows
them. `company_tracker/`, `construction_tracker/`, the delivery ZIP and PDF became versioned.

**How the links were fixed.** 451 local markdown links across ~70 files, rewritten by resolving
each against the pre-move tree and recomputing the relative path — not by search and replace. The
`.claude/rules/*.md` files alone sat at four different depths. All 451 resolve.

**What it required of the owner.** Vercel had **no** Root Directory set, meaning it built from the
repo root. After the move the only manifest was one level down. Two deploys failed with:

```
sh: line 1: vite: command not found
Error: Command "vite build" exited with 127
```

Production stayed up throughout on the last good build — **a failed Vercel build never replaces a
working deployment.** The owner set Root Directory to `apps/web`, an empty commit triggered a
build, and it went green.

**A miss caught on verification.** The resume prompts live inside code fences, so the link
rewriter skipped them and they still named pre-move paths — the exact failure the package exists
to prevent. Fixed in a follow-up commit.

**`vercel.json` did not need moving.** With a Root Directory set, Vercel reads `vercel.json` from
*that* directory. `apps/web/vercel.json` stayed correct where it was. Moving it to the repo root
would silently stop the headers applying, and the only symptom would be the security probe's last
four checks failing.

---

## Phase 13 in detail — clearing the demo data

All 32 rows dated 2026-08-31; nothing genuine was lost. The restore path already existed in
`apps/web/src/data.js`, so no export was needed at delete time — the archive in
[docs/seeded-data-backup/](../docs/seeded-data-backup/README.md) was written afterwards, on
request, and its totals match what was read from the live database immediately before the delete.

**The seed was removed too**, not just the rows. `seed()` became `start()`: a workspace with no
config row opens empty and writes only the config row.

### Clearing the data broke the test suite, which was the useful part

Six specs quietly depended on demo data they had not created — three hunted for "an existing
receipt", two needed a masterlist rule, and `smoke` asserted the seed had run. Making them
self-sufficient surfaced five further defects **in the tests**:

| Defect | Why it mattered |
|---|---|
| Fixtures shared one name | Two receipts matched the same row locator; the click became ambiguous |
| Fixtures created after `signIn` | The app reads its data once at mount, so the row was invisible to the page |
| Masterlist spec required a rule row | An empty masterlist is a legitimate state; the spec failed on a correct app |
| `smoke` left rows behind on a thrown assertion | A crashed run left two rows in the live ledger |
| `smoke` never restored the category list | Left a stray `Smoke Category` in the shared config |

The last two were not theoretical — both residues were found on the verification pass and removed.
`smoke` now does its cleanup in a `finally`.

---

## Open items awaiting your decision

Renumbered and current. Items 1 and 8 from the first package are **done**.

| # | Item | Why it needs you | Cost of waiting |
|---|---|---|---|
| 1 | **Backups** | Verified in Supabase docs: free-plan backups are *not downloadable*, and free projects pause after a 7-day low-activity window. Upgrade to Pro, or I script an export | **Highest.** No restore path for real data |
| 2 | **Password rotation** | Deferred three times. Five characters, shared across all three accounts, in front of a public URL | Compounding |
| 3 | **Company codes and categories** | Still the prototype's 21 and 13. They feed every dropdown | **Fix before real data goes in** |
| 4 | **`ackRequirePhoto`** — currently **off** | It was stored `true` while it did nothing; now it genuinely blocks liquidation without a file | None |
| 5 | **Receipt deletion does not exist** | Transactions can be deleted; receipts cannot, anywhere | Low until someone mistypes |
| 6 | **Roles, with three accounts** | All three can delete any row. You chose "same as admin" when it was two people | Grows with headcount |
| 7 | **The construction tracker screens** | `construction_tracker/construction.csv` specifies attendance, payroll, cash-flow, debts, expenses, receivables. None built | Unknown — never scoped |

---

## Held back deliberately

- **`autoGen` and `ackAutoNotify` removed, not built.** Both need work while nobody has the app
  open. No scheduler exists.
- **No audit trail.** Three equal accounts, nothing records who changed what.
- **No CI.** A push to `main` deploys unchecked; every test runs from a developer's machine.
- **Last write wins.** No conflict detection, no realtime.
- **No migration files in the repo.** The schema lives only in the Supabase project — five
  migrations, listed in the first package.
- **`apps/api/` still empty**, still undecided.

---

## Traps, continued

Traps 1 to 12 are in [the first package](2026-09-01%20Session%20Continuation%20Package.md#traps-for-the-next-agent)
and all still apply. These are new.

13. **Vercel's Root Directory is load-bearing.** It is `apps/web`. Unset it and every build fails
    with `vite: command not found`. It also determines where `vercel.json` is read from.
14. **A failed Vercel build does not take production down.** The domain keeps serving the last
    successful deployment. Check the deployment list before assuming an outage.
15. **Link rewriters do not see inside code fences.** Any path written in a fenced block — resume
    prompts especially — must be updated by hand after a move.
16. **No spec may assume the ledger has content.** Use `makeReceipt` / `makeRecurring` from
    `e2e/db.js`, create the fixture **before** `signIn`, and give each a unique name.
17. **`git mv` cannot move a repo root.** Move `.git` up, then `git add -A`; rename detection does
    the rest. Verify with `git status --short | grep '^R '` before committing.
18. **`.obsidian/` is 16 MB** and churns on every pane change. It is gitignored. Do not add it.

---

## How to verify the state in a fresh session

```bash
cd /Users/itadmin/Desktop/puge/apps/web
npm test                                      # 33 offline assertions
E2E_EMAIL=… E2E_PASSWORD=… npm run e2e        # 24 specs
E2E_EMAIL=… E2E_PASSWORD=… npm run security   # 33 checks
SMOKE_EMAIL=… SMOKE_PASSWORD=… npm run smoke  # live end-to-end
npm audit                                     # expect 0
```

Note the variable names differ: `E2E_*` for Playwright and the probe, `SMOKE_*` for the smoke
script. Getting this wrong prints "Set SMOKE_EMAIL and SMOKE_PASSWORD" and exits 2.

**Expected ledger afterwards:** zero transactions, receipts and recurring rules; one config row
with 21 companies, 13 categories, empty notes; zero stored files; nothing tagged `E2E-`, named
`smoke holder`, or carrying a probe note. Anything else means a run left residue.

**Last verified green:** 2026-09-01 — 33 unit, 24 e2e (five consecutive local runs plus
production), 33 security against production, smoke passing, `npm audit` clean.

---

## Resume prompts

Paste one into a fresh chat. Each names this file and tells the session to verify before acting.

### Straight continuation

```
Read "handoff/2026-09-01 Repository Restructure and Data Clear.md" in
/Users/itadmin/Desktop/puge, then docs/Decisions.md. Confirm the current state back
to me in a few lines — including anything you find stale — before doing any work.
Then wait.
```

### Work the open items

```
Read "handoff/2026-09-01 Repository Restructure and Data Clear.md" in
/Users/itadmin/Desktop/puge. Work its "Open items awaiting your decision" list. Ask
me the ones needing a decision in one batch and do not build until I answer.
Backups (item 1) first.
```

### Pick up a specific piece of work

```
Read "handoff/2026-09-01 Repository Restructure and Data Clear.md" in
/Users/itadmin/Desktop/puge for context, then <TASK>. Respect docs/Decisions.md —
D8 (one shared ledger, no roles), D10 (a control either works or is removed) and
D12 (the ledger holds only real data) constrain most changes. Run npm test,
npm run e2e and npm run security in apps/web before telling me it is done.
```

### Something is broken in production

```
Read "handoff/2026-09-01 Repository Restructure and Data Clear.md" in
/Users/itadmin/Desktop/puge, its Traps section and the first package's. <SYMPTOM>.
Check the Vercel deployment list and the Supabase project state before assuming a
code fault. Reproduce it before proposing a fix, and give me the root cause.
```

### After a long gap

```
Read "handoff/2026-09-01 Repository Restructure and Data Clear.md" in
/Users/itadmin/Desktop/puge. Verify the state still matches: run npm test,
npm run e2e and npm run security in apps/web, and check the Supabase project has
not paused — it is on the free plan and pauses after 7 quiet days. Report what
drifted.
```

---

## Suggested skills for the next session

| Skill | When |
|---|---|
| `superpowers:systematic-debugging` | Any reported failure. Every hard bug this session was misdiagnosed on the first pass |
| `superpowers:verification-before-completion` | Before reporting anything done. Three "passes" this session were not |
| `superpowers:test-driven-development` | Before touching `logic.js`, `rows.js` or `errors.js` — all pinned by tests |
| `obsidian-vault` | Before writing any note. Resolve the vault; this project *is* the vault |
| `supabase` | Any schema, RLS, storage or auth change. Check the changelog first |
| `security-review` (project) | Anything touching grants, policies, storage or headers |
| `database-design` | If backups, migrations-in-repo, or an audit trail get built |

---

## Guideline Basis

- **PG-04** requires a continuation record naming scope, checks, limitations and unresolved evidence.
- **DOC-02** keeps observed facts, decisions and open questions separately labelled.
- **MD-02** requires descriptive, resolvable links; every link here targets an existing file.
- **DOC-03** keeps terminology and relationship labels consistent with the rest of the vault.
- **SEC-03** is why no credential appears in this note.

implements: [Awesome Guidelines Integration](../docs/Awesome%20Guidelines%20Integration.md)

Related: [Session Continuation Package](2026-09-01%20Session%20Continuation%20Package.md) · [Decisions](../docs/Decisions.md) · [Handoff](../docs/Handoff.md) · [Repository Evidence](../docs/Repository%20Evidence.md) · [Seeded Data Backup](../docs/seeded-data-backup/README.md)
