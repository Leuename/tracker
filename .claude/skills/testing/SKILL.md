---
name: testing
description: Define valid documentation checks now and gate automated tests on real source and runner configuration.
version: 2.0.0
---

# Testing

## Applicability

Use for test requests, QA planning, or validation design.

## Repository Prerequisite

The current phase is documentation-only, and [Repository Evidence](../../../docs/Repository%20Evidence.md) is the factual baseline.

## Workflow

Identify behavior and target layer; locate runner/scripts/source; if absent, specify the smallest future check and manual criteria. For authorized export review, include viewport, keyboard, console, and online/offline checks.

## Stop or Escalate

Stop before adding a framework/dependency or executing active content without approval.

## Deliverable

A reproducible checklist, results/blocked state, artifacts, environment, and untested limits.

Parent: [AI Agent Context](../../../docs/AI%20Agent%20Context.md) · Decision basis: [Decisions](../../../docs/Decisions.md) · Related: [workflow](../../rules/testing.md)

## Guideline Basis

- **PG-02** limits present checks to documentation because no automated runner exists.
- **PG-04** requires each result to name the command or manual procedure that verifies it.
- **WCAG-03** pairs future accessibility automation with manual semantic checks.
- **FE-01** defers browser/release suites until an authored runnable frontend exists.

implements: [Awesome Guidelines Integration](../../../docs/Awesome%20Guidelines%20Integration.md)
