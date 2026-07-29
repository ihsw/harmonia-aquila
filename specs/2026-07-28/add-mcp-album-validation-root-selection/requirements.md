# Requirements: Add MCP Album Validation Root Selection

## 1. Background

`manage_albums_validate` currently resolves every `dirName` through
`WebPathResolver.resolveSource`, so MCP clients can validate only directories
under the configured `--source-dir`. The MCP list and organize-files tools
already use optional `useScratchDir` to let a client select the server's
configured source or scratch root without accepting an arbitrary root path.

Validation is read-only and is useful after `manage_albums_fix_tags` stages
files under `--scratch-dir`. It needs the same server-controlled root selector
while preserving its current domain operation and all non-MCP contracts.

## 2. Goal

The `manage_albums_validate` MCP tool MUST accept optional boolean
`useScratchDir`. Omitted or `false` MUST resolve `dirName` under the configured
source root, while `true` MUST resolve it under the configured scratch root.
The tool name, read-only behavior, validation rows, errors, and existing option
mapping MUST remain compatible.

## 3. Scope

### In scope

- Extend the MCP album validation input schema and discovery metadata.
- Select `resolveSource` or `resolveScratch` in the MCP validate adapter.
- Add focused MCP tests for discovery, routing, rejection, and compatibility.
- Add safe Bruno requests for default-source and scratch validation behavior.
- Update MCP documentation with the selector and root-confinement contract.

### Out of scope

- Changes to the CLI, REST, or GraphQL validation inputs or behavior.
- Changes to `validateAlbumSourceDir`, metadata parsing, collision validation,
  row formatting, strategy handling, limits, or filesystem traversal rules.
- Changes to `WebPathResolver`, configured roots, or `web serve` options.
- Client-supplied absolute roots or destination-root validation.
- Changes to list, summarize, fix-tags, organize-files, audiobook operations,
  media fixtures, or package dependencies.

## 4. Functional Requirements

- **FR-1** `manageAlbumsValidateInputSchema` MUST expose optional native
  boolean `useScratchDir`, and MCP discovery MUST show it as an optional
  Boolean property.
- **FR-2** The validate handler MUST call `resolveScratch(input.dirName,
  'dirName')` only when `input.useScratchDir === true`; omitted and explicit
  `false` MUST call `resolveSource(input.dirName, 'dirName')`.
- **FR-3** The selected path resolver MUST complete before
  `validateAlbumSourceDir` is invoked, so traversal and confinement errors
  identify `--source-dir` for omitted/false and `--scratch-dir` for true.
- **FR-4** `useScratchDir` MUST be consumed only by the MCP adapter and MUST
  NOT be included in the options passed to `validateAlbumSourceDir`.
- **FR-5** Non-boolean `useScratchDir` values MUST fail through the existing
  MCP invalid-arguments contract before path resolution or domain invocation.
- **FR-6** Existing calls that omit `useScratchDir` MUST retain the same
  source-root behavior, tool name, response rows, tool-error content, and
  strategy, ignore, and limit mappings.
- **FR-7** The tool MUST remain annotated with `readOnlyHint: true` and MUST
  NOT create, modify, move, or delete files under either selected root.
- **FR-8** Tool discovery metadata and `docs/mcp-server.md` MUST describe
  validation of a configured source or scratch directory without exposing a
  client-controlled root override.
- **FR-9** Focused MCP tests MUST prove omitted/false source routing, true
  scratch routing, unchanged option mapping, invalid-type rejection,
  selected-root traversal errors, optional Boolean discovery, and retained
  read-only annotation.
- **FR-10** The Bruno collection MUST retain a successful omitted-selector
  source validation and add a successful scratch-selected validation plus a
  scratch-selected traversal request that reports `--scratch-dir`.

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
- **NFR-5 — Type safety** The implementation MUST use strict TypeScript, no
  `any`, and no TypeScript suppression directives.
- **NFR-6 — File size** No created source or test file MAY exceed 200 lines;
  a touched test file MUST be split if the required coverage would exceed that
  limit.
- **NFR-7 — No new dependencies** `package.json` and `package-lock.json` MUST
  remain unchanged.
- **NFR-8 — Scope discipline** `git --no-pager diff --stat -- src/lib
  src/commands src/web/controllers src/web/modules/graphql` MUST be empty after
  implementation.
- **NFR-9 — Behavioral parity** Existing MCP validation output, domain option
  conversion, error translation, source-root default, and read-only semantics
  MUST be preserved.

## 6. Acceptance Criteria

1. MCP discovery exposes optional Boolean `useScratchDir` on
   `manage_albums_validate` and retains `readOnlyHint: true`.
2. Omitted and false selectors validate under source; true validates under
   scratch; the shared operation receives only the resolved `dirName` and
   unchanged existing options.
3. Invalid selector types and traversal attempts fail before domain invocation
   and name the selected configured root.
4. Focused tests and Bruno requests prove both roots without modifying media.
5. `npm run lint`, `npm run build`, `npm test`, the affected Bruno requests,
   and scope checks exit successfully.
