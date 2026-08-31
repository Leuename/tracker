---
name: database-design
description: Gate database design until authoritative persistence requirements and schema tooling exist.
version: 2.0.0
---

# Database Design

## Applicability

Use when data modeling, migrations, or storage are requested.

## Repository Prerequisite

The current phase is documentation-only, and [Repository Evidence](../../../docs/Repository%20Evidence.md) is the factual baseline.

## Workflow

Confirm scope; locate schema/migrations/ORM; distinguish mock UI data from domain facts; request ownership, constraints, lifecycle, privacy, scale, and migration requirements.

## Stop or Escalate

Stop before selecting a vendor or inventing tables, credentials, and migrations.

## Deliverable

A blocked prerequisite report or an authorized, evidence-linked schema decision.

Parent: [AI Agent Context](../../../docs/AI%20Agent%20Context.md) · Decision basis: [Decisions](../../../docs/Decisions.md) · Related: [workflow](../../rules/database.md)

## Guideline Basis

- **JSON-03** prevents product-input fields from becoming an undocumented schema.
- **SEC-05** requires future constraints, authorization, and validation at persistence boundaries.
- **PG-02** defers schema and migration commands until database tooling is checked in.

implements: [Awesome Guidelines Integration](../../../docs/Awesome%20Guidelines%20Integration.md)
