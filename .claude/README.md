# Claude Adapter Index

This is a derived navigation index for Claude-compatible adapters. Authority remains with [AI Agent Context](../docs/AI%20Agent%20Context.md), [Repository Evidence](../docs/Repository%20Evidence.md), and [Decisions](../docs/Decisions.md). Select the smallest adapter matching the task; an adapter never expands authorization.

Each adapter has a tailored `Guideline Basis` pointing to the [traceability ledger](../docs/Awesome%20Guidelines%20Integration.md). Follow that section to see which source-derived principles govern a workflow and whether runtime guidance is adopted or deferred.

Policy entry points: synchronized [AGENTS.md](../AGENTS.md) and [CLAUDE.md](../CLAUDE.md), plus the deliberately thin [CLAUDE.local.md](../CLAUDE.local.md) adapter.

## Agents

- [Accessibility Auditor](agents/accessibility-auditor.md)
- [Architect](agents/architect.md)
- [Backend Engineer](agents/backend-engineer.md)
- [Code Reviewer](agents/code-reviewer.md)
- [Database Engineer](agents/database-engineer.md)
- [Devops Engineer](agents/devops-engineer.md)
- [Frontend Engineer](agents/frontend-engineer.md)
- [Fullstack Engineer](agents/fullstack-engineer.md)
- [Performance Engineer](agents/performance-engineer.md)
- [Product Manager](agents/product-manager.md)
- [Qa Engineer](agents/qa-engineer.md)
- [Security Auditor](agents/security-auditor.md)
- [Technical Writer](agents/technical-writer.md)
- [Ux Reviewer](agents/ux-reviewer.md)

## Commands

- [Create Feature](commands/create-feature.md)
- [Deploy](commands/deploy.md)
- [Fix Issue](commands/fix-issue.md)
- [Generate Docs](commands/generate-docs.md)
- [Migrate](commands/migrate.md)
- [Optimize](commands/optimize.md)
- [Refactor](commands/refactor.md)
- [Release](commands/release.md)
- [Review](commands/review.md)
- [Rollback](commands/rollback.md)
- [Ux Reviewer](commands/ux-reviewer.md)
- [Write Tests](commands/write-tests.md)

## Rules

- [Accessibility](rules/accessibility.md)
- [Api Conventions](rules/api-conventions.md)
- [Architecture](rules/architecture.md)
- [Code Style](rules/code-style.md)
- [Database](rules/database.md)
- [Dependency Management](rules/dependency-management.md)
- [Documentation](rules/documentation.md)
- [Error Handling](rules/error-handling.md)
- [Git Workflow](rules/git-workflow.md)
- [Logging](rules/logging.md)
- [Naming](rules/naming.md)
- [Performance](rules/performance.md)
- [Security](rules/security.md)
- [Testing](rules/testing.md)

## Skills

- [Api Design](skills/api-design/SKILL.md)
- [Architecture Analysis](skills/architecture-analysis/SKILL.md)
- [Code Review](skills/code-review/SKILL.md)
- [Database Design](skills/database-design/SKILL.md)
- [Debugging](skills/debugging/SKILL.md)
- [Dependency Audit](skills/dependency-audit/SKILL.md)
- [Deployment](skills/deployment/SKILL.md)
- [Documentation](skills/documentation/SKILL.md)
- [Performance](skills/performance/SKILL.md)
- [Refactoring](skills/refactoring/SKILL.md)
- [Security Review](skills/security-review/SKILL.md)
- [Testing](skills/testing/SKILL.md)

## Guideline Basis

- **AGENT-02** makes this the discoverable graph hub for Claude-compatible task adapters.
- **AGENT-03** keeps every linked adapter subordinate to repository scope and activation gates.
- **MD-02** requires every index link and ledger backlink to resolve by path.
- **MD-04** uses this index instead of duplicating adapter content in the root policy.

implements: [Awesome Guidelines Integration](../docs/Awesome%20Guidelines%20Integration.md)

Related: [Handoff](../docs/Handoff.md) · [Claude adapter](../CLAUDE.md) · [Guideline ledger](../docs/Awesome%20Guidelines%20Integration.md)
