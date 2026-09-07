---
title: Open Problems and Proposals
tags: [proposal, open-items, erp, tracker, supabase, fx, backups, testing, security]
created: 2026-09-02
updated: 2026-09-02
status: round 2 — items 3, 6, 7, 8 awaiting approval; 1 moved to its own note; 2 built; 4 and 5 resolved by experiment
related:
  - "[Decisions](Decisions.md) — D1 to D48 now; this note was written when the record ended at D31"
  - "[Everything Held Back, Built](../handoff/2026-09-02%20Everything%20Held%20Back,%20Built.md) — the current handoff, whose open-items table this expands"
  - "[Repository Evidence](Repository%20Evidence.md) — the factual baseline"
  - "[Backups](../backups/README.md) — the restore procedure"
up: "[AI Agent Context](AI%20Agent%20Context.md)"
---

# Open Problems and Proposals

**Round 2.** The owner answered round 1 on 2026-09-02. This revision records what was decided,
what was carried out, what changed as a result, and what is still waiting on an answer.

Nothing is built except where a section says so — item 2's `rewind.mjs` is, and items 4 and 5 were
settled by experiment rather than by argument. Approve the rest by item number.

## Round 1 outcome, in one table

| # | Problem | Owner's answer | State now |
|---|---|---|---|
| 1 | Cross-currency totals on five hardcoded numbers | *"What if we have an API for exchange rates?"* → *"propose it again"* | **Moved to [Exchange Rates Proposal](Exchange%20Rates%20Proposal.md).** Read that note |
| 2 | Real data unbacked-up for up to 24 hours | *"Yes… roll back a minute before"* → *"use the write-ahead log"* | **Snapshot taken. `rewind.mjs` built and rehearsed** end to end |
| 3 | e2e cannot tell a slow network from a broken app | *"What should we do? Devise a plan and consult Codex"* | **Root cause found.** Four workers, one shared ledger. Not the network |
| 4 | `is_viewer()` callable over RPC | *"You may proceed with the migration"* | **Resolved.** Tested, answered, and it is not what anyone expected |
| 5 | `profiles` restore untested | *"create a new one and do not touch it"* → *"retry"* | **Rehearsed. It does not work** — `backups/` has no `auth.users`, so the roster cannot be restored |
| 6–8 | Traces, scheduler credentials, smaller items | *"Same as 3 — devise a plan and consult"* | **Plans below, consultation done.** It corrected a real error in item 6 |

---

## Before anything else: `zone-offices` is not a scratch project

Round 1 proposed rehearsing on `zone-offices` and said the free plan's two active slots were
both held. That was based on a reading taken while the project was still coming out of pause,
and **it was wrong.**

`zone-offices` (`lasycakyudaawrydetnm`) holds a **live CRM**: 18 tables in `public` —
`contacts`, `companies`, `opportunities`, `opportunity_products`,
`opportunity_stage_history`, `pipeline_stages`, `products`, `sales_representatives`,
`activities`, `lead_sources`, `audit_events`, `sessions`, `users`, `login_attempts`,
`login_telemetry_daily`, `loss_reasons`, `search_rate_limit`, `app_settings` — behind
**21 migrations** of its own.

It is not a place to replay this project's schema. One migration of ours was sent to it while
it was still restoring; it returned `{"success": true}` and **did not land**, because the
instance it reached was replaced as the restore finished. That was luck, not design, and it is
[Decisions](Decisions.md) D23's lesson arriving a third time: *`{"success": true}` proves the
SQL ran, not that it achieved anything.*

**Verified afterwards, four ways:** zero of our tables (`txns`, `receipts`, `recurring`,
`app_config`, `profiles`, `audit_log`), zero of our functions (`is_viewer`, `log_change`,
`merge_app_config`), zero of our indexes, zero rows in its `schema_migrations` at or after
`20260831000000`, and its own 18 tables and 21 migrations intact. `zone-offices` is unchanged.

It was restored, because restoring it was the only way to look inside; the instruction since was
*"do not touch it"*, which was followed — its status was read and nothing else. **The owner paused
it again**, which freed the second free-plan slot, and `tracker-rehearsal`
(`bucmcnsjkuprpojhequy`) was created in its place. Everything item 5 needed was done there.

---

## 1 — Exchange rates → moved to its own note

**Superseded by [Exchange Rates Proposal](Exchange%20Rates%20Proposal.md), 2026-09-02.** Re-proposed
standalone at the owner's request, and re-costed against the state of the sheet this afternoon —
six of the nine wires were marked `released` at 10:32 UTC, so the money has moved, and the two
strip totals now read ₱15,455,590.00 pending and ₱24,509,173.80 released. Read that note; the
summary below is kept only so this table is not a dead end.

<details><summary>Superseded round-2 text</summary>

### The old heading: yes to an API, but it solves half the problem

### The answer to your question

An exchange-rate API is the right upgrade, and it fixes the half that is embarrassing —
`{ USD: 58, GBP: 74, EUR: 63 }` sitting in `apps/web/src/logic.js:259` with no date and no
source. It does **not** fix the half that is expensive.

Two different problems hide behind one symptom:

- **Stale defaults.** Today's rate is a guess copied from a prototype. *An API fixes this.*
- **Revalued history.** A wire sent in March should be worth what March's rate said, forever.
  With a live API and no stored rate, **every wire on the sheet is re-priced every time the
  rate moves** — last month's telegraphic transfer changes value overnight because the peso
  did. *An API makes this worse, not better,* because the numbers now move daily instead of
  never.

