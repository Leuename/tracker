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
- **resumed-by:** [Repository Restructure and Data Clear](../handoff/2026-09-01%20Repository%20Restructure%20and%20Data%20Clear.md) is the current entry point for a fresh session. It supersedes [Session Continuation Package](../handoff/2026-09-01%20Session%20Continuation%20Package.md) as the place to start, while that note remains the record of how the app was built.
- **archived-in:** [Seeded Data Backup](seeded-data-backup/README.md) holds the demo rows cleared from the ledger on 2026-09-01, with the totals verified against the live database before the delete.
- **specialized-by:** [Turborepo and Turbopack](Turborepo%20and%20Turbopack.md) governs conditional build-tool adoption.

## Artifact Taxonomy

`company_tracker/*.dc.html`, `support.js`, `company_tracker/_ds/craftui-crm-design-system-2dfce37d-76d0-4306-9635-769d70a72018/_ds_bundle.js`, and `.thumbnail` are export or delivery artifacts; no `company_tracker/uploads/` directory exists. `_ds/**/tokens/*.css` and `_ds/**/styles.css` are design-system export assets. `construction_tracker/construction.csv` is a requirements/reference sheet, not a service or database; its nearest guide is [Construction Tracker Guidelines](../construction_tracker/AGENTS.md). `.claude/` contains derived adapters; use the [Claude Adapter Index](../.claude/README.md) to navigate its agents, commands, rules, and skills. `.obsidian/` is editor configuration, not a note location.

## Task Routing

- Documentation or context work: use `.claude/commands/generate-docs.md` and keep evidence distinct from decisions.
- Passive artifact review: use `.claude/commands/review.md`; do not execute active HTML without provenance review.
- UX or accessibility review: use `.claude/commands/ux-reviewer.md` or the matching agent, with manual checks only when authorized.
- Resuming a session, or picking up work someone else left: start at [Session Continuation Package 2026-09-01](../handoff/2026-09-01%20Session%20Continuation%20Package.md).
- Run or test the authored tracker with the evidence-backed commands in [Repository Evidence](Repository%20Evidence.md). For further feature, refactor, migration, deployment, release, or rollback work, consult [Decisions](Decisions.md) and stop when its activation gate is unmet.

## Current State

`apps/web/` is a running React + Vite application backed by Supabase Postgres, deployed to Vercel and used by three accounts sharing one ledger. It has a package manifest, a build, three test commands and a security probe. The rest of the checkout is unchanged: `company_tracker/` remains a static Design Component export, `construction_tracker/construction.csv` remains a requirements sheet, and `apps/api/` is still empty.

Still absent: CI, an audit trail, checked-in migrations, conflict detection between concurrent editors, and any backup of either the database or these notes. Each is recorded, with its reason, in [Session Continuation Package 2026-09-01](../handoff/2026-09-01%20Session%20Continuation%20Package.md).

## Guideline Basis

- **AGENT-01** explains instruction precedence from root policy to the nearest folder guide.
- **AGENT-02** makes this the vendor-neutral routing hub for facts, decisions, adapters, and the guideline ledger.
- **MD-04** assigns each kind of knowledge one canonical home instead of duplicating it across adapters.
- **DOC-03** standardizes relationship labels and path-qualified cross-references.

implements: [Awesome Guidelines Integration](Awesome%20Guidelines%20Integration.md)
