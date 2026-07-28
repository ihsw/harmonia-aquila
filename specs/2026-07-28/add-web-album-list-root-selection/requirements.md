# Requirements: Add Web Album List Root Selection

## 1. Background

The 2026-07-23 spec `add-manage-albums-list` introduced a shared
`listAlbumSourceDir` operation plus CLI, REST, GraphQL, and MCP adapters. The
three `web serve` adapters currently bind the operation exclusively to the
configured `--source-dir`, even though `web serve` also has an authoritative
`--scratch-dir` and album organization already uses the optional
`useScratchDir` convention to select between those roots.

Clients need to inspect staged album output under the scratch root before
continuing an organization workflow. Root selection must remain server
controlled: clients may choose source or scratch, but must never supply an
arbitrary filesystem root.

## 2. Goal

REST `GET /manage-albums/list`, GraphQL `albumList`, and MCP
`manage_albums_list` MUST accept optional `useScratchDir`; omitted or `false`
MUST list within the configured source root, while `true` MUST list within the
configured scratch root. Existing prefix, output, error, and read-only
semantics MUST remain unchanged.

## 3. Scope

### In scope

- Extend the REST list query schema and controller root selection.
- Extend `AlbumListInput`, its resolver, and generated GraphQL SDL.
- Extend the MCP list input schema, handler, and discovery metadata.
- Add focused REST, GraphQL, and MCP tests for omitted, explicit-false, true,
  prefixed, and invalid selector behavior.
- Add Bruno requests that prove source and scratch selection through all three
  web surfaces.
- Update the GraphQL, MCP, and web smoke-test documentation.

### Out of scope

- Changes to the standalone `manage-albums list` CLI options or behavior.
- Changes to `listAlbumSourceDir`, prefix validation, sorting, recursion, entry
  formatting, or filesystem error behavior.
- Client-supplied root paths or changes to `web serve` root configuration.
- Changes to summarize, validate, fix-tags, organize-files, audiobook, or other
  GraphQL/MCP operations.
- Filesystem writes by the list operation, authentication, pagination,
  filtering, metadata parsing, or new dependencies.

## 4. Functional Requirements

- **FR-1** REST `GET /manage-albums/list` MUST accept optional
  `useScratchDir=true|false` using the existing query-boolean parsing contract.
- **FR-2** GraphQL `AlbumListInput` MUST expose nullable
  `useScratchDir: Boolean`, and generated `schema.gql` MUST be regenerated
  through application initialization and committed.
- **FR-3** MCP `manage_albums_list` MUST expose optional boolean
  `useScratchDir` in its input schema and MUST remain annotated read-only.
- **FR-4** Each web adapter MUST pass `WebPathResolver.scratchDir` to
  `listAlbumSourceDir` only when `useScratchDir === true`; omitted and explicit
  `false` MUST pass `WebPathResolver.sourceDir`.
- **FR-5** `prefix` MUST remain optional and MUST be resolved by the shared
  operation relative to the selected root, including when
  `useScratchDir: true`.
- **FR-6** REST MUST reject repeated/non-string or non-boolean
  `useScratchDir` values with the existing HTTP 400 bad-request contract before
  invoking `listAlbumSourceDir`.
- **FR-7** GraphQL and MCP MUST reject non-boolean selector values through
  their existing schema-validation error contracts before invoking
  `listAlbumSourceDir`.
- **FR-8** All successful responses MUST retain the existing lexically sorted,
  non-recursive array of selected-root-relative strings, including trailing
  `/` on directories, without exposing an absolute root path.
- **FR-9** Existing requests that omit `useScratchDir` MUST remain
  backward-compatible in URL, operation/tool name, response shape, status/error
  mapping, and source-root behavior.
- **FR-10** MCP discovery title/description and public GraphQL/MCP
  documentation MUST state that the list operation can inspect the configured
  source or scratch directory.
- **FR-11** The Bruno collection MUST exercise source-default and
  scratch-selected REST, GraphQL, and MCP calls and MUST assert a scratch-only
  marker entry for the scratch-selected calls.
- **FR-12** The list operation MUST NOT create, modify, move, or delete files
  under either configured root.

## 5. Non-Functional Requirements

- **NFR-1 — Lint after every source code file modification** After every
  modification of a source code file, `npm run lint -- <modified-file>` MUST be
  run so only the modified file is linted, and any reported issues MUST be
  fixed before the change is considered complete. This applies per source-code
  edit, not per task. Whole-codebase `npm run lint` MUST be reserved for final
  verification after all TypeScript modifications are complete.
- **NFR-2 — Build** `npm run build` MUST exit 0 after implementation.
- **NFR-3 — Tests** `npm test` MUST exit 0 after implementation.
- **NFR-4 — No `npx`** `npx` is forbidden in all forms. Commands MUST use
  `npm run <script>` or `./node_modules/.bin/<tool>` exclusively.
- **NFR-5 — Type safety** The implementation MUST use strict TypeScript, no
  `any`, and no TypeScript suppression directives.
- **NFR-6 — File size** No created source or test file MAY exceed 200 lines;
  modified files SHOULD remain below 200 lines where their current structure
  permits.
- **NFR-7 — No new dependencies** `package.json` and `package-lock.json` MUST
  remain unchanged.
- **NFR-8 — Scope discipline** `git --no-pager diff --stat --
  src/lib src/commands src/commands/manage-audiobooks
  src/web/controllers/manage-audiobooks.controller.ts
  src/web/modules/graphql/audiobook.resolver.ts` MUST be empty after
  implementation.
- **NFR-9 — Behavioral parity** Existing album-list prefix validation, output
  ordering and formatting, adapter error mapping, MCP read-only annotation, and
  source-root default MUST be preserved.

## 6. Acceptance Criteria

1. REST, GraphQL, and MCP each list source by default and scratch only when
   `useScratchDir` is exactly true.
2. Each surface applies `prefix` within the selected root and rejects invalid
   selector types before the shared operation runs.
3. GraphQL SDL and MCP discovery advertise the optional boolean selector.
4. Bruno source and scratch requests prove root selection with a scratch-only
   marker and perform no writes through the list operation.
5. Focused tests, `npm run lint`, `npm run build`, `npm test`, and the Bruno
   web collection exit 0.
