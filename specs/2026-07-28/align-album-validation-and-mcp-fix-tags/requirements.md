# Requirements: Album Validation Collision Parity and MCP Fix-Tags Album Selection

## 1. Background

`organizeAlbumFiles` rejects a plan when one sanitized album directory name
would appear below multiple sanitized artist directory names. It throws the
deterministic `UserInputError` introduced by
`specs/2026-07-25/reject-multi-artist-album-output/` before destination
inspection or copying. `validateAlbumSourceDir` computes the same relative
destinations, but currently checks only missing metadata and exact duplicate
file destinations; it can report every row as valid for a plan that
`organize-files` will reject.

The validation library is shared by `manage-albums validate`, REST
`GET /manage-albums/validate`, GraphQL `albumValidateSourceDir`, and MCP
`manage_albums_validate`. The invariant therefore belongs in shared album
planning code, with each adapter retaining its existing error translation.

The MCP `manage_albums_fix_tags` tool currently passes the configured source
root directly to `fixAlbumTags`. Because `fix-tags` requires a flat directory
of supported audio files, a source root containing album subdirectories cannot
be processed. MCP `organize-files` already solves the analogous selection
problem with a required, slash-terminated `albumDir` resolved beneath the
configured source root. This spec extends that pattern to MCP `fix-tags` while
preserving the scratch destination established by
`specs/2026-07-28/add-web-scratch-dir-routing/`.

## 2. Goal

Validation MUST fail with the same deterministic multi-artist/same-album
`UserInputError` as organization whenever its selected rows imply that
conflicting output layout, and CLI, REST, GraphQL, and MCP MUST expose their
established client-specific failure contracts. MCP `manage_albums_fix_tags`
MUST require a listed album directory as its source and continue to plan or
write only under the configured scratch root.

## 3. Scope

### In scope

- Shared album output-identity and collision validation under
  `src/lib/albums/**`.
- Focused CLI, REST, GraphQL, and MCP validation error coverage.
- MCP `manage_albums_fix_tags` input schema, root-confined source selection,
  tests, Bruno request, and documentation.
- Directly related album organization, GraphQL, and MCP documentation.

### Out of scope

- Changing organization destinations, row shapes, strategy defaults, limit
  semantics, or the existing conflict message.
- Turning missing metadata or exact duplicate destinations into thrown
  validation errors; their current invalid-row behavior remains.
- Adding `albumDir` to CLI, REST, or GraphQL `fix-tags`.
- Allowing MCP callers to choose source, scratch, or destination roots.
- Changing scratch routing, execute defaults, tag mutation behavior, REST or
  GraphQL schemas, GraphQL SDL, MCP transport, or audiobook behavior.
- Processing a real music library, modifying `etc/**`, adding dependencies, or
  changing the unrelated user edit in `bin/web-serve.sh`.

## 4. Functional Requirements

- **FR-1** Album planning MUST have one shared guard that compares the same
  sanitized artist and album directory segments used by
  `getAlbumDestination`.
- **FR-2** `validateAlbumSourceDir` MUST throw `UserInputError` when its
  selected files contain one non-empty sanitized album directory associated
  with more than one distinct non-empty sanitized artist directory.
- **FR-3** The validation error MUST exactly preserve the organization error
  contract: deterministic album ordering, sorted artist names, no absolute
  paths, and the prefix `Multiple artists resolve to the same album directory:`.
- **FR-4** The guard MUST evaluate only files selected after existing
  discovery, strategy, and `limit` handling and only rows whose organization
  destination is computable.
- **FR-5** Missing-metadata rows and exact duplicate destinations MUST retain
  their existing `status`, `issues`, and row-return behavior when no
  multi-artist/same-album conflict exists.
- **FR-6** `organizeAlbumFiles` MUST retain its existing conflict behavior,
  ordering before destination inspection/writes, output rows, and execute
  behavior after adopting the shared guard.
- **FR-7** `manage-albums validate` MUST surface the shared `UserInputError`
  through its existing Commander failure path and MUST emit no validation rows
  for the rejected invocation.
- **FR-8** REST `GET /manage-albums/validate` MUST expose the failure through
  the existing HTTP 400 JSON contract without changing route or query inputs.