So: fetch the rate from an API **and stamp it on the wire**. The API supplies the default; the
stamp is what makes the figure mean something a month later. [Decisions](Decisions.md) D22
named the stamp; the API is the part D22 did not anticipate.

### Two constraints that decide the design

**The browser cannot call a rate API.** The deployed Content-Security-Policy is
`connect-src 'self' https://jusifpditdigqdjiwdaj.supabase.co wss://jusifpditdigqdjiwdaj.supabase.co`
— verified in today's security run, which passes 7 of 7 header checks. A `fetch()` to any other
origin is blocked, silently. Allowing one means widening a control the probe measures.

**A key in the bundle is not a secret.** Vite ships every `VITE_`-prefixed variable to the
browser, and D9 forbids putting anything but the two public Supabase values there. A keyed API
called from the client publishes its key.

Both point the same way: **fetch server-side, store in Postgres, read it like every other row.**

### Proposal

1. **`public.fx_rates`** — `(cur text, as_of date, rate numeric, source text, fetched_at
   timestamptz, primary key (cur, as_of))`. A new table, so it takes all five obligations it
   does not inherit: `revoke all` then grant back, a `for select` policy plus write policies
   predicated on `not public.is_viewer()`, an entry in `TABLES` in
   `apps/web/scripts/backup.mjs`, its own security-probe checks, and its own `log_change()`
   trigger.
2. **The daily scheduler fetches them.** `.github/workflows/schedule.yml` already runs every
   day and already signs in as an administrator ([Decisions](Decisions.md) D31). It gains a
   step that fetches today's rates and upserts one row per currency. One call a day fits every
   free tier, no key need ever reach the browser, and a failed fetch turns the run red instead
   of failing silently.
3. **`transfers.rate` and `transfers.rate_at`.** `rate` is client-settable and defaults from
   the newest `fx_rates` row for that currency; `rate_at` is server-managed and must be left
   out of the `authenticated` column grant, exactly as `created_at` is ([Decisions](Decisions.md)
   D23).
4. **`inPesos` prefers the stored rate**, falls back to the newest `fx_rates` row, and falls
   back again to `TRANSFER_RATES`. The nine existing wires keep the value they have today until
   somebody decides otherwise — no backfill, no figure moving on deploy.
5. **The strip shows the rate's date.** A number whose provenance is invisible is how this
   started. `as_of` on screen means a stale rate looks stale.

**Provider.** Recommend `frankfurter.app` first: European Central Bank reference rates, no API
key, no account, PHP/USD/GBP/EUR/AUD all published, daily. **No key means no secret to store,
leak or rotate** — and rotation is deferred by you, so a design that needs none is worth
preferring. `exchangerate.host` and `open.er-api.com` are the keyed alternatives if ECB's daily
fix is too coarse.

**Cost.** One migration, one workflow step, one changed function, two form fields, unit tests on
the fallback chain, and probe coverage proving `rate_at` is refused from a client. One working
pass, the same as round 1 estimated — the API adds a step, not a project.

### Decision needed

- **Provider: frankfurter (no key) or a keyed one?**
- **May a person override the fetched rate on the form,** or is the daily rate authoritative?
- **Backfill the nine existing wires** with the rates they were actually sent at? That needs
  the real numbers from you; without them they stay on the constants.

</details>

---

## 2 — Backups, and rolling back a minute

### Done already

The backup ran by dispatch at **08:23:55Z** and captured the nine wires. `backups/MANIFEST.md`
now reads `transfers rows 9`, `audit_log rows 1000`, `profiles rows 4`. They are in version
control.

### The second daily run — approved, one line

A second `cron` entry in `.github/workflows/backup.yml` at 09:00 UTC (17:00 Manila, after the
working day). Worst-case exposure falls from about 24 hours to about 9. The numeric-id sort fix
([Decisions](Decisions.md) D24) already made each night's `audit_log` rows a clean append, so a
second commit a day costs a few kilobytes.

### "Roll back a minute before" — you already have the data, not the tool

What you are describing is point-in-time recovery. Supabase sells it as a Pro add-on; the free
plan takes daily backups you cannot download. So one honest answer is *upgrade*.

The better answer is that **this project already keeps a write-ahead log and nobody has ever
used it that way.** `public.audit_log` stores, for every change: the table, the operation, the
whole row `before`, the whole row `after`, the timestamp and the actor's email. Confirmed today
by reading `pg_trigger`: **all six tables carry a `log_change()` trigger** — `txns`, `receipts`,
`recurring`, `transfers`, `app_config` **and `profiles`**. Nothing that matters is unlogged.

That is enough to reconstruct the ledger as it stood at any second you name.

**Built 2026-09-02, on the owner's instruction — *"since PITR is a Pro add-on, use the
write-ahead log."*** `apps/web/scripts/rewind.mjs`, `apps/web/scripts/rewind-plan.js` and
`apps/web/scripts/rewind-plan.test.js`. Given a timestamp `T`, it reads every `audit_log` row
with `at > T` and works out what to put back:

| Oldest logged entry for a row, after `T` | What it means | Undo |
|---|---|---|
| `INSERT` | the row did not exist at `T` | delete it |
| `UPDATE` or `DELETE` | its `before` **is** its state at `T` | restore that |

