# Remaining Work and Owner Decisions

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