- **FR-9** GraphQL `albumValidateSourceDir` MUST expose the failure with
  `extensions.code = BAD_USER_INPUT` without changing its input, row type, or
  generated SDL.
- **FR-10** MCP `manage_albums_validate` MUST expose the failure through the
  existing MCP tool-error content without changing its name, schema,
  annotations, or read-only behavior.
- **FR-11** Focused domain and adapter tests MUST use an equivalent fixture
  with distinct tracks, distinct artists, and one sanitized album directory,
  and MUST assert the client-specific contracts in FR-7 through FR-10.
- **FR-12** MCP `manage_albums_fix_tags` MUST require an `albumDir` string that
  is non-empty and slash-terminated, matching the
  `manage_albums_organize_files.albumDir` validation contract.
- **FR-13** The MCP fix-tags handler MUST resolve `albumDir` with
  `WebPathResolver.resolveSource(input.albumDir, 'albumDir')` before calling
  `fixAlbumTags`; malformed and traversal inputs MUST fail before the domain
  operation is invoked.
- **FR-14** MCP fix-tags MUST pass the resolved album directory as
  `fixAlbumTags.sourceDir` and MUST continue to pass the configured scratch
  root as `fixAlbumTags.destDir` for dry-run and execute requests.
- **FR-15** Every existing MCP fix-tags option, tool name, annotation, output
  row shape, dry-run default, and error representation MUST remain unchanged.
- **FR-16** MCP discovery, Bruno coverage, and documentation MUST identify
  `albumDir` as a required source-root-relative directory returned by
  `manage_albums_list`, and MUST state that callers cannot override roots.

## 5. Non-Functional Requirements

- **NFR-1 — Lint after every source code file modification** After every
  source code file modification, `npm run lint -- <modified-file>` MUST run so
  only that file is linted, and reported issues MUST be fixed before the next
  edit. Whole-codebase `npm run lint` MUST be reserved for final verification
  after all TypeScript modifications are complete.
- **NFR-2 — No `npx`** `npx` is forbidden in all forms. Commands MUST use
  `npm run <script>` or `./node_modules/.bin/<tool>` exclusively.
- **NFR-3 — Build and tests** `npm run build` and `npm test` MUST exit 0.
- **NFR-4 — Type safety** Changes MUST preserve strict TypeScript with no
  `any`, TypeScript suppression directives, or unsafe path casts.
- **NFR-5 — File size** No produced source or test file MAY exceed 200 lines;
  oversized touched tests MUST be split into focused files when necessary.
- **NFR-6 — Client parity** All validation surfaces MUST delegate to the one
  domain guard; no adapter MAY reimplement or weaken collision detection.
- **NFR-7 — Root confinement and confidentiality** MCP fix-tags MUST preserve
  source-root containment and MUST NOT expose absolute configured paths in
  schemas, descriptions, logs, or client errors.
- **NFR-8 — No new dependencies** The implementation MUST use existing
  dependencies only.
- **NFR-9 — Scope discipline** The final diff MUST preserve `bin/web-serve.sh`,
  `etc/**`, package manifests, audiobook code, REST/GraphQL fix-tags schemas,
  and unrelated source unless the user explicitly approves expansion.

## 6. Acceptance Criteria

1. A domain validation fixture for `Artist A/Same Album` and
   `Artist B/Same Album` rejects with the exact organization conflict message,
   while same-artist multi-track and existing invalid-row cases remain
   unchanged.
2. Focused CLI, REST, GraphQL, and MCP tests prove the same domain failure is
   exposed as Commander failure, HTTP 400, `BAD_USER_INPUT`, and MCP tool error,
   respectively.
3. MCP tool discovery marks `albumDir` required for
   `manage_albums_fix_tags`; a valid directory reaches `fixAlbumTags` as the
   resolved source with scratch as destination.
4. Missing, non-slash-terminated, and traversal `albumDir` inputs fail before
   `fixAlbumTags`; no arbitrary root input is accepted.
5. Relevant docs and safe dry-run Bruno requests reflect both contracts.
6. Focused tests, `npm run lint`, `npm run build`, and `npm test` exit 0.