**The idea that makes it small: only the oldest entry per row matters.** A wire inserted, edited
four times and deleted needs one statement, not six. Walking every entry backwards reaches the
same place through five pointless writes and five more chances to get an order wrong. Proven
against the live log this afternoon: **202 recorded changes collapsed to 76 statements.**

Four properties make it safe to keep near production:

- **It writes nothing to the database, ever.** There is no `--apply`. It prints the plan and saves
  a `.sql` file for a human to run. Removing the mode that could do damage is cheaper than
  guarding it.
- **Applying is `postgres`, not the app.** `authenticated` holds no INSERT on `audit_log` and only
  column-list grants elsewhere, so a client-credentialed rewind would silently drop `created_at`
  and the audit history — trap 37, the same reason a restore cannot use the app's credentials. The
  alternative to a human running it is a `service_role` key living somewhere permanent, which is a
  far larger decision than a rare operator action deserves.
- **Triggers off during, one marker row after.** Left on, the undo writes a mirror image of itself
  into the log and a second rewind would try to undo the undo (trap 36). The generated script
  disables each `*_audit` trigger it touches plus `app_config_touch`, re-enables them, and writes
  **one** summary row.
- **It tells you to check for a schema change** before applying, in a comment at the top of the
  generated file, because reversing rows into a table whose shape has changed is how a rollback
  becomes a corruption. It cannot check itself: `authenticated` cannot read
  `supabase_migrations`.

**Verified.** Ten unit assertions on the planner, offline, wired into `npm test` — now **53
assertions, 43 before**. Run against the live log with `--since 2026-09-02T03:10:00Z` it read 202
changes and planned 76 statements across five tables, naming the three accounts whose work would
be undone. Nothing was written. Generated plans are gitignored: they carry whole rows of real
financial data in plain text.

**Rehearsed end to end** on `tracker-rehearsal`: real damage done to a restored copy, a plan
generated and applied as `postgres`, and all three fingerprints back to their pre-damage values
with one marker row and zero mirror rows. Details under item 5, finding 4.

**What it does not cover, stated plainly.** Stored documents in the `receipts` bucket are not
audited, so a deleted file is not recovered by this — `cleanupOrphanFiles()` remains the thing
to fear. DDL is not covered. And if the Supabase project itself is lost, `audit_log` goes with
it: this is an *undo*, not disaster recovery. `backups/` is still the thing that survives losing
the project.

**Migrations that roll back.** There are none today — twelve migrations, zero reversals. Every
new migration from here ships a `-- rollback:` block in the same file, and
[Supabase Schema](../supabase/README.md) gains a section on applying one. That is the
"migration plan that can roll back" half of your ask; the rewind script is the data half.

**Rehearsal.** The rewind gets tested on a scratch project against a copy of the ledger, never
first against `baby`. That is item 5's blocker too.

### Decision needed

- **Second daily backup at 09:00 UTC — confirm the hour**, or name a better one. Not yet built.
- **Nothing.** The rewind is built and rehearsed. Only the second `cron` line is outstanding.

---

## 3 — The e2e suite runs four workers against one shared ledger

**Round 1 called this a network problem. It is not — or not only. The consultation asked a
question that found the actual cause, and it is a one-word bug in the configuration.**

### The root cause

`apps/web/playwright.config.js:32` sets `fullyParallel: false`, with the comment *"one shared
dataset; parallel specs would race each other."* That is the correct intent and **the config
does not achieve it.** `fullyParallel: false` serialises tests *within* a file. It does not stop
separate files running on separate workers. `workers` is unset, so Playwright defaults to half
the CPU count — **four on this machine** — and `app.spec.js` and `functional.spec.js` have been
running **concurrently**, signing in at the same time, against one Supabase project and one
production ledger.

That is exactly the cross-file race trap 43 was written about, still present, one layer below
where it was fixed.

### The evidence

| Configuration | Runs | Result |
|---|---|---|
| Default (4 workers) | 3 | **0 clean.** 20/1/6, 7/1/19, 18/2/7 (passed/failed/did-not-run) — a different spec each time, all 30 s timeouts |
| `--workers=1` | 2 | **27/27 both times**, 4.2 min and 3.2 min |

The ledger was checked afterwards: fingerprint `f95cd619e877916891cb0f6853f9e041`, 21 rows,
₱226,000.00, nine wires, zero `E2E-` residue, zero stored files. Nothing was harmed by any of it.

The slow link is real too — production HTML fetches from this machine ranged 0.50 s to 17.93 s —
but it was the *aggravator*, not the cause. Four concurrent workers on a degraded link is what
crossed 30 seconds; one worker on the same link does not.

### Proposal

1. **`workers: 1`** in `apps/web/playwright.config.js`, beside `fullyParallel: false`, with the
   comment corrected to say what it now actually does. This is the fix; everything below is
   diagnostics.
2. **A network preflight before the specs run** — the consultation's idea, and better than my
   round-1 draft. Three uncached `GET`s of `baseURL` through `request.newContext()`, and if the
   median exceeds a documented threshold, fail immediately with a distinct
   `NETWORK_PREFLIGHT_SLOW` message naming the URL, the timings and the status codes. A
   diagnosis printed *before* the run beats one reconstructed from traces afterwards, which is
   what today cost.
3. **`retries: process.env.CI ? 0 : 1`.** Locally a stall costs a retry; CI keeps zero, because
   a flaky gate is worse than a slow one.
