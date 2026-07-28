# Requirements: Add Web Scratch Directory Routing

## 1. Background

`web serve` currently requires `--source-dir` and `--dest-dir`, normalizes both
as trusted roots, and exposes them through `WebPathResolver`. The REST,
GraphQL, and MCP adapters for `manage-albums fix-tags` and
`manage-albums organize-files` both pass the configured destination root to
their shared album operations.

The destination root still serves audiobook operations, but album repair needs
a separate staging boundary. Tag fixes must never target the general
destination root, while organization must let a request choose between the
configured source and scratch roots without accepting an arbitrary path.

This change extends the trusted-root model from the 2026-07-18
`constrain-web-serve-dirs` spec and the thin GraphQL/MCP adapters from the
2026-07-19 `add-remaining-mcp-tools` and 2026-07-23
`add-web-graphql-support` specs; it supersedes only their album destination
bindings.

## 2. Goal

`web serve` MUST require and normalize a third root, `--scratch-dir`. REST,
GraphQL, and MCP `fix-tags` calls MUST always plan/write into that scratch root.
The same three `organize-files` surfaces MUST accept optional
`useScratchDir: boolean`, default it to `false`, and use the configured source
root when false or omitted and the scratch root when true. Existing audiobook
destination behavior and direct `manage-albums` CLI commands MUST remain
unchanged.

## 3. Scope

### In scope

- Add required `--scratch-dir <dir>` parsing and propagate it through web
  bootstrap, normalized roots, Nest providers, GraphQL, and MCP contexts.
- Route web REST, GraphQL, and MCP album `fix-tags` destinations to scratch.
- Add `useScratchDir` to the REST body, GraphQL input, and MCP tool schema for
  `organize-files`.
- Route web album organization to the configured source or scratch root.
- Update focused CLI/bootstrap/path, REST, GraphQL, and MCP tests.
- Regenerate the committed GraphQL SDL through application initialization.
- Update related Bruno requests and GraphQL, MCP, and testing documentation.

### Out of scope

- Changing the standalone `manage-albums fix-tags` or `organize-files` CLI
  options or shared library operation signatures.
- Changing `--dest-dir` semantics for any audiobook REST, GraphQL, or MCP
  operation.
- Allowing request-supplied filesystem paths for source, scratch, or
  destination roots.
- Creating a missing scratch directory, deleting scratch contents, adding
  cleanup/retention policy, or requiring the three roots to be distinct.
- Authentication, authorization, new endpoints/tools/operation names, response
  row changes, new dependencies, or changes under `etc/**`.

## 4. Functional Requirements

- **FR-1** `web serve` MUST expose `--scratch-dir <dir>` in help and MUST reject
  an omitted, blank, nonexistent, or non-directory value before Nest
  application startup.
- **FR-2** `WebRoots`, `normalizeWebRoots`, and `WebPathResolver` MUST carry an
  absolute realpath-normalized `scratchDir` alongside the existing source and
  destination roots, without changing source/destination containment behavior.
- **FR-3** `serveWeb` and `createWebApp` MUST require `scratchDir`, and all
  production and test bootstrap call sites MUST provide it.
- **FR-4** `POST /manage-albums/fix-tags`, GraphQL `albumFixTags`, and MCP
  `manage_albums_fix_tags` MUST pass `WebPathResolver.scratchDir` as
  `fixAlbumTags.destDir` for both dry-run and execute requests.
- **FR-5** The three web `fix-tags` surfaces MUST NOT expose a scratch,
  destination, or source root override; their existing option and response
  contracts otherwise MUST remain unchanged.
- **FR-6** REST `POST /manage-albums/organize-files`,
  `AlbumOrganizeFilesInput`, and the `manage_albums_organize_files` MCP schema
  MUST accept optional boolean `useScratchDir`.
- **FR-7** When `useScratchDir` is omitted or `false`, every web
  `organize-files` adapter MUST pass the configured `sourceDir` as
  `organizeAlbumFiles.destDir`; when it is `true`, every adapter MUST pass the
  configured `scratchDir`.
- **FR-8** MCP `manage_albums_organize_files.albumDir` MUST continue to resolve
  within the configured source root and supply the operation's input
  `sourceDir`; destination selection MUST use the configured root itself, not
  the resolved `albumDir`.
- **FR-9** `useScratchDir` MUST be consumed only by web adapters and MUST NOT
  be forwarded to `organizeAlbumFiles` or added to `OrganizeFilesOptions`.
- **FR-10** Non-boolean REST/MCP values and invalid GraphQL values for
  `useScratchDir` MUST fail through each transport's existing input-error
  contract before `organizeAlbumFiles` is called.
- **FR-11** REST and GraphQL successful response shapes, GraphQL/MCP operation
  names, MCP tool annotations, dry-run/execute defaults, library validation,
  and album organization collision checks MUST remain unchanged.
- **FR-12** `--dest-dir` MUST remain required and MUST continue to supply the
  destination root for every existing audiobook adapter.
- **FR-13** The committed GraphQL schema MUST be regenerated from decorators
  and MUST show `useScratchDir: Boolean` on `AlbumOrganizeFilesInput`.
- **FR-14** Bruno REST, GraphQL, and MCP album requests and documentation MUST
  describe/test the default source destination and explicit scratch
  destination without performing writes.

## 5. Non-Functional Requirements

- **NFR-1 — Lint after every source code file modification** After every source
  code file modification, `npm run lint -- <modified-file>` MUST be run so only
  the modified file is linted, and all reported issues MUST be fixed before
  proceeding. Whole-codebase `npm run lint` MUST be reserved for final
  verification after all TypeScript modifications are complete.
- **NFR-2 — Build** `npm run build` MUST exit 0 after implementation.
- **NFR-3 — Tests** `npm test` MUST exit 0 after implementation.
- **NFR-4 — No `npx`** `npx` is forbidden in all forms. Commands MUST use
  `npm run <script>` or `./node_modules/.bin/<tool>` exclusively.
- **NFR-5 — Type safety** The implementation MUST use strict TypeScript, no
  `any`, and no TypeScript suppression directives.
- **NFR-6 — File size** No created source or test file MAY exceed 200 lines;
  touched files SHOULD remain focused and readable.
- **NFR-7 — No new dependencies** The implementation MUST use existing
  project dependencies only.
- **NFR-8 — Scope discipline** `git --no-pager diff --stat -- src/lib
  src/commands/manage-albums src/web/controllers/manage-audiobooks.controller.ts
  src/web/modules/graphql/audiobook.resolver.ts
  src/web/servers/mcp-tools/manage-audiobooks package.json package-lock.json
  etc` MUST be empty after implementation.
- **NFR-9 — Root confidentiality** Public errors, logs, schemas, and tool
  descriptions MUST identify configured option names where needed but MUST NOT
  expose absolute configured root values.

## 6. Acceptance Criteria

1. `node build/dist/index.js web serve --help` lists `--scratch-dir <dir>`, and
   startup rejects a missing/invalid scratch root before calling `serveWeb`.
2. Focused adapter tests prove all three `fix-tags` surfaces use scratch and
   never destination.
3. Focused adapter tests prove omitted/false `useScratchDir` selects source and
   true selects scratch for REST, GraphQL, and MCP, including MCP's distinct
   source `albumDir`.
4. Audiobook tests prove `destDir` behavior is unchanged.
5. Generated SDL, Bruno requests, and documentation describe the new contract.
6. Focused tests, `npm run lint`, `npm run build`, and `npm test` exit 0.
