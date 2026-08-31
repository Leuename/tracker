---
name: code-review
description: Review documentation and passive artifact findings against repository scope and generated boundaries.
version: 2.0.0
---

# Code Review

## Applicability

Use for change review, policy consistency, or requested passive inspection.

## Repository Prerequisite

The current phase is documentation-only, and [Repository Evidence](../../../docs/Repository%20Evidence.md) is the factual baseline.

## Workflow

Read the nearest guide; establish diff/scope; verify claims against evidence; check generated-file boundaries, links, contradictions, and validation; report findings first.

## Stop or Escalate

Stop before applying fixes or executing active content unless separately authorized.

## Deliverable

Severity-ranked findings with paths, evidence, checks, and residual risks.

Parent: [AI Agent Context](../../../docs/AI%20Agent%20Context.md) · Decision basis: [Decisions](../../../docs/Decisions.md) · Related: [workflow](../../commands/review.md)

## Guideline Basis

- **PG-04** requires evidence-ranked findings and explicit verification.
- **GIT-01** checks that the change remains focused and reviewable.
- **JS-03** rejects generated-bundle patches as maintainable fixes.
- **SEC-03** keeps secrets and sensitive evidence out of review output.

implements: [Awesome Guidelines Integration](../../../docs/Awesome%20Guidelines%20Integration.md)
