---
title: Exchange Rates Shipped, What Is Still Open
tags: [handoff, remediation, brief, erp, tracker, supabase, fx, backups, security]
created: 2026-09-03
status: current
kind: technical brief for an external agent — the open remediation items, updated after R3 shipped
supersedes: "nothing as entry point; extends [[2026-09-03 Remediation Brief for an External Agent]], whose stable IDs (R-, F-, N-, Q-prefixed) it reuses rather than renumbers"
decisions-made: "[[Decisions]] D42 to D44, all recorded on 2026-09-03"
blocked-on-owner:
  - "backfill the six released wires, or leave all nine on constants — Q2c, restated below"
  - "R7: apply the two is_viewer migrations, or accept the advisory permanently"
related:
  - "[[Decisions]] — D1 to D44, the authority on what is authorised"
  - "[[2026-09-03 Remediation Brief for an External Agent]] — the defect index this brief extends; its traps 1-54 and R/F/N/Q ids are load-bearing"
  - "[[2026-09-03 Ten Closed, and a Backup Nobody Had Deployed]] — phases 31-36, traps 55-63"
  - "[[Exchange Rates Proposal]] — R3's spec; now built, mostly"
  - "[Supabase Schema](../supabase/README.md) — thirteen applied, two written and unapplied"
  - "[Backups](../backups/README.md) — the restore procedure"
up: "[[AI Agent Context]]"
---

# Exchange Rates Shipped, What Is Still Open

