---
title: Remaining Work and Owner Decisions
tags: [open-items, decisions, owner, erp, tracker, supabase, backups, testing, security]
created: 2026-09-04
status: occurrence-identity rollout awaits owner authorization; C1, C2, C3 and C4 resolved 2026-09-04; C5 deferred again; A and B still blocked
supersedes: "[[Open Problems and Proposals]] as the current open-items record; that note remains the round-2 record of 2026-09-02"
related:
  - "[[Decisions]] — D1 to D79, the authority on what is authorised"
  - "[[2026-09-04 Three Answers, and a Finding That Corrected Itself]] — the current continuation package; C6 and C7 originate there"
  - "[[2026-09-04 Owner Decision Brief, C5 to C7]] — the deep technical detail for C5, C6 and C7, written for a cold-context agent"
  - "[[2026-09-04 Open Items Brief for Codex, Second Pass]] — the same items written for an external agent"
  - "[[Handoff Index]] — every handoff, and which are superseded records"
  - "[[Repository Evidence]] — the factual baseline"
  - "[Backups](../backups/README.md) — the restore procedure"
up: "[[AI Agent Context]]"
---

# Remaining Work and Owner Decisions

Everything that was actionable has been done. What is left divides into four kinds, and **none of
it is work I can simply go and finish** — two kinds are blocked on access I do not have, one is
yours to decide, and the last is what verification turned up on 2026-09-04.

Read this by section. Each item says what it is, what is actually true today, what it would cost,
and what I would do. Answer by item number; nothing here is urgent enough to answer all at once.
Section C's answered items keep their original framing above the resolution, so the reasoning that
produced the answer survives alongside it.

---

## Occurrence-identity rollout — CLOSED 2026-09-08

The owner authorized the sequence and it ran end to end. **Both migrations are applied, the
identity-aware application is deployed, and production behavior has changed.** The full record,
with the rehearsal evidence and MD5s, is [D80](Decisions.md).

What was done, in the order [D79](Decisions.md) requires and nothing rearranged:

1. Rehearsed both phases on `tracker-rehearsal` against seeded cases production does not have —
   a linked row never moved, one rescheduled with its insert audit, one rescheduled with only an
   update audit. Every rescheduled row kept its **original** occurrence; a duplicate insert at an
   existing `(src, occurrence_due)` was refused; deleting the recurring parent unlinked its rows
   without violating the new check. Preflight re-read on production immediately before applying:
   `linked_rows=0`, `rescheduled_linked=0`, `relinks=0`, `collisions=0`, so the backfill was a
   no-op and `audit_log` did not move.
2. Applied phase 1, deployed, and ran the suite. `OCCURRENCE_IDENTITY_PHASE=1` returned
   `occurrence_due: 42501, src: UPDATE allowed`.
3. Applied phase 2. `OCCURRENCE_IDENTITY_PHASE=2` returned `occurrence_due: 42501, src: 42501`,
   57 checks, 0 failed, 0 deferred.

**The suite was then run a second time, after phase 2, and that is the only reason two defects were
caught.** The prescribed order runs e2e once, between the deploy and phase 2, so nothing in it
exercises the application against the final grant set. One spec drew its refusal from the very
index phase 2 drops. Any future staged grant change must re-run its acceptance suite **after the
last phase**. See [D80](Decisions.md).

Current baseline: `npm test` **191 assertions across 11 files**, `npm run security` **57 checks, 0
failed, 0 deferred** at `OCCURRENCE_IDENTITY_PHASE=2`, e2e **50/50** against the deployed bundle.
Rewinding a linked transaction across the migration boundary now requires the pre-migration schema
or an explicit owner-approved occurrence mapping; the tool refuses to invent one.

**`Refund` is also closed.** It was missing from production's `app_config.data.categories` while
`src/data.js` had shipped it all along, which is why `npm test` was green against a short list. It
was added on 2026-09-07 under a guarded write that pinned the existing eighteen values, so a
concurrent owner edit would have been a no-op rather than a clobber. Nineteen categories now, in
the order `alphabetical()` produces.

---

## A. Blocked on a database connection string

Two items, one blocker. Both are about proving the backup can actually be restored.

### A1 — The full-volume `audit_log` restore has never been done

**What it is.** `backups/audit_log.json` is the ledger's history — who changed what, when. Restoring
it is the last unproven step of the disaster-recovery path.

