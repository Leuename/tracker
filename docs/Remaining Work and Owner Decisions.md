---
title: Remaining Work and Owner Decisions
tags: [open-items, decisions, owner, erp, tracker, supabase, backups, testing, security]
created: 2026-09-04
status: awaiting owner decisions — C2 renamed 2026-09-04
supersedes: "[[Open Problems and Proposals]] as the current open-items record; that note remains the round-2 record of 2026-09-02"
related:
  - "[[Decisions]] — D1 to D45, the authority on what is authorised"
  - "[[2026-09-04 Open Items Brief for Codex, Second Pass]] — the same items written for an external agent"
  - "[[Repository Evidence]] — the factual baseline"
  - "[Backups](../backups/README.md) — the restore procedure"
up: "[[AI Agent Context]]"
---

# Remaining Work and Owner Decisions

Everything that was actionable has been done. What is left divides cleanly into three kinds, and
**none of it is work I can simply go and finish** — two kinds are blocked on access I do not have,
and the third is yours to decide.

Read this by section. Each item says what it is, what is actually true today, what it would cost,
and what I would do. Answer by item number; nothing here is urgent enough to answer all at once.

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

Five items. I have deliberately not acted on any of them.

### C1 — `signOut()` revokes every device

**Where.** `apps/web/src/App.jsx:58` — `supabase.auth.signOut()`, called bare.

**What that means.** The library defaults to `scope: 'global'`. **Signing out on your laptop
revokes that account's session on every device it is signed in on** — phone, tablet, another
browser. Nobody chose this; it is a library default nobody read.

**The two options.**
- **Leave it.** For a shared financial ledger, "sign out everywhere" is a defensible security
  posture. If a device is lost, signing out from any other device kills it.
- **Change it** to `{ scope: 'local' }` — one word. Signing out affects only the device you are on.

**Cost of changing.** One word, plus updating one e2e assertion. It would also remove a constraint:
the e2e specs that touch sessions are currently *ordered* because a global sign-out revokes the
shared test session mid-run (D41).

**What I would do.** Ask you, which is what this is. It is live, user-visible behaviour on a system
you use daily, and I will not change how your sign-out button behaves on my own judgement.

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

**What I would do.** Delete it. An empty directory promising a backend is a claim the repository
cannot support, and the documentation rule here is that guidance must be evidence-backed. If a real
API is ever built, creating a directory is not the hard part.

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

---

## Summary

| # | Item | Blocked on | My recommendation |
|---|---|---|---|
| **A1** | Full `audit_log` restore | a `postgres` connection string | Do it when you can supervise it — the most valuable unproven thing here |
| **A2** | Run `backups/verify-restore.sql` | same string | Fold into A1 |
| **B1** | F5 paging ceiling | 1,000+ objects somewhere disposable | Leave it. Logic is unit-tested; the live gap is theoretical |
| **B2** | Blank-target replay | an empty Supabase project | Leave it. Fold into the next rehearsal |
| **C1** | `signOut()` scope | your decision | Tell me global or local. No default is safe to assume |
| **C2** | ₱0.00 proof row | your decision | **Renamed 2026-09-04.** Keep it — deleting it destroys the storage-restore proof |
| **C3** | `apps/api/` | your decision | Delete it |
| **C4** | Notifications | your decision | Pick a channel, or leave it. Telegram if you want one |
| **C5** | `FX_PASSWORD` | your decision | **Rotate it now.** Cheapest and highest-risk item on this page |

Nothing on this page is half-finished. Everything actionable is committed, pushed, and verified.

## Guideline Basis

- **PG-04** names the reproducible check behind each claim; every figure here was read live on 2026-09-04.
- **DOC-02** separates observed facts, blockers, and owner decisions rather than presenting them as one list.
- **PG-02** documents no command or capability that checked-in configuration does not support — the absent connection string is stated as absent.
- **SEC-03** is why C5 names the credential's existence and its blast radius but not its value.

implements: [Awesome Guidelines Integration](Awesome%20Guidelines%20Integration.md)

Related: [Decisions](Decisions.md) · [Repository Evidence](Repository%20Evidence.md) · [Open Problems and Proposals](Open%20Problems%20and%20Proposals.md) · [Backups](../backups/README.md) · [AI Agent Context](AI%20Agent%20Context.md)