**Not a fresh entry point.** Read
[[2026-09-03 Ten Closed, and a Backup Nobody Had Deployed]] first if you have not — it is still the
complete-package entry, and everything in its §1 ("a fix in the working tree is not a fix in the
system") and its traps 1–63 still applies without exception. This note is a technical continuation:
what R3 (exchange rates) did between that handoff and now, verified state as of this write, and a
precise account of everything still open, for a fresh agent to plan from.

Do not re-derive facts already established in the two linked handoffs. Cite them.

---

## 1. What shipped — R3, closed as "mostly done"

Commit `cbbe5f1`, pushed to `main`, CI green (`npm test` → `npm run build` → `npm audit`, then a
Vercel deploy), migration `20260903144056_fx_rates` applied and proven live. Full technical account:

### 1.1 The schema

`supabase/migrations/20260903144056_fx_rates.sql` — read the file, it is short and the comments are
the specification. Three objects:

- **`public.fx_rates`** — `(cur, as_of, rate, source, fetched_at)`, PK `(cur, as_of)`. RLS on,
  `anon` and `authenticated` both start revoked, then `select` is granted to `authenticated` and
  **column-level** `insert (cur, as_of, rate, source)` / `update (rate, source)` — `fetched_at` is
  in neither grant, same shape as `created_at` elsewhere (D23).
- **`public.fx_latest`** — a `security_invoker = on` view, `distinct on (cur) ... order by cur,
  as_of desc`. The app reads this, not the table: four currencies × ~260 working days/year crosses
  PostgREST's silent 1,000-row cap inside a year (the exact defect that truncated `audit_log`), so
  the table is for history and backup, the view is what stays small forever.
- **`public.transfers.rate` / `.rate_as_of`** — both nullable, both nullable **meaningfully**: null
  means "never priced," and the fallback chain (below) treats it that way. Granted to every
  administrator (D42 explains why this table differs from `fx_rates` itself).

**D42 — the one policy shape this schema does not otherwise use.** Every other write policy here is
`with check (not public.is_viewer())` — any administrator. `fx_rates`'s two write policies instead
name one account's `uid` literally: `(select auth.uid()) = '14f0d1af-f37a-4936-b278-e280bcb25129'::uuid`.
No administrator can write a rate, full stop. Read [[Decisions]] D42 before touching this table's
policies — the shape is intentional, not an oversight to "fix" toward the usual pattern.

**Verified live, not just applied** (`{"success": true}` proves the SQL ran, not that it works — see
N-series precedent in the prior brief):

| Check | Method | Result |
|---|---|---|
| Admin `INSERT` on `fx_rates` | direct REST call with an admin JWT | `403 42501` |
| Admin `UPDATE` on `fx_rates` | direct REST call with an admin JWT | `403 42501`, value unchanged |
| Rates account `INSERT` on `fx_rates` | direct REST call | `201`, row present |
| Rates account `INSERT` on `txns` | direct REST call | `403 42501` |
| Rates account `SELECT` on `txns` | direct REST call | `200` — **expected, not a bug**: every read policy in this schema is `using(true)`; see the standing note in §4 |
| `fx_latest` readable | direct REST call, admin JWT | `200`, 4 rows |
| `npm run security` | full suite | **56/56**, 7 new checks for this table, 0 failed, no `DEFERRED` entry |

Probe additions live in `apps/web/security/probe.mjs`, appended to section 5 ("What a signed-in
client may write").

### 1.2 The fetcher and its schedule

`apps/web/scripts/fx.mjs` + `.github/workflows/fx.yml`. `npm run fx` / `npm run fx -- --dry-run`.
Secrets `FX_EMAIL` / `FX_PASSWORD`, set in GitHub Actions and in `.env.local` (git-ignored, never
committed).

**Provider: `api.frankfurter.dev/v1`**, ECB reference rates, no API key. One call,
`base=EUR&symbols=PHP,USD,GBP,AUD`, PHP-per-unit derived by division from the EUR-native figures
rather than trusting a rounded PHP-based response.

**Cron: `0 2` and `0 8` UTC — 10:00 and 16:00 Manila, exactly as the owner asked.** Read D43 before
assuming this is wrong: the ECB publishes once daily at ~14:00 UTC, so **both** requested times land
before that day's fix and both see the previous working day's — that is a knowing, confirmed choice,
not a bug to silently "fix" by moving the hours. The second run is a **retry**, not a second number.

**Idempotent by design and proven in production, not just claimed.** `fx.mjs` reads what is already
stored for the resolved `as_of` before writing, and skips anything unchanged. Real evidence, not
inference:

```
run 1 (workflow_dispatch, manual):  Stored 4 row(s) for 2026-09-03: USD, GBP, EUR, AUD
run 2 (workflow_dispatch, manual):  Already stored for 2026-09-03 — nothing to write.
```

Both runs happened inside actual GitHub Actions (run ids `33769364767` for the second), using the
real secrets — not just `npm run fx` locally. `audit_log` count did not move between the two runs.

### 1.3 The fallback chain — `apps/web/src/logic.js`

`rateFor(w, rates)` → three rungs, most specific first: **the wire's own stored `rate`** (compared
against `null`/`''`, not truthiness — a stored `0` is honoured and shown, never silently replaced),
then **the `fx_latest` map for that currency**, then **`TRANSFER_RATES`** (the original five
constants, now the last resort instead of the only resort). `inPesos(w, rates)` and
`transferTotals(transfers, rates)` both take the `fx_latest` map as a second argument;
`transferTotals` additionally reports the **oldest** date any counted wire was priced at, or `null`
the moment even one wire fell through to a constant — so a total can never claim a provenance it did
not entirely earn. 13 new unit tests cover this chain (`src/logic.test.js`), including the zero-rate
and empty-string cases.

`apps/web/src/screens/Telegraphic.jsx` prints `at ECB rates of <date>` or, when the totals are not
fully priced, `indicative — not all wires are priced`. `apps/web/src/modals/RateField.jsx` is the
shared rate input on both `AddTransfer.jsx` and `EditTransfer.jsx`: pre-filled from `fx_latest`,
editable, hint states its own provenance (`ECB <date>` vs `entered by hand` vs `no rate — totals
fall back to constants`).

### 1.4 One real defect, caught before shipping — new finding, **F7**

**F7 — `.upsert()` fails against a table with intentionally narrow column-level grants, and the
failure looks like an RLS problem but is not one.**

`fx_rates.rate` and `.source` are the only columns `authenticated` has `UPDATE` on — `cur` and
`as_of` deliberately are not, since they are the primary key. Supabase JS's `.upsert(rows, {
onConflict })` compiles to `INSERT ... ON CONFLICT (...) DO UPDATE SET col = EXCLUDED.col` naming
**every** column in the payload, PK columns included, even though their values do not change on
conflict. Postgres checks privilege on every column named in a `SET` clause regardless of whether the
value differs, so the call failed:

```
permission denied for table fx_rates
hint: "Grant the required privileges to the current role with: GRANT UPDATE ON public.fx_rates TO authenticated;"
```

That error is column-grant-shaped, not RLS-shaped (RLS violations say `"new row violates row-level
security policy"`) — worth knowing before assuming any `42501` here means a policy problem.