4. **Do not raise the timeouts.** My round-1 draft proposed 45 s and 60 s; the consultation
   pushed back and is right. Longer budgets hide the signal instead of classifying it, and with
   `workers: 1` the 30 s budget is no longer the binding constraint. Withdrawn.

Rejected, unchanged: mocking Supabase or standing up a local database. The suite's whole value
is that it drives the real stack.

**Cost.** One config line for the fix, plus a preflight file. Under an hour.

**Note for CI.** `.github/workflows/verify.yml` runs on a GitHub runner with its own CPU count,
so it has been running the same race — invisibly, because the runner's link to Vercel is fast.
`workers: 1` fixes it there too, and it is the reason nightly `verify.yml` has stayed green
while local runs failed.

### Decision needed

Approve. If you want only one thing from this item, take (1) — it is a single line and it is the
bug.

---

## 4 — `is_viewer()` over RPC: resolved, and the advisor's fix would have broken the app

**Answered by experiment, not by argument, and the answer is the dangerous one.**

Round 1 offered two branches: if the policies do not need `EXECUTE`, revoke it and read
`profiles` directly from `db.js`. **They need it.** That branch is dead.

### What was run

An isolated probe in a throwaway schema on `zone-offices` — never in its `public` schema, never
on `baby` — mirroring the real shapes exactly: an `sql`, `stable`, `security definer` function
with `set search_path = ''`, a table with RLS, a `for select … using (true)` policy and a
`for insert … with check (not <fn>())` policy, granted to `authenticated`.

| Step | Result |
|---|---|
| Insert as `authenticated`, `EXECUTE` granted | **succeeds** — 1 row |
| Insert as `authenticated`, `EXECUTE` revoked | **`42501 permission denied for function is_viewer`** |
| Select as `authenticated`, `EXECUTE` revoked | succeeds — the read policy never calls the function |
| Insert with the function moved to a **non-exposed schema**, `EXECUTE` granted there | **succeeds** |

Both schemas were dropped afterwards and `zone-offices` verified clean.

### What it means

Postgres checks `EXECUTE` on a function referenced in an RLS policy **against the querying
role**, at query time. So on `baby`, revoking `EXECUTE` on `public.is_viewer()` from
`authenticated` would have left every account able to read the whole ledger and **unable to
write a single row** — every insert, update and delete failing `42501`, on all six tables and on
receipt uploads. Reads would have kept working, so the app would have looked *almost* fine,
which is worse.

The advisor's own first remediation — *"Revoke `EXECUTE`"* — is wrong for this schema. Its
second — *"move it out of your exposed API schema"* — is right, and is proven above.

### Proposal

**Move the function, do not revoke it.**

1. A migration creating `private.is_viewer()` with the identical body, `grant usage on schema
   private to authenticated`, `grant execute` on the function, and every write policy on the six
   tables and the storage bucket re-pointed at it. Then drop `public.is_viewer()`.
2. PostgREST exposes `public` and `graphql_public` only, so `/rest/v1/rpc/is_viewer` stops
   existing and the advisory clears — **without** the app losing the ability to write.
3. `apps/web/src/db.js:78` currently calls `supabase.rpc('is_viewer')` at load. That endpoint
   goes away with the move, so it becomes a direct read of the caller's own `public.profiles`
   row — which already grants `authenticated` `SELECT` and nothing else, so no new privilege is
   needed.
4. A security-probe check asserting the RPC is **refused**, not merely absent — a missing
   endpoint and a blocked one both return an error, and asserting the wrong one is how this
   project has been fooled three times.

**And a real alternative: do nothing, on the record.** The exposure is that a signed-in account
can learn its own role. It can already learn that by selecting its own row from
`public.profiles`, which is granted deliberately so the app can grey out controls. The RPC
reveals **strictly less** than a grant you already made on purpose. Accepting the advisory and
writing down why is a defensible answer, and cheaper than a migration touching every write
policy in the schema.

**Recommendation: move it.** Not because the exposure is large — it is not — but because an
advisory left open with no explanation trains everyone to skim advisories, and this project has
exactly one other open one.

### Decision needed

**Move it, or accept it and record the reason?** Either closes the item. Moving costs a
migration that rewrites 19 policies; accepting costs a paragraph in
[Decisions](Decisions.md).

---

## 5 — `profiles` restore: rehearsed, and it does not work

**Done 2026-09-02 on `tracker-rehearsal` (`bucmcnsjkuprpojhequy`, `ap-southeast-1`, free),** created
once the owner paused `zone-offices`. Four findings, two of them serious, and the item is now a
defect report rather than a plan.

### What was proven

**The twelve migrations rebuild production exactly.** Applied in order into an empty project, then
compared by a fingerprint over 291 catalogue facts scoped to `public` — columns, policies, indexes,
triggers, table grants, column grants and function bodies:

```
7d44a32a1ad258f984fb145892e94c97   291 facts   production
7d44a32a1ad258f984fb145892e94c97   291 facts   rebuilt from supabase/migrations/
```

Identical. This is the first time the three migrations written after phase 24 — `merge_app_config`,
`viewer_role`, `harden_merge_app_config` — have been replayed at all.

**The data comes back byte-for-byte.** Restored from `backups/` with the audit triggers and
`app_config_touch` disabled: `txns` returned fingerprint `f95cd619e877916891cb0f6853f9e041`, 21
rows, ₱226,000.00 — the snapshot's own value — `app_config.updated_at` kept its stored time rather
than being stamped `now()`, and **the restore wrote zero rows into `audit_log`**, which is what
disabling the triggers is for.

