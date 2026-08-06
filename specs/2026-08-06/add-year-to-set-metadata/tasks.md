# Tasks: Add `year` support to `setMetadata`

> ## Hard constraints (re-read before starting)
>
> - **DO NOT START** any task below until the user explicitly directs you to.
>   This file is delivered as a plan, not as a work order.
> - **No `npx`** in any form. Forbidden in **all** invocations (no
>   `--no-install`, no one-off vitest/tsc runs). Any command line containing the
>   substring `npx` is a violation and must be rewritten before execution. Use
>   `./node_modules/.bin/<tool>` or `npm run <script>` exclusively.
> - **No edits to audiobook paths** for the duration of this spec (NFR-7):
>   `src/commands/manage-audiobooks/`, `src/lib/audiobooks/`,
>   `src/web/servers/mcp-tools/manage-audiobooks/`. If a real bug surfaces
>   there, STOP and surface it; do not patch silently.
> - After **every** source code file modification (for example, a `.ts` edit),
>   run `npm run lint -- <modified-file>` and fix any reported issues before
>   moving on (NFR-1). This MUST lint only the file just modified. Do this per
>   source-code edit, not per-task.
> - Run whole-codebase `npm run lint` only as a last-call verification after all
>   TypeScript modifications are complete — **including not using it as a
>   pre-flight baseline**.
> - The typecheck script is `npm run build`, **not** `npm run build:ts`.
> - Mark the matching `- [x]` checkbox **immediately** when each task is
>   finished, so progress is resumable.

## Phase 1 — Pre-flight

### 1.1 Confirm clean baseline

- [x] Do **not** run whole-codebase `npm run lint` as a pre-flight baseline;
      reserve it for final verification after all TypeScript modifications are
      complete.
- [x] Run `npm test` and capture the pass/fail counts as the baseline.
- [x] Run `git status` and confirm a clean tree before starting.

> Baseline: **62 test files, 353 tests, all passing** (1.81s). Tree clean apart
> from the untracked `specs/2026-08-06/` folder.

### 1.2 Audit `ParsedAlbumSource` construction sites

- [x] Grep `__tests__/` and `src/` for object literals typed as
      `ParsedAlbumSource` (`grep -rn "ParsedAlbumSource" __tests__ src`).
      Record every construction site — each needs `year` once FR-5 makes the
      field required. This is the highest-risk item in `design.md` §8.
- [x] Inspect `src/lib/albums/concatenate-album-sources.ts` lines ~86–88 and
      record whether synthesized sources spread the original object or
      enumerate fields (`design.md` §4.3). Note the answer here:

      > Finding: **spread** — `concatenate-album-sources.ts:106` ends
      > `normalizeSourceTracks` with `.map(source => ({ ...source, sourceDirectory }))`.
      > `year` propagates automatically; **task 3.4 needs no code edit.**

> Audit notes:
> - **Zero hand-built `ParsedAlbumSource` literals exist in `__tests__/`.** The
>   only construction site in the whole repo is `parseAlbumSources` in
>   `src/lib/albums/metadata-fix-sources.ts`. Every other reference is a type
>   annotation on a parameter or local. The `design.md` §8 "Medium" risk about
>   fixtures breaking does **not** materialize — **task 3.5 is a no-op** beyond
>   confirming the typecheck passes.

## Phase 2 — Core types

### 2.1 Extend `SetMetadataRecord`

- [x] Add `year?: number` to `SetMetadataRecord` in
      `src/commands/manage-albums/helpers/set-metadata-records.ts` (FR-1).
- [x] Add the `MIN_YEAR`/`MAX_YEAR` constants and the `yearValue` validator per
      `design.md` §3 (FR-2, FR-2a).
- [x] Wire `year` into `buildRecord`, including the `!== ''` empty-cell guard,
      and add the conditional spread to the returned literal (FR-2a).
- [x] Leave `REQUIRED_FIELDS` and `STRING_FIELDS` unchanged (`design.md` §4.1).
- [x] Run `npm run lint -- src/commands/manage-albums/helpers/set-metadata-records.ts`.
      Fix issues. Re-run until clean.

### 2.2 Extend `AudioTagFix`

- [x] Add `year?: number` to `AudioTagFix` in `src/lib/albums/audio-tags.ts` (FR-4).
- [x] Add the `tagFix.year !== undefined` write block after the `trackNumber`
      block and before `audioFile.save()` (`design.md` §4.4).
