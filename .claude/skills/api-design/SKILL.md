---
name: api-design
description: Gate API design until a real contract or implementation is supplied.
version: 2.0.0
---

# Api Design

## Applicability

Use when API design is requested or CRM screens imply service behavior.

## Repository Prerequisite

The current phase is documentation-only, and [Repository Evidence](../../../docs/Repository%20Evidence.md) is the factual baseline.

## Workflow

Confirm explicit authorization; locate routes/spec/server source; if absent, map UI needs as unverified questions and request domain, auth, error, versioning, and compatibility inputs.

## Stop or Escalate

Stop before inventing endpoints, payloads, or framework choices.

## Deliverable

A blocked applicability report or, after activation, an evidence-linked API decision record.

Parent: [AI Agent Context](../../../docs/AI%20Agent%20Context.md) · Decision basis: [Decisions](../../../docs/Decisions.md) · Related: [workflow](../../rules/api-conventions.md)

## Guideline Basis

- **SEC-05** requires explicit validation, authorization, and encoding at future API trust boundaries.
- **JSON-03** requires a stable documented request/response contract rather than one inferred from mock UI data.
- **PG-02** blocks generation and validation commands until API source and tooling exist.

implements: [Awesome Guidelines Integration](../../../docs/Awesome%20Guidelines%20Integration.md)
