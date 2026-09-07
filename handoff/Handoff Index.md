---
title: Handoff Index
tags: [moc, index, handoff, continuation, navigation]
created: 2026-09-04
status: active
kind: map of content — every handoff in this folder, newest first
purpose: "A fresh session needs ONE entry point. This note names it, and says what every other handoff is still good for."
related:
  - "[[AI Agent Context]] — the navigation hub for the whole repository"
  - "[[Handoff]] — the append-only per-pass record in docs/, a different thing from this folder"
  - "[[Decisions]] — D1 to D79"
  - "[[Repository Evidence]] — the factual baseline"
up: "[[AI Agent Context]]"
---

# Handoff Index

Nineteen handoffs, one entry point. This note exists because the folder had none, and because
`status: current` in a handoff's own frontmatter means *"accurate when written"* rather than
*"start here"* — several notes carry it and only one can be the entry point.

## Start here

> **[[2026-09-07 Session Continuation, Rounds One to Twenty-Five]]**
> The current complete continuation package and **the entry point**. It carries the whole session's
> story, the loop in one table, the live state, what is *not* verified, and the one resume prompt.
>
> **Read it with two notes it supersedes as entry points but not as records:**
> **[[2026-09-06 The Review Loop, Rounds One to Twenty]]** holds the round-by-round ledger, the
> rate-limit history, and sections 4a-4f describing rounds 19-25 in detail.
> **[[2026-09-05 The Design Port, and Three Requirements the File Did Not Show]]** holds the design
> port itself, the twelve client requirements mapped to `file:line`, the four migrations and their
> MD5 verification, the **eighty-one-row findings table**, and **traps 77-107**.
>
> Before all three, **[[2026-09-04 Three Answers, and a Finding That Corrected Itself]]** (phase 45)
> remains the record of C1/C4/C5 and traps 72-76 — every trap in it still applies.
>
> **The three lines that matter most across the set:** rounds 16-18 were run by the main session by
> hand under a rate limit and reported the work green, and round 19 — the first real verifier
> afterwards — refuted that with six findings; rounds 21, 23 and 24 each found their worst defect in
> code no round had ever examined; and **forty-two of the eighty-one findings were introduced by the
> fix for the previous defect**. Rounds 1-25 all found something; round 26 reviewed round 25's
> fixes and closed the local gate with `AUDIT: READY`. Hosted migration and live E2E verification
> remain owner-gated.

## How to read this folder

Three kinds of note live here and they are not interchangeable:

| Kind | What it is | How to use it |
|---|---|---|
| **Complete continuation package** | Self-contained. State, decisions, traps, open items, one resume prompt | Read the newest one. It replaces its predecessor as the entry point, not as a record |
| **External-agent brief** | The same ground written for a cold-context agent that cannot resolve wikilinks. Exact relative paths only | Read when briefing another agent, or to see what was open at that moment |
| **Pass record** | What one specific piece of work did | Read when you need that work's detail. Do not resume from one |

A superseded package is **not wrong** — it is a dated record of what was true when it was written.
This project keeps them rather than rewriting them, because a fingerprint or a row count in an old
note is a timestamp, not a claim about today.

## Newest first

### 2026-09-04

- **[[2026-09-04 Three Answers, and a Finding That Corrected Itself]]** — *complete package,
  superseded as an entry point by the 2026-09-05 handoff and ultimately by the sole current entry
  point, the 2026-09-07 continuation.* Phase 45. The owner answered C1 (sign-out stays global, now explicit, D47),
  C4 (no notification channel, D48, which closes D31) and C5 (password rotation deferred again,
  D44). The resolution plan was audited twice — eight defects, then two more — and then mostly left
  unexecuted. Two new findings: C6, GitHub queues scheduled runs 2.5-5 hours late; and C7, three
  released wires carry no rate. Traps 72-76. **Work is uncommitted.**
- **[[2026-09-04 Owner Decision Brief, C5 to C7]]** — *external-agent brief.* The deep technical detail behind the
  three open owner decisions: the rates account's exact policies and column grants and why its real
  risk is read access rather than write; the measured cron-delay dataset behind C6; and the
  audit-log provenance, `rateFor()` rung analysis and backfill shape for C7. Exact relative paths,
  no wikilinks. Read it before acting on C5, C6 or C7 — the continuation package summarises these,
  this file is what you execute from.
- **[[2026-09-04 Exchange Rates, R7, and Two Agent Audits]]** — *complete package, superseded as
  entry point.* Phases 37-45. Still the record of the exchange-rate build, the R7 relocation of
  `is_viewer()` into a non-exposed schema, the six-wire ECB backfill, and both external-agent
  audits. Traps 64-71. Its §1 on verification is the argument the newest package sharpens.
- **[[2026-09-04 Open Items Brief for Codex, Second Pass]]** — *external-agent brief.* The audit of
  Codex's first pass, written for Codex. Exact relative paths, no wikilinks. Where the preflight
  status-check defect and the F5/R10 correction are set out.