- [x] Run `npm run lint -- src/lib/albums/audio-tags.ts`. Fix issues. Re-run
      until clean.

### 2.3 Extend the metadata-fix types

- [x] Add `year?: number | null` and `newYear?: number` to
      `MetadataFixJsonOutputRow` (FR-6).
- [x] Add `year: number | null` to `ParsedAlbumSource` (FR-5).
- [x] Add `year: number | null` to `EffectiveAlbumMetadata` (FR-7).
- [x] Run `npm run lint -- src/lib/albums/metadata-fix-types.ts`. Fix issues.
      Re-run until clean.

> Note: after 2.3 the tree will not type-check until 3.1 lands, because
> `ParsedAlbumSource.year` is required. Complete Phase 3 before running
> `npm run build`.

## Phase 3 — Producers and planner

### 3.1 Populate `year` when parsing sources

- [x] Add `year: metadata.common.year ?? null` to the returned literal in
      `parseAlbumSources` (`src/lib/albums/metadata-fix-sources.ts`, FR-5).
- [x] Run `npm run lint -- src/lib/albums/metadata-fix-sources.ts`. Fix issues.
      Re-run until clean.

### 3.2 Extract strategy helpers (NFR-5 prerequisite)

- [x] Create `src/lib/albums/metadata-fix-strategies.ts` and move
      `getAlbumArtists`, `getArtists`, and `getProducers` (currently
      `metadata-fix-planner.ts` lines ~185–203) into it, exporting all three.
- [x] Update `metadata-fix-planner.ts` to import them.
- [x] Confirm both files are now under 200 lines (NFR-5) — the planner is
      **already at 203** before this spec's additions, so this extraction is
      mandatory, not optional.
- [x] Run `npm run lint -- src/lib/albums/metadata-fix-strategies.ts`. Fix
      issues. Re-run until clean.
- [x] Run `npm run lint -- src/lib/albums/metadata-fix-planner.ts`. Fix issues.
      Re-run until clean.

### 3.3 Thread `year` through the planner

- [x] In `planSource`, read `record?.year` and add the conditional tag-fix
      spread (`design.md` §4.2).
- [x] Add the row spread emitting `newYear` **and** `year: source.year` as a
      pair (FR-6). Emit unconditionally when the record supplies `year`, per
      `design.md` §10 decision 2.
- [x] Add `year: tagFix.year ?? source.year` to `projectMetadata` (FR-7).
- [x] Verify no `year` key appears in the row or tag fix when the record omits
      it (FR-11).
- [x] Run `npm run lint -- src/lib/albums/metadata-fix-planner.ts`. Fix issues.
      Re-run until clean.

### 3.4 Preserve `year` across the concatenate path

- [x] Apply the finding from task 1.2: if synthesized sources enumerate fields,
      add `year: source.year` in `src/lib/albums/concatenate-album-sources.ts`
      (FR-8). If they spread, make no edit and record that here.
- [x] Confirm `assertNoDiscFieldsInRecords` in
      `src/lib/albums/concatenate-set-metadata.ts` is **not** modified — `year`
      MUST remain permitted under `discStrategy: concatenate` (FR-8,
      `design.md` §2).
- [x] If edited, run `npm run lint -- src/lib/albums/concatenate-album-sources.ts`.
      Fix issues. Re-run until clean.

### 3.5 Fix `ParsedAlbumSource` construction sites

- [x] Using the audit from task 1.2, add `year: null` to every hand-built
      `ParsedAlbumSource` literal in `src/` and `__tests__/`.
- [x] Run `npm run build` — must exit 0. This is the first point the tree
      type-checks after Phase 2.

## Phase 4 — Execution surfaces

### 4.1 REST + MCP (shared Zod schema)

- [x] Add `year: z.number().int().min(1000).max(9999).optional()` to
      `albumSetMetadataRecordSchema` in `src/web/schemas/album-set-metadata.ts`,
      keeping keys alphabetically ordered (FR-1, FR-2).
- [x] Confirm `src/web/schemas/mcp/manage-albums.ts` and
      `src/web/schemas/request-schemas.ts` need **no** edit — both import the
      shared schema (NFR-9, `design.md` §2).
- [x] Run `npm run lint -- src/web/schemas/album-set-metadata.ts`. Fix issues.
      Re-run until clean.

