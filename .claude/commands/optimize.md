# Optimize

## Applicability

Gated; passive analysis is allowed, but optimization changes require measurements and source.

## Prerequisite State

Static assets expose possible costs, while no benchmark, build profile, or editable runtime exists.

## Workflow

State the metric, inspect relevant artifacts, separate evidence from hypotheses, propose a reproducible baseline, and identify the authoritative source to change.

## Stop Condition

Stop before editing bundles, adding caches/tooling, or promising gains without measurements.

## Deliverable

An optimization hypothesis, evidence paths, measurement plan, and activation requirements.

Parent: [AI Agent Context](../../docs/AI%20Agent%20Context.md) · Decision basis: [Decisions](../../docs/Decisions.md) · Related: [workflow](../skills/performance/SKILL.md)

## Guideline Basis

- **PG-04** requires a measured baseline and reproducible comparison before optimization claims.
- **PG-05** rejects new optimization tooling without a demonstrated bottleneck.
- **FE-01** defers frontend performance budgets until a runnable authored release target exists.

implements: [Awesome Guidelines Integration](../../docs/Awesome%20Guidelines%20Integration.md)