**What is true today.** 252 of ~1,759 rows have been loaded onto the rehearsal project. The
*mechanism* is proven, the *fidelity* is proven, and the sequence repair is proven — that last one
by deliberately reproducing the failure: with the sequence left behind, the next audited write dies
with `23505 duplicate key value violates unique constraint "audit_log_pkey"`, and it dies **days
later**, not immediately. What is unproven is moving the whole file.

**Why it is blocked.** The file is now **1.7 MB**. An agent tool payload is roughly 35 KB, so it
needs ~50 chunks; a prior attempt failed at chunk 5 of 23 when the file was smaller. Chunking is not
a slow route to success, it is the known failure mode. The right transport is `psql \copy`, and
**there is no `postgres` connection string anywhere in this project** — I checked: none in the
repository, none among the thirteen GitHub secrets. Every credential here is an application login
that reads through row-level security, which is deliberate (D13) and correct, and also cannot do
this job.

**What unblocks it.** One supervised `postgres` connection string, used once, for a restore into a
disposable target. Not stored in the repository.

**What I would do.** Leave it blocked until you are ready to sit with it. It is the single most
valuable unproven thing in the project, but it is an operator task by design (D39), and doing it
badly is worse than not doing it.

### A2 — `backups/verify-restore.sql` has never actually run

**What it is.** 7 KB of assertions that a restore must survive: it fails on a short row count, a
roster that is not all administrators, a sequence left behind, a disabled trigger, or a write that
does not reach the audit log.

**What is true today.** Every assertion in it has been proven individually, transliterated into
separate calls. **The file itself has never been executed.** That distinction matters — a file that
has never run is a file that has never been shown to parse, let alone pass.

**Cost.** Minutes, once A1's connection string exists. It is the natural last step of that work, not
a separate project.

---

## B. Blocked on somewhere disposable to run it

Two items. Both are low value, and I want to be plain about that rather than pad the list.

### B1 — F5, the storage paging ceiling

**What it is.** Supabase's storage listing silently caps at 1,000 objects, the same ceiling that
once truncated a backup to exactly 1,000 audit rows while reporting success. `listAll()` in
`apps/web/scripts/backup.mjs` pages past it.

**What is true today.** The round-trip is proven — a real stored document was backed up and restored
byte-for-byte on 2026-09-03. But **the paging loop has still never iterated**, because `listAll()`
returns as soon as a page comes back shorter than 1,000 and the bucket holds one object. The
boundary logic is covered by a unit test against a fake at 1000/1001.

**Why it is blocked, and why I am not pushing on it.** Proving it live needs a bucket holding more
than 1,000 objects. **I would not create 1,001 files in your production bucket to close a
checklist item** — that is real storage, a real backup that then has to carry them, and a real
cleanup risk. The unit test covers the logic; the live gap is theoretical until the business
actually stores a thousand receipts.

**What I would do.** Leave it. Revisit if receipt volume ever approaches the ceiling.

### B2 — The blank-target schema replay

**What it is.** Proof that all fifteen migrations rebuild the database from nothing.

**What is true today.** Twelve migrations were replayed into an empty project on 2026-09-02
(291 catalogue facts, identical fingerprints). The three newest — `fx_rates`, `private_is_viewer`,
`drop_public_is_viewer` — have been replayed onto the rehearsal project, which already had the
twelve. So they are proven to apply *onto an existing baseline*, not to *rebuild from zero*.

**Why it is blocked.** It needs a disposable empty Supabase project. Creating one may cost money,
and that is your call, not mine. `zone-offices` is off limits and `tracker-rehearsal` is no longer
empty.

**What I would do.** Leave it until the next time a rehearsal is needed for another reason, then
fold this in. The gap is narrow: three migrations, none of which is structurally novel.

---

## C. Yours to decide

Seven items now. C1, C3 and C4 were answered on 2026-09-04 and are recorded as decisions; C2 was
answered in part; C5 was raised again and deferred again; C6 and C7 are new and untouched. Each
item's original framing is kept above its resolution.

### C1 — `signOut()` revokes every device

**Where.** `apps/web/src/App.jsx:58` at the time this was written — `supabase.auth.signOut()`,
called bare. The same bare call was also at `apps/web/src/store.jsx:62`, which this framing missed.

**What that means.** The library defaults to `scope: 'global'`. **Signing out on your laptop
revokes that account's session on every device it is signed in on** — phone, tablet, another
browser. Nobody chose this; it is a library default nobody read.

**The two options.**
- **Leave it.** For a shared financial ledger, "sign out everywhere" is a defensible security
  posture. If a device is lost, signing out from any other device kills it.
- **Change it** to `{ scope: 'local' }` — one word. Signing out affects only the device you are on.