### 4.2 GraphQL input, row, and SDL

- [x] Trace whether the album resolver routes `setMetadata` through
      `normalizeSetMetadataRecords`. If it does **not**, range validation
      (FR-2) must be enforced explicitly for this surface — record the finding
      and the chosen enforcement point here:

      > Finding: **routes through normalize.** `album.resolver.ts:100` forwards
      > `input.setMetadata` as `setMetadataRecords`, and
      > `src/lib/albums/organize-files.ts:30` calls
      > `normalizeSetMetadataRecords(inlineRecords)` on that path. REST and MCP
      > use the identical path. GraphQL `Int` supplies integrality, and
      > `yearValue`'s 1000–9999 range check applies to all three web surfaces.
      > **No explicit resolver-level check needed.**

- [x] Add `@Field(() => Int, { nullable: true }) public year?: number` to
      `AlbumSetMetadataRecordInput` in
      `src/web/modules/graphql/album.inputs.ts` (FR-9).
- [x] Add `year?: number` and `newYear?: number` fields to
      `AlbumMetadataChangesRow` in `src/web/modules/graphql/album.rows.ts` (FR-9).
- [x] Add `year: Int` to `input AlbumSetMetadataRecordInput` and
      `year: Int` + `newYear: Int` to `type AlbumMetadataChangesRow` in
      `src/web/modules/graphql/schema.gql` (FR-9).
- [x] Confirm `schema.gql` field ordering matches the generated SDL convention
      (alphabetical within each block).
- [x] Run `npm run lint -- src/web/modules/graphql/album.inputs.ts`, then
      `npm run lint -- src/web/modules/graphql/album.rows.ts`. Fix issues.
      Re-run until clean.

### 4.3 CLI option help text

- [x] Update the `--set-metadata` option description in
      `src/commands/manage-albums/organize-files.ts` to name the year field
      alongside the existing disc-fields wording (FR-10).
- [x] Run `npm run lint -- src/commands/manage-albums/organize-files.ts`. Fix
      issues. Re-run until clean.

## Phase 5 — Tests

### 5.1 CLI manifest parsing

- [x] Extend `__tests__/commands/manage-albums/helpers/set-metadata.test.ts`:
      JSON numeric year, JSON numeric-string year, CSV `year` column, empty CSV
      cell treated as absent (FR-2a).
- [x] Add rejection cases for `0`, `999`, `10000`, `1986.5`, `"nineteen"`,
      asserting the message names the record (FR-2, acceptance criterion 3).
- [x] Run `npm run lint -- __tests__/commands/manage-albums/helpers/set-metadata.test.ts`.

### 5.2 Planner and tag write

- [x] Extend `__tests__/lib/albums/organize-files-set-metadata-input.test.ts`
      with the `year`/`newYear` row-pair case from `design.md` §6.2.
- [x] Extend `__tests__/lib/albums/organize-files-metadata.test.ts` to assert
      `year` reaches `writeAudioTagFix` on the execute path, covering **both**
      `.flac` and `.mp3` (risk table).
- [x] Add an explicit parity case: a record set omitting `year` produces a row
      with no `year` and no `newYear` key (FR-11, NFR-8).
- [x] Run `npm run lint -- <each modified test file>`.

### 5.3 Concatenate compatibility

- [x] Extend `__tests__/lib/albums/concatenate-set-metadata.test.ts` to assert
      `year` is accepted under `discStrategy: concatenate` and is **not**
      rejected by `assertNoDiscFieldsInRecords` (FR-8, acceptance criterion 5).
- [x] Run `npm run lint -- __tests__/lib/albums/concatenate-set-metadata.test.ts`.

### 5.4 Web surfaces

- [x] Extend `__tests__/web/manage-albums-controller.test.ts` — REST accepts a
      valid year, rejects out-of-range.
- [x] Extend `__tests__/web/graphql/album.resolver.test.ts` — `year` in,
      `newYear` out.
- [x] Extend `__tests__/web/mcp.manage-albums-operations.test.ts` — MCP inherits
      the field from the shared Zod schema (NFR-9).
- [x] Assert all three surfaces produce the same `tagChanges` payload for the
      same record (acceptance criterion 2).
- [x] Run `npm run lint -- <each modified test file>`.

## Phase 6 — Verification

### 6.1 Full lint + typecheck + test

