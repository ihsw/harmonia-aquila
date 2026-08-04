# Tasks: Allow setMetadata With sourceDirs

> ## Hard constraints (re-read before starting)
>
> - **DO NOT START** any task until the user explicitly directs execution;
>   this spec is a plan, not a work order.
> - **No `npx`** in any form. Use repository `npm run` scripts or
>   `./node_modules/.bin/<tool>` exclusively (NFR-4).
> - Make no edits outside `src/lib/albums/`,
>   `src/commands/manage-albums/helpers/`, their focused tests under
>   `__tests__/lib/albums/`, and organize-files documentation
>   (requirements §3). No CLI, REST, GraphQL, or MCP schema files should need
>   changes (design §6) — if one does, STOP and confirm scope before editing.
> - Do not modify `etc/albums/**`, `package.json`, or lockfiles.
> - After **every** source code file modification, run
>   `npm run lint -- <modified-file>` and fix issues before continuing
>   (NFR-1). Do this per edit, not per task.
> - Do not run whole-codebase `npm run lint` as a pre-flight baseline;
>   reserve it for final verification after all TypeScript modifications are
>   complete.
> - Mark the matching `- [ ]` checkbox **immediately** when each task
>   finishes so progress remains resumable.

## Phase 1 — Pre-flight

### 1.1 Capture the baseline

- [ ] Record `git status --short` and preserve all pre-existing changes.
- [ ] Run the existing organize-files/concatenate test files, then
      `npm test`, recording pass/fail counts without running whole-codebase
      lint.
- [ ] Confirm dependency manifests are unchanged before implementation.
- [ ] Confirm current line counts of `src/lib/albums/organize-files.ts` and
      `src/lib/albums/concatenate-album-sources.ts` (design §2 budget check,
      NFR-5).

## Phase 2 — New cross-directory reconciliation module

### 2.1 Add `concatenate-set-metadata.ts`

- [ ] Create `src/lib/albums/concatenate-set-metadata.ts` with
      `assertNoDiscFieldsInRecords`, `assertUniqueFilenamesAcrossSources`,
      and `reconcileConcatenateSetMetadata` per `design.md` §3.1.
- [ ] After the edit, run
      `npm run lint -- src/lib/albums/concatenate-set-metadata.ts`. Fix
      issues.

### 2.2 Unit-test the new module

- [ ] Add `__tests__/lib/albums/concatenate-set-metadata.test.ts` covering:
      disc-field rejection (single and multiple offending records);
      cross-directory duplicate filename rejection naming both directories;
      coverage reconciliation success and its missing/extra-record failure
      modes (FR-3–FR-5).
- [ ] After the edit, run
      `npm run lint -- __tests__/lib/albums/concatenate-set-metadata.test.ts`.
      Fix issues.

## Phase 3 — Wire `concatenate-album-sources.ts`

### 3.1 Drop the setMetadata conflict and thread records through

- [ ] Remove `--set-metadata` from `assertConcatenateOptions`'s conflict
      list; keep `--limit`, `--reset-track`, and
      `--ignore-audio-files-without-tracks` rejected (FR-2).
- [ ] Add the optional `records: SetMetadataRecord[] | undefined` parameter
      to `readConcatenateAlbumSources`; call
      `reconcileConcatenateSetMetadata` when `records !== undefined` and
      return the resulting map as `recordsByFilename` on
      `ConcatenateAlbumSources` (design §3.2, FR-1).
- [ ] Update `getLocalTrackNumber` and `normalizeSourceTracks` to accept a
      `record: SetMetadataRecord | undefined` parameter and fall back to
      `record?.trackNumber` before throwing (FR-6).
- [ ] After the edit, run
      `npm run lint -- src/lib/albums/concatenate-album-sources.ts`. Fix
      issues.

### 3.2 Extend concatenate-album-sources tests

- [ ] Extend the relevant existing test file (or add a focused one) to cover:
      `getLocalTrackNumber` falling back to a record's `trackNumber` when
      the embedded tag is absent; still throwing when both are absent/invalid;
      `assertConcatenateOptions` accepting `--set-metadata` while still
      rejecting `--limit`/`--reset-track`/`--ignore-audio-files-without-tracks`.
- [ ] After the edit, run `npm run lint -- <modified-test-file>`. Fix issues.

## Phase 4 — Wire `organize-files.ts`

### 4.1 Remove the blanket rejection and pass records through