**Cost of changing.** One word, plus reordering the two session-mutating e2e specs and rewriting
both of their comment blocks. It would also remove a constraint: those specs are *ordered* because a
global sign-out revokes the shared test session mid-run (D41).

**What I would do.** Ask you, which is what this is. It is live, user-visible behaviour on a system
you use daily, and I will not change how your sign-out button behaves on my own judgement.

**Resolved 2026-09-04: keep it global, and say so** ([D47](Decisions.md)). Runtime behaviour is
unchanged, because `global` is what the unread default already did. What changed is that the scope
is now written out at both same-browser call sites — `apps/web/src/App.jsx:63` and
`apps/web/src/store.jsx:67` — so it reads as a decision instead of an accident, and neither can be
edited without noticing the other. The session-expiry handler in `store.jsx` had been overlooked in
the original framing of this item; it is the same user in the same browser and now carries the same
scope. The Node scripts stay bare on purpose. The D41 ordering stands.

### C2 — The ₱0.00 proof row in your receipts screen

**What it is.** `receipts` row `1788471059637` — company `F5`, beneficiary **"DO NOT DELETE — backup
proof"**, ₱0.00, `released`, with a stored document attached. Created by an agent to prove the
storage backup works. **Renamed 2026-09-04** at the owner's request from "Task 2 storage proof",
as an attributed admin update (`audit_log` id 1760); only `name` changed, the linked object is
untouched, and the rename is reversible with `npm run rewind`.

**Why it is still there.** It is deliberately **not** tagged `E2E-`, because the test sweep deletes
tagged rows and `cleanupOrphanFiles()` deletes any stored file no receipt points at. Tagging it
would have destroyed the very evidence it exists to provide.

**The consequence you should know about.** It sits in your Acknowledgement Receipts screen
permanently, and the project's own safety rule — *never sweep a row without an `E2E-` tag, because
it might be the owner's* — will now protect it from every future cleanup. It is invisible to every
automated tidy-up by design.

**The two options.**
- **Keep it.** It is the only live evidence that a stored document survives backup and restore.
  Cost: one meaningless row on a screen you look at.
- **Delete it.** The screen is clean again. Cost: deleting it orphans the stored object, which the
  next cleanup then removes, and the storage-restore proof goes with it. It would need redoing to
  re-establish.

**Decided 2026-09-04: kept, and renamed** to "DO NOT DELETE — backup proof". The remaining question
is only whether it stays at all; keeping it costs one meaningless row on a screen, and deleting it
still destroys the storage-restore proof.

### C3 — `apps/api/` is an empty directory

**What it is.** A directory containing nothing, declaring an intent nobody has acted on. It has been
empty since 2026-08-31.

**The two options.** Delete it, or keep it and write one line in the docs saying why. Five minutes
either way.

**Resolved 2026-09-04: deleted** ([D46](Decisions.md)). Note that git never tracked it — git does not
track empty directories — so the deletion produced no diff. The *documentation* was the real change:
`AGENTS.md`, `CLAUDE.md`, `docs/AI Agent Context.md` and `docs/Repository Evidence.md` no longer
describe a boundary that is not there.

### C4 — The scheduler has no real notification channel

**What it is.** `npm run schedule` finds what is overdue every day and reports it to the GitHub
Actions job summary — a page nobody opens unless they already suspect a problem. Confirmed: the only
delivery path in `apps/web/scripts/schedule.mjs` is `GITHUB_STEP_SUMMARY`.

**What it would take.** A provider (email, Telegram, whatever you actually read), the recipients, and
a secret. The work is small; the decision is not mine because it involves choosing a service and
handing it an address list.

**What I would do.** Nothing until you name a channel. Building a notifier nobody has agreed to read
is how you get an alert everyone ignores. If you want a recommendation: Telegram, because you will
actually see it and it needs no email deliverability work.

**Resolved 2026-09-04: no external channel** ([D48](Decisions.md)). The Telegram option was
specified in full first — one dedicated bot, one private chat, an explicit `TELEGRAM_NOTIFICATIONS`
on/off switch so the channel could be silenced without a code revert, and an aggregate-only payload
(date, overdue count and total, awaiting-liquidation count) carrying no company, beneficiary,
description, due date or per-row amount. The owner chose not to add it. The GitHub job summary and
the workflow-failure notification are the accepted paths, `apps/web/scripts/schedule.mjs` is
unchanged, no `TELEGRAM_*` secret or variable exists, and the repository secret count stays at
thirteen. This is decided, not deferred; the unbuilt specification is kept in
`docs/superpowers/plans/2026-09-04-c1-c4-c5-resolution.md` Tasks 4 and 5 so that reopening it is a
build, not a redesign.

