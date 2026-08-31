# Migrate

## Applicability

Gated; no source stack or migration target is defined.

## Prerequisite State

No package manager, workspace, framework config, schema, CI, or source/output contract exists.

## Workflow

Document the proposed from/to states, inventory prerequisites, assess generated artifacts, and identify reversible validation checkpoints.

## Stop Condition

Stop before adding frameworks, Turbo configuration, schemas, or conversion scripts.

## Deliverable

A migration readiness record with scope, prerequisites, risks, rollback concept, and decision owner.

Parent: [AI Agent Context](../../docs/AI%20Agent%20Context.md) · Decision basis: [Decisions](../../docs/Decisions.md) · Related: [workflow](../../docs/Turborepo%20and%20Turbopack.md)

## Guideline Basis

- **GIT-03** requires an agreed integration strategy before history-affecting migration work.
- **PG-04** requires before/after evidence, rollback conditions, and changed-path reporting.
- **PG-05** blocks migrations toward tools or frameworks that the repository does not evidence.

implements: [Awesome Guidelines Integration](../../docs/Awesome%20Guidelines%20Integration.md)
