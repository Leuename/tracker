# Accessibility Rule

## Purpose and Applicability

Apply accessibility analysis to static HTML/CSS; remediation requires source and authorization.

## Requirements

Inspect semantic structure, labels, keyboard/focus clues, contrast tokens, motion, and responsive readability. Report WCAG-oriented risks as evidence or hypotheses; do not claim conformance from static inspection.

## Repository Evidence

No automated accessibility runner or authoritative component source exists.

## Stop or Escalate

Stop before executing active HTML without approval or patching exports.

## Validation Deliverable

A path-cited audit with severity, limitations, and source-level remediation.

Parent: [Decisions](../../docs/Decisions.md) · Evidence: [Repository Evidence](../../docs/Repository%20Evidence.md) · Related: [guidance](../agents/accessibility-auditor.md)

## Guideline Basis

- **WCAG-01** defines perceivable evidence to inspect in static artifacts and future source.
- **WCAG-02** requires keyboard operability and visible focus to be tested on a runnable UI.
- **WCAG-03** prevents automated checks alone from establishing conformance.

implements: [Awesome Guidelines Integration](../../docs/Awesome%20Guidelines%20Integration.md)
