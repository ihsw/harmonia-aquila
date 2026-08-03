# Requirements: Add Concatenate Disc Strategy

## 1. Background

`manage-albums organize-files` currently accepts one flat `sourceDir` and the
MCP tool accepts one slash-terminated `albumDir`. Its `infer` disc strategy can
place tagged discs below `Disc NN/`, but it cannot combine separately nested
disc directories into one flat album. The completed
`organize-lenny-kravitz-albums-via-mcp` spec therefore produced eight album
folders for four two-disc releases.

The Lenny Kravitz source layout has an ordered pair of flat child directories
for each affected release. Each child repeats track numbers from one and has a
direct `Folder.png`. Combining those sources also creates multiple album-art
inputs for one destination path, which must be resolved explicitly rather than
silently choosing a file.

## 2. Goal

Add an opt-in `concatenate` disc strategy that accepts an ordered set of flat
album directories, plans them atomically as one album, renumbers tracks into a
single sequence, clears disc tags, and writes no `Disc NN/` directories. Add
`--album-art-strategy first|last|neither` and equivalent API fields; it becomes
mandatory when multiple source art files resolve to the same destination.

## 3. Scope

### In scope

- Album source discovery, metadata planning, organization planning, album-art
  collision planning, copy execution, and result types under `src/lib/albums/`.
- `manage-albums organize-files` CLI parsing and output.
- REST, GraphQL, and `manage_albums_organize_files` MCP schemas/adapters.
- Focused unit, adapter, integration, and execution tests under `__tests__/`.
- Organize-files documentation in `docs/` and generated GraphQL schema.

### Out of scope

- Recursive album discovery or automatic parsing of names such as `CD1`.
- Moving, deleting, or modifying source files.
- Deduplicating audio, comparing artwork contents, or selecting artwork by
  dimensions, format, or quality.
- Concatenation with `limit`, `resetTrack`, missing track metadata, or
  per-track `setMetadata` input in the first version.
- Changing destination collision strategies or dependency versions.
- Reorganizing the already-written Lenny Kravitz destination as part of this
  specification.

## 4. Functional Requirements

- **FR-1** `DiscStrategy` and every public parser MUST accept `concatenate` in
  addition to `infer` and `no change`.
- **FR-2** The core organizer MUST accept exactly one of `sourceDir` or an
  ordered `sourceDirs` array, preserving the existing singular contract.
- **FR-3** Concatenation MUST require at least two unique source directories,
  and multi-source input MUST require `discStrategy: "concatenate"`.
- **FR-4** Every selected directory MUST be resolved and validated as a flat
  album source independently; nested directories MUST NOT be traversed.
- **FR-5** Source-directory array order MUST define disc order; the organizer
  MUST NOT infer order from directory names or embedded disc tags.
- **FR-6** Within each directory, audio MUST be ordered by positive, unique
  embedded track number, and concatenation MUST assign destination tracks
  `1..N` continuously across the ordered directories.
- **FR-7** Concatenation MUST clear destination-copy disc number and disc total
  tags and MUST place every audio file directly in one album directory without
  a `Disc NN/` component.
- **FR-8** Existing metadata fixes MAY run before album identity validation,
  but all effective tracks MUST resolve to one album directory and one valid
  artist identity; callers MAY use `setAlbum` to unify disc-specific titles.
- **FR-9** Concatenation MUST reject `limit`, `resetTrack`,
  `ignoreAudioFilesWithoutTracks`, and `setMetadata` with actionable errors
  before any destination write.
- **FR-10** The CLI MUST retain singular `--source-dir <sourceDir>`, add
  mutually exclusive `--source-dirs <sourceDirs...>`, and describe the latter
  as ordered input for `--disc-strategy concatenate`.
- **FR-11** MCP MUST retain `albumDir`, add `albumDirs` as an array of at least
  two unique slash-terminated relative directories, reject requests containing
  both, and resolve every entry through the configured source/scratch root.
- **FR-12** REST and GraphQL MUST add optional `albumDirs` arrays relative to
  the configured source root; omission MUST preserve their current whole-root
  behavior, and each supplied path MUST use the existing containment checks.
