# Requirements: Replace Album Organization API Metadata Paths with Inline JSON

## 1. Background

`manage-albums organize-files` currently represents `setMetadata` as a host
filesystem path on every surface. The CLI flag, REST body, GraphQL input, and
MCP tool input all eventually resolve that path and read a JSON or CSV
manifest. The manifest already requires exactly one metadata record for every
selected audio file, but remote API clients cannot use it unless they can first
place a file on the server host.

The 2026-08-01 spec `migrate-fix-tags-into-organize-files` established the
combined metadata-and-organization pipeline. The 2026-08-02 spec
`allow-missing-disc-metadata` recommends whole-album `setMetadata` repair for
incorrect repeated track numbers. This spec makes that repair directly usable
through REST, GraphQL, and MCP while retaining the CLI's convenient local
JSON-file manifest workflow.

## 2. Goal

REST, GraphQL, and MCP `manage-albums organize-files` inputs MUST accept
`setMetadata` as an inline JSON array containing one record for every selected
audio file and MUST no longer accept or read a host manifest path from those
APIs. The same inline contract MUST work for dry runs and `execute: true`.
The CLI MUST remain unchanged and continue accepting a filepath to a JSON
whole-album metadata manifest, with existing CSV compatibility also preserved.

## 3. Scope

### In scope

- REST organize body schema/controller mapping and HTTP tests.
- GraphQL organize input/resolver/generated SDL and GraphQL tests.
- MCP organize schema/handler/discovery and protocol tests.
- A focused shared/internal record input that lets API adapters pass validated
  inline records to organization without temporary manifest files.
- Existing file parsing, record reconciliation, option conflicts, and
  organization tests needed to preserve CLI behavior and API parity.
- Affected REST, GraphQL, and MCP Bruno requests and assertions.
- Active API, set-metadata, album-organization, testing, and
  `.agents/skills/album-organization` guidance.
- This spec and its execution notes.

### Out of scope

- Changing the CLI `--set-metadata <json-or-csv-path>` contract or removing
  existing CLI JSON/CSV filepath functionality.
- Retaining API filepath compatibility or adding a string/array union.
- Adding CSV text, JSON-encoded strings, partial patches, remote URLs, uploads,
  temporary manifests, or a second public metadata field.
- Changing record field names, output rows, album-art handling, strategies,
  configured-root selection, endpoint/tool names, or execution defaults.
- Relaxing whole-selection coverage, duplicate/unknown filename checks,
  metadata option conflicts, disc validation, or destination preflight.
- New dependencies, audiobook behavior, historical specs, or real media edits.

## 4. Functional Requirements

