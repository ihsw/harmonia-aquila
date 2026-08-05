# Tasks: Allow Duplicate Filenames Across sourceDirs

> ## Hard constraints (re-read before starting)
>
> - **DO NOT START** any task until the user explicitly directs execution;
>   this spec is a plan, not a work order.
> - **Confirm the `sourceIndex` naming decision** (requirements §7) before
>   Phase 2. It is the only open decision; everything downstream assumes it.
> - **No `npx`** in any form. Use repository `npm run` scripts or
>   `./node_modules/.bin/<tool>` exclusively (NFR-4).
> - Make no edits outside the files listed in design §2 "Modified files". In
>   particular `disc-metadata.ts`, `organization-plan.ts`,
>   `organization-planner.ts`, `organize-files-execution.ts`,
>   `album-art-planner.ts`, `validate.ts`, the CLI command file, controllers,
>   and MCP tool files should need **no** changes — if one does, STOP and
>   confirm scope before editing.
> - Do not modify `etc/albums/**`, `package.json`, or lockfiles. No test may
>   read or write `etc/albums/**`; use temporary fixtures.
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
- [ ] Run `npm test`, recording pass/fail counts without running
      whole-codebase lint.
- [ ] Confirm dependency manifests are unchanged before implementation.
- [ ] Record current line counts of `set-metadata-records.ts` (133),
      `concatenate-set-metadata.ts` (49), `concatenate-album-sources.ts`
      (153), `metadata-fix-planner.ts` (204), `organize-files.ts` (204),
      `album-set-metadata.ts` (37), `album.inputs.ts` (122) as the NFR-5
      budget check.
- [ ] Run `grep -rn "assertUniqueFilenamesAcrossSources\|unique filenames across sourceDirs\|recordsByFilename\|discsByFilename" src __tests__ docs`
      and record every hit as the inventory to reconcile against in Phase 8.

### 1.2 Confirm the open decision

- [ ] Confirm with the user that the discriminator is named `sourceIndex`
      and is a 1-based positive integer (requirements §7). Do not proceed
      to Phase 2 without this.

## Phase 2 — Record contract

### 2.1 Extend `set-metadata-records.ts`

- [ ] Add `sourceIndex?: number` to `SetMetadataRecord` (FR-2).
- [ ] Parse `sourceIndex` in `buildRecord` via the existing
      `positiveInteger` helper, treating an empty-string value as absent
      (design §3.1, FR-3, FR-4).
- [ ] Re-key `normalizeSetMetadataRecords`'s duplicate detection to the
      `(filename, sourceIndex)` pair, keeping the existing
      `duplicate record for filename "..."` message verbatim (design §3.1,
      FR-5).
- [ ] Add exported `assertNoSourceIndexInRecords`, mirroring
      `assertNoDiscFieldsInRecords`'s shape and naming every offending
      filename (FR-7).
- [ ] Change `reconcileSetMetadata` to
      `(records, sourceDirectory, sourceFilenames)`, call
      `assertNoSourceIndexInRecords` first, keep both existing coverage
      messages verbatim, and return a map keyed by
      `resolve(sourceDirectory, filename)` (design §3.1, FR-6, FR-10).
      Add `resolve` to the `node:path` import.
- [ ] After the edit, run
      `npm run lint -- src/commands/manage-albums/helpers/set-metadata-records.ts`.
      Fix issues.

### 2.2 Update the record-contract tests first

- [ ] Update `__tests__/commands/manage-albums/helpers/set-metadata.test.ts`'s
      two `reconcileSetMetadata` calls to the 3-argument form and assert the
      returned map is keyed by resolved absolute path (design §5).
- [ ] Add the new cases from design §5: `sourceIndex` rejected by
      `assertNoSourceIndexInRecords`; duplicate `(filename, sourceIndex)`
      rejected; same filename with distinct `sourceIndex` accepted; empty
      string treated as absent; `0`/`-1`/non-numeric rejected with the
      `positiveInteger` message.
- [ ] After the edit, run
      `npm run lint -- __tests__/commands/manage-albums/helpers/set-metadata.test.ts`.
      Fix issues.
- [ ] Run `./node_modules/.bin/vitest run __tests__/commands/manage-albums/helpers/set-metadata.test.ts`
      and get it green before touching any caller.

## Phase 3 — Concatenate reconciliation

### 3.1 Rewrite `concatenate-set-metadata.ts`

- [ ] Delete `assertUniqueFilenamesAcrossSources`, its export, and its call
      site (FR-1). Leave `assertNoDiscFieldsInRecords` untouched (FR-12).
