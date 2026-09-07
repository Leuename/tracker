# Remaining Work and Owner Decisions

> **Superseded on 2026-09-04.** C1, C4 and C5 were put to the owner and answered: sign-out stays
> **global** and is now explicit at both browser call sites ([D47](../../Decisions.md)), the scheduler gets
> **no external notification channel** ([D48](../../Decisions.md), which also closes D31), and the rates-account
> password rotation was **deferred again** ([D44](../../Decisions.md)) and remains open as C5.
> **Do not ask the owner to choose C1 or C4 again.** This file is kept as the dated record of
> what was open before those answers. Current state: [Three Answers, and a Finding That Corrected Itself](../../../handoff/2026-09-04%20Three%20Answers,%20and%20a%20Finding%20That%20Corrected%20Itself.md)

## Goal

Close the safe, explicitly recommended items from `docs/Remaining Work and Owner Decisions.md`, and leave database-connection, disposable-environment, and owner-choice blockers visible without inventing access or mutating production data beyond the requested proof-row cleanup.

## Architecture

Use the existing authenticated Supabase client and existing receipt/object relationship. Make the proof-row rename ID-scoped and verify the row and linked storage object remain intact. Remove only the empty `apps/api/` boundary directory. Record both decisions in `docs/Decisions.md`; record evidence in `docs/Repository Evidence.md` if production verification is performed.

## Tech Stack

React/Vite app in `apps/web`, Supabase Postgres/Auth/Storage, Node scripts, Markdown decision and evidence notes.

## Spec

- Keep the six released-wire backfill and the three pending wires' null rates unchanged.
- Do not attempt A1/A2 without an owner-supplied direct Postgres connection string.
- Do not manufacture 1,001 production storage objects for B1.
- Do not create or alter a paid/production project for B2.
- Rename receipt `1788471059637` to `DO NOT DELETE — backup proof`; preserve released status, amount, links, and the stored object.
- Delete `apps/api/` only if it is empty.
- Do not choose C1 sign-out scope, C4 notification channel/recipients, or rotate the deferred rates-account password without explicit owner confirmation.

## Global Constraints

- `AGENTS.md` and `CLAUDE.md` remain synchronized.
- Generated exports and `company_tracker/` remain read-only.
- Never place or repeat credentials in repository notes.
- Run checks from `apps/web`; `npm run security` and live smoke/e2e checks touch production and must be treated as such.
- Verify before completion; do not push or tag.

## Tasks

### 1. Reconfirm baseline and blockers

Read the remaining-work brief, decision/evidence notes, and current git state. Confirm no Postgres connection variables are available and that the rehearsal target is not blank. Document A1/A2/B1/B2 as blocked/deferred rather than retrying.

### 2. Preserve and relabel the storage-proof receipt

Use the existing receipt update path, scoped to ID `1788471059637`, to change only the beneficiary/description text. Re-read the receipt and linked storage object; confirm amount `0`, released state, storage link, and object bytes/hash are unchanged. Record the owner decision and evidence.

### 3. Remove the unused API boundary

Confirm `apps/api/` contains no files, remove the empty directory, and record that the repository has no API implementation there.

### 4. Stop at owner-gated choices

Leave C1, C4, and C5 unchanged. Ask the owner to choose local/global sign-out, notification channel and recipients (or defer), and whether to rotate the rates-account password now.

### 5. Verify

Run the focused test suite and security probe if credentials are available. Inspect the final diff, ensure documentation links resolve, and report live checks separately from local checks.
