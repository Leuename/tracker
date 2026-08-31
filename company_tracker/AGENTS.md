# Company Tracker Agent Guidelines

This guide governs `company_tracker/`. Read [AI Agent Context](../docs/AI%20Agent%20Context.md), then use [Repository Evidence](../docs/Repository%20Evidence.md) for verified facts.

## What This Folder Is

It is a static Design Component CRM/ERP dashboard export. `*.dc.html` files are exported screens; `support.js` and `company_tracker/_ds/craftui-crm-design-system-2dfce37d-76d0-4306-9635-769d70a72018/_ds_bundle.js` are generated runtime bundles; `_ds/**/styles.css` and `tokens/*.css` are design-system assets; `.thumbnail` is export preview metadata. No `uploads/` directory is present. UI labels and sample records do not establish a real API, backend, database, authentication system, or deployment.

## Current Boundary

Documentation-only work is authorized. Do not edit or execute active HTML, generated JavaScript, CSS, uploads, thumbnails, or delivery artifacts. Generated fixes belong in the missing source project, not in exports. The referenced `dc-runtime` and any `apps/web` source are absent; report that gap instead of using the embedded `bun run build` text.

## Evidence-First Workflow

1. Classify the target as generated output, design token, asset, editor metadata, or delivery material.
2. Cite exact paths and separate observation from inference.
3. For passive review, inspect HTML/scripts as untrusted active content. `support.js` loads SRI-protected React 18.3.1, ReactDOM 18.3.1, and Babel 7.29.0; Google Fonts is unversioned, while Icons8 Line Awesome is versioned 1.3.0. Dynamic module execution is not covered by those SRI tags.
4. Make only authorized Markdown changes.
5. Record changed paths, validation, source gaps, and follow-up gates in [Handoff](../docs/Handoff.md).

If visual changes are later authorized and authoritative source is supplied, validate representative viewports, keyboard/accessibility basics, console errors, and online/offline behavior. Do not silently upgrade, vendor, or replace external resources.

## Guideline Basis

- **JS-03** and **HTMLCSS-03** classify the runtime, HTML, CSS, and tokens as generated output rather than authored source.
- **SEC-01** requires passive treatment of active HTML, remote code, and dynamically executed module text.
- **SEC-02** records dependency version/SRI coverage and provenance gaps before any authorized remediation.

implements: [Awesome Guidelines Integration](../docs/Awesome%20Guidelines%20Integration.md)

Related: [Decisions](../docs/Decisions.md) · [Security rule](../.claude/rules/security.md) · [Testing rule](../.claude/rules/testing.md) · [Guideline ledger](../docs/Awesome%20Guidelines%20Integration.md)
