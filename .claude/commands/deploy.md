# Deploy

## Applicability

Not applicable: the checkout has no deployable app or deployment system.

## Prerequisite State

No build output contract, hosting config, environment contract, CI, credentials, or release artifact provenance exists.

## Workflow

Document the intended target and inventory required source, build, environment, approval, and rollback inputs.

## Stop Condition

Stop; do not deploy, create projects, use credentials, or invent provider commands.

## Deliverable

A deployment-readiness gap report and activation checklist.

Parent: [AI Agent Context](../../docs/AI%20Agent%20Context.md) · Decision basis: [Decisions](../../docs/Decisions.md) · Related: [workflow](../skills/deployment/SKILL.md)

## Guideline Basis

- **PG-02** blocks deployment commands until checked-in build and hosting configuration exists.
- **GIT-04** requires a versioned artifact, recovery plan, and verification record.
- **SEC-04** requires future hosting to define transport and defensive browser headers.

implements: [Awesome Guidelines Integration](../../docs/Awesome%20Guidelines%20Integration.md)