### C5 — The rates-account password, still deferred

**What it is.** `admin@admin.com` / `admin` — the account the exchange-rate job signs in as, live on
production. You deferred rotating it on 2026-09-03 while testing, and asked to be reminded. **This
is the reminder** (D44, N9).

**What is actually at risk.** It can write exchange rates and nothing else — `is_viewer()` refuses
it on every other table. But every read policy in this schema is `using(true)`, so **this login can
read your entire ledger**: every payable, all nine wires with beneficiary names, the full audit log.
It is also the most-guessed credential pair on the internet, on a publicly reachable URL.

**Cost of fixing.** Small and self-contained: generate a password, update it in Supabase, update the
`FX_PASSWORD` GitHub secret and your local `.env.local`. Same account, same uid, same policies —
nothing else changes, and the two migrations that name its uid are unaffected.

**What I would do.** Rotate it now that the exchange-rate work is finished and stable. That was the
condition you set for revisiting it. It is the highest-risk item on this page and the cheapest to
close.

**Raised again 2026-09-04, and deferred again** ([D44](Decisions.md)). The condition had been met
and the reminder was delivered with this blast radius restated; the owner chose to wait. **This
stays open and the reminder stands.** The rotation procedure is written and costed in
`docs/superpowers/plans/2026-09-04-c1-c4-c5-resolution.md` Task 2, including its rollback rules and
its evidence steps, so acting on it later needs a decision rather than any further design. Note one
thing about its evidence: the FX cron runs hours behind its slot (C6 below), so waiting on a
scheduled run is a poor rotation signal — Task 2 uses an explicitly dispatched run instead.

---

## D. Found on 2026-09-04, during verification

> Technical depth for C5, C6 and C7 — exact RLS policies and column grants, the measured
> cron-delay dataset, the audit-log provenance of the three unpriced wires, a reviewed
> backfill shape and the rotation procedure with rollback rules — is in
> [2026-09-04 Owner Decision Brief, C5 to C7](../handoff/2026-09-04%20Owner%20Decision%20Brief,%20C5%20to%20C7.md). This section states the decisions; that file is what you
> execute from.

Two things the checks turned up that no earlier note records. Neither is damage, and neither was
acted on, because both touch live behaviour.

### C6 — the FX cron fires, but hours late, and the margin is smaller than it looks

**How this item was found, and then corrected.** At 06:57 UTC on 2026-09-04 the workflow's entire
run history was one `workflow_dispatch` at `2026-09-03T14:52:01Z`. The `0 2` cron had produced
nothing, nearly five hours after its slot, and `fx_rates.fetched_at` still pointed at that manual
run — so the table held four plausible rows because a human had pressed a button once. That was
written up as "the cron has never fired."

**Two minutes later it fired.** A `schedule` run started at `2026-09-04T06:59:08Z` and succeeded:
**4 hours 59 minutes after its 02:00 UTC slot.** The original finding was true when it was written
and false twenty minutes afterwards, which is worth keeping on the page rather than quietly
rewriting — a scheduler that has not run yet and a scheduler that never runs look identical, and
only waiting tells them apart.

**It wrote nothing, correctly.** `fx_rates.fetched_at` is still `2026-09-03 14:43:59Z` and the run
fired no audit trigger, because the ECB publishes once a day and its 2026-09-03 fix was already
stored. That is exactly [D43](Decisions.md)'s idempotence — and this is the first time it has been
demonstrated on the **scheduled** path rather than a manual one.

**What is actually left, and it is narrower.** GitHub is queuing this repository's scheduled runs
2.5 to 5 hours behind their cron slots. Both FX slots exist to land before the ECB's ~14:00 UTC
publication so the stored rate is deliberately one working day old (D43). 08:00 UTC plus a
five-hour delay is 13:00 UTC — still inside the window, but the margin is about an hour rather than
the six the schedule appears to give. A longer delay would silently flip the stored rate from T+1 to
T+0 with nothing on screen changing. The same delay affects `backup.yml`: its 06:00 UTC run had not
appeared by 11:03 UTC, so `backups/MANIFEST.md` was around fourteen hours old.

**What I would do.** Nothing urgent. Watch whether a run ever crosses 14:00 UTC, and decide then
whether the app should record which ECB date it actually stored versus which it expected — it
already stores `as_of`, so the check is cheap. **Do not "fix" this by moving the cron hours**: 02:00
and 08:00 UTC are deliberate and decided (D43), and moving them earlier makes the delay worse, not
better. And never read a late or absent cron run as a failed credential rotation (C5).

