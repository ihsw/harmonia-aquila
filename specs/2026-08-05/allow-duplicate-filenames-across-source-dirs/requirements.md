# Requirements: Allow Duplicate Filenames Across sourceDirs

## 1. Background

The 2026-08-04 spec `allow-set-metadata-with-source-dirs` unblocked
`setMetadata` under `--disc-strategy concatenate`, and its FR-4 added
`assertUniqueFilenamesAcrossSources` (`src/lib/albums/concatenate-set-metadata.ts`):
when records are supplied, every bare filename must be unique across the
combined file lists of all `sourceDirs`, otherwise the run is rejected with
`--set-metadata requires unique filenames across sourceDirs: ...`. That spec
listed the alternative in its own **Out of scope** section:

> Adding a `sourceIndex`/`sourceDirectory` discriminator field to
> `SetMetadataRecord` so intentionally-duplicate bare filenames across
> different source directories could receive different records. The first
> version requires globally-unique bare filenames across the whole
> concatenate operation, matching the existing single-source contract where
> filename is already the unique record key.

Two things have changed since:

1. The 2026-08-04 spec `embed-disc-number-in-track-filenames` put the disc
   number into the destination filename (`101 - Title.flac`,
   `201 - Title.flac`). Duplicate *source* filenames across discs no longer
   imply a *destination* collision — `assertUniqueOrganizationDestinations`
   is satisfied by the disc prefix alone, for any valid disc set.
2. A real blocked album has been identified. `etc/albums/1-source-files/…/
   Iced Earth - 2001 - Dark Genesis [EAC-FLAC]` is a 5-disc, 42-track box
   set whose FLACs carry **zero embedded tags** (`manage-albums validate`
   reports `missing album, missing artist, missing track number, missing
   title` for all 42 files). Concatenation therefore requires `setMetadata`
   to supply track numbers — but `04 - curse the sky.flac` exists in both
   `01 - enter the realm/` and `02 - iced earth/`, so
   `assertUniqueFilenamesAcrossSources` rejects the run. The two
   requirements are mutually unsatisfiable and the album cannot be organized
   without renaming source files on disk.

**The uniqueness check is not purely a destination-collision guard, and
removing it alone is not correct.** It also protects *record identity*:
`reconcileSetMetadata` (`set-metadata-records.ts`) builds
`Map<filename, SetMetadataRecord>`, and `planMetadataFixes`,
`getDiscChanges`, and `normalizeSourceTracks` all look records up by
`source.filename`. With the check deleted and nothing else changed, two
files sharing a bare filename would both resolve to the *same* record:
`reconcileSetMetadata`'s coverage check would still pass (neither filename
is "missing"), and disc 2's file would silently inherit disc 1's `title`,
`artist`, `album`, and `trackNumber` with no error. This spec must replace
the record key, not merely drop the guard.

Note also that the uniqueness check only ever runs when records are
supplied (`reconcileConcatenateSetMetadata` is called from
`concatenate-album-sources.ts` only when `records !== undefined`).
Concatenating directories with duplicate filenames and **no** `setMetadata`
already works today and is unaffected by this spec, though it is currently
untested.

## 2. Goal

Delete `assertUniqueFilenamesAcrossSources` and make duplicate bare
filenames across `sourceDirs` a supported, unambiguous input by (a) keying
reconciled records on each file's absolute `sourcePath` instead of its bare
`filename`, and (b) adding an optional `sourceIndex` field to
`SetMetadataRecord` — the 1-based position of the target directory in the
`sourceDirs` array — which is **required only for filenames that actually
appear in more than one source directory**. Metadata files for
unambiguous sources keep working byte-for-byte unchanged.

## 3. Scope

### In scope

- Removing `assertUniqueFilenamesAcrossSources` and its error message from
  `src/lib/albums/concatenate-set-metadata.ts`.
- A new optional `sourceIndex` field on `SetMetadataRecord`, parsed and
  validated alongside the existing fields in
  `src/commands/manage-albums/helpers/set-metadata-records.ts`.
- Re-keying the reconciled record map from bare `filename` to absolute
  `sourcePath` across `set-metadata-records.ts`,
  `concatenate-set-metadata.ts`, `concatenate-album-sources.ts`,
  `metadata-fix-planner.ts`, and `organize-files.ts`.
