# Security Rule

## Purpose and Applicability

Treat exported HTML/scripts and external resources as active-content trust boundaries.

## Requirements

Review provenance, executable scripts, external URLs, pinned/unpinned versions, embedded data, and accidental secrets passively. Do not claim backend/auth controls that are absent. Never place secrets in Markdown or local adapters.

## Repository Evidence

Generated runtime loads external React/ReactDOM/Babel, Google Fonts, and icon resources; no server security configuration exists.

## Stop or Escalate

Stop before executing network content, using credentials, or mutating dependencies.

## Validation Deliverable

A risk-ranked report with evidence, trust boundary, exploitability limits, and safe verification.

Parent: [Decisions](../../docs/Decisions.md) · Evidence: [Repository Evidence](../../docs/Repository%20Evidence.md) · Related: [guidance](../skills/security-review/SKILL.md)

## Guideline Basis

- **SEC-01** governs passive review of external and dynamically executed active content.
- **SEC-02** requires dependency version, SRI, and provenance evidence.
- **SEC-04** keeps transport and browser-header controls deferred until hosting exists.
- **SEC-05** keeps input validation and output encoding deferred until processing boundaries exist.

implements: [Awesome Guidelines Integration](../../docs/Awesome%20Guidelines%20Integration.md)
