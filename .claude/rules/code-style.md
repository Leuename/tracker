# Code Style Rule

## Purpose and Applicability

Protect generated artifacts and keep authorized documentation/CSS work consistent.

## Requirements

Generated JavaScript and HTML are read-only. Markdown must be concise, evidence-based, and locally linked. If CSS is later authorized, reuse semantic token files and lowercase kebab-case custom properties instead of duplicating values.

## Repository Evidence

Editable application source and formatter/linter configuration are absent.

## Stop or Escalate

Stop before formatting or rewriting generated bundles.

## Validation Deliverable

A minimal, convention-aligned diff plus relevant validation.

Parent: [Decisions](../../docs/Decisions.md) · Evidence: [Repository Evidence](../../docs/Repository%20Evidence.md) · Related: [guidance](../agents/frontend-engineer.md)

## Guideline Basis

- **JS-01** defers readable formatting conventions to future authored JavaScript/TypeScript.
- **JSON-01** requires future authorized JSON to contain a valid interoperable top-level value.
- **JSON-02** requires strict double-quoted JSON without comments or executable constructs.
- **HTMLCSS-02** reserves consistent selectors and lowercase kebab-case custom properties for authored styles.

implements: [Awesome Guidelines Integration](../../docs/Awesome%20Guidelines%20Integration.md)