- **FR-1 — Native inline API contract** REST, GraphQL, and MCP MUST retain the public field name `setMetadata`, but each API schema MUST define it as a non-empty list/array of metadata record objects rather than a string or host filepath.
- **FR-2 — Record shape** Each API record MUST require non-empty `filename`, `artist`, `album`, and `title` strings plus a positive-integer `trackNumber`; `discNumber` and `discTotal` MAY be positive integers, but `discTotal` MUST NOT appear without `discNumber` and `discNumber` MUST NOT exceed `discTotal` when both are present.
- **FR-3 — Filename safety** Each inline `filename` MUST be a bare supported `.flac` or `.mp3` filename, matched exactly and case-sensitively against the selected flat source directory; paths, unsupported extensions, and unknown names MUST fail before planning or writes.
- **FR-4 — Whole-album reconciliation** Inline records MUST use existing selected-set semantics: after `limit` and trackless filtering, every selected audio file MUST have exactly one record; duplicate, unknown, missing, or empty record sets MUST fail before planning or writes.
- **FR-5 — Existing metadata semantics** Valid inline records MUST drive existing effective artist, album, track, title, and optional disc projection, tag-change rows, disc validation, filename planning, collision preflight, staged execution, and verification without a temporary manifest file.
- **FR-6 — Option conflicts** Inline API `setMetadata` MUST preserve all current `setMetadata` conflicts and compatible album-artist/producer options; internal callers MUST reject supplying both filepath and inline record sources.
- **FR-7 — API path removal** REST, GraphQL, and MCP MUST reject string `setMetadata` inputs and MUST never resolve or read a filesystem path derived from API `setMetadata`.
- **FR-8 — CLI parity** CLI `--set-metadata` MUST continue to accept a host-readable JSON or CSV filepath and preserve current parsing, validation, conflicts, errors, dry-run output, execution, and source safety.
- **FR-9 — REST behavior** Valid inline REST input MUST work identically with omitted/false or true `execute`; malformed input MUST produce the existing HTTP 400 user-input translation before organization or writes.
- **FR-10 — GraphQL behavior** `AlbumOrganizeFilesInput.setMetadata` MUST become a list of typed record inputs in generated SDL; valid input MUST work for dry run and execution, and invalid input/domain failures MUST retain `BAD_USER_INPUT` behavior.
- **FR-11 — MCP behavior** MCP `tools/list` MUST advertise the inline array and nested record schema; malformed input MUST return tool-error content without invoking organization, and domain failures MUST retain normal tool-error translation.
- **FR-12 — Dry-run and execution safety** Omitted `execute` MUST remain write-free; `execute: true` MUST repair only staged destination copies, and every validation/preflight failure MUST leave source audio, source images, and destination content unchanged on all surfaces.
- **FR-13 — Documentation** Active guidance MUST show inline whole-album arrays for REST, GraphQL, and MCP, distinguish them from the CLI filepath, require one record per selected audio file, and retain review-before-execute guidance.

## 5. Non-Functional Requirements

- **NFR-1 — Lint after every source code file modification** After every source-code file modification, `npm run lint -- <modified-file>` MUST run and all reported issues MUST be fixed before moving on. This applies per edit, not per task. Whole-codebase `npm run lint` MUST be reserved for final verification after all TypeScript modifications are complete.
- **NFR-2 — No `npx`** `npx` is forbidden in all forms. Commands MUST use `npm run <script>` or `./node_modules/.bin/<tool>` exclusively.
- **NFR-3 — Build and tests** `npm run build` and `npm test` MUST exit 0.
- **NFR-4 — Type safety** Changes MUST preserve strict TypeScript without `any`, suppression directives, or unsafe casts.
- **NFR-5 — File size** Every produced or touched source/test file MUST remain at or below 200 lines; near-limit modules MUST be split before adding behavior.
- **NFR-6 — No dependencies** `package.json` and `package-lock.json` MUST NOT change.
- **NFR-7 — Determinism** Validation, reconciliation errors, row ordering, destinations, and collision behavior MUST remain deterministic across APIs.
- **NFR-8 — Scope discipline** Implementation MUST NOT change `etc/**`, audiobook code, root configuration, historical specs, or the CLI set-metadata contract.
- **NFR-9 — No server staging** Inline API metadata MUST remain in memory; implementation MUST NOT create a temporary JSON/CSV manifest or expose a new host path.

## 6. Acceptance Criteria

1. REST and MCP schemas expose `setMetadata` as an array, GraphQL SDL exposes a typed input list, and all three reject string values before `organizeAlbumFiles` runs.
2. Each API completes an equivalent whole-album dry run from inline records and returns matching effective metadata and destinations without writes.
3. Focused REST and GraphQL execution tests prove the same inline request works with `execute: true`, repairs only destination copies, and preserves sources.
4. Empty, partial, duplicate, unknown, path-bearing, invalid-extension, invalid-number, orphan-total, and inconsistent-disc inputs fail deterministically with zero source/destination writes.
5. A complete Requiem-style 35-record fixture can assign unique tracks and fill missing core metadata in one API request; tests use temporary fixtures rather than repository media.
6. CLI JSON/CSV filepath regression tests pass unchanged, including dry-run and execution coverage.
7. Focused tests, final `npm run lint`, `npm run build`, and `npm test` pass; expected GraphQL SDL changes are reviewed and dependency, scope, and media-tree audits are clean.
