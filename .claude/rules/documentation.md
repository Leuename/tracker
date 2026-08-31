# Documentation Rule

## Purpose and Applicability

Keep repository knowledge discoverable, non-duplicative, and agent-agnostic.

## Requirements

Put observations in `docs/Repository Evidence.md`, decisions in `docs/Decisions.md`, continuation in `docs/Handoff.md`, and navigation in `docs/AI Agent Context.md`. Handoffs go in `handoff/`, named `YYYY-MM-DD Title.md`. Scan hidden Markdown, link leaves upward and sideways, use exact relative paths, and keep `.obsidian/` configuration-only.

Every handoff, recap, or continuation package must carry a `## Resume prompts` section of copy-pasteable prompts. Each names the handoff's exact path and tells the next session to verify before acting. A handoff without them is incomplete and must not be reported as done. See [Session Continuation Package 2026-09-01](../../handoff/2026-09-01%20Session%20Continuation%20Package.md) for the shape.

## Repository Evidence

Canonical root notes exist; `.claude` files are derived adapters.

## Stop or Escalate

Stop before copying policy into every leaf or writing unverified commands.

## Validation Deliverable

A cohesive graph with resolved local links, no placeholders, and updated handoff.

Parent: [Decisions](../../docs/Decisions.md) · Evidence: [Repository Evidence](../../docs/Repository%20Evidence.md) · Related: [guidance](../skills/documentation/SKILL.md)

## Guideline Basis

- **MD-01** requires concise heading hierarchy and scannable sections.
- **MD-03** keeps lists, tables, spacing, and code fences render-safe.
- **MD-02** requires descriptive path-qualified links and resolution checks.
- **DOC-03** keeps terminology, paths, and relationship labels consistent.

implements: [Awesome Guidelines Integration](../../docs/Awesome%20Guidelines%20Integration.md)