### Finding 1 — the roster cannot be restored at all

Not quiet. Impossible.

```
23503 insert or update on table "profiles" violates foreign key constraint "profiles_user_id_fkey"
DETAIL: Key (user_id)=(02155e68-…) is not present in table "users".
```

`profiles.user_id` references `auth.users(id)`, and **`backups/` does not contain `auth.users`.**
The snapshot records who is an administrator but not that they exist. Into a fresh project the
roster has nowhere to attach, and because an account with no profile row is a viewer (D29), a
restore that skipped the error would hand back a ledger **nobody can write to** — every account
silently demoted.

The fix is small and was proven in the same session: the four accounts can be recreated **with
their original UUIDs** by inserting into `auth.users` as `postgres`, after which the roster
restores and reads `4 rows, all admin`. That requires the backup to carry the ids and emails, which
it does not today.

**Proposed:** add an `auth_users.json` to `backups/` holding **`id`, `email`, `created_at` only** —
never `encrypted_password`, which would put password hashes into git — plus the account-recreation
step in [Backups](../backups/README.md). Passwords are reset after a restore, which is the right
outcome anyway.

### Finding 2 — the sequence trap fires later than the procedure says

[Backups](../backups/README.md) says to `setval` on `audit_log_id_seq` or the next audited write
dies on a duplicate key. Rehearsed, and the timing is wrong in the way that matters:

| Step | Result |
|---|---|
| First audited write after a restore, sequence untouched | **succeeds** — the sequence is at 1 and 1 is free |
| Later, once the sequence climbs into the restored block | **`23505 duplicate key value violates unique constraint "audit_log_pkey"`** |
| After `setval` past the highest restored id | succeeds |

So a restore rehearsal that ends with *"can I still write? yes"* **passes while broken.** The
failure arrives days later, in production, hitting every audited write on all six tables at once,
with an error naming `audit_log_pkey` and nothing to do with what anyone was doing.

**Proposed:** reword that step from a warning into a required, verified action — `setval`, then
assert `last_value >= max(id)` — and say plainly that a successful first write proves nothing.

### Finding 3 — a new project has sign-up open, and it held your data

A fresh Supabase project allows self-serve sign-up by default. This one was carrying a copy of real
payables and wires behind the same `using (true)` read policies production uses, and a probe
confirmed a stranger could register:

```
POST /auth/v1/signup → 200 {"id":"a562332a-…","role":"authenticated", …}
```

Anonymous access was correctly refused (`42501`, the migrations' `revoke all from anon` carrying
over), so the exposure needed an account — but it existed. **The copied ledger was deleted
immediately**, the probe account removed, and the throwaway sign-in credential disabled. The schema
is kept, so re-seeding from `backups/` is one statement whenever it is next needed.

**This is a rule for the future, not a one-off:** a rehearsal project gets real data only after
sign-up is turned off on it, or it gets no real data at all.

### Finding 4 — the rewind works end to end

Item 2's script, proven against a real schema rather than only in unit tests. Damage was done to
the restored copy — three payables deleted, two edited to nonsense, one invented, a wire deleted,
three wires cancelled and re-priced, and the company list cut from 21 entries to one — then
`npm run rewind` read the log and generated a plan, which was applied as `postgres`:

```
11 changes recorded · 11 statements planned
txns        5 restored   1 removed
transfers   4 restored   0 removed
app_config  1 restored   0 removed
```

Afterwards **all three fingerprints matched their pre-damage values exactly** —
`7b518013…` for `txns`, `741a86f2…` for `transfers`, `a03fbb22…` for the config — with 21 payables
and 9 wires back, `app_config.updated_at` preserved rather than stamped `now()`, **one** marker row
in the log and **zero** mirror rows. The undo is complete and does not write a mirror image of
itself.

### What is still not proven

- **`audit_log` at full volume.** The restore path was exercised with a representative block rather
  than all 1,129 rows; the transport between here and the database is the limit, not the mechanism.
  The sequence behaviour above was rehearsed properly and is the part that bites.
- **Restoring `files/`.** The bucket has been empty at every backup ever taken, so a document has
  never made the return trip.

### Decision needed

Two small changes to checked-in files, both consequences of the above:
**(a)** add `auth_users.json` (id, email, created_at) to `backups/` and the recreation step to
[Backups](../backups/README.md); **(b)** rewrite the `setval` step there as a required action with
an assertion. Neither is built — say the word.

<details><summary>Superseded: the blocker this item used to be</summary>

## 5 (old) — blocked on somewhere to rehearse

Two things now wait on this, not one: the `profiles` restore, **and** applying a rewind plan for
the first time (item 2).

**Attempted and blocked, 2026-09-02.** The owner instructed: *"zone-offices is paused in Supabase.
Create a new one and do not touch it."* `create_project` was refused:

```
The following organization members have reached their maximum limits for the number of
active free projects: Leuename (2 project limit).
```

`zone-offices` still reports **`ACTIVE_HEALTHY`** — checked twice, several minutes apart. Nothing
was done to it either way, as instructed: it was not paused, not written to, not read beyond its
status.

So the slot is the blocker, and **only you can clear it**, because clearing it means acting on
`zone-offices`:

