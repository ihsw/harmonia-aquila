# Requirements: Reject Multiple Albums Per Validation or Organization Run

## 1. Background

`manage-albums validate` and `manage-albums organize-files` both operate on a
flat directory of FLAC/MP3 files. They currently permit one invocation to
produce multiple normalized album directories. The shared
`assertSingleArtistPerAlbumDirectory` guard rejects a normalized album
directory associated with multiple normalized artist directories, but it does
not reject distinct album directories in the same selected file set.

The 2026-07-25 spec `reject-multi-artist-album-output` introduced the
organization guard, and the 2026-07-28 spec
`align-album-validation-and-mcp-fix-tags` shared it with validation. This
change extends that shared planning boundary so a source selection represents
one album per invocation.

## 2. Goal

Validation and organization MUST fail with one deterministic
`UserInputError` when their selected, organizable files resolve to more than
one normalized album directory. The failure MUST be identical across CLI,
REST, GraphQL, and MCP, and organization MUST detect it before inspecting or
writing destination paths.

## 3. Scope

### In scope

- Add a shared single-album output-identity guard.
- Invoke the guard from album validation and organization.
- Preserve and define conflict-check ordering relative to existing metadata,
  duplicate-destination, and multi-artist behavior.
- Update CLI descriptions and focused CLI/domain tests.
- Add REST, GraphQL, and MCP error-translation coverage.
- Add safe Bruno requests for validation and organization on all three web
  surfaces using a temporary two-album source fixture.
- Update album organization, GraphQL, MCP, and smoke-test documentation.

### Out of scope

- Adding an option to bypass, warn about, split, merge, or auto-select albums.
- Changing output paths, metadata strategies, limits, filtering, dry-run
  defaults, root selection, or path-confinement behavior.
- Changes to REST/GraphQL/MCP schemas, routes, operation/tool names, response
  row types, GraphQL SDL, or MCP transport lifecycle.
- Changes to fix-tags, summarize, list, audiobook operations, or album-art
  processing.
- Modifying or adding committed media under `etc/**`.
- New dependencies or package upgrades.

## 4. Functional Requirements

- **FR-1** The shared album planning module MUST expose a typed guard over
  `AlbumOutputIdentity` values that identifies distinct normalized
  `albumDirectory` values.
- **FR-2** The guard MUST do nothing for zero or one distinct album directory
  and MUST throw `UserInputError` for two or more distinct album directories.
- **FR-3** The error MUST be exactly `Multiple albums found: <albums>`, where
  `<albums>` is the comma-separated list of distinct normalized album
  directory segments in lexical order; it MUST NOT expose absolute paths.
- **FR-4** `organizeAlbumFiles` MUST apply the guard to its selected
  `PlannedCopy` records after missing-metadata and exact duplicate-file
  destination handling, but before the existing multi-artist guard, every
  destination existence check, `mkdir`, or `copyFile`.
- **FR-5** `validateAlbumSourceDir` MUST apply the guard after rows and exact
  duplicate-destination issues are built, using only rows with computable
  destinations, and before the existing multi-artist guard or successful row
  return.
- **FR-6** Album identities MUST use the same `sanitizePathSegment` result as
  output planning; raw metadata values that normalize to one album directory
  MUST count as one output album.
- **FR-7** Existing `limit`, non-audio filtering, and skipped-track behavior
  MUST determine the selected files before either operation evaluates the
  guard.
- **FR-8** Existing precedence MUST remain:
  missing required organization metadata and exact duplicate-file destination
  behavior first, then multiple albums, then the existing multiple-artist
  collision, followed by destination inspection.
- **FR-9** Organization MUST enforce the rule in dry-run and
  `execute: true`; a conflict MUST return no rows and create/copy no
  destination files or directories.
- **FR-10** A valid single normalized album with multiple distinct tracks MUST
  retain current validation rows, organization rows, output layout, and
  execute behavior.
- **FR-11** Both CLI commands MUST surface the shared error through their
  existing Commander failure path without plaintext/JSON rows, and their help
  descriptions MUST state the one-album-per-run requirement.
- **FR-12** REST validation and organization MUST preserve their existing HTTP
  400 `{ error, message, statusCode }` mapping for the shared error without
  adapter production changes.
- **FR-13** GraphQL validation and organization MUST preserve
  `extensions.code = BAD_USER_INPUT` with the exact shared message, without
  changing operations, inputs, results, or generated SDL.
- **FR-14** MCP validation and organization MUST preserve their current tool
  error representation, schemas, annotations, root selection, and dry-run
  defaults while including the exact shared message.
- **FR-15** Focused tests MUST cover deterministic sorting, output-name
  sanitization, empty/single/multiple album sets, limit-before-guard behavior,
  conflict precedence, dry-run/execute no-write behavior, and all four client
  error mappings.
- **FR-16** A Bruno fixture built only in a temporary directory from two
  existing read-only sample tracks with distinct album tags MUST prove both
  operations fail through REST, GraphQL, and MCP; no request MAY set execute.
- **FR-17** Public documentation MUST describe the one-album-per-run rule,
  exact error prefix, lack of bypass, and pre-write timing.

## 5. Non-Functional Requirements

- **NFR-1 — Lint after every source code file modification** After every
  modification of a source code file, `npm run lint -- <modified-file>` MUST be
  run so only the modified file is linted, and all reported issues MUST be
  fixed before moving on. This applies per source-code edit, not per task.
  Whole-codebase `npm run lint` MUST be reserved for final verification after
  all TypeScript modifications are complete.
- **NFR-2 — Build** `npm run build` MUST exit 0 after implementation.
- **NFR-3 — Tests** `npm test` MUST exit 0 after implementation.
- **NFR-4 — No `npx`** `npx` is forbidden in all forms. Commands MUST use
  `npm run <script>` or `./node_modules/.bin/<tool>` exclusively.
- **NFR-5 — Type safety and file size** Changes MUST preserve strict
  TypeScript with no `any` or suppression directives; no created source/test
  file MAY exceed 200 lines, and new coverage MUST use focused files rather
  than enlarging existing oversized tests.
- **NFR-6 — Shared enforcement** Both operations and all clients MUST delegate
  to one domain guard; adapters MUST NOT reimplement album counting.
- **NFR-7 — Behavioral parity** Existing multi-artist, missing-metadata,
  duplicate-destination, root-confinement, output, and error-translation
  contracts MUST remain unchanged except where FR-8 deliberately gives the new
  multiple-album error precedence.
- **NFR-8 — No new dependencies** `package.json` and `package-lock.json` MUST
  remain unchanged.
- **NFR-9 — Scope discipline** The implementation MUST NOT modify `etc/**`,
  audiobook code, web schemas, GraphQL SDL, MCP transport/server code, or
  unrelated operations.

## 6. Acceptance Criteria

1. Two valid selected tracks resolving to normalized `Album A` and `Album B`
   make both domain operations reject with
   `Multiple albums found: Album A, Album B`.
2. The same fixture fails organization in dry-run and execute mode before
   destination inspection or writes; the destination remains empty.
3. A one-album multi-track fixture succeeds, existing multi-artist behavior
   remains exact, and limit/filter/invalid-row regressions pass.
4. CLI, REST, GraphQL, and MCP tests assert their established failure
   contracts for validation and organization.
5. Six temporary-fixture Bruno requests prove validation and organization
   failures through REST, GraphQL, and MCP without executing writes.
6. Focused tests, final lint, build, full tests, Bruno checks, and scope checks
   exit successfully.