- Relaxing `normalizeSetMetadataRecords`'s parse-time duplicate detection
  from `filename` to the `(filename, sourceIndex)` pair, while preserving
  today's exact behavior for records that carry no `sourceIndex`.
- Rejecting `sourceIndex` in single-`sourceDir` mode, mirroring how
  `discNumber`/`discTotal` are already rejected in concatenate mode.
- Adapter schema changes for the new field: `src/web/schemas/album-set-metadata.ts`
  (zod, which the MCP schema derives from), `src/web/modules/graphql/album.inputs.ts`,
  and the generated `src/web/modules/graphql/schema.gql`.
- Focused unit, planning, and execution tests, plus CLI/REST/GraphQL/MCP
  contract coverage for the new field.
- Regression coverage for concatenating duplicate filenames **without**
  `setMetadata`, which works today but is untested.
- Documentation updates in `docs/album-organization.md`,
  `docs/organize-files-set-metadata.md`, `docs/graphql.md`, and
  `docs/mcp-server.md`.

### Out of scope

- Changing how disc identity is derived. `discNumber`/`discTotal` continue
  to come solely from `sourceDirs` order via the unchanged
  `ConcatenateDiscContext`/`applyConcatenateDiscMetadata` path, and records
  MUST still be rejected for carrying `discNumber` or `discTotal` under
  concatenate (`assertNoDiscFieldsInRecords` is unchanged). `sourceIndex` is
  a record *selector*, never a source of disc metadata.
- Album-art collision behavior. Art destinations carry no disc prefix, so
  identically-named art across directories (`Front.jpg` in each disc folder)
  still collides and still requires `--album-art-strategy`. Unchanged.
- A `sourceDirectory` (path-valued) discriminator as an alternative or
  addition to `sourceIndex`. See §7.
- Aligning `discNumber`/`discTotal`'s CSV empty-cell handling with the new
  `sourceIndex` rule (FR-4). Today an empty CSV cell under a `discNumber`
  header throws `invalid discNumber`; that pre-existing behavior stays as-is
  to avoid widening this spec.
- Changing the existing `--limit`, `--reset-track`, and
  `--ignore-audio-files-without-tracks` conflicts with concatenate.
- Executing any real organize run, or reorganizing/renaming anything under
  `etc/albums/**`.
- Changing dependency versions or `package.json`/lockfiles.

## 4. Functional Requirements

- **FR-1** `assertUniqueFilenamesAcrossSources` MUST be deleted from
  `src/lib/albums/concatenate-set-metadata.ts`, along with its export, its
  call site in `reconcileConcatenateSetMetadata`, and its unit tests.
  Duplicate bare filenames across `sourceDirs` MUST NOT, on their own, fail
  a run.
- **FR-2** `SetMetadataRecord` MUST gain an optional `sourceIndex?: number`
  field: a positive integer, 1-based, identifying which `sourceDirs` entry
  the record targets. `sourceIndex: 1` selects the first `--source-dirs`
  argument, matching the numbering already used in the disc assignment and
  in `assertUniqueSourceDirs`'s error text.
- **FR-3** `buildRecord` MUST validate `sourceIndex` with the existing
  `positiveInteger` helper and the existing `Metadata record at index N ...`
  message shape. Range validation against `sourceDirs.length` happens during
  reconciliation (FR-8), not at parse time, since the parser has no access
  to the directory list.
- **FR-4** A `sourceIndex` CSV cell that is the empty string MUST be treated
  as absent rather than as an invalid integer, so a single CSV can carry a
  `sourceIndex` column populated only for the ambiguous rows.
- **FR-5** `normalizeSetMetadataRecords`'s duplicate-record check MUST key
  on the `(filename, sourceIndex)` pair instead of `filename` alone. Two
  records sharing a filename with distinct `sourceIndex` values MUST parse;
  two records sharing a filename where either lacks `sourceIndex`, or both
  carry the same `sourceIndex`, MUST still be rejected with the existing
  `duplicate record for filename "..."` message.
- **FR-6** The reconciled record map returned by every reconciliation entry
  point MUST be keyed by the file's absolute `sourcePath`
  (`resolve(sourceDirectory, filename)`) rather than its bare `filename`.
  All consumers MUST be updated to look up by `source.sourcePath`:
  `planMetadataFixes` and `getDiscChanges`/`planSource`'s internal
  `discsByFilename` map (`metadata-fix-planner.ts`), and
  `getLocalTrackNumber`/`normalizeSourceTracks`
  (`concatenate-album-sources.ts`).