### C7 — Three released wires carry no rate

**What is true today.** `select status, count(*), count(rate) from public.transfers` returns
`released 9, priced 6`. The owner moved the last three from `pending` to `released` at
2026-09-04 02:26:59–02:27:03 UTC (`audit_log` 1697–1699): `GZZ` EUR 100,000, `ZPH` USD 79,180 and
`MCR` USD 78,675. All three went across with `rate` and `rate_as_of` null. Ordinary owner work, not
damage — but it happened four hours before the current handoff was written and that note still says
"6 released, 3 pending."

**Why it matters.** [D45](Decisions.md) says a released wire carries the rate it went out at, and
`apps/web/src/logic.js:261` says the same in a comment: "once this is set nothing may re-price it."
Nothing in the app stamps a rate when the status changes — the rate is a manual field on the
transfer form — so the intent is not enforced. Those three wires now fall to rung 2 of `rateFor()`
and are re-valued off `fx_latest` every time the feed moves. They are not on the stale constants
today, because the feed rung is live, so this is drift rather than a wrong number on screen.

**What I would do.** Ask, which is what this is. There are two separable questions: whether to stamp
the three existing wires with the ECB rate for their release date (the same reasoning that made the
2026-09-02 backfill legitimate — the release date is a recorded fact in `audit_log`), and whether
release should stamp a rate automatically from then on. The first is a one-off write to a live money
ledger; the second is a behaviour change to the transfer form. Neither is mine to take.

### One more thing, and it is not an item

**The 2026-09-04 work is uncommitted.** Fifteen modified files and four untracked:
the resolution plan under `docs/superpowers/plans/`, the new continuation package, and the handoff
index. Nothing was committed or pushed, because a push to `main` runs the gate
and a green gate deploys production — that is your call, not something to slip into a documentation
pass. `git status --short` shows the set; the change itself is four lines of application code, two
e2e comment blocks, and documentation.

Everything actionable and authorized has been done. What remains is C5, C6 and C7 for you, the
pending commit, and the A and B items blocked on access nobody has.

## Summary

| # | Item | Blocked on | My recommendation |
|---|---|---|---|
| **A1** | Full `audit_log` restore | a `postgres` connection string | Do it when you can supervise it — the most valuable unproven thing here |
| **A2** | Run `backups/verify-restore.sql` | same string | Fold into A1 |
| **B1** | F5 paging ceiling | 1,000+ objects somewhere disposable | Leave it. Logic is unit-tested; the live gap is theoretical |
| **B2** | Blank-target replay | an empty Supabase project | Leave it. Fold into the next rehearsal |
| **C1** | `signOut()` scope | ~~your decision~~ | **Done 2026-09-04** — kept global and made explicit at both browser call sites, D47 |
| **C2** | ₱0.00 proof row | your decision | **Renamed 2026-09-04.** Keep it — deleting it destroys the storage-restore proof |
| **C3** | `apps/api/` | ~~your decision~~ | **Done 2026-09-04** — deleted, D46 |
| **C4** | Notifications | ~~your decision~~ | **Done 2026-09-04** — no external channel, decided rather than deferred, D48 |
| **C5** | `FX_PASSWORD` | your decision | **Still open.** Raised again 2026-09-04 and deferred again. Highest-risk item here and the cheapest to close |
| **C6** | Scheduled runs land 2.5-5 h late | your decision | **New 2026-09-04.** The FX cron does fire; the delay eats the margin before ECB publication |
| **C7** | Three wires released unpriced | your decision | **New 2026-09-04.** Nothing stamps a rate on release, so D45's intent is not enforced |

---

## Guideline Basis

- **PG-04** names the reproducible check behind each claim; every figure here was read live on 2026-09-04.
- **DOC-02** separates observed facts, blockers, and owner decisions rather than presenting them as one list.
- **PG-02** documents no command or capability that checked-in configuration does not support — the absent connection string is stated as absent.
- **SEC-03** is why C5 names the credential's existence and its blast radius but not its value.

implements: [Awesome Guidelines Integration](Awesome%20Guidelines%20Integration.md)

Related: [Decisions](Decisions.md) · [Repository Evidence](Repository%20Evidence.md) · [Open Problems and Proposals](Open%20Problems%20and%20Proposals.md) · [Backups](../backups/README.md) · [AI Agent Context](AI%20Agent%20Context.md)
