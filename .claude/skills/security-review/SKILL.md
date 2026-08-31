---
name: security-review
description: Passively review active content, external resources, embedded data, provenance, and secret exposure.
version: 2.0.0
---

# Security Review

## Applicability

Use for security or trust-boundary review of exports and documentation.

## Repository Prerequisite

The current phase is documentation-only, and [Repository Evidence](../../../docs/Repository%20Evidence.md) is the factual baseline.

## Workflow

Inspect scripts/URLs without execution; record pinned/unpinned resources; check Markdown/adapters for secrets; distinguish absent backend controls from findings; rank supported risks.

## Stop or Escalate

Stop before network execution, credential use, dependency mutation, or unsupported exploit claims.

## Deliverable

Risk-ranked findings, exact evidence, trust boundaries, limitations, and safe next checks.

Parent: [AI Agent Context](../../../docs/AI%20Agent%20Context.md) · Decision basis: [Decisions](../../../docs/Decisions.md) · Related: [workflow](../../rules/security.md)

## Guideline Basis

- **SEC-01** maps active content, remote resources, and dynamic execution as trust boundaries.
- **SEC-02** checks dependency provenance, versions, and integrity coverage.
- **SEC-04** defers transport/header assessment until deployment configuration exists.
- **SEC-05** defers runtime validation assessment until input-processing source exists.

implements: [Awesome Guidelines Integration](../../../docs/Awesome%20Guidelines%20Integration.md)
