# Rollback

## Applicability

Not applicable: no deployed environment, release record, or rollback mechanism exists.

## Prerequisite State

Static delivery artifacts do not establish prior versions or operational state.

## Workflow

Record the incident/requested state, identify the absent release/deployment evidence, and request the authoritative system and owner.

## Stop Condition

Stop before deleting, replacing, restoring, or publishing any artifact.

## Deliverable

A blocked rollback report naming required version, environment, owner, backup, and verification evidence.

Parent: [AI Agent Context](../../docs/AI%20Agent%20Context.md) · Decision basis: [Decisions](../../docs/Decisions.md) · Related: [workflow](../skills/deployment/SKILL.md)

## Guideline Basis

- **GIT-04** requires a named recoverable artifact and post-rollback verification.
- **PG-02** blocks invented reversal commands without a real release/deployment mechanism.
- **SEC-03** prevents credentials or sensitive runtime values from entering rollback records.

implements: [Awesome Guidelines Integration](../../docs/Awesome%20Guidelines%20Integration.md)
