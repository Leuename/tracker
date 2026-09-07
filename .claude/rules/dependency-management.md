# Dependency Management Rule

## Purpose and Applicability

Prevent speculative installs and document existing external runtime dependencies accurately.

## Requirements

`apps/web/` manages its own dependencies through `apps/web/package.json` and its lockfile; additions there need an explicit request, as `@supabase/supabase-js` had under [Decisions](../../docs/Decisions.md) D7. Everywhere else, do not add packages.

Record React 18.3.1, ReactDOM 18.3.1, and Babel 7.29.0 as pinned external loads in the generated export; Google Fonts and Icons8/Line Awesome as external resources with unversioned/provenance concerns. Do not silently upgrade or vendor them.

## Repository Evidence

`apps/web/package.json` and its lockfile exist and pin React `^18.3.1`, ReactDOM `^18.3.1`, `@supabase/supabase-js` `^2.112.4`, `html2canvas` `^1.4.1`, and — in devDependencies — `@playwright/test` `^1.62.1`, `@vitejs/plugin-react` `^6.1.1` and Vite `^8.2.2`. `html2canvas` was added on 2026-09-05 under the explicit request [D51](../../docs/Decisions.md) records; it is imported dynamically, so it ships as its own chunk rather than in the entry bundle, and it is bundled rather than loaded from a CDN because the deployment sends `script-src 'self'`. **This line read "Vite 5" until 2026-09-04**, when a build printed `vite v8.2.2` and the manifest was read back to check; correct the version here whenever the manifest moves rather than restating it from memory. No manifest exists anywhere else, and the export's CDN references remain generated content.

## Stop or Escalate

Stop before installs, upgrades, or vendoring outside `apps/web/`, and before any upgrade inside it that no request covers.

## Validation Deliverable

A dependency inventory with source URL/path, version state, trust risk, and activation gate.

Parent: [Decisions](../../docs/Decisions.md) · Evidence: [Repository Evidence](../../docs/Repository%20Evidence.md) · Related: [guidance](../skills/dependency-audit/SKILL.md)

## Guideline Basis

- **SEC-02** requires version, integrity, and provenance evidence for external resources.
- **SEC-03** prohibits credentials in manifests, examples, and audit output.
- **JSON-02** applies strict JSON syntax to future authored manifests.
- **PG-05** rejects dependency additions that solve no evidenced repository need.

implements: [Awesome Guidelines Integration](../../docs/Awesome%20Guidelines%20Integration.md)
