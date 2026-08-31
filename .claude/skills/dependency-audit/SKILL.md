---
name: dependency-audit
description: Passively inventory export-time external dependencies and provenance risks.
version: 2.0.0
---

# Dependency Audit

## Applicability

Use for CDN, font, icon, script-version, or future package questions.

## Repository Prerequisite

The current phase is documentation-only, and [Repository Evidence](../../../docs/Repository%20Evidence.md) is the factual baseline.

## Workflow

Trace URLs and versions from export artifacts; classify pinned, unversioned, generated, and absent-manifest dependencies; assess trust and reproducibility; recommend verification without mutation.

## Stop or Escalate

Stop before installing, upgrading, vendoring, or executing external content.

## Deliverable

A dependency table with evidence path, version state, trust concern, and activation gate.

Parent: [AI Agent Context](../../../docs/AI%20Agent%20Context.md) · Decision basis: [Decisions](../../../docs/Decisions.md) · Related: [workflow](../../rules/dependency-management.md)

## Guideline Basis

- **SEC-02** inventories versions, SRI coverage, provenance, and unpinned external resources.
- **SEC-03** requires audit output to omit credentials and sensitive values.
- **PG-05** prohibits adding or replacing dependencies without an evidenced need and authorized source.

implements: [Awesome Guidelines Integration](../../../docs/Awesome%20Guidelines%20Integration.md)
