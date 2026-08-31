# Construction Tracker Guidelines

This folder contains requirements/reference material for the construction-tracker experience. It is not an application package.

## Artifact and Evidence Boundary

`construction.csv` is a 57-line, loosely tabular design brief. It names screen areas and fields for the left panel, dashboard, attendance, daily cash flow, projects, payroll, worker masterlist, payables, debts, expenses, and receivables. It includes product notes such as dropdowns, calculated balances, payment status, receipt references, and forecast fields. Blank cells and mixed English/Filipino annotations are part of the source artifact; do not normalize them into implementation assumptions without authorization.

The file does not prove a database schema, API, backend, authentication, or working calculations. Do not invent commands, tests, migrations, or services from its labels. Treat it as product-input evidence and preserve the original CSV when documenting derived interpretations.

## Current Scope and Workflow

The current phase is documentation and AI-agent setup only. Read the CSV for context, record interpretations in [Repository Evidence](../docs/Repository%20Evidence.md) or [Decisions](../docs/Decisions.md), and link back to the exact artifact. Do not edit or regenerate the CSV unless explicitly requested. If a future implementation request arrives, first obtain the authoritative source, data model, acceptance criteria, and validation commands.

## Guideline Basis

- **AGENT-01** makes this the nearest governing guide for `construction_tracker/`.
- **JSON-03** prevents loosely tabular product labels from becoming an invented data contract or schema.
- **PG-01** records what the CSV is and what application layers are absent.
- **DOC-02** separates source text, interpretation, and implementation decisions.

implements: [Awesome Guidelines Integration](../docs/Awesome%20Guidelines%20Integration.md)

Related: [AI Agent Context](../docs/AI%20Agent%20Context.md) · [Construction Tracker Handoff](../docs/Handoff.md) · [Company Tracker Guidelines](../company_tracker/AGENTS.md) · [Guideline ledger](../docs/Awesome%20Guidelines%20Integration.md)
