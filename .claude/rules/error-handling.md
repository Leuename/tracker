# Error Handling Rule

## Purpose and Applicability

Not applicable to runtime code until application source and behavior contracts exist.

## Requirements

Do not infer server/client error flows from static screens. Documentation workflows must still report tool failures, incomplete evidence, and blocked verification explicitly.

## Repository Evidence

No application error boundary, API, logging system, or test path exists.

## Stop or Escalate

Stop before prescribing runtime patterns without source context.

## Validation Deliverable

A limitation/error record with attempted check, evidence, impact, and next prerequisite.

Parent: [Decisions](../../docs/Decisions.md) · Evidence: [Repository Evidence](../../docs/Repository%20Evidence.md) · Related: [guidance](../skills/debugging/SKILL.md)

## Guideline Basis

- **SEC-05** requires future errors to preserve validation boundaries without exposing unsafe input.
- **SEC-03** prohibits secrets and sensitive payloads in messages or examples.
- **DOC-02** separates observed failures from inferred causes.
- **PG-04** requires reproducible evidence and verification for a resolved defect.

implements: [Awesome Guidelines Integration](../../docs/Awesome%20Guidelines%20Integration.md)