- [ ] Implement the `ConcatenateTarget` builder and `groupByFilename`
      (design §3.2), converting the 0-based `entry.sourceIndex` to the
      1-based user-facing number.
- [ ] Implement `assertSourceIndexRange` (FR-8), collecting every offender
      before throwing.
- [ ] Implement `selectTarget` covering all four arms in design §3.2 step 3:
      no candidates (existing "not present" message), `sourceIndex` with no
      candidate at that index, ambiguous without `sourceIndex`, and the
      single unambiguous match (FR-9, FR-10).
- [ ] Implement `assertNoDuplicateTargets` (FR-11) and `assertFullCoverage`
      (FR-10), the latter qualifying ambiguous filenames with their
      directory.
- [ ] Return `Map<sourcePath, SetMetadataRecord>` (FR-6).
- [ ] Confirm the file is at or below 200 lines (NFR-5).
- [ ] After the edit, run
      `npm run lint -- src/lib/albums/concatenate-set-metadata.ts`. Fix issues.

### 3.2 Rewrite `concatenate-set-metadata.test.ts`

- [ ] Delete the `assertUniqueFilenamesAcrossSources` describe block and its
      import; keep the `assertNoDiscFieldsInRecords` block unchanged.
- [ ] Add a `reconcileConcatenateSetMetadata` block covering each validation
      class from design §3.2 in order, plus the happy path proving two
      same-named files map to **different** records (design §5).
- [ ] After the edit, run
      `npm run lint -- __tests__/lib/albums/concatenate-set-metadata.test.ts`.
      Fix issues.
- [ ] Run `./node_modules/.bin/vitest run __tests__/lib/albums/concatenate-set-metadata.test.ts`
      and get it green.

## Phase 4 — Re-key the consumers

### 4.1 `concatenate-album-sources.ts`

- [ ] Rename `ConcatenateAlbumSources.recordsByFilename` →
      `recordsBySourcePath` and the `normalizeSourceTracks` parameter to
      match; switch all three `getLocalTrackNumber` lookups to
      `source.sourcePath` (design §3.3, FR-6). Leave `getLocalTrackNumber`'s
      tag-wins-over-record precedence unchanged.
- [ ] After the edit, run
      `npm run lint -- src/lib/albums/concatenate-album-sources.ts`. Fix issues.

### 4.2 `metadata-fix-planner.ts`

- [ ] Switch `getDiscChanges`'s lookup and emitted key, rename
      `discsByFilename` → `discsBySourcePath`, and switch `planMetadataFixes`
      and `planSource`'s lookups to `source.sourcePath` (design §3.4, FR-6).
- [ ] Confirm the file's line count did not increase past 204 (NFR-5).
- [ ] After the edit, run
      `npm run lint -- src/lib/albums/metadata-fix-planner.ts`. Fix issues.

### 4.3 `organize-files.ts`

- [ ] Rename `organizeSingleAlbum`'s `recordsByFilename` parameter and the
      `concatenated.recordsByFilename` read to the path-keyed names.
- [ ] Destructure `targetDirectory` from the existing `getAudioFiles` call
      in `organizeAlbumFiles` and pass it to `reconcileSetMetadata`
      (design §3.5).
- [ ] Confirm the file's line count did not increase past 204 (NFR-5).
- [ ] After the edit, run `npm run lint -- src/lib/albums/organize-files.ts`.
      Fix issues.

## Phase 5 — Adapter schemas

### 5.1 Zod and GraphQL

- [ ] Add `sourceIndex: z.number().int().positive().optional()` to
      `albumSetMetadataRecordSchema` (design §3.6, FR-13). Add no
      `superRefine` rule — range validation belongs to the core.
- [ ] After the edit, run `npm run lint -- src/web/schemas/album-set-metadata.ts`.
      Fix issues.
- [ ] Add the nullable `Int` `sourceIndex` field to
      `AlbumSetMetadataRecordInput` (`src/web/modules/graphql/album.inputs.ts`).
- [ ] After the edit, run `npm run lint -- src/web/modules/graphql/album.inputs.ts`.
      Fix issues.
- [ ] Regenerate `src/web/modules/graphql/schema.gql` via the build rather
      than hand-editing; confirm `sourceIndex: Int` appears on
      `AlbumSetMetadataRecordInput`.
- [ ] Confirm the MCP tool schema picks the field up automatically from the
      zod schema — no edit to `src/web/schemas/mcp/manage-albums.ts` should
      be needed.

## Phase 6 — Behavior tests

### 6.1 Rewrite the two rejection fixtures

