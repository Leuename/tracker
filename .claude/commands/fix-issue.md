# Fix Issue

## Applicability

Gated; diagnosis may be documented, but implementation is not authorized.

## Prerequisite State

Reported behavior can only be compared with static exports; authoritative `dc-runtime`/application source is absent.

## Workflow

Capture reproduction evidence, locate relevant export artifacts, distinguish export symptom from likely source owner, and document the required source/test path.

## Stop Condition

Stop before patching generated output or claiming resolution without a runnable verification path.

## Deliverable

A diagnosis/gap report, affected paths, likely source boundary, and required authorization.

Parent: [AI Agent Context](../../docs/AI%20Agent%20Context.md) · Decision basis: [Decisions](../../docs/Decisions.md) · Related: [workflow](../skills/debugging/SKILL.md)

## Guideline Basis

- **JS-03** redirects generated-bundle defects to the missing authored source.
- **PG-04** requires a reproducible symptom, root-cause evidence, and proportional verification.
- **SEC-05** requires future boundary defects to be fixed where input validation or output encoding belongs.

implements: [Awesome Guidelines Integration](../../docs/Awesome%20Guidelines%20Integration.md)
