---
name: architecture-analysis
description: Analyze the static export architecture, source gaps, and future tooling gates without changing artifacts.
version: 2.0.0
---

# Architecture Analysis

## Applicability

Use for repository structure, generated/source boundaries, or build-system applicability.

## Repository Prerequisite

The current phase is documentation-only, and [Repository Evidence](../../../docs/Repository%20Evidence.md) is the factual baseline.

## Workflow

Map artifacts from canonical evidence; trace generated provenance; distinguish observed, inferred, and absent layers; evaluate requested changes against decisions and Turbo gates.

## Stop or Escalate

Stop when conclusions require missing `dc-runtime`/app source or invented services.

## Deliverable

An architecture map, evidence paths, gaps, decision options, and activation gate.

Parent: [AI Agent Context](../../../docs/AI%20Agent%20Context.md) · Decision basis: [Decisions](../../../docs/Decisions.md) · Related: [workflow](../../agents/architect.md)

## Guideline Basis

- **PG-01** starts analysis from observed paths, roles, and absent prerequisites.
- **PG-03** enforces the source/generated/delivery boundary.
- **PG-05** keeps proposed tools and layers conditional on demonstrated need.
- **DOC-02** labels observations, inferences, and decisions separately.

implements: [Awesome Guidelines Integration](../../../docs/Awesome%20Guidelines%20Integration.md)
