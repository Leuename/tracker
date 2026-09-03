---
title: AI Agent Context
aliases: [Repository Context Index]
tags: [ai-agents, context-map]
status: active
---

# AI Agent Context

This is the agent-agnostic entry point. It describes where facts live, how instructions compose, and which workflows are usable in the current phase.

## Instruction Precedence

1. Current user request and platform safety requirements.
2. The nearest scoped `AGENTS.md`; [company_tracker/AGENTS.md](../company_tracker/AGENTS.md) and [construction_tracker/AGENTS.md](../construction_tracker/AGENTS.md) govern their folders.
3. Root [AGENTS.md](../AGENTS.md) and [CLAUDE.md](../CLAUDE.md), which are synchronized, equal policies and must change together.
4. Tool-specific adapters under `.claude/`, which may narrow a workflow but never broaden scope.

## Canonical Knowledge

- **implemented-by:** [Awesome Guidelines Integration](Awesome%20Guidelines%20Integration.md) records every adopted, deferred, and excluded external principle and its local implementations.
- **observed-in:** [Repository Evidence](Repository%20Evidence.md) records what is present, absent, generated, or externally loaded.
- **decided-by:** [Decisions](Decisions.md) records current boundaries and activation gates.
- **continued-by:** [Handoff](Handoff.md) records completed documentation work and unresolved source gaps.
- **resumed-by:** [Ten Closed, and a Backup Nobody Had Deployed](../handoff/2026-09-03%20Ten%20Closed,%20and%20a%20Backup%20Nobody%20Had%20Deployed.md) is the current entry point and a **complete continuation package** (phases 31-36): a fresh chat resumes from that file alone. Its first instruction is to confirm the nightly backup manifest: the fixes that make it complete were pushed on 2026-09-03 and the job has never run with them.
- **previously-resumed-by:** [The Rewind, and a Backup That Was Short](../handoff/2026-09-02%20The%20Rewind,%20and%20a%20Backup%20That%20Was%20Short.md) is the current entry point for a fresh session. It supersedes [Everything Held Back, Built](../handoff/2026-09-02%20Everything%20Held%20Back,%20Built.md), which superseded [Telegraphic Transfers and Full-Stack Verification](../handoff/2026-09-01%20Telegraphic%20Transfers%20and%20Full-Stack%20Verification.md), which superseded [Repository Restructure and Data Clear](../handoff/2026-09-01%20Repository%20Restructure%20and%20Data%20Clear.md), which superseded [Session Continuation Package](../handoff/2026-09-01%20Session%20Continuation%20Package.md). All five are live: the newest carries the current facts, the older four remain the record of phases 1 to 25 and hold traps 1 to 46.
- **proposed-in:** [Open Problems and Proposals](Open%20Problems%20and%20Proposals.md) holds the eight open items with one proposal each, and the nine questions only the owner can answer. [Exchange Rates Proposal](Exchange%20Rates%20Proposal.md) was item 1, moved out at the owner's request and re-costed; it is **now built** (2026-09-03, commit `cbbe5f1`), with one decision — backfilling the six released wires — still open. **blocks:** the remaining seven items in Open Problems and Proposals on their approval.
- **audited-by:** [Remediation Brief for an External Agent](../handoff/2026-09-03%20Remediation%20Brief%20for%20an%20External%20Agent.md) indexes every open defect, unproven claim and unanswered question as stable IDs (R1-R15 remediation, N1-N8 explicit non-actions, F1-F4 findings, Q2a-Q9 owner questions) plus all 54 traps condensed into one place. It **extends** [The Rewind, and a Backup That Was Short](../handoff/2026-09-02%20The%20Rewind,%20and%20a%20Backup%20That%20Was%20Short.md) rather than superseding it, and is written for an external agent researching and planning the fixes. **blocks:** nothing is built from it until the owner answers its section 7.
- **supplemented-by:** [Exchange Rates Shipped, What Is Still Open](../handoff/2026-09-03%20Exchange%20Rates%20Shipped,%20What%20Is%20Still%20Open.md) **extends** both handoffs above with R3's build (§1), Decisions D42-D44, and the remediation index's status after it — reusing the Remediation Brief's stable IDs rather than renumbering. Written for the next agent, external or otherwise, to plan from. Not a new entry point: read [Ten Closed, and a Backup Nobody Had Deployed](../handoff/2026-09-03%20Ten%20Closed,%20and%20a%20Backup%20Nobody%20Had%20Deployed.md) first.
- **planned-by:** [Audit Trail Plan](Audit%20Trail%20Plan.md) and [Continuous Integration Plan](Continuous%20Integration%20Plan.md) were designs for the two highest-value unbuilt items. **Both are built**, on 2026-09-01; the notes are kept as the record of where each plan was wrong, not as work outstanding.
- **archived-in:** [Seeded Data Backup](seeded-data-backup/README.md) holds the demo rows cleared from the ledger on 2026-09-01, with the totals verified against the live database before the delete.
- **specialized-by:** [Turborepo and Turbopack](Turborepo%20and%20Turbopack.md) governs conditional build-tool adoption.