- [ ] `__tests__/lib/albums/organize-files-concatenate.test.ts`: replace the
      `'unique filenames across sourceDirs'` rejection with the ambiguity
      case (records without `sourceIndex` → FR-9 error) plus a dry-run
      success case (records with `sourceIndex: 1`/`2` → two distinct rows)
      (design §4, AC-1, AC-2).
- [ ] `__tests__/lib/albums/organize-files-concatenate-execution.test.ts`:
      same pair, and assert each **written** file carries its own record's
      `title` and `trackNumber` — not merely that two files exist
      (design §4, AC-1).
- [ ] Add the FR-14 regression: duplicate filenames across two `sourceDirs`
      with **no** `setMetadata` executes successfully to `1NN`/`2NN`
      destinations (AC-8).
- [ ] After each edit, run `npm run lint -- <file>`. Fix issues.

### 6.2 Remaining core and CLI coverage

- [ ] `__tests__/lib/albums/organize-files-set-metadata-input.test.ts`:
      `sourceIndex` round-trips through inline-record normalization.
- [ ] `__tests__/commands/manage-albums/organize-files-set-metadata.test.ts`:
      CLI `--set-metadata` JSON and CSV fixtures carrying `sourceIndex`,
      including a CSV whose `sourceIndex` column is blank on unambiguous
      rows (AC-9).
- [ ] Add the single-`sourceDir` rejection case: `sourceIndex` on any record
      fails before any write (AC-7).
- [ ] After each edit, run `npm run lint -- <file>`. Fix issues.

### 6.3 Adapter contract coverage

- [ ] `__tests__/web/manage-albums-controller.test.ts`,
      `__tests__/web/graphql/album.resolver.test.ts`, and
      `__tests__/web/mcp.manage-albums-operations.test.ts`: inline records
      with `sourceIndex` are accepted; a malformed value is rejected by the
      schema; an out-of-range value surfaces the core's error (AC-11).
- [ ] After each edit, run `npm run lint -- <file>`. Fix issues.

### 6.4 Dark Genesis shape

- [ ] Add the AC-10 test to `organize-files-concatenate.test.ts`: five
      temporary directories holding 6/8/9/8/11 fully tagless files, 42
      records, `sourceIndex` present on only the two duplicated
      `04 - curse the sky.flac` records. Assert 42 rows, first
      `101 - Enter the Realm.flac`, last `511 - Hallowed Be Thy Name.flac`,
      and the duplicated pair landing at `104` and `204` with distinct
      titles.
- [ ] Confirm the test creates and cleans up its own temporary fixture and
      never touches `etc/albums/**`.
- [ ] After the edit, run `npm run lint -- <file>`. Fix issues.

## Phase 7 — Documentation

- [ ] `docs/organize-files-set-metadata.md`: add `sourceIndex` to the record
      contract table; replace the "`filename` **must be unique across every
      source directory combined**" bullet with the ambiguity rule; extend
      the worked example with a filename duplicated across two discs.
- [ ] `docs/album-organization.md`: replace the "Every bare filename **must
      be unique across all `--source-dirs` entries combined**" bullet with
      the new rule, keeping the surrounding disc-field and coverage bullets
      intact.
- [ ] `docs/graphql.md` (~line 103): add `sourceIndex` to the `setMetadata`
      record field list.
- [ ] `docs/mcp-server.md` (~line 83): note `sourceIndex` in the
      `manage_albums_organize_files.setMetadata` description.
- [ ] Confirm no doc still claims filenames must be globally unique across
      source directories.

## Phase 8 — Verification

- [ ] `npm run lint`
- [ ] `npm run build`
- [ ] `npm test`
- [ ] `grep -rn "assertUniqueFilenamesAcrossSources\|unique filenames across sourceDirs" src __tests__ docs`
      — must return nothing (AC-12).
- [ ] `grep -rn "recordsByFilename\|discsByFilename" src` — must return
      nothing.
- [ ] `grep -n "sourceIndex" src/web/modules/graphql/schema.gql` — must show
      the field on `AlbumSetMetadataRecordInput`.
- [ ] `wc -l src/lib/albums/organize-files.ts src/lib/albums/metadata-fix-planner.ts`
      — must be at or below 204 each; every other modified source file at or
      below 200 (NFR-5).
- [ ] `git --no-pager diff -- package.json package-lock.json` — must be empty.
- [ ] Reconcile the Phase 1.1 grep inventory: every recorded hit is either
      removed or intentionally renamed.
- [ ] Confirm all 13 acceptance criteria in requirements §6 are demonstrably
      covered by a test or a verification command.
