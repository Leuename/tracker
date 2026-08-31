---
title: Turborepo and Turbopack
tags: [architecture, build-tooling]
status: gated
---

# Turborepo and Turbopack

## Decision

Neither tool applies today. Adding configuration now would invent an application architecture that the checkout does not contain.

## Evidence and Semantic Fit

[Repository Evidence](Repository%20Evidence.md) shows no package manifest, lockfile, workspace, checked-in application source, task scripts, Next.js configuration, CI, or deploy system. `support.js` is a generated export whose `dc-runtime` provenance is absent.

- **Turborepo orchestrates tasks across real packages.** Reconsider when checked-in workspaces expose repeatable scripts and dependency-aware ordering, caching, affected-package CI, or shared development creates measurable value. Begin with existing scripts, declare only real outputs/environment inputs, and use filters or `--affected` only after Git and CI baselines exist.
- **Turbopack bundles Next.js applications.** Reconsider when a Next.js app and `next.config.*` exist. Prefer the supported Next.js default; retain Webpack only for a demonstrated incompatible loader/plugin and document the exception.

## Activation Workflow

When a gate is met: verify the package manager and lockfile; inventory actual package scripts; map package dependencies and cached outputs; add the minimum configuration; record runnable commands and validation in [AGENTS.md](../AGENTS.md); update [Decisions](Decisions.md) and [Handoff](Handoff.md). Do not create placeholder tasks.

Official background: [Crafting your repository](https://turborepo.dev/docs/crafting-your-repository) and [adding Turborepo to an existing repository](https://turborepo.dev/docs/getting-started/add-to-existing-repository). These sources inform the gates; local evidence controls applicability.

## Guideline Basis

- **PG-02** requires Turbo tasks to wrap real checked-in commands rather than invented placeholders.
- **PG-05** keeps Turborepo and Turbopack deferred until workspaces or Next.js source demonstrate a need.
- **FE-01** gates production frontend checks on a runnable authored application and explicit targets.

implements: [Awesome Guidelines Integration](Awesome%20Guidelines%20Integration.md)

Related: [AI Agent Context](AI%20Agent%20Context.md) · [Architecture rule](../.claude/rules/architecture.md) · [Guideline ledger](Awesome%20Guidelines%20Integration.md)
