# Performance Rule

## Purpose and Applicability

Require evidence and measurement before optimization.

## Requirements

Passive inspection may identify CDN, parse, CSS, asset, or generated-runtime hypotheses. Label hypotheses, define baseline metrics, and recommend changes at the missing source layer. Turbo caching is gated on real tasks.

## Repository Evidence

No benchmark, production trace, source build, or performance budget exists.

## Stop or Escalate

Stop before editing bundles, adding tooling, or claiming gains.

## Validation Deliverable

An evidence/hypothesis table and reproducible measurement plan.

Parent: [Decisions](../../docs/Decisions.md) · Evidence: [Repository Evidence](../../docs/Repository%20Evidence.md) · Related: [guidance](../skills/performance/SKILL.md)

## Guideline Basis

- **FE-01** defers release budgets and browser performance checks until a runnable frontend exists.
- **PG-04** requires measured baselines and comparable results.
- **PG-05** rejects caching, bundling, or profiling tools without an evidenced bottleneck.

implements: [Awesome Guidelines Integration](../../docs/Awesome%20Guidelines%20Integration.md)