| Option | Cost | Note |
|---|---|---|
| **Pause `zone-offices` in the dashboard**, then say go | Free | It was already paused when today started; this restores that. One click, then `tracker-rehearsal` gets created in `ap-southeast-1` |
| **Let me pause it** | Free | Countermands *"do not touch it"*, so it needs saying explicitly. I restored it in the first place, so putting it back is reverting my own action |
| **Rehearse locally** with the Supabase CLI and Docker | Free, no slot | The CLI is not installed and the folder is not CLI-managed ([Decisions](Decisions.md) D14). Closest to a real rebuild, throwaway and repeatable — the only option that scales to rehearsing a rewind *repeatedly*, which is what the script needs |
| **Supabase Pro** | Money | Buys PITR and leaked-password protection (8g) too, and makes the slot question go away |

**Recommendation: the local CLI**, with pausing `zone-offices` as the quick answer if you want the
rehearsal done today. The CLI removes a standing awkwardness — this repository versions twelve
migrations it currently has no way to replay without borrowing a hosted project — and a rewind
plan that gets applied, checked, thrown away and applied again is exactly what a local stack is
for.

Whichever is chosen, the rehearsal asserts **four `profiles` rows back and every one `admin`** —
not that the insert did not error. A restore that drops the roster leaves everybody a viewer and
throws nothing. It restores `audit_log` at **full volume** (1,129 rows now, not the 18-row sample
phase 24 used), because `setval` on `audit_log_id_seq` is the step that bites. And it applies one
generated rewind plan end to end, then reads the state back.

### Decision needed (resolved)

The owner paused `zone-offices` and `tracker-rehearsal` was created. Both rehearsals are done; see
above.

</details>

---

## 6 — A failed e2e run writes the shared password to disk in plaintext

*Plan drafted; consultation recorded in the appendix.*

The artifacts from today's three failed runs were deleted. The mechanism that creates them is
unchanged: `trace: 'retain-on-failure'` records `fill()` values verbatim, so the next failure
writes the password again.

### Proposal — revised by the consultation, which corrected a real mistake in my draft

Round 1 proposed signing in through the Supabase **API** in a `globalSetup`. That would not have
worked: `signInWithPassword()` called from Node does not populate the browser's storage, and
hand-building Supabase's project-scoped `localStorage` key to fake it is brittle and undocumented.
Withdrawn.

1. **A Playwright setup project that signs in through the UI once, with tracing disabled**, and
   saves `storageState`. Ordinary projects then declare `use.storageState` and start
   authenticated. The one place the password is typed has no trace recording it, so it never
   reaches an artifact — and 27 redundant sign-ins disappear with it. A setup project is right
   rather than `globalSetup` because it gets normal browser fixtures and establishes the correct
   origin without being told.
2. **Treat the state file as a credential.** It holds an access token *and* a refresh token, so
   it is not an improvement to leave it lying about — write it under
   `apps/web/test-results/`, which is already gitignored, and say so in the README.
3. **Keep `app.spec.js`'s gate and wrong-password specs on the form**, overriding the saved
   state for those two. Exercising the sign-in form is their entire purpose, and the
   wrong-password spec already types a literal, which is safe to record.
4. **One line in `apps/web/README.md`:** a trace is a credential until proven otherwise; never
   attach one to an issue or a PR. Playwright has no evidenced way to redact selected input
   values while keeping the rest of a trace, so this is a discipline, not a setting.

Item 3's `workers: 1` is a prerequisite: several browser contexts restored from one refresh-token
snapshot can race each other when Supabase rotates the token.

**Cost.** One setup file, two config keys, a small edit to each `signIn`. Half a pass.

### Decision needed

Approve or reject. Rejecting is defensible — nothing is committed or uploaded — in which case
(4) should still happen, because the whole risk is that nobody knows.

---

## 7 — `npm run schedule -- --dry-run` cannot run as documented

`apps/web/scripts/schedule.mjs:36-39` requires `SCHEDULE_EMAIL` and `SCHEDULE_PASSWORD`;
`.github/workflows/schedule.yml:61-62` supplies them from the `BACKUP_*` secrets; `.env.local`
has neither. Handed an administrator account today it ran clean — *no recurring rules, no
overdue payables, no receipts awaiting liquidation.*

**Plan.** Add both names — names only, never values — to `apps/web/.env.example` and to the
handoff's credential list, with a line saying CI maps them from `BACKUP_*` and that `--dry-run`
writes nothing. Two files, no code.

Rejected, and the consultation agreed for the same reason: **no credential fallback.** Not to
`BACKUP_*`, not to `E2E_*`, not to one generic pair. The scheduler **writes** to the ledger; the
backup only reads. A fallback would conceal that difference and make the privilege each
credential carries impossible to reason about. Trap 41 already turns on exactly this distinction.

The consultation went further and proposed a **dedicated scheduler account with its own
`SCHEDULE_*` GitHub secrets, holding the minimum role that can do the job.** The first half is
sound and worth doing if you want it. The second half is not available: [Decisions](Decisions.md)
D29 gives this schema two roles, `admin` and `viewer`, and a viewer is refused every write — so
a dedicated scheduler account would still have to be an administrator. Recorded rather than
adopted.

### Decision needed

Approve the documentation fix (no decision needed), and separately: **do you want a dedicated
scheduler account?** It would still be an administrator, so it buys attribution in `audit_log`
and a separately revocable credential, not less privilege.

---

## 8 — Smaller items