- **FR-7** Single-`sourceDir` mode MUST reject any record carrying
  `sourceIndex`, before any write, with an actionable `UserInputError`
  naming every offending filename and stating that `sourceIndex` requires
  `sourceDirs` with `--disc-strategy concatenate`.
- **FR-8** Concatenate reconciliation MUST reject, before any write, a
  record whose `sourceIndex` is outside `1..sourceDirs.length`, naming the
  filename, the supplied value, and the valid range.
- **FR-9** Concatenate reconciliation MUST resolve each record to exactly
  one source file:
  - a record with `sourceIndex` matches only the file with that filename in
    that directory position;
  - a record without `sourceIndex` matches the single file with that
    filename when the filename occurs in exactly one directory;
  - a record without `sourceIndex` whose filename occurs in two or more
    directories MUST be rejected with an actionable `UserInputError` naming
    the filename and every containing directory with its 1-based index, and
    stating that `sourceIndex` is required to disambiguate;
  - a record with `sourceIndex` naming a directory that does not contain
    that filename MUST be rejected, naming the filename, the requested
    index, and the directories that do contain it.
- **FR-10** Coverage checks MUST continue to run against the union of every
  directory's files, preserving the existing `reconcileSetMetadata` error
  message shapes (`Source audio files are missing metadata records`,
  `Metadata records reference files that are not present in the source
  directory`). When an unmatched or missing file's bare filename is
  ambiguous, its message MUST additionally identify the directory so the
  operator can tell the two apart.
- **FR-11** Two records MUST NOT resolve to the same source file; if they
  do, reconciliation MUST reject before any write, naming the file.
- **FR-12** `assertNoDiscFieldsInRecords` MUST remain unchanged and MUST
  continue to reject `discNumber`/`discTotal` on records under concatenate.
  `sourceIndex` MUST NOT influence the written `discNumber`/`discTotal`
  tags, which continue to come solely from directory order.
- **FR-13** REST, GraphQL, and MCP adapters MUST accept the optional
  `sourceIndex` field on inline `setMetadata` records:
  `albumSetMetadataRecordSchema` gains `sourceIndex: z.number().int().positive().optional()`
  (the MCP tool schema derives from it automatically),
  `AlbumSetMetadataRecordInput` gains a nullable `Int` field, and
  `schema.gql` is regenerated to match.
- **FR-14** Concatenating `sourceDirs` with duplicate bare filenames and
  **no** `setMetadata` MUST succeed, producing disc-prefixed destinations
  (this is current behavior; the spec adds the missing regression test).
- **FR-15** Existing single-`sourceDir` `setMetadata` behavior, existing
  concatenate behavior with globally-unique filenames, and metadata files
  containing no `sourceIndex` field MUST remain unchanged.

## 5. Non-Functional Requirements

- **NFR-1 — Lint after every source code file modification.** After every
  modification of a source code file, `npm run lint -- <modified-file>` MUST
  be run so only that file is linted, and issues MUST be fixed before
  continuing; whole-codebase `npm run lint` MUST be reserved for the final
  verification phase after all TypeScript modifications are complete.
- **NFR-2 — Build.** `npm run build` MUST exit 0 after implementation.
- **NFR-3 — Tests.** `npm test` MUST exit 0 after implementation.
- **NFR-4 — No `npx`.** `npx` is forbidden in all forms; commands MUST use
  repository scripts or `./node_modules/.bin/<tool>`.
- **NFR-5 — File size.** New or modified source files SHOULD remain at or
  below 200 lines. Pre-change counts: `concatenate-set-metadata.ts` 49,
  `concatenate-album-sources.ts` 153, `set-metadata-records.ts` 133,
  `album-set-metadata.ts` 37, `album.inputs.ts` 122.
  `src/lib/albums/organize-files.ts` (204) and
  `src/lib/albums/metadata-fix-planner.ts` (204) are already over the limit
  from prior work; this spec's net change to either file MUST NOT increase
  its line count. New reconciliation logic MUST live in
  `concatenate-set-metadata.ts` or a new focused module rather than growing
  either of those two files.
