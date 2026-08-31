---
name: refactoring
description: Gate refactoring until editable source and invariant checks exist.
version: 2.0.0
---

# Refactoring

## Applicability

Use for structural cleanup requests involving application or export artifacts.

## Repository Prerequisite

The current phase is documentation-only, and [Repository Evidence](../../../docs/Repository%20Evidence.md) is the factual baseline.

## Workflow

Define the problem and invariants; locate authoritative source; identify validation; prefer deletion/reuse; document why exports cannot safely carry the change.

## Stop or Escalate

Stop before refactoring generated HTML/JS/bundles or scaffolding abstractions.

## Deliverable

A readiness brief or authorized minimal diff plan with invariants and checks.

Parent: [AI Agent Context](../../../docs/AI%20Agent%20Context.md) · Decision basis: [Decisions](../../../docs/Decisions.md) · Related: [workflow](../../commands/refactor.md)

## Guideline Basis

- **JS-02** preserves explicit module contracts and immutable defaults in future authored source.
- **GIT-01** keeps structural change separate from unrelated behavior changes.
- **PG-04** requires stated invariants and runnable checks before and after refactoring.

implements: [Awesome Guidelines Integration](../../../docs/Awesome%20Guidelines%20Integration.md)
