---
title: Awesome Guidelines Integration
aliases: [Guideline Traceability Ledger]
tags: [guidelines, traceability, ai-agents, knowledge-graph]
status: active
---

# Awesome Guidelines Integration

This ledger converts relevant guidance into local, testable rules. [Awesome Guidelines](https://github.com/Kristories/awesome-guidelines) is a curated index of independent guides, not a single normative standard. A listed source is advisory until a principle below adopts it; repository evidence, the current user request, and the nearest scoped guide still control applicability.

## Studied Sources

- [Awesome Guidelines](https://github.com/Kristories/awesome-guidelines) — discovery index and category taxonomy.
- [AGENTS.md specification](https://agents.md/) — agent instruction discovery and nearest-file scope.
- [Project Guidelines](https://github.com/elsewhencode/project-guidelines) — repository organization, reproducible workflows, testing, documentation, and review practices.
- [Google JavaScript Style Guide](https://google.github.io/styleguide/jsguide.html) — readable authored JavaScript and generated-code boundaries.
- [Google JSON Style Guide](https://google.github.io/styleguide/jsoncstyleguide.xml) — interoperable JSON structure and naming.
- [Google Markdown Style Guide](https://google.github.io/styleguide/docguide/style.html) — readable headings, links, lists, and concise prose.
- [Google HTML/CSS Style Guide](https://google.github.io/styleguide/htmlcssguide.html) — semantic markup, maintainable CSS, and separation from generated output.
- [WCAG 2.1](https://www.w3.org/TR/WCAG21/) — perceivable, operable, understandable, and robust interfaces.
- [Git Style Guide](https://github.com/agis/git-style-guide) — focused history, imperative subjects, and reversible integration.
- [Google Developer Documentation Style Guide](https://developers.google.com/style) — audience-first, direct, accurate technical writing.
- [Front-End Checklist](https://github.com/thedaviddias/Front-End-Checklist) — evidence-based release checks for authored web applications.
- [Mozilla Secure Coding Guidelines](https://wiki.mozilla.org/WebAppSec/Secure_Coding_Guidelines) — trust boundaries, third-party scripts, transport, headers, validation, and output encoding.

## Relationship Vocabulary

- `governed-by`: a narrower guide receives authority or scope from a parent policy.
- `implements`: a file operationalizes one or more principle IDs from this ledger.
- `evidenced-by`: a claim is supported by an observed repository path or canonical evidence note.
- `deferred-until`: guidance is intentionally inactive pending named repository evidence.
- `verified-by`: a claim names the check that can confirm it.

Use these labels in prose or link descriptions. Every implementation links back here; this ledger links to its policy, evidence, decision, routing, and continuation hubs.

## Principle Traceability Ledger

| ID | Source-derived meaning | Repository-specific application | Status and activation evidence | Implementing files |
|---|---|---|---|---|
| AGENT-01 | Instructions are hierarchical and the nearest guide wins. | Root policy governs generally; nested `AGENTS.md` files narrow their folders. | **Adopted**; scoped guides exist. | `AGENTS.md`, `CLAUDE.md`, `company_tracker/AGENTS.md`, `construction_tracker/AGENTS.md`, `AI Agent Context.md` |
| AGENT-02 | Agent instructions must be concrete, discoverable, and repository-specific. | Route agents through canonical facts, decisions, and task adapters. | **Adopted**; documentation graph exists. | `.claude/README.md`, all `.claude/agents/**`, `CLAUDE.local.md` |
| AGENT-03 | Tool adapters may narrow work but cannot invent authority. | Commands, agents, rules, and skills stop at unmet repository gates. | **Adopted**; documentation-only decision is active. | all `.claude/**`, `Decisions.md` |
| PG-01 | Describe actual structure and ownership. | Distinguish static exports, requirements input, adapter files, and missing source. | **Adopted**; verified paths are recorded. | `Repository Evidence.md`, root and nested guides |
| PG-02 | Publish only commands that are reproducible from checked-in configuration. | Do not claim build, test, dev, deploy, or Turbo commands yet. | **Adopted**; manifests and runners are absent. | root policies, commands, testing/deployment rules |
| PG-03 | Separate source, generated output, assets, and documentation. | Treat Design Component HTML/JS/CSS as read-only delivery artifacts. | **Adopted**; generated headers and absent source are evidenced. | `company_tracker/AGENTS.md`, architecture/code-style rules |
| PG-04 | Define reviewable changes and validation evidence. | Record changed paths, checks, limitations, and activation gates. | **Adopted**; used by review, handoff, and documentation workflows. | `Handoff.md`, review command/agent/skill, Git rule |
| PG-05 | Keep setup minimal and introduce tooling only for demonstrated needs. | Turbo, frameworks, CI, and dependencies remain gated. | **Adopted**; prerequisite evidence is absent. | `Decisions.md`, `Turborepo and Turbopack.md`, dependency/deployment adapters |
| JS-01 | Authored JavaScript should be consistently formatted, readable, and explicit. | Apply only when authoritative editable JavaScript arrives. | **Deferred** until authored `.js`/`.ts` source and its formatter exist. | code-style rule, frontend/fullstack agents |
| JS-02 | Prefer module-safe, immutable-by-default code with clear names and contracts. | Use for future runtime source, not exported bundles. | **Deferred** until application source is supplied. | backend/frontend agents, refactoring skill |
| JS-03 | Generated code is not hand-maintained source. | Never patch `support.js` or `_ds_bundle.js` as the source fix. | **Adopted**; generated artifacts are present. | nested company guide, debugging/code-review skills |
| JSON-01 | JSON must be valid, interoperable, and represented by one top-level value. | Future authored configuration must remain machine-parseable. | **Deferred** until JSON configuration changes are authorized. | naming and code-style rules |
| JSON-02 | Use double-quoted property names and strings; avoid comments and executable constructs. | Apply to future manifests and configuration, not `.obsidian` settings. | **Deferred** until an authored JSON target is in scope. | code-style and dependency rules |
| JSON-03 | Use stable, documented field names and validate against a known contract. | Do not turn `construction.csv` labels into an invented JSON schema. | **Deferred** until a schema or consumer exists. | construction guide, database/API adapters |
| MD-01 | Organize documents with descriptive headings and concise sections. | Every knowledge note and adapter uses scannable task-specific structure. | **Adopted**; Markdown is the active work product. | all Markdown files |
| MD-02 | Links should be descriptive, stable, and locally resolvable. | Use path-qualified Markdown links and verify local targets. | **Adopted**; graph checks are required. | context/index/documentation files |
| MD-03 | Lists, tables, code blocks, and spacing must render predictably. | Keep CommonMark-compatible layout and escape link text where necessary. | **Adopted**; applies to all documentation edits. | documentation rule/skill/command, ledger |
| MD-04 | Avoid duplication by assigning canonical homes and linking to them. | Facts live in Evidence, decisions in Decisions, continuation in Handoff. | **Adopted**; canonical notes exist. | `AI Agent Context.md`, canonical notes, `.claude/README.md` |
| HTMLCSS-01 | Authored HTML should be semantic and structurally accessible. | Inspect current exports passively; apply fixes only in future source. | **Deferred** until authoritative HTML/component source is available. | frontend/UX/accessibility adapters |
| HTMLCSS-02 | Authored CSS should be maintainable, consistently named, and free of avoidable specificity coupling. | Preserve exported CSS; future authored custom properties use lowercase kebab-case. | **Deferred** until editable style source is authorized. | code-style rule, frontend and UX agents |
| HTMLCSS-03 | Separate generated markup/styles from maintainable source. | Exported `.dc.html`, bundles, tokens, and styles are read-only evidence. | **Adopted**; export structure is present. | company guide, architecture/review adapters |
| WCAG-01 | Provide perceivable alternatives, contrast, and adaptable structure. | Report observable risks now; remediate only in authoritative source. | **Deferred** until visual source and change authority exist. | accessibility rule/auditor, UX workflow |
| WCAG-02 | Interfaces must be keyboard operable with visible focus and no traps. | Require manual keyboard checks for future authorized UI work. | **Deferred** until a runnable interface is supplied. | accessibility and QA adapters |
| WCAG-03 | Use semantic names, predictable behavior, and compatible validation. | Combine automated evidence with manual assistive-technology review. | **Deferred** until an executable UI and test method exist. | accessibility, UX, testing adapters |
| GIT-01 | Keep changes focused and logically atomic. | Documentation passes should avoid unrelated artifact edits. | **Adopted** for change scope; history convention remains unverified. | root policies, review/release commands |
| GIT-02 | Write concise imperative commit subjects with useful context. | Use only when a repository Git workflow is available. | **Deferred** until Git history/workflow evidence exists. | Git rule, release command |
| GIT-03 | Rebase or integrate deliberately; do not rewrite shared history casually. | Require owner and branch policy before history-changing operations. | **Deferred** until a shared Git workflow exists. | Git rule, migration/release commands |
| GIT-04 | Make releases and reversals traceable and recoverable. | Release/rollback require version, artifact, deployment, and recovery evidence. | **Deferred** until release and deployment systems exist. | release, deploy, rollback adapters |
| DOC-01 | Write for the reader with direct, action-oriented language. | State what an agent should inspect, stop, record, or verify. | **Adopted**; used across guidance. | technical-writer agent, documentation rule/skill/command |
| DOC-02 | Separate facts, assumptions, decisions, and examples. | Claims cite Repository Evidence; gates cite Decisions. | **Adopted**; canonical separation exists. | evidence/decision/context/handoff notes |
| DOC-03 | Keep terminology, paths, and cross-references consistent. | Preserve artifact names and use the relationship vocabulary above. | **Adopted**; link validation is required. | all knowledge hubs and scoped guides |
| FE-01 | A web release needs a repeatable checklist covering metadata, quality, accessibility, performance, and compatibility. | Use only after source, a runnable app, target browsers, and acceptance criteria exist. | **Deferred** until a deployable authored frontend exists. | frontend, QA, UX, performance, deployment adapters |
| SEC-01 | Identify trust boundaries and treat active external content as untrusted until verified. | Review exported HTML/scripts and dynamic module execution passively. | **Adopted**; external CDN/runtime behavior is evidenced. | security rule/auditor/skill, company guide |
| SEC-02 | Pin and verify third-party dependencies; document provenance and integrity gaps. | Record SRI/version coverage and unversioned external resources without silently replacing them. | **Adopted** for passive review; remediation needs source authority. | dependency rule/skill, security adapters |
| SEC-03 | Keep secrets out of source, logs, examples, and documentation. | Never record credentials; redact sensitive evidence in handoffs and reviews. | **Adopted** even in documentation-only work. | security, logging, review, documentation adapters |
| SEC-04 | Deploy web systems with secure transport and defensive browser headers. | Do not claim or configure CSP/HSTS/cookie policy from static exports. | **Deferred** until a deployable app and hosting configuration exist. | security and deployment adapters |
| SEC-05 | Validate inputs and encode outputs at trust boundaries. | Do not infer validation from UI controls or mock data. | **Deferred** until API/backend/input-processing source exists. | API/backend/database/security/error-handling adapters |

## Top-Level Applicability Register

| Awesome Guidelines category | Repository finding | Disposition |
|---|---|---|
| Programming Languages | Markdown is authored; JavaScript, HTML, and CSS are generated/exported; CSV is product input; no other authored language is evidenced. | Apply Markdown principles now, generated-boundary principles to exports, and defer language-specific coding rules. Exclude all other language guides until source or manifest evidence appears. |
| Development Environment | Agent guides and `.claude/` adapters exist; `.obsidian/` is editor configuration; no reproducible package or CI environment exists. | Adopt instruction discovery and documentation checks. Exclude editor, shell, container, and CI conventions not evidenced by checked-in configuration. |
| Platforms | The artifacts depict a browser-based dashboard, but there is no runnable web, server, mobile, desktop, or cloud platform project. | Permit passive web-artifact analysis only. Exclude platform-specific implementation rules until source and deployment evidence appears. |
| Frameworks | React, ReactDOM, and Babel are loaded by generated runtime; Next.js and other frameworks are absent as authored dependencies. | Record provenance only. Exclude framework conventions until a manifest and editable source establish use. |
| CMS | No CMS configuration, schema, content model, or integration exists. | Exclude all CMS guidance; re-evaluate only when source or manifest evidence identifies one. |
| Tools | Agent documentation is active; Turborepo, Turbopack, linters, test runners, release, and deployment tools are absent or gated. | Use only documented agent adapters. Re-evaluate each tool solely when its configuration, manifest, or runnable command is checked in. |

Exclusion means “not evidenced here,” not “forbidden forever.” Re-evaluate a category only when new source, manifest, configuration, schema, or deployment evidence is added; record that evidence in [Repository Evidence](Repository%20Evidence.md) before changing status here.

## Knowledge Graph

- governed-by: [AGENTS.md](../AGENTS.md) and the synchronized [CLAUDE.md](../CLAUDE.md)
- routed-by: [AI Agent Context](AI%20Agent%20Context.md) and the [.claude adapter index](../.claude/README.md)
- evidenced-by: [Repository Evidence](Repository%20Evidence.md)
- decided-by: [Decisions](Decisions.md)
- continued-by and verified-by: [Handoff](Handoff.md)
- specialized-by: [Turborepo and Turbopack](Turborepo%20and%20Turbopack.md)
- scoped-by: [Company Tracker Guidelines](../company_tracker/AGENTS.md) and [Construction Tracker Guidelines](../construction_tracker/AGENTS.md)

## Guideline Basis

- **MD-02** requires this ledger to link every canonical hub and every implementation to link back here.
- **MD-04** makes this file the single source of truth for external-guidance adoption, status, and traceability.
- **DOC-02** keeps source meaning, local application, evidence, and decisions in separate table columns.
- **AGENT-02** gives any coding agent a stable, vendor-neutral route from principles to repository workflows.

implements: [Awesome Guidelines Integration](Awesome%20Guidelines%20Integration.md)