- **NFR-6 — Type safety.** Implementation MUST use strict TypeScript without
  `any` or TypeScript suppression comments.
- **NFR-7 — No dependencies.** `package.json` and lockfiles MUST remain
  unchanged.
- **NFR-8 — Determinism.** The same ordered inputs, records, and filesystem
  state MUST produce the same rows, errors, and destinations across runs;
  error messages listing multiple filenames or directories MUST use a
  stable order.
- **NFR-9 — Source safety.** Dry runs MUST perform no writes; all
  reconciliation, range, ambiguity, and coverage validation MUST complete
  before the first write in execute mode.

## 6. Acceptance Criteria

1. A two-directory concatenate fixture where both directories contain
   `04 - track.flac`, with records disambiguated by `sourceIndex: 1` and
   `sourceIndex: 2`, dry-runs successfully and executes, producing
   `Artist/Album/104 - ....flac` and `Artist/Album/204 - ....flac` with each
   file receiving *its own* record's `title` and `trackNumber` (proving the
   silent-misapplication failure described in §1 does not occur).
2. The same fixture with both `sourceIndex` fields omitted fails before any
   write with an error naming `04 - track.flac`, both directories with their
   1-based indices, and the instruction to supply `sourceIndex`.
3. A record with `sourceIndex: 3` against two `sourceDirs` fails before any
   write, naming the filename, the value `3`, and the valid range `1..2`.
4. A record with `sourceIndex: 2` whose filename exists only in directory 1
   fails before any write, naming the filename, the requested index, and the
   directory that does contain it.
5. Two records resolving to the same file (same filename, same
   `sourceIndex`) are rejected at parse time by the existing
   `duplicate record for filename` message.
6. A metadata file containing no `sourceIndex` fields against `sourceDirs`
   with globally-unique filenames produces byte-for-byte identical output to
   before this spec.
7. `sourceIndex` on any record in single-`sourceDir` mode fails before any
   write with an actionable error naming the offending filename(s).
8. Two `sourceDirs` sharing a bare filename with **no** `setMetadata`
   succeed, producing disc-prefixed destinations (FR-14).
9. A CSV with a `sourceIndex` column left empty on unambiguous rows parses,
   treating the empty cells as absent (FR-4).
10. The Dark Genesis shape is organizable end-to-end in a dry run: five
    `sourceDirs` (6/8/9/8/11 tagless FLACs), 42 records, `sourceIndex: 1`
    and `sourceIndex: 2` on the two `04 - curse the sky.flac` records only,
    yielding 42 rows from `101 - Enter the Realm.flac` to
    `511 - Hallowed Be Thy Name.flac`. This MAY be asserted with a
    synthetic temporary fixture of the same shape rather than the real
    collection; no test may read or write `etc/albums/**`.
11. REST, GraphQL, and MCP contract tests accept `sourceIndex` on inline
    records, and `schema.gql` contains `sourceIndex: Int` on
    `AlbumSetMetadataRecordInput`.
12. `grep -rn "assertUniqueFilenamesAcrossSources\|unique filenames across sourceDirs" src __tests__ docs`
    returns nothing.
13. Per-edit lint, final `npm run lint`, `npm run build`, and `npm test`
    exit 0, and `package.json`/lockfile diffs are empty.

## 7. Open decisions

**Discriminator field name and shape.** This spec commits to a 1-based
integer `sourceIndex`. The alternatives considered and rejected:

- **`discNumber` as the selector.** Reuses an existing field and reads
  naturally for a box set, but overloads a field that means "disc tag
  value" everywhere else and would require weakening
  `assertNoDiscFieldsInRecords` (prior spec FR-3). Rejected to keep disc
  identity strictly derived from directory order.
- **`sourceDirectory` (path-valued).** Self-describing in a metadata file,
  but forces callers to reproduce the exact resolved path, and REST/GraphQL/
  MCP callers pass directories relative to a configured root while the CLI
  passes absolute paths — matching semantics would differ per adapter.
  Rejected as ambiguous.

`sourceIndex` matches the name the prior spec's out-of-scope note
anticipated and the 1-based numbering already surfaced to users in
`assertUniqueSourceDirs`'s error text. Flag before implementation if a
different name is wanted; everything else in this spec is independent of
the choice.