**Not fixed by widening the grant** — that grant is narrow on purpose (D42's whole point).
Fixed by splitting the write into two paths in `fx.mjs`: `.insert()` for rows with no existing value,
and a targeted `.update({ rate, source }).eq('cur', c).eq('as_of', asOf)` per row for the rest —
naming only the two columns that are actually granted. Reproduced with a direct `curl` upsert call
first to confirm root cause before writing the fix, rather than guessing.

**Trap 64, added to the running list**: any future table with column-scoped grants narrower than its
full row shape cannot safely use `.upsert()`. Use an explicit insert/update split instead.

### 1.5 Deliberately not done — no backfill (yet)

All nine wires that existed before this shipped — six released, three pending — kept `rate: null,
rate_as_of: null`. Confirmed directly: `select count(*) from transfers where rate is not null` → `0`.
The `txns` fingerprint (`05a080127ca18b46dc693edbd22b5168`) was checked before this session's first
write and after its last — unchanged throughout. **Nothing on the ledger or the transfer sheet moved
as a result of this build.**

This is the one part of R3 that is genuinely unfinished, not merely deferred by convention — see §3,
Q2c.

---

## 2. Verified state, right now

Read live for this brief, `2026-09-03` ~15:00 UTC. Do not trust it past the point you start acting —
re-run the equivalent queries; see §5.

| | |
|---|---|
| `main` | `cbbe5f1`, `origin/main..HEAD` empty |
| `auth.users` | **5** — 4 admin, 1 viewer (`admin@admin.com`, the rates account) |
| `txns` | 21 rows, ₱226,000.00, fingerprint `05a080127ca18b46dc693edbd22b5168` — unchanged all session |
| `transfers` | 9 rows, **0** carry a stored rate |
| `fx_rates` | 4 rows, `as_of 2026-09-03`, source `"ECB via frankfurter.dev"` for all four |
| `audit_log` | 1,474 rows (was 1,389 after the last confirmed nightly backup — the delta is this session's writes: the smoke test, the e2e run, the security probe, the fx runs) |
| migrations applied | **13** (12 prior + `fx_rates`); `private` schema **absent**, `public.is_viewer()` **still present** |
| security advisors | 2 `WARN`, unchanged from before this session: `is_viewer()` is `SECURITY DEFINER` and callable by `authenticated` (expected — see D34, N1 in the prior brief); leaked-password protection disabled (Pro-only) |
| `npm test` | 66/66 (was 53; +13 for the fallback chain) |
| `npm run security` | 56/56 (was 49; +7 for `fx_rates`) |
| `npx playwright test --workers=1` | 29/29, ~1.3 min |
| CI (`cbbe5f1`) | green — check, then deploy |
| production | `https://tracker-six-flax.vercel.app/` → `200` |
| last nightly Backup run | `40d8fe4`, **before** this session's push — tonight's 18:00 UTC run is the first with `fx_rates` in `TABLES` (`apps/web/scripts/backup.mjs`) and the fifth account in the roster. **Its manifest has not yet been checked** — do that before trusting `backups/` reflects current state |

---

## 3. The remediation index, updated

Stable IDs from [[2026-09-03 Remediation Brief for an External Agent]] §5, reused as-is. Rows not
listed here are **unchanged** from that brief — go read it, do not assume silence means resolved.

| ID | Status change this session |
|---|---|
| **R3** | Was "not started." Now **built and shipped** — §1 above. One decision remains, see Q2c below; everything else in the original proposal (provider, editability, the CSP constraint, the fallback chain, the date on the strip) is done |
| **R11** | Was "no viewer account exists." **Partially addressed, not closed — do not mark it done.** A `role = 'viewer'` account now exists in production and is exercised daily by real policy checks (`fx_rates` write refusal proves the role model works end to end). But R11's original ask was a viewer account **for a person to test the UI's read-only affordances with**, and this one is a robot credential nobody signs into interactively. If a human viewer account is still wanted, it is still not issued |
| **F7** | New finding this session — §1.4. Not a repository defect requiring further action; `fx.mjs` already carries the fix. Recorded because the underlying gotcha (`.upsert()` vs column-scoped grants) will recur the moment anyone adds another narrowly-granted table |

Everything else — **R2/R9** (audit_log full-volume restore, needs `psql \copy`), **R7** (`is_viewer`
migrations, unapplied, see §3.1 below), **R8** (preflight/retries, deferred), **R10** (`files/`
restore, unexercised), **R12** (notifications, needs a provider), **R14** (`apps/api/`, owner
preference), **F5** (storage paging, never seen a live bucket), the `signOut()` scope question,
leaked-password protection (Pro-only) — **all unchanged**. Read the prior brief's §5 for each one's
exact location and blocker; nothing here supersedes it.

### 3.1 R7, specifically — because it is the most likely next task

Two migrations exist, applied nowhere, unproven even on `tracker-rehearsal`:

- `supabase/migrations/20260903071500_private_is_viewer.sql` — moves `is_viewer()` into a
  non-exposed `private` schema, repoints all 17 write policies plus `merge_app_config`, **keeps**
  `public.is_viewer()`
- `supabase/migrations/20260903071600_drop_public_is_viewer.sql` — drops `public.is_viewer()`.
  Header says `DO NOT APPLY THIS YET`

**This session did not touch either one.** `fx_rates` does not call `is_viewer()` at all (D42), so
building R3 changed nothing about R7's readiness or blockers. The ordering constraint from
`supabase/README.md` still holds exactly as documented: apply migration 1 → deploy the `db.js` change
that already reads `public.profiles` directly (already in the tree, safe standalone) → **then**
apply migration 2. Prove both on `tracker-rehearsal` first.

### 3.2 New non-action — N9

| ID | Do not | Why |
|---|---|---|
| **N9** | Do **not** rotate `FX_PASSWORD` / the rates account's password | Owner explicitly deferred it this session: "we are live and testing at the same time, we will not change password yet." [[Decisions]] D44. Raise it again once R3 has settled, but do not act on your own judgment — the owner asked to be reminded, not overridden |

---

## 4. One standing fact worth restating, because a fresh agent will trip on it

**A `role = 'viewer'` account can still read the entire ledger.** `is_viewer()` gates *writes* — read
policies on `txns`, `receipts`, `recurring`, `transfers`, `audit_log` and now `fx_rates` are all
`using(true)` for any `authenticated` principal, admin or viewer alike. The rates account
(`admin@admin.com`) can `SELECT` every payable, wire and audit row in production; it just cannot
`INSERT`/`UPDATE`/`DELETE` anything outside `fx_rates`. This was surfaced and accepted explicitly
this session, not overlooked — see §2 of [[2026-09-03 Remediation Brief for an External Agent]] for
the read-policy shape and why nobody has narrowed it (D8, D20).

---

## 5. How to verify this brief before acting on it

```bash
cd /Users/itadmin/Desktop/puge
git log origin/main..HEAD          # expect empty
git log -1 --format='%H'           # expect cbbe5f1 or later

cd apps/web
npm test                           # expect 66
npm run build
npm audit
npm run security                   # expect 56, 0 failed, no DEFERRED entry
npx playwright test --workers=1    # expect 29, ~1.3 min — WRITES to production
```

```sql
-- ledger unchanged
select md5(string_agg(t::text, chr(10) order by t.id)) fingerprint, count(*), sum(amount)::text
  from public.txns t;
-- expect 05a080127ca18b46dc693edbd22b5168, 21, 226000.00 — if it differs, the owner has
-- been working; say so rather than assuming damage (D40's own lesson, restated)

-- roster: five now, not four
select u.email, p.role from public.profiles p join auth.users u on u.id = p.user_id order by 2, 1;

-- fx state
select cur, as_of, rate, source from public.fx_rates order by cur;
select count(*) rated from public.transfers where rate is not null;  -- expect 0 until backfill

-- migrations
select version, name from supabase_migrations.schema_migrations order by version desc limit 3;
-- expect the newest to be 20260903144056, name fx_rates
```

Then check `backups/MANIFEST.md` on `origin/main` for tonight's 18:00 UTC run — the first with
`fx_rates` included. `audit_log rows` should read **≥ 1474**, `Accounts in the roster` should read
**5**. If either is stale or short, treat it exactly as F6 was treated in the prior brief: the most
important fact in the repository, not a side note.

---

## 6. Questions only the owner can answer, restated

Superset unchanged from the prior brief's §7 — Q3 (R7), Q5 (R8), Q7 was answered (D36), Q9 (R14),
Q10 (R11, still open per §3 above), Q11 (R12), Q13 (R10), Q14 was answered (R13). One is new:

**Q2c — restated with the constants removed as an excuse.** The prior brief could not answer this
because exchange rates did not exist yet; they do now, so the question is sharper: **backfill the
six released wires with the ECB rate for their actual release date (recoverable from `audit_log`,
all six show `released_on 2026-09-02`), or leave all nine on the pre-rate constants indefinitely?**
Every rate stays editable per wire regardless of the answer, and every change is a normal audited
column update, reversible via `npm run rewind` — this is not a one-way door. Not answered this
session; not defaulted, because it changes what the transfer sheet displays for real money that has
already moved.

---

## Resume prompt

```
Read these, in this order, in /Users/itadmin/Desktop/puge:

  handoff/2026-09-03 Exchange Rates Shipped, What Is Still Open.md         (this file — what changed and what remains)
  handoff/2026-09-03 Ten Closed, and a Backup Nobody Had Deployed.md       (entry point, phases 31-36, traps 1-63)
  handoff/2026-09-03 Remediation Brief for an External Agent.md           (stable R/F/N/Q ids this file extends)
  docs/Decisions.md                                                       (D1-D44; D42-D44 are this session's)
  supabase/README.md                                                     (thirteen applied, two written and unapplied)
  backups/README.md                                                      (the restore procedure)

This is a React + Vite ERP in apps/web on Supabase Postgres, deployed to Vercel behind a CI
gate. main is at cbbe5f1. Five accounts now — four administrators and one dedicated viewer
account that exists only to write exchange rates. One shared ledger, REAL money, and the
owner uses it daily during Manila working hours. There is no staging environment: npm run
e2e, npm run security and npm run smoke all WRITE to production.

FIRST, verify rather than trust this snapshot: git log origin/main..HEAD (expect empty), then
in apps/web: npm test (expect 66), npm run build, npm audit, npm run security (expect 56, 0
failed, no DEFERRED entry), npx playwright test --workers=1 (expect 29, ~1.3 min, WRITES to
production). Then check backups/MANIFEST.md on origin/main for the first nightly Backup run
at or after 2026-09-03T18:00 UTC — confirm audit_log rows >= 1474 and the roster reads 5, not
4. Then in Postgres: the txns fingerprint must still read
05a080127ca18b46dc693edbd22b5168 (21 rows, PHP 226,000.00) — if it differs, the owner has
been working, say so rather than assuming damage.

This session shipped exchange rates (R3 from the linked remediation brief): a fx_rates table
and fx_latest view, an ECB fetch job (frankfurter.dev, no API key) running twice daily at
02:00 and 08:00 UTC, and a three-rung fallback (a wire's own stored rate, then the daily
feed, then the original five constants) in apps/web/src/logic.js. Proven live: an
administrator cannot write a rate (42501, verified by direct REST call and by the security
probe), the dedicated rates account can, and a same-day retry writes nothing. No backfill
happened — all nine existing wires still show rate: null, and the ledger fingerprint never
moved. Full technical detail, including one real bug caught and fixed (Supabase JS's
.upsert() fails against a table with intentionally narrow column-level grants — split into
insert/update instead of widening the grant), is in this file's sections 1 and 2.

Hold these while you work, in addition to every trap in the two linked handoffs:
- fx_rates write policies name ONE account's uid directly, not is_viewer() (Decisions D42).
  Do not "fix" this toward the usual not-is_viewer() shape — the whole point is that no
  administrator, however trusted, can write a rate.
- The fx cron runs at 02:00 and 08:00 UTC deliberately, landing before the ECB's ~14:00 UTC
  daily publication both times, so the stored rate is always one working day old by design
  (Decisions D43). This is a known, confirmed tradeoff, not a bug to move the hours to fix.
- Do NOT rotate FX_PASSWORD (admin@admin.com on production) without being asked. The owner
  explicitly deferred it this session and asked to be reminded later, not overridden
  (Decisions D44, N9 in this file's section 3.2).
- A role='viewer' account can still read the ENTIRE ledger — is_viewer() gates writes only,
  every read policy is using(true). This is expected and was accepted explicitly, not an
  oversight (section 4 of this file).
- R7 (moving is_viewer() to a non-exposed schema) is untouched by this session and remains
  exactly where the prior brief left it: two migrations written, applied nowhere, ordering
  load-bearing. It does not depend on or conflict with anything fx_rates did.
- Q2c (backfill the six released wires with dated ECB rates, or leave all nine on constants)
  is the one open decision from this session's build. It is reversible either way (every
  rate stays editable, every change is a normal audited update, npm run rewind exists) but
  was deliberately not defaulted because it changes what the sheet shows for money that has
  already moved.
- Every trap and non-action from the two linked handoffs still applies without exception:
  the working-tree-vs-system gap (trap 55), receipts growing being the owner working not
  residue (trap 61), never running a bulk audit_log restore through an agent tool (trap 62),
  never revoking EXECUTE on is_viewer() (N1), never modifying company_tracker/ (N7), never
  cleaning up audit_log (N8), and all the rest — read them, do not re-derive them.

Next work, in the order the owner is most likely to want it:
1. Confirm tonight's Backup manifest (above) — first run with fx_rates included.
2. Get an answer to Q2c (backfill) and implement whichever the owner picks; it is a single
   audited UPDATE per wire either way.
3. R7: prove the two is_viewer migrations on tracker-rehearsal, then apply to production in
   the documented order (migration 1, deploy db.js's already-written change, migration 2).
4. Everything else in the prior remediation brief's still-open list (R2/R9, R8, R10, R12,
   R14, F5, the signOut() scope question) — unchanged, unprioritized relative to each other,
   pick per owner preference.

Report what you verified and what drifted, confirm the state back to me in a few lines, and
wait for direction before starting any of the above.
```

## Guideline Basis

- **PG-04** requires a continuation record naming scope, checks, limitations and unresolved evidence.
- **DOC-02** keeps observed facts, decisions and open questions separately labelled, and this file adds no claim it did not verify live.
- **MD-02** requires descriptive, resolvable links; every link here targets an existing file.
- **DOC-03** keeps terminology and stable IDs (R-, F-, N-, Q-prefixed) consistent with the brief this extends, rather than renumbering.
- **SEC-03** is why no credential value appears here — the rates account's password is named as a fact of its existence, never printed.

implements: [Awesome Guidelines Integration](../docs/Awesome%20Guidelines%20Integration.md)

Related: [[2026-09-03 Remediation Brief for an External Agent]] · [[2026-09-03 Ten Closed, and a Backup Nobody Had Deployed]] · [[Decisions]] · [[Exchange Rates Proposal]] · [Supabase Schema](../supabase/README.md) · [Backups](../backups/README.md) · [[AI Agent Context]]