Ranked by the consultation, which I agree with on five of six and disagree with on one.

| Rank | Item | Proposal |
|---|---|---|
| 1 | ~~**8c — Scheduler has no notification channel**~~ ([Decisions](Decisions.md) D31) | **Answered 2026-09-04: no external channel** ([D48](Decisions.md)). A Telegram design was specified in full — one bot, one private chat, an explicit on/off switch, aggregate-only payload — costed, and declined. The GitHub job summary and workflow-failure notification are the accepted paths. Decided, not deferred; see [Remaining Work and Owner Decisions](Remaining%20Work%20and%20Owner%20Decisions.md) C4 |
| 2 | **8a — No viewer account exists** | Issue one when a named person needs read-only access. Cheap and reversible: an account plus *no* `profiles` row. Needs an address from you |
| 3 | **8b — Viewer affordances** | After 8a exists, and only if refusals actually confuse someone. Server-side refusal stays authoritative — a disabled button is presentation, not authorization. Six screens, twelve modals |
| 4 | **8d — Node 20 deprecation warnings** | Routine maintenance once `actions/checkout@v5` and `actions/setup-node@v5` exist. Bump both together. Nothing today |
| 5 | **8f — Three unused INFO-level indexes** | **Do not remove them.** INFO-level evidence on near-empty tables says nothing about their value once the tables fill, and `transfers_co_idx` has nine rows to work with now where it had none |
| 6 | **8e — `apps/api/` is empty** | **We disagree here.** The consultation says keep it: deleting an intentional documented boundary buys no runtime value and costs documentation churn. I lean the other way — a directory that has declared an intent for two days and been acted on never is a note pretending to be architecture. Either is defensible; **your call**, and it is a five-minute job whichever way |
| — | **8g — Leaked-password protection off** | Pro-plan only. Nothing to approve unless item 5's Pro option is chosen, which would include it |

---

## What I would do next

1. **Item 3's one line.** `workers: 1`. It is a config key, it is the cause of three failed runs
   today, and it silently affects `verify.yml` too. No decision required beyond a yes.
2. **Answer item 1's three questions** — provider, override, backfill. ₱30.8M is priced by five
   constants until then.
3. **Choose item 5's rehearsal home.** It blocks the `profiles` restore *and* item 2's rewind.
4. **Item 4: move or accept.** Either closes it; leaving it open is the bad option.
5. Then 2's second cron, 6 and 7, which are all small.

## The open questions, in full

Nine questions. Grouped by what they block, hardest first. Each says what it decides, what the
options actually cost, and what I would do — so a one-word answer is enough where you agree.

### Blocking — nothing moves until these are answered

**Q1. Which free-project slot do I get, and how?**
*Blocks: item 5's `profiles` restore, item 2's rewind rehearsal, and any future migration test.*
Creating `tracker-rehearsal` was refused — `Leuename (2 project limit)` — and `zone-offices` still
reports `ACTIVE_HEALTHY`. Four ways out:
(a) **you pause `zone-offices`** in the dashboard and say go — one click, then I create the
project; (b) **you tell me to pause it**, which countermands *"do not touch it"* and so has to be
said explicitly — I un-paused it, so putting it back is reverting my own action; (c) **install the
Supabase CLI and rehearse locally** in Docker, costing no slot at all; (d) **Supabase Pro**, which
makes the question disappear and brings PITR and leaked-password protection with it.
*I would take (c), with (a) as the fast answer if you want this closed today.* A rewind plan needs
applying, checking, throwing away and applying again — that is what a local stack is for, and it
also ends the awkwardness of versioning twelve migrations we cannot replay without borrowing a
hosted project.

**Q2. Exchange rates — provider, override, backfill.**
*Blocks: the whole of [Exchange Rates Proposal](Exchange%20Rates%20Proposal.md), which is
₱39,964,763.80 of wires priced by five constants.* Three sub-answers, set out in full in that
note:
**(a) Provider** — `frankfurter.app`, no API key, ECB daily rates *(recommended)*, or a keyed
provider with more frequent updates and a secret to store and rotate.
**(b) Override** — may the person entering a wire type over the fetched rate? *Recommend yes:* six
wires were released this morning at some bank's real rate, and only the person entering them knows
it.
**(c) Backfill** — stamp the nine existing wires with the rates they were actually sent at, or
leave them on the constants? *This one I cannot answer for you at all.* Without your real numbers
a backfill would be inventing figures for money that has already moved.

**Q3. `is_viewer()` — move it, or accept it on the record?**
*Blocks: closing the last actionable Supabase advisory.* Revoking is off the table: it was tested
today and produces `42501 permission denied for function is_viewer` on **every** write while reads
keep working, so the app would look almost fine and save nothing.
**Move it** to a non-exposed `private` schema — proven to work — which costs a migration
rewriting 19 policies and a change to `apps/web/src/db.js:78`. **Or accept it**, which costs a
paragraph in [Decisions](Decisions.md): a signed-in account learns its own role, which it can
already learn by reading its own `public.profiles` row, so the RPC reveals strictly less than a
grant you made on purpose.
*Recommend moving it* — not because the exposure is large, it is not, but because an advisory left
open with no written reason trains everyone to skim advisories.

### Cheap and unblocked — a yes is enough

