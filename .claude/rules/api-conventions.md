# API Conventions Rule

## Purpose and Applicability

Not applicable until an API implementation or contract is checked in.

## Requirements

Do not infer endpoints, payloads, authentication, or error formats from CRM labels. When activated, derive conventions from real routes/schema and document compatibility requirements.

## Repository Evidence

No routes, OpenAPI document, server package, or network contract exists.

## Stop or Escalate

Stop before designing speculative API conventions.

## Validation Deliverable

An applicability statement and required contract/source inputs.

Parent: [Decisions](../../docs/Decisions.md) · Evidence: [Repository Evidence](../../docs/Repository%20Evidence.md) · Related: [guidance](../skills/api-design/SKILL.md)

## Guideline Basis

- **SEC-05** requires validation and output encoding at every future API trust boundary.
- **JSON-03** requires stable documented field contracts rather than schemas inferred from labels.
- **PG-02** blocks API generation, validation, and server commands until implementation/configuration exists.

implements: [Awesome Guidelines Integration](../../docs/Awesome%20Guidelines%20Integration.md)