- [ ] Remove the `if (records !== undefined) { throw ... }` block in the
      concatenate branch of `organizeAlbumFiles`; call
      `organizeConcatenatedAlbum(options, options.execute === true, records)`
      instead (design §3.3, FR-1).
- [ ] Add the `records` parameter to `organizeConcatenatedAlbum`; pass it
      into `readConcatenateAlbumSources`; pass
      `concatenated.recordsByFilename` into `planMetadataFixes` in place of
      the current hardcoded `undefined` (FR-7).
- [ ] Confirm disc identity still comes only from
      `applyConcatenateDiscMetadata`/`ConcatenateDiscContext`; make no
      changes to that function (FR-8).
- [ ] After the edit, run `npm run lint -- src/lib/albums/organize-files.ts`.
      Fix issues.
- [ ] Confirm the file's line count did not increase versus the Phase-1
      baseline (NFR-5).

### 4.2 Extend organize-files concatenate tests

- [ ] Extend `__tests__/lib/albums/organize-files-concatenate.test.ts` with
      a dry-run case: two zero-tag source directories (mirroring the Days of
      Purgatory shape — disc-local track numbers restart at 1 in each
      directory) with full `setMetadata` records, asserting correct plan
      rows and disc identity still derived from directory order (AC-1).
- [ ] Extend `__tests__/lib/albums/organize-files-concatenate-execution.test.ts`
      with: a successful execute-mode write using `setMetadata`; atomic
      failure (no writes performed) when a record supplies disc fields, when
      a filename collides across directories, and when coverage is
      incomplete (AC-2–AC-4).
- [ ] After each edit, run `npm run lint -- <modified-test-file>`. Fix
      issues.

## Phase 5 — Adapter regression coverage

### 5.1 Confirm no adapter code changes are needed

- [ ] Re-read `src/web/controllers/manage-albums.controller.ts`,
      `src/web/modules/graphql/album.resolver.ts`,
      `src/web/servers/mcp-tools/manage-albums/organize-files.ts`, and the
      CLI command file to confirm none duplicate the old "not supported with
      sourceDirs" guard (design §6). If one does, stop and reconcile scope
      with the user before editing outside the approved paths.

### 5.2 Add one contract case per adapter

- [ ] Add a passing "concatenate + setMetadata" case to the CLI organize-files
      test suite.
- [ ] Add a passing "concatenate + setMetadata" case to the REST controller
      test suite.
- [ ] Add a passing "concatenate + setMetadata" case to the GraphQL resolver
      test suite.
- [ ] Add a passing "concatenate + setMetadata" case to the MCP
      `manage_albums_organize_files` test suite.
- [ ] After each edit, run `npm run lint -- <modified-test-file>`. Fix
      issues.

## Phase 6 — Regression proof

### 6.1 Prove legacy parity

- [ ] Run and confirm unchanged: existing concatenate-without-setMetadata
      tests, existing single-`sourceDir`-with-setMetadata tests, and
      existing `--limit`/`--reset-track`/`--ignore-audio-files-without-tracks`
      concatenate-conflict tests (FR-10).
- [ ] After any incidental edit, run `npm run lint -- <modified-file>`.

## Phase 7 — Documentation

### 7.1 Document the new capability and its constraints

- [ ] Update `docs/album-organization.md`'s concatenate section to describe
      `setMetadata` support: disc fields forbidden, filenames must be
      globally unique across `sourceDirs`, and every file across every
      directory needs a matching record.
- [ ] Update `docs/organize-files-set-metadata.md` with the same
      cross-directory constraints and a worked example mirroring the Days of
      Purgatory two-disc, zero-tag shape.

## Phase 8 — Final verification

### 8.1 Run last-call checks

- [ ] Run whole-codebase `npm run lint` only now; require exit 0.
- [ ] Run `npm run build`; require exit 0.
- [ ] Run `npm test`; require exit 0 and reconcile with the Phase-1 baseline.

### 8.2 Verify scope and acceptance

- [ ] Confirm `git --no-pager diff -- package.json package-lock.json` is
      empty.
- [ ] Confirm `git status --short` contains only expected files under
      `src/lib/albums/`, `src/commands/manage-albums/helpers/`,
      `__tests__/lib/albums/`, `docs/`, and this spec, plus any preserved
      pre-existing changes.
- [ ] Reconcile all acceptance criteria in `requirements.md` §6 and record
      concise execution notes beneath completed phases.

---

## Execution notes

<!-- Append notes here as phases complete. -->