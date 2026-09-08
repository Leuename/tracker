# Git Workflow Rule

## Purpose and Applicability

Avoid inventing repository history while defining reviewable future changes.

## Requirements

The **repository root** is the project root as of 2026-09-01, remote `Leuename/tracker` (private), branch `main`. It was `apps/web/` alone until the re-root; nothing is untracked now except what `.gitignore` names. Use focused changes and concise imperative subjects; PRs should cite affected paths, checks, source gaps, issues, and screenshots for visual work.

**A push to `main` starts the CI gate, and a successful gate deploys to production.** There is no staging branch, so before pushing run `npm test`, then `npm run e2e` against a **local dev server** (`npm test` imports no `.jsx`, so only Playwright catches a render-time error — see [D84](../../docs/Decisions.md)), then **`npm run build` and only then `npm run security`**. That order is load-bearing: the probe's secret scan reads `dist/assets`, so running it before the build scans the *previous* bundle and cannot see a key you just added. `verify.yml` has always had it right; this line had it backwards until 2026-09-08 ([D97](../../docs/Decisions.md)). `npm run security` stays a local pre-push check because it writes to production.

### Release tags

Every deploy worth naming gets an annotated tag, so a version has a name that is not a commit hash and a rollback has something to point at.

```bash
git tag -a v0.2.0 -m "What changed, in a sentence or two"
git push origin v0.2.0
```

`vMAJOR.MINOR.PATCH`, matching `apps/web/package.json`. Bump the minor for a feature, the patch for a fix, and keep the manifest and the tag on the same commit. Tags are cut by hand: there is no release automation and inventing one before a real cadence exists would be scaffolding for later.

**Rolling back is a revert, not a tag.** Vercel keeps every successful deployment and can promote an earlier one from its dashboard, which is the fastest way to stop a bad release. Git is the durable record: `git revert <commit>` and push, so `main` and production agree again. Never move a tag that has been pushed — a version that means two different things is worse than an ugly version number.

## Repository Evidence

No CI checks or release automation exist. Vercel deploys `main` automatically; there is no other pipeline. Tags are created by hand. `.github/workflows/backup.yml` is a scheduled snapshot job, not a gate — it checks nothing and blocks nothing.

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