## Artifact Taxonomy

`company_tracker/*.dc.html`, `support.js`, `company_tracker/_ds/craftui-crm-design-system-2dfce37d-76d0-4306-9635-769d70a72018/_ds_bundle.js`, and `.thumbnail` are export or delivery artifacts; no `company_tracker/uploads/` directory exists. `_ds/**/tokens/*.css` and `_ds/**/styles.css` are design-system export assets. `construction_tracker/construction.csv` is a requirements/reference sheet, not a service or database; its nearest guide is [Construction Tracker Guidelines](../construction_tracker/AGENTS.md). `.claude/` contains derived adapters; use the [Claude Adapter Index](../.claude/README.md) to navigate its agents, commands, rules, and skills. `.obsidian/` is editor configuration, not a note location.

## Task Routing

- Documentation or context work: use `.claude/commands/generate-docs.md` and keep evidence distinct from decisions.
- Passive artifact review: use `.claude/commands/review.md`; do not execute active HTML without provenance review.
- UX or accessibility review: use `.claude/commands/ux-reviewer.md` or the matching agent, with manual checks only when authorized.
- Resuming a session, or picking up work someone else left: start at [The Rewind, and a Backup That Was Short](../handoff/2026-09-02%20The%20Rewind,%20and%20a%20Backup%20That%20Was%20Short.md) and paste its single `## Resume prompt`.
- Restoring, or undoing a bad afternoon: [Backups](../backups/README.md) is the procedure and `npm run rewind` is the per-second undo ([Decisions](Decisions.md) D32). Read D33 first — the roster is a separate step and skipping it returns everyone as a viewer.
- Run or test the authored tracker with the evidence-backed commands in [Repository Evidence](Repository%20Evidence.md). For further feature, refactor, migration, deployment, release, or rollback work, consult [Decisions](Decisions.md) and stop when its activation gate is unmet.

## Current State

`apps/web/` is a running React + Vite application backed by Supabase Postgres, deployed to Vercel through a CI gate, and used by **four** accounts sharing one ledger, all administrator-equivalent. Five screens — Dashboard, Tracker, AckRec, **Telegraphic** and Masterlist — plus Settings. **Seven tables**: `txns`, `receipts`, `recurring`, `transfers`, `app_config`, `audit_log` and `profiles`. It holds real financial data, and as of 2026-09-02 the Telegraphic screen holds real wires in EUR, USD and GBP that a person has been releasing.

The schema is versioned in [supabase/migrations/](../supabase/README.md) — **twelve** files, each MD5-verified against what was applied, and replayed into an empty project on 2026-09-02 to a `public` schema identical to production's over 291 catalogue facts. A nightly workflow snapshots the workspace into [backups/](../backups/README.md); `npm run rewind` reconstructs any second from `audit_log` ([Decisions](Decisions.md) D32). Releases are annotated tags, `v0.2.0` through `v0.6.0`.

The rest of the checkout is unchanged: `company_tracker/` remains a static Design Component export, `construction_tracker/construction.csv` remains a requirements sheet parked by decision (D18), and `apps/api/` is still empty.

**Everything once listed as absent is built.** CI gates production, the audit trail is a trigger on all seven tables, the scheduler runs daily, the read-only role is enforced in the policies, and the restore has been performed. What is left is in [Open Problems and Proposals](Open%20Problems%20and%20Proposals.md): a per-wire exchange rate ([Exchange Rates Proposal](Exchange%20Rates%20Proposal.md)), conflict detection between concurrent editors on the same key (D28, deliberate), a real notification channel for the scheduler (D31), and viewer affordances.

**Two restore defects are open**, both found by rehearsing rather than reading, both fixed in code and procedure but neither yet exercised against a second rehearsal: the roster needs its own recreation step (D33) and the `audit_log` sequence fails late rather than next. **The e2e suite runs four workers against one shared ledger** and fails about as often as it passes; `workers: 1` is proposed and not applied.

**No known open security gap in production.** Self-serve sign-up has been closed since 2026-09-02 — `/auth/v1/signup` answers `422 signup_disabled` — and `npm run security` reports **47 checks, 0 failed, 0 deferred**. Being signed in is still the whole of read authorization ([Decisions](Decisions.md) D8, D20, D29), so account creation staying closed is what holds the model up. Two Supabase advisories stand: `is_viewer()` is callable over RPC and **cannot simply be revoked** (D34), and leaked-password protection is Pro-only.

## Guideline Basis

- **AGENT-01** explains instruction precedence from root policy to the nearest folder guide.
- **AGENT-02** makes this the vendor-neutral routing hub for facts, decisions, adapters, and the guideline ledger.
- **MD-04** assigns each kind of knowledge one canonical home instead of duplicating it across adapters.
- **DOC-03** standardizes relationship labels and path-qualified cross-references.

implements: [Awesome Guidelines Integration](Awesome%20Guidelines%20Integration.md)
