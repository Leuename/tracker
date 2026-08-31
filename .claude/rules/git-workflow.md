# Git Workflow Rule

## Purpose and Applicability

Avoid inventing repository history while defining reviewable future changes.

## Requirements

`apps/web/` is a Git repository as of 2026-08-31, remote `Leuename/tracker` (private), branch `main`. Everything outside it is still untracked. Use focused changes and concise imperative subjects; PRs should cite affected paths, checks, source gaps, issues, and screenshots for visual work.

**A push to `main` deploys to production.** There is no staging branch and no CI gate, so `npm test`, `npm run e2e`, and `npm run build` are the checks that have to pass before pushing, not after.

## Repository Evidence

No CI checks or release automation exist. Vercel deploys `main` automatically; there is no other pipeline.

## Stop or Escalate

Stop before claiming a house convention or running destructive Git operations.

## Validation Deliverable

A focused change summary and reproducible verification record.

Parent: [Decisions](../../docs/Decisions.md) · Evidence: [Repository Evidence](../../docs/Repository%20Evidence.md) · Related: [guidance](../../docs/Handoff.md)

## Guideline Basis

- **GIT-01** keeps each authorized change focused and reviewable.
- **GIT-02** defers an imperative commit convention until history and branch policy exist.
- **GIT-03** forbids assuming a rebase/integration policy for a shared history that is not evidenced.
- **GIT-04** requires traceable versions and recoverable release/rollback paths.

implements: [Awesome Guidelines Integration](../../docs/Awesome%20Guidelines%20Integration.md)
