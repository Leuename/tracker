---
name: deployment
description: Gate deployment work until a deployable source, build contract, environment, and owner exist.
version: 2.0.0
---

# Deployment

## Applicability

Use for deploy, release-environment, hosting, or rollback requests.

## Repository Prerequisite

The current phase is documentation-only, and [Repository Evidence](../../../docs/Repository%20Evidence.md) is the factual baseline.

## Workflow

Inventory checked-in build/deploy/CI configuration; if absent, record target, artifact provenance, environment variables, approvals, health checks, and rollback prerequisites.

## Stop or Escalate

Stop before provider changes, credentials, uploads, or invented commands.

## Deliverable

A deployment-readiness gap report or authorized run record with validation.

Parent: [AI Agent Context](../../../docs/AI%20Agent%20Context.md) · Decision basis: [Decisions](../../../docs/Decisions.md) · Related: [workflow](../../commands/deploy.md)

## Guideline Basis

- **GIT-04** requires versioned artifacts, traceable promotion, and a verified recovery path.
- **SEC-04** requires future hosting to define HTTPS and defensive browser-header policy.
- **PG-02** blocks deployment commands until build and hosting configuration are present.

implements: [Awesome Guidelines Integration](../../../docs/Awesome%20Guidelines%20Integration.md)
