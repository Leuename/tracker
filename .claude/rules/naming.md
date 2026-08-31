# Naming Rule

## Purpose and Applicability

Keep knowledge notes discoverable while preserving supplied artifact identities.

## Requirements

Use Title Case for canonical note filenames in `docs/`; name handoffs `YYYY-MM-DD Title.md` in `handoff/`, so they sort by date and each resolves as a unique Obsidian link; preserve generated/export filenames exactly; use lowercase kebab-case for CSS custom properties if authorized. Prefer descriptive Markdown headings and unambiguous relative links over basename-only wikilinks.

## Repository Evidence

Current artifacts already carry export-specific names that must not be normalized.

## Stop or Escalate

Stop before renaming exports, assets, or folders without an explicit migration plan.

## Validation Deliverable

Names that preserve provenance and resolve without ambiguity.

Parent: [Decisions](../../docs/Decisions.md) · Evidence: [Repository Evidence](../../docs/Repository%20Evidence.md) · Related: [guidance](../rules/documentation.md)

## Guideline Basis

- **JSON-03** requires stable, documented field names when a future schema is authorized.
- **MD-01** keeps knowledge-note titles descriptive and scannable.
- **DOC-03** preserves exact artifact paths and consistent domain terminology.
- **HTMLCSS-02** reserves lowercase kebab-case custom properties for future authored CSS.

implements: [Awesome Guidelines Integration](../../docs/Awesome%20Guidelines%20Integration.md)
