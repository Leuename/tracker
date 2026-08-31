# Architecture Rule

## Purpose and Applicability

Preserve the distinction between static export, missing source, and optional agent adapters.

## Requirements

Treat `.dc.html`, `support.js`, `_ds_bundle.js`, uploads, and thumbnails as outputs. Apply nearest `AGENTS.md` precedence. Add Turborepo only for real package tasks and Turbopack only for Next.js.

## Repository Evidence

No runnable source architecture, backend, database, CI, or deployment exists.

## Stop or Escalate

Stop when an architecture claim depends on demo labels or absent source.

## Validation Deliverable

An evidence-backed map, decision, prerequisites, and affected policies.

Parent: [Decisions](../../docs/Decisions.md) · Evidence: [Repository Evidence](../../docs/Repository%20Evidence.md) · Related: [guidance](../../docs/Turborepo%20and%20Turbopack.md)

## Guideline Basis

- **PG-01** anchors architecture descriptions in the observed folder and artifact structure.
- **PG-03** treats exported HTML, JavaScript, and styles as delivery output, not architecture source.
- **PG-05** permits new layers or tools only after source and measurable need are evidenced.

implements: [Awesome Guidelines Integration](../../docs/Awesome%20Guidelines%20Integration.md)
