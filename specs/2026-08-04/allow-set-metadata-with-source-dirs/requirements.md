# Requirements: Allow setMetadata With sourceDirs

## 1. Background

`manage-albums organize-files` supports two source shapes: a single flat
`sourceDir` (optionally paired with `--set-metadata` to supply per-track
`artist`/`album`/`title`/`trackNumber`, keyed by bare filename), and an
ordered `sourceDirs` array requiring `--disc-strategy concatenate`, added by
the 2026-08-03 spec `add-concatenate-disc-strategy`. That spec explicitly
deferred `setMetadata` support for concatenation (its FR-9: "Concatenation
MUST reject ... `setMetadata` with actionable errors"), because concatenated
sources are ordered by embedded track-number tags
(`concatenate-album-sources.ts`'s `getLocalTrackNumber`), and reconciling
per-track records across multiple directories raised open questions this
spec now resolves.

This gap is blocking real operational work: the `iced-earth-organize-status.md`
audit (`etc/iced-earth-organize-status.md`) found three multi-disc albums
(Days of Purgatory, Alive in Athens, The Glorious Burden) whose FLAC files
carry **no embedded tags at all**. `getLocalTrackNumber` throws `"... must
have a positive integer track number for concatenation"` for every one of
their tracks, and the current guard
(`src/lib/albums/organize-files.ts`: `"--set-metadata is not supported with
sourceDirs"`) makes it impossible to supply the missing metadata explicitly.
Disc 1 of each album organizes fine as a single-`sourceDir` call with
`setMetadata`; only the multi-disc `concatenate` path is blocked.

## 2. Goal

`organizeAlbumFiles` MUST accept `setMetadata` together with `sourceDirs`
under `discStrategy: 'concatenate'`, applying each record's `artist`,
`album`, `title`, and `trackNumber` exactly as it already does for a single
`sourceDir`, while disc identity (`discNumber`/`discTotal`) continues to come
solely from `sourceDirs` array order — never from record content or embedded
tags — per the existing concatenate contract. A record's `trackNumber`
becomes the fallback used to order and validate tracks locally within its
own source directory when the embedded tag is absent, so fully tagless
multi-disc sources (like the Iced Earth fixtures above) become organizable
in one call.

## 3. Scope

### In scope

- Cross-directory `setMetadata` reconciliation: validating that every bare
  filename across the combined set of `sourceDirs` is unique and has exactly
  one matching record, and every record matches exactly one file.
- Rejecting `discNumber`/`discTotal` fields on any record when
  `discStrategy: 'concatenate'` is active, since disc identity is derived
  from directory order, not record content.
- Threading reconciled records into `concatenate-album-sources.ts`'s local
  track-number resolution (`getLocalTrackNumber`/`normalizeSourceTracks`) as
  a fallback when the embedded tag is missing or invalid.
- Threading reconciled records into `planMetadataFixes` for the concatenate
  path (`src/lib/albums/organize-files.ts`'s `organizeConcatenatedAlbum`),
  mirroring the existing single-`sourceDir` path.
- Removing the blanket `setMetadata`-with-`sourceDirs` rejections in
  `src/lib/albums/organize-files.ts` and
  `src/lib/albums/concatenate-album-sources.ts`.
- A new focused module under `src/lib/albums/` for the cross-directory
  reconciliation logic, if keeping it inline would push
  `concatenate-album-sources.ts` or `organize-files.ts` over the 200-line
  limit (NFR-5).
- Focused unit, planning, and execution tests under `__tests__/lib/albums/`.
- CLI, REST, GraphQL, and MCP regression coverage proving the combination now
  succeeds end-to-end through every adapter with **no schema changes**,
  since each adapter already accepts `setMetadata` and `sourceDirs`/
  `albumDirs` independently and only the core library currently rejects the
  combination.
- Documentation updates in `docs/album-organization.md` and
  `docs/organize-files-set-metadata.md`.

### Out of scope

- Adding a `sourceIndex`/`sourceDirectory` discriminator field to
  `SetMetadataRecord` so intentionally-duplicate bare filenames across
  different source directories could receive different records. The first
  version requires globally-unique bare filenames across the whole
  concatenate operation, matching the existing single-source contract where
  filename is already the unique record key.
- Changing the existing `--limit`, `--reset-track`, and
  `--ignore-audio-files-without-tracks` conflicts with `--disc-strategy
  concatenate`; these remain rejected exactly as today.
- Changing how destination track numbers are assigned within concatenated
  output, album-art collision handling, or any other concatenate behavior
  not directly tied to `setMetadata`.
- Reorganizing `etc/albums/**` or executing any real organize run as part of
  this specification.
- Changing dependency versions or `package.json`/lockfiles.

## 4. Functional Requirements

- **FR-1** `organizeAlbumFiles` MUST accept `setMetadata` (file path or
  inline records) together with `sourceDirs` when `discStrategy` resolves to
  `'concatenate'`, removing the current unconditional rejection in
  `src/lib/albums/organize-files.ts`.
- **FR-2** `concatenate-album-sources.ts`'s `assertConcatenateOptions` MUST
  stop listing `--set-metadata` as a conflicting option; `--limit`,
  `--reset-track`, and `--ignore-audio-files-without-tracks` MUST remain
  rejected.
- **FR-3** When records are supplied under `discStrategy: 'concatenate'`,
  the core MUST reject with an actionable `UserInputError`, before any
  destination write, if any record includes a `discNumber` or `discTotal`
  field, naming every offending filename.
- **FR-4** The core MUST validate that no bare filename repeats across the
  combined file lists of every `sourceDirs` entry when records are supplied,
  and MUST reject with an actionable `UserInputError` naming the filename
  and every contributing source directory before any destination write.
- **FR-5** The core MUST validate, across the union of files from every
  `sourceDirs` entry, that every file has exactly one matching record and
  every record matches exactly one file, reusing the existing
  `reconcileSetMetadata` error message shapes ("Source audio files are
  missing metadata records", "Metadata records reference files that are not
  present in the source directory") generalized to the multi-directory
  union.
- **FR-6** `getLocalTrackNumber` (or its replacement) MUST fall back to the
  reconciled record's `trackNumber` when a source file's embedded track tag
  is `null` or not a positive integer, so per-source sorting and duplicate
  detection succeed for fully tagless sources.
- **FR-7** `organizeConcatenatedAlbum` MUST pass the reconciled
  `Map<string, SetMetadataRecord>` into `planMetadataFixes`, replacing the
  current hardcoded `undefined`, so `artist`, `album`, `title`, and
  `trackNumber` from records apply to concatenated output exactly as they do
  for a single `sourceDir`.
- **FR-8** Disc identity (`discNumber`/`discTotal`) on concatenated output
  MUST continue to be derived solely from `sourceDirs` array order via the
  existing `applyConcatenateDiscMetadata`/`ConcatenateDiscContext` path;
  this spec MUST NOT change that derivation.
- **FR-9** CLI, REST, GraphQL, and MCP adapters MUST require no schema or
  option changes, since `--set-metadata`/`setMetadata` and
  `--source-dirs`/`sourceDirs`/`albumDirs` are already independently
  accepted at every adapter boundary; only core validation currently blocks
  the combination.
- **FR-10** Existing single-`sourceDir` `setMetadata` behavior and existing
  `sourceDirs` concatenation without `setMetadata` MUST remain covered and
  unchanged by this spec.

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
- **NFR-5 — File size.** New or modified source files MUST remain at or
  below 200 lines. `src/lib/albums/organize-files.ts` is already 207 lines
  before this spec; this spec's net change to that file MUST NOT increase
  its line count and SHOULD reduce it where practical. New reconciliation
  logic SHOULD live in a new focused module rather than growing
  `concatenate-album-sources.ts` or `organize-files.ts` past the limit.
- **NFR-6 — Type safety.** Implementation MUST use strict TypeScript without
  `any` or TypeScript suppression comments.
- **NFR-7 — No dependencies.** `package.json` and lockfiles MUST remain
  unchanged.
- **NFR-8 — Determinism.** The same ordered inputs, records, and filesystem
  state MUST produce the same rows, errors, and destinations across runs.
- **NFR-9 — Source safety.** Dry runs MUST perform no writes; all
  reconciliation and disc-field validation MUST complete before the first
  write in execute mode.

## 6. Acceptance Criteria

1. A two-directory concatenate fixture with zero embedded tags in every file
   (matching the Iced Earth "Days of Purgatory" shape: disc-local track
   numbers restart at 1 in each directory) dry-runs successfully when full
   `setMetadata` records are supplied, and executes producing correct
   destination paths/tags with `discNumber`/`discTotal` derived from
   directory order, not from records.
2. A record supplying `discNumber` or `discTotal` under `discStrategy:
   'concatenate'` fails before any write with an actionable error naming the
   offending filename(s).
3. Two source directories sharing an identical bare filename fail before any
   write with an actionable error naming the filename and both directories.
4. Missing or extra records relative to the union of all `sourceDirs` files
   fail before any write, reusing the existing `reconcileSetMetadata` error
   message shapes.
5. CLI, REST, GraphQL, and MCP contract tests cover the combination
   end-to-end with no schema changes; existing `--limit`, `--reset-track`,
   and `--ignore-audio-files-without-tracks` concatenate-conflict tests
   remain green and unchanged.
6. Per-edit lint, final `npm run lint`, `npm run build`, and `npm test` exit
   0, and `package.json`/lockfile diffs are empty.