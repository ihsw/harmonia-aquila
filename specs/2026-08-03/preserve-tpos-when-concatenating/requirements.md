# Requirements: Preserve TPOS When Concatenating Albums

## 1. Background

The completed `add-concatenate-disc-strategy` spec introduced ordered
multi-directory input for `manage-albums organize-files`. Its current behavior
interprets `concatenate` as destructive flattening of disc identity: it assigns
one global track sequence, clears MP3 ID3v2 `TPOS` (and FLAC disc fields), and
places every destination copy in one flat album directory.

That behavior does not match the operational intent for sources whose CDs were
incorrectly stored as separate directories. Directory order is reliable disc
evidence even when embedded disc tags are absent or wrong. A track that is
local track 1 in the second supplied directory must remain track 1 and become
disc 2 of the complete set, rather than becoming the next global track.

This spec supersedes FR-6 and FR-7, plus the corresponding design and acceptance
statements, in `specs/2026-08-03/add-concatenate-disc-strategy/`. All unrelated
requirements from that completed spec remain in force.

## 2. Goal

Change `discStrategy: "concatenate"` so ordered source directories define disc
number and total, local track numbers are preserved, missing or conflicting
disc metadata is repaired on destination copies, and all audio still lands in
one flat album directory. For MP3 output this means writing canonical ID3v2
`TPOS`; for FLAC it means canonical `DISCNUMBER` and `DISCTOTAL`.

## 3. Scope

### In scope

- Concatenate source modeling, metadata fixes, and destination planning under
  `src/lib/albums/`.
- Concatenate CLI help and public documentation.
- Focused core, execution, CLI, REST, GraphQL, and MCP regression tests.
- Result-row semantics for `trackNumber`, `discNumber`, `discTotal`, and
  `tagChanges` in concatenate mode.

### Out of scope

- New CLI, REST, GraphQL, or MCP request fields.
- Inferring disc order from directory names or source TPOS values.
- Recursively discovering disc directories.
- Preserving or synthesizing track totals such as the total component of
  ID3v2 `TRCK`.
- Automatically resolving duplicate flat destination filenames.
- Changing album-art selection, destination collision strategies, dependencies,
  source files, or already-organized destination albums.

## 4. Functional Requirements

- **FR-1** In concatenate mode, the zero-based position of each ordered
  `sourceDirs`/`albumDirs` entry MUST define canonical disc number
  `position + 1`, and the number of entries MUST define canonical disc total.
- **FR-2** Concatenation MUST preserve every source track's positive, unique
  local track number and MUST NOT assign a global track sequence.
- **FR-3** A source track whose effective disc number and total already equal
  the canonical values from FR-1 MUST retain those values without an unnecessary
  metadata mutation.
- **FR-4** A source track with absent, partial, or conflicting disc metadata
  MUST receive canonical disc number and total on its destination copy.
- **FR-5** MP3 destination copies MUST encode canonical disc number/total in
  ID3v2 `TPOS` as `N/M`; FLAC destination copies MUST encode equivalent
  `DISCNUMBER` and `DISCTOTAL` values.
- **FR-6** Concatenate result rows MUST report preserved local `trackNumber`
  plus canonical `discNumber` and `discTotal`; `tagChanges` MUST include
  `newDiscNumber`/`newDiscTotal` only when a disc value changes and MUST NOT
  report `newTrackNumber` when the local track number is unchanged.
- **FR-7** Concatenated audio MUST remain directly under one
  `Artist/Album/TT - Title.ext` directory even though its effective metadata is
  multi-disc; concatenate mode MUST NOT add `Disc DD` path components.
- **FR-8** Exact duplicate destinations produced by repeated local track/title
  pairs in the flat layout MUST fail during combined-plan preflight before any
  write; the organizer MUST NOT silently rename, overwrite, or discard them.
- **FR-9** Source-directory array order MUST remain authoritative when existing
  TPOS conflicts with it; canonical directory-derived values MUST repair the
  destination copy and source audio MUST remain unchanged.
- **FR-10** Album identity repair, album-artist repair, artwork selection,
  source qualification, atomic preflight, and dry-run/execute parity from the
  original concatenate feature MUST remain unchanged.
- **FR-11** CLI, REST, GraphQL, and MCP request schemas MUST remain compatible;
  only documented concatenate semantics and returned metadata values change.
- **FR-12** CLI, GraphQL, and MCP documentation MUST state that concatenate
  preserves local track numbering, derives disc position from ordered inputs,
  writes disc metadata, and keeps the physical destination layout flat.
- **FR-13** Singular `no change` and `infer` behavior MUST remain unchanged,
  including the existing `Disc DD` layout for ordinary multi-disc organization.

## 5. Non-Functional Requirements

- **NFR-1 — Lint after every source code file modification.** After every
  source-code modification, `npm run lint -- <modified-file>` MUST lint only
  that file, and all reported issues MUST be fixed before continuing.
  Whole-codebase `npm run lint` MUST be reserved for final verification after
  all TypeScript modifications are complete.
- **NFR-2 — Build.** `npm run build` MUST exit 0 after implementation.
- **NFR-3 — Tests.** `npm test` MUST exit 0 after implementation.
- **NFR-4 — No `npx`.** `npx` is forbidden in all forms; commands MUST use
  repository scripts or `./node_modules/.bin/<tool>`.
- **NFR-5 — File size.** New source files MUST remain at or below 200 lines;
  existing large modules SHOULD delegate new logic to focused helpers.
- **NFR-6 — Type safety.** Implementation MUST use strict TypeScript without
  `any` or TypeScript suppression comments.
- **NFR-7 — No dependencies.** `package.json` and lockfiles MUST remain
  unchanged.
- **NFR-8 — Determinism.** Identical ordered inputs and filesystem state MUST
  produce identical disc metadata, row order, actions, and destinations.
- **NFR-9 — Source safety.** Dry runs MUST perform no writes; execution MUST
  modify only destination copies and MUST preserve all source audio and art.

## 6. Acceptance Criteria

1. A two-directory fixture with local tracks `1,2` and `1` plans flat tracks
   `1,2,1` with disc metadata `1/2,1/2,2/2`, not global tracks `1,2,3`.
2. Missing, correct, partial, and conflicting source disc tags all produce the
   canonical directory-derived result, with mutations reported only where
   values change.
3. An executed MP3 fixture is reparsed from the destination and exposes
   `common.disk.no` and `common.disk.of` matching the expected TPOS values.
4. An executed FLAC fixture is reparsed with equivalent disc values, while
   both formats retain their local track numbers and sources remain unchanged.
5. Concatenate destinations contain no `Disc DD` component; an exact duplicate
   flat destination fails atomically.
6. CLI, REST, GraphQL, and MCP tests preserve request compatibility and expose
   canonical disc/local-track values in their existing result contracts.
7. Per-edit lint, final `npm run lint`, `npm run build`, and `npm test` exit 0,
   and dependency manifests have no diff.