**Q4. `workers: 1` in the Playwright config?**
*One line.* Three runs at the default four workers failed; two runs at one worker passed 27/27.
`fullyParallel: false` does not do what its comment claims, and `verify.yml` has been running the
same race invisibly. *Recommend yes*, and if you take one thing from this whole document, take
this.

**Q5. The rest of item 3 — network preflight and local retries?**
Three uncached fetches of the base URL before the specs run, failing fast with
`NETWORK_PREFLIGHT_SLOW` if the median is bad, plus `retries: 1` locally and `0` in CI. Diagnoses
a slow link *before* a run instead of after. *Recommend yes.* My earlier proposal to raise the
timeouts is withdrawn — it hides the signal rather than classifying it.

**Q6. Keep the password out of Playwright traces?**
A setup project that signs in through the UI once with tracing disabled, saves `storageState`, and
lets every other spec start authenticated. *Recommend yes.* If you say no, the one-line README
warning should still happen, because the whole risk is that nobody knows a trace is a credential.

**Q7. Second daily backup at 09:00 UTC?**
One `cron` line. Cuts the worst-case unbacked-up window from about 24 hours to about 9 — and today
showed the ledger changing in bursts during Manila working hours, twice. *Recommend yes; confirm
the hour or name a better one.*

### Smaller, and genuinely yours

**Q8. A dedicated scheduler account?**
The consultation proposed one holding "the minimum role capable of the job". Half-available only:
this schema has two roles, `admin` and `viewer`, and a viewer is refused every write (D29) — so a
dedicated account would still be an administrator. It buys clean attribution in `audit_log` and a
separately revocable credential, not less privilege. *No recommendation; it depends whether you
want the scheduler's writes distinguishable from a person's.*

**Q9. Delete the empty `apps/api/`?**
The consultation says keep it: an intentional documented boundary, and deleting it is
documentation churn for no runtime gain. I lean the other way — a directory that has declared an
intent for two days and been acted on never is a note pretending to be architecture. *Five minutes
either way; your call, and I am happy to be overruled.*

### Not asked, because you have already answered them

Password and Vercel token rotation are deferred by you and are not raised here. The construction
tracker is parked (D18). Leaked-password protection is Pro-only and rides on Q1(d) if you take it.

## Approval

Reply with the item numbers to build, plus answers to the questions above. Approval alone does not
unblock Q1, Q2 or Q3.

## Appendix — external consultation

Requested by the owner on items 3, 6, 7 and 8: `codex exec`, `gpt-5.6-sol`, medium reasoning
effort.

**First attempt returned nothing.** Codex's mandated code-navigation MCP server was unreachable
and its own policy forbade falling back to file reads, so it read no files and answered no
questions, at a cost of 47,267 tokens. Recorded because it is the second time an external
consultation on this project has produced less than it appeared to — the first, on 2026-09-01,
returned six answers of which three would have misled if followed.

Re-run with every relevant file inlined in the prompt and MCP disabled, so no exploration was
required. That run answered all four. **Its answers were treated as input, not verdicts** — each
was checked against the repository before being adopted.

**Where it changed the outcome, and it earned its keep this time:**

- **Item 3.** It questioned whether `fullyParallel: false` achieves what its comment claims. It
  does not, and chasing that produced the root cause: four default workers racing two spec files
  against one production ledger. Three failed runs at four workers, two clean 27/27 runs at one.
  That is the single most valuable thing anyone said today.
- **Item 6.** It caught a real error in my round-1 plan — `signInWithPassword()` from Node does
  not populate browser storage, so the `globalSetup` design would not have worked — and replaced
  it with a setup project that signs in through the UI with tracing off. It also pointed out the
  `storageState` file is itself a credential, which my draft had not said.
- **Item 3, second time.** It argued *against* my proposal to raise the timeouts, on the grounds
  that longer budgets hide the signal rather than classify it. Correct, and withdrawn.

**Where it was wrong or not actionable, checked rather than taken:**

- **Item 7.** It proposed a dedicated scheduler account holding "the minimum role capable of the
  required generation" — but this schema has exactly two roles, and a viewer is refused every
  write ([Decisions](Decisions.md) D29). A dedicated account would still be an administrator. It
  flagged this as not-in-evidence rather than asserting it, which is the right behaviour.
- **Item 8e.** It says keep the empty `apps/api/`. Defensible, and recorded as a disagreement
  rather than resolved by seniority.

Two consultations now, one useless and one genuinely useful, and the difference was entirely
whether it could read the files. The lesson for next time is in the prompt, not the model: inline
the evidence.

## Guideline Basis

- **PG-02** keeps every proposal tied to a checked-in file or an observed run, with no invented commands.
- **PG-04** requires each claim to name the reproducible check behind it; item 4 is settled by a recorded experiment rather than by reasoning.
- **PG-05** rejects tooling and layers that no evidenced need supports, which is why items 3 and 6 propose configuration rather than infrastructure.
- **DOC-02** keeps observation, inference and proposal separately labelled in every item.
- **SEC-03** is why item 6 describes a credential exposure by its mechanism and never by its value.

implements: [Awesome Guidelines Integration](Awesome%20Guidelines%20Integration.md)

Related: [Decisions](Decisions.md) · [Everything Held Back, Built](../handoff/2026-09-02%20Everything%20Held%20Back,%20Built.md) · [Repository Evidence](Repository%20Evidence.md) · [Backups](../backups/README.md) · [Supabase Schema](../supabase/README.md) · [AI Agent Context](AI%20Agent%20Context.md)