- **[[2026-09-04 Open Items Brief for Codex]]** — *external-agent brief.* What was open before that
  first pass.
- **[[2026-09-04 Open Items Execution Progress]]** — *pass record.* Codex's own report of its first
  execution pass, with one status corrected in place.
- **[[2026-09-04 Remaining Work Implementation Handoff]]** — *pass record.*
- **[[2026-09-04 Exchange Rates and R7 Production Rollout]]** — *pass record.* R7 reaching
  production and the six released wires taking their historical ECB rate (D45).

### 2026-09-03

- **[[2026-09-03 Ten Closed, and a Backup Nobody Had Deployed]]** — *complete package, superseded.*
  **Traps 1-63 live here and every one of them still applies.** Any session doing real work should
  read them.
- **[[2026-09-03 Exchange Rates Shipped, What Is Still Open]]** — *external-agent brief.*
- **[[2026-09-03 Remediation Brief for an External Agent]]** — *external-agent brief.*

### 2026-09-02

- **[[2026-09-02 The Rewind, and a Backup That Was Short]]** — *complete package, superseded.* The
  reference shape for a handoff, and the record of the rewind tool (D32) and the backup that was
  silently truncated at PostgREST's 1,000-row cap.
- **[[2026-09-02 Everything Held Back, Built]]** — *complete package, superseded.*

### 2026-09-01

- **[[2026-09-01 Session Continuation Package]]** — *complete package, superseded.*
- **[[2026-09-01 Telegraphic Transfers and Full-Stack Verification]]** — *pass record.*
- **[[2026-09-01 Repository Restructure and Data Clear]]** — *pass record.* The re-root of the
  repository from `apps/web/` to the project root, and the clearing of the demo ledger.

## Conventions this folder follows

- **Naming:** `YYYY-MM-DD Title.md`. Date first so the folder sorts chronologically, then a short
  title so two handoffs from the same day stay distinguishable and each resolves as a unique
  Obsidian link. Never overwrite an earlier handoff; each session appends a new one.
- **One resume prompt.** Every handoff ends with a `## Resume prompt` section holding exactly one
  copy-pasteable block that restores the whole state. No per-situation or per-task variants. A
  handoff without it is incomplete and must not be reported as done.
- **Location:** this folder, at the repository root — never `docs/`, `notes/` or a temp directory.

Set out in [CLAUDE.md](../CLAUDE.md), [AGENTS.md](../AGENTS.md) and
[.claude/rules/documentation.md](../.claude/rules/documentation.md), which are the authority; this
list is a summary.

### Two link-check exceptions, both deliberate

A vault-wide link check on 2026-09-04 flagged exactly two things in this folder. Neither is a
defect, and both are recorded here so the next check does not chase them:

- **[[2026-09-04 Open Items Brief for Codex]]** links `docs/Decisions.md` without a `../`. Its own
  header declares *"every path in this file is an exact relative path from the repository root"* —
  the intended reader was an external agent working from the repository root, not Obsidian. The
  paths are correct for that reader and unresolvable from the file's own location. Left as written,
  because rewriting a dated brief to suit a checker would falsify what was sent.
- **[[2026-09-03 Remediation Brief for an External Agent]]** writes the word *wikilink* out in
  double square brackets inside a sentence explaining what a wikilink is. Prose, not a link.
  Obsidian does not resolve one inside inline code either, so nothing is broken — but a naive
  checker will flag it, and quoting it here verbatim would make this note flag too.

Both external-agent briefs use root-relative paths on purpose. Complete continuation packages and
`docs/` notes use wikilinks and file-relative paths, and those must resolve.

## Where the other records live

- [[Handoff]] in `docs/` — the append-only, newest-first record of what each pass *did*. This folder
  holds the packages you resume *from*; that note holds the narrative history.
- [[Decisions]] — D1 to D79. What is authorised, and why.
- [[Repository Evidence]] — observed facts, separated from inference.
- [[Remaining Work and Owner Decisions]] — A1-A2, B1-B2, C1-C7, grouped by what blocks each item.
- [[AI Agent Context]] — the navigation hub above all of these.

## Guideline Basis

- **MD-01** gives this index a scannable heading hierarchy rather than one undifferentiated list.
- **MD-02** requires descriptive, resolvable links; every entry here targets an existing note.
- **DOC-02** distinguishes the current entry point from superseded records, so a dated snapshot is not mistaken for a claim about today.
- **DOC-03** reuses the established handoff naming and identifier conventions rather than inventing a parallel scheme.

implements: [Awesome Guidelines Integration](../docs/Awesome%20Guidelines%20Integration.md)

Related: [[2026-09-05 The Design Port, and Three Requirements the File Did Not Show]] · [[2026-09-04 Three Answers, and a Finding That Corrected Itself]] · [[AI Agent Context]] · [[Handoff]] · [[Decisions]] · [[Repository Evidence]] · [[Remaining Work and Owner Decisions]]
