# Requirements: Remove Deprecated Web Scratch Directory

## 1. Background

web serve currently requires three roots: --source-dir, --dest-dir, and the deprecated --scratch-dir. The scratch root is selected through useScratchDir in parts of the REST, GraphQL, and MCP album interfaces. Its routing is inconsistent: MCP organization already writes to the destination root, while REST and GraphQL organization can write to source or scratch.

The 2026-07-28 specs add-web-scratch-dir-routing and add-web-album-list-root-selection introduced this contract. The scratch root is now deprecated and must be removed instead of retained as an undocumented compatibility path.

## 2. Goal

Make web serve a two-root service: album and audiobook inputs are confined to --source-dir; published album and audiobook copies are confined to --dest-dir. The REST, GraphQL, and MCP public contracts must no longer expose scratch selection, while preserving their remaining paths, response shapes, and dry-run safety.

## 3. Scope

### In scope

- web serve options, WebRoots, and WebPathResolver.
- Album adapters and schemas for REST, GraphQL, and MCP.
- Generated GraphQL SDL, focused unit/integration tests, and MCP test helpers.
- Web Bruno collection requests, bin/web-serve.sh, README, web/MCP/GraphQL documentation, testing instructions, and album-organization agent guidance.

### Out of scope

- Shared album and audiobook libraries, standalone CLI commands, and their source/destination contracts.
- New staging, temporary-file, migration, or backward-compatibility features.
- Audiobook operation semantics, authentication, transport lifecycle, package dependencies, lockfiles, and media fixtures under etc/**.
- Altering historical specifications under specs/**.

## 4. Functional Requirements

- **FR-1** web serve MUST accept and require only --source-dir and --dest-dir as filesystem roots; it MUST NOT expose, require, normalize, or forward --scratch-dir.
- **FR-2** WebRoots and WebPathResolver MUST contain only source and destination roots, retain their existing normalization and confinement guarantees, and remove scratch getters and resolution methods.
- **FR-3** REST album list, summary, and validation operations MUST read only from the configured source root, and REST organization MUST read source albums and publish its plan or execution output to the configured destination root.
- **FR-4** GraphQL AlbumListInput and AlbumOrganizeFilesInput MUST remove useScratchDir; albumList MUST select source and albumOrganizeFiles MUST select destination. The generated SDL MUST reflect those removals.
- **FR-5** MCP album list, validation, and organization schemas MUST remove useScratchDir; list and validation MUST use source, and organization MUST retain source input resolution plus destination output. Tool names, order, annotations, and text-encoded JSON result shape MUST remain unchanged.
- **FR-6** REST, GraphQL, and MCP test and Bruno coverage MUST remove scratch scenarios and prove the resulting source-to-destination behavior, including dry-run safety and source-root traversal rejection.
- **FR-7** Active scripts, README, web/MCP/GraphQL/testing documentation, and the album-organization skill MUST describe the two-root contract and MUST NOT instruct users to configure or select scratch storage.

## 5. Non-Functional Requirements

- **NFR-1 — Lint after every source code file modification** After every source-code file modification, npm run lint -- <modified-file> MUST be run and all reported issues MUST be fixed before the next edit. Whole-codebase npm run lint is reserved for final verification after all TypeScript edits.
- **NFR-2 — Build and tests** npm run build and npm test MUST exit 0 when implementation is complete.
- **NFR-3 — No npx** npx is forbidden in every command and document. Use npm run <script> or ./node_modules/.bin/<tool> instead.
- **NFR-4 — No new dependencies** The implementation MUST NOT modify package.json or package-lock.json.
- **NFR-5 — Scope discipline** No files outside this spec directory and the paths enumerated in design.md section 2 MAY be changed. etc/**, shared libraries, standalone commands, and historical specs MUST remain untouched.
- **NFR-6 — Behavioral parity** Except for removal of scratch configuration and selectors, existing HTTP routes, GraphQL field names and envelopes, MCP protocol behavior, source/destination confinement, collision preflight, and explicit execute: true write authorization MUST remain intact.

## 6. Acceptance Criteria

1. web serve --help contains source and destination roots but no scratch option, and server startup succeeds with existing source/destination roots.
2. No active source, test, collection, script, or documentation file outside specs/** contains scratchDir, scratch-dir, or useScratchDir.
3. REST and GraphQL album organization target --dest-dir; MCP organization continues to do so, with source-root album inputs in every case.
4. GraphQL SDL and MCP discovery omit scratch-selection fields, while MCP tool names, ordering, annotations, and JSON-text response contract remain stable.
5. Focused tests, Bruno dry-run coverage, npm run lint, npm run build, and npm test pass without writing source files during dry runs.