- [x] `npm run lint` — whole-codebase last-call lint after all TypeScript
      modifications are complete; exit 0.
- [x] `npm run build` — exit 0 (NFR-2).
- [x] `npm test` — exit 0; baseline pass count from task 1.1 plus the new cases
      (NFR-3).

### 6.2 Scope verification

- [x] `git --no-pager diff --stat src/commands/manage-audiobooks src/lib/audiobooks
      src/web/servers/mcp-tools/manage-audiobooks` — output MUST be empty (NFR-7).
- [x] `git --no-pager diff --stat` — output MUST list only the files in
      `design.md` §2, plus `metadata-fix-strategies.ts` (new, task 3.2), the
      test files from Phase 5, and the docs from Phase 7.

### 6.3 File-size check

- [x] Confirm no modified or created file exceeds 200 lines (NFR-5), with
      particular attention to `metadata-fix-planner.ts` and
      `set-metadata-records.ts`.

### 6.4 Behaviour smoke check (manual)

- [x] Build, then run `manage-albums organize-files` against a scratch source
      dir with a JSON manifest setting `year`, **without** `--execute`, and
      confirm the `--format json` row carries `year` and `newYear`.
- [x] Repeat with `--execute` against a disposable copy and confirm the written
      file's year via `manage-albums summarize-source-dir` (acceptance
      criterion 1).

## Phase 7 — Documentation

### 7.1 Record contract

- [x] Update the "Record contract" section of
      `docs/organize-files-set-metadata.md` to list `year` — optional, integer
      1000–9999, set-only, no clear semantic (FR-12, FR-3).
- [x] Add `year` to the REST, GraphQL, and MCP examples in that file.

### 7.2 Surface docs

- [x] Update `docs/album-organization.md` with the new field.
- [x] Update `docs/graphql.md` — `AlbumSetMetadataRecordInput.year` and
      `AlbumMetadataChangesRow.newYear`.
- [x] Update `docs/mcp-server.md` — `manage_albums_organize_files` setMetadata
      field list.

### 7.3 Note the prior gap

- [x] In `docs/organize-files-set-metadata.md`, state explicitly that before
      this change an unrecognized `year` key was silently accepted and
      discarded, so operators know why older manifests appeared to succeed
      without effect.

---

## Execution notes (2026-08-06)

> **NFR-1 command form does not do what the spec assumed.** The `lint` script is
> `eslint ./src ./__tests__`, so `npm run lint -- <file>` **appends** the path and
> lints the whole codebase *plus* that file rather than only that file. The
> substance of NFR-1 was met (each modified file was linted and issues fixed
> before moving on) but the "only the modified file" wording is unachievable with
> this script. To make the intent literal, either add a
> `"lint:file": "eslint"` script or use `./node_modules/.bin/eslint <file>`,
> which NFR-4 already permits.

> **Two tests went to new files instead of extending existing ones**, to satisfy
> NFR-5 (≤200 lines):
> - `__tests__/commands/manage-albums/helpers/set-metadata-year.test.ts` — the
>   target `set-metadata.test.ts` was already 241 lines.
> - `__tests__/web/album-set-metadata-year.test.ts` — covers REST + GraphQL + MCP
>   parity in one file; `mcp.manage-albums-operations.test.ts` was already 239
>   lines and `manage-albums-controller.test.ts` was at 195.

> **Task 5.2's assertion about `sourceDir`** was wrong on first write: a single
> `albumDir` is not joined into `organizeAlbumFiles`'s `sourceDir`. The assertion
> was dropped (path mapping is already covered by the existing controller and
> resolver suites); the cross-surface test asserts record parity instead.

> **Task 6.4 smoke check was run through the built CLI on a throwaway copy**,
> not the live MCP server: the running MCP process still holds pre-change code
> and silently dropped `year` exactly as the old build did. **The MCP server
> needs a restart to expose the new field.** The CLI run confirmed end-to-end
> behavior — `tagChanges` reported `"year": 2009, "newYear": 1986`, and reading
> the written FLAC back gave `year: 1986`.

> **Final state:** lint / `npm run build` / `npm test` all exit 0.
> Tests went from **62 files / 353 tests** to **64 files / 377 tests** (+24).
> Largest touched file is 194 lines (`album.rows.ts`); the planner dropped from
> 203 → 189 via the mandated extraction.
