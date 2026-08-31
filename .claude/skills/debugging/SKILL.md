---
name: debugging
description: Document reproducible symptoms and locate the generated/source boundary before any fix.
version: 2.0.0
---

# Debugging

## Applicability

Use for reported defects in exported screens or documentation.

## Repository Prerequisite

The current phase is documentation-only, and [Repository Evidence](../../../docs/Repository%20Evidence.md) is the factual baseline.

## Workflow

Capture expected/actual behavior and artifact paths; identify whether evidence is Markdown, export, generated runtime, or missing source; define the smallest verification path; request source/authorization if needed.

## Stop or Escalate

Stop before patching generated output or declaring a fix without verification.

## Deliverable

A diagnosis with reproduction, evidence, likely owner layer, blocker, and next check.

Parent: [AI Agent Context](../../../docs/AI%20Agent%20Context.md) · Decision basis: [Decisions](../../../docs/Decisions.md) · Related: [workflow](../../commands/fix-issue.md)

## Guideline Basis

- **JS-03** redirects defects in generated bundles to their absent authored source.
- **PG-04** requires reproducible symptoms, root-cause evidence, and a check that fails before the fix.
- **DOC-02** distinguishes observed behavior from causal hypotheses.

implements: [Awesome Guidelines Integration](../../../docs/Awesome%20Guidelines%20Integration.md)
