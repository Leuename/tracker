# Database Rule

## Purpose and Applicability

Not applicable until schema or persistence source exists.

## Requirements

Do not treat UI tables or sample CRM records as entities. When activated, require domain ownership, schema/migration tooling, constraints, data lifecycle, and verification commands.

## Repository Evidence

No database schema, migrations, ORM, connection configuration, or seeds exist.

## Stop or Escalate

Stop before selecting a database or inventing models/migrations.

## Validation Deliverable

A gap assessment or, after activation, an evidence-linked design record.

Parent: [Decisions](../../docs/Decisions.md) · Evidence: [Repository Evidence](../../docs/Repository%20Evidence.md) · Related: [guidance](../skills/database-design/SKILL.md)

## Guideline Basis

- **JSON-03** prevents product fields from being mistaken for a persistence contract.
- **SEC-05** requires future data constraints and authorization at real write boundaries.
- **PG-02** blocks invented schema, migration, seed, and database validation commands.

implements: [Awesome Guidelines Integration](../../docs/Awesome%20Guidelines%20Integration.md)
