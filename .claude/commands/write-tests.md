# Write Tests

## Applicability

Gated; no test runner, source module, package scripts, or behavioral contract exists.

## Prerequisite State

Only manual review criteria can be documented for the static export.

## Workflow

Identify the behavior and authoritative source, define the smallest failure-reproducing check, and list the runner/configuration prerequisites. Use manual checks only when explicitly authorized.

## Stop Condition

Stop before choosing a framework, adding dependencies, or fabricating runnable commands.

## Deliverable

A blocked test plan with behavior, target layer, prerequisites, and future run/acceptance criteria.

Parent: [AI Agent Context](../../docs/AI%20Agent%20Context.md) · Decision basis: [Decisions](../../docs/Decisions.md) · Related: [workflow](../skills/testing/SKILL.md)

## Guideline Basis

- **PG-02** blocks fabricated test commands while no runner or source package exists.
- **WCAG-03** requires manual accessibility evidence to complement future automated checks.
- **FE-01** gates browser and compatibility suites on a runnable authored frontend.

implements: [Awesome Guidelines Integration](../../docs/Awesome%20Guidelines%20Integration.md)
