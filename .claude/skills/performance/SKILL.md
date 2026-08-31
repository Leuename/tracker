---
name: performance
description: Analyze performance hypotheses in static artifacts and define measurements before changes.
version: 2.0.0
---

# Performance

## Applicability

Use for asset, network, generated-runtime, CSS, or future build-performance questions.

## Repository Prerequisite

The current phase is documentation-only, and [Repository Evidence](../../../docs/Repository%20Evidence.md) is the factual baseline.

## Workflow

Inspect relevant paths; distinguish measurable evidence from hypotheses; define baseline metrics and environment; locate the source layer that would own remediation; apply Turbo gates.

## Stop or Escalate

Stop before modifying bundles, adding tools, or claiming unmeasured gains.

## Deliverable

Evidence/hypothesis findings, measurement plan, source prerequisites, and confidence.

Parent: [AI Agent Context](../../../docs/AI%20Agent%20Context.md) · Decision basis: [Decisions](../../../docs/Decisions.md) · Related: [workflow](../../rules/performance.md)

## Guideline Basis

- **PG-04** requires reproducible baselines and comparable before/after measurements.
- **PG-05** prevents premature caching, bundling, or profiling infrastructure.
- **FE-01** defers browser performance and release budgets until a runnable authored frontend exists.

implements: [Awesome Guidelines Integration](../../../docs/Awesome%20Guidelines%20Integration.md)