- **FR-13** Concatenation output rows MUST include an optional
  `sourceDirectory` identifier so repeated basenames from different inputs are
  unambiguous; singular-mode output MUST remain unchanged by omitting it.
- **FR-14** All multi-source validation, metadata planning, album-art
  selection, destination collision checks, and destination preparation MUST
  complete for the combined plan before the first write.
- **FR-15** The CLI MUST add `--album-art-strategy <strategy>`, and the core,
  REST, GraphQL, and MCP contracts MUST expose `albumArtStrategy` with only
  `first`, `last`, and `neither` accepted.
- **FR-16** An album-art collision MUST mean two or more direct, recognized art
  files whose sanitized basenames resolve to the same destination album path;
  it MUST remain distinct from a file that already exists at the destination.
- **FR-17** When an album-art collision is present, the request MUST fail
  before any write unless `albumArtStrategy` is supplied, and the error MUST
  identify every collided destination and contributing source directory.
- **FR-18** For each collision group, `first` MUST select the earliest source
  by `sourceDirs` order, `last` MUST select the latest, and `neither` MUST
  select no member; non-colliding artwork MUST always remain selected.
- **FR-19** Unselected collision members MUST appear as deterministic
  `would exclude` dry-run rows and `excluded` execute rows, while selected art
  retains the normal copy/destination-strategy action.
- **FR-20** `albumArtStrategy` MUST be rejected outside concatenate mode and
  MAY be supplied without error in concatenate mode when no collision exists.
- **FR-21** Existing `error|ignore|overwrite` destination behavior MUST apply
  only after source-art selection and MUST remain unchanged for selected art
  and audio.
- **FR-22** Dry-run and execute results MUST have field-for-field parity after
  normalizing `would copy|ignore|overwrite|exclude` to their execute actions.
- **FR-23** Existing singular CLI, core, REST, GraphQL, and MCP behavior and
  error contracts MUST remain covered and unchanged except for the additive
  enum values, fields, and result actions in this spec.

## 5. Non-Functional Requirements

- **NFR-1 — Lint after every source code file modification.** After every
  modification of a source code file, `npm run lint -- <modified-file>` MUST be
  run so only that file is linted, and issues MUST be fixed before continuing;
  whole-codebase `npm run lint` MUST be reserved for final verification after
  all TypeScript modifications are complete.
- **NFR-2 — Build.** `npm run build` MUST exit 0 after implementation.
- **NFR-3 — Tests.** `npm test` MUST exit 0 after implementation.
- **NFR-4 — No `npx`.** `npx` is forbidden in all forms; commands MUST use
  repository scripts or `./node_modules/.bin/<tool>`.
- **NFR-5 — File size.** New source files MUST remain at or below 200 lines;
  large existing modules SHOULD delegate new logic to focused modules.
- **NFR-6 — Type safety.** Implementation MUST use strict TypeScript without
  `any` or TypeScript suppression comments.
- **NFR-7 — No dependencies.** `package.json` and lockfiles MUST remain
  unchanged.
- **NFR-8 — Determinism.** The same ordered inputs and filesystem state MUST
  produce the same row order, selected artwork, and destinations.
- **NFR-9 — Source safety.** Dry runs MUST perform no writes, and execution
  MUST write only destination copies.

## 6. Acceptance Criteria

1. A two-directory fixture with repeated local tracks dry-runs as one flat
   album with continuous tracks, empty disc fields, and source-qualified rows.
2. The same fixture fails atomically on repeated `Folder.png` without an art
   strategy; `first`, `last`, and `neither` produce their specified plans.
3. MCP accepts ordered `albumDirs`, rejects `albumDir` plus `albumDirs`, and
   preserves the existing singular request.
4. CLI, REST, GraphQL, and MCP contract/error tests cover all new fields and
   conflicts, including path containment.
5. Execute tests prove dry-run parity, source immutability, metadata clearing,
   flat destinations, and no partial writes on preflight failure.
6. Per-edit lint, final `npm run lint`, `npm run build`, and `npm test` exit 0,
   and dependency manifests have no diff.
