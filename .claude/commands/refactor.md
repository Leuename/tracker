# Refactor

## Applicability

Gated; exported/generated artifacts are not refactoring targets.

## Prerequisite State

Editable application source and automated verification are absent.

## Workflow

Define the structural problem, trace the generated/source boundary, list required source and invariant checks, and assess whether the change is necessary.

## Stop Condition

Stop before reorganizing exports, creating speculative abstractions, or changing tooling.

## Deliverable

A refactor readiness brief with target source, invariants, risks, and authorization gate.

Parent: [AI Agent Context](../../docs/AI%20Agent%20Context.md) · Decision basis: [Decisions](../../docs/Decisions.md) · Related: [workflow](../skills/refactoring/SKILL.md)

## Guideline Basis

- **JS-02** preserves clear module contracts and immutable defaults when authored source arrives.
- **PG-04** requires explicit invariants and verification before structural edits.
- **GIT-01** keeps refactoring separate from unrelated feature or artifact changes.

implements: [Awesome Guidelines Integration](../../docs/Awesome%20Guidelines%20Integration.md)
