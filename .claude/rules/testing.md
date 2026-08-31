# Testing Rule

## Purpose and Applicability

Use documentation validation now and manual artifact checks only after explicit authorization.

## Requirements

No automated test runner or coverage threshold exists. Validate Markdown links, placeholders, contradictions, and scope. Authorized artifact checks cover representative viewports, keyboard/accessibility basics, console behavior, and online/offline resource behavior.

## Repository Evidence

There is no package script, test source, browser harness, or expected-behavior contract.

## Stop or Escalate

Stop before inventing test commands or executing active exports without provenance review.

## Validation Deliverable

A reproducible checklist with results, environment, artifacts, screenshots when relevant, and untested limits.

Parent: [Decisions](../../docs/Decisions.md) · Evidence: [Repository Evidence](../../docs/Repository%20Evidence.md) · Related: [guidance](../skills/testing/SKILL.md)

## Guideline Basis

- **PG-02** limits current checks to documentation because no test runner or source package exists.
- **PG-04** requires every claimed result to name a reproducible check.
- **WCAG-03** requires manual evidence alongside future accessibility automation.
- **FE-01** defers browser/release coverage until an authored application exists.

implements: [Awesome Guidelines Integration](../../docs/Awesome%20Guidelines%20Integration.md)
