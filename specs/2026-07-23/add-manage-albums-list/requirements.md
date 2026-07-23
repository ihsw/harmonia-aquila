# Requirements: Add Manage Albums List

## 1. Background

`manage-albums` currently has no lightweight way to discover immediate
contents of a source directory. Its CLI commands, REST controllers, GraphQL
resolvers, and MCP tools delegate to shared album operations, while web-facing
paths are constrained to configured roots.

The new list operation must be equally available through all execution methods:
the CLI command, `web serve` REST endpoint, GraphQL query, and MCP tool.
Its user-controlled prefix must remain confined to the configured or supplied
source root, including against lexical traversal and reachable symlink escape.

## 2. Goal

`manage-albums list` and its REST, GraphQL, and MCP counterparts MUST return a
non-recursive, deterministic listing of a source-root-relative directory.
`prefix` MUST be either empty or slash-terminated, and all adapters MUST reject
prefixes that escape their source root with their established error contract.

## 3. Scope

### In scope

- Add the shared album listing operation and CLI `manage-albums list` command.
- Add `GET /manage-albums/list`, GraphQL `albumList`, and MCP
  `manage_albums_list` adapters.
- Add CLI, library, REST, GraphQL, and MCP tests.
- Regenerate committed GraphQL SDL and add REST/GraphQL Bruno collection
  requests, including traversal rejection requests.
- Update directly related GraphQL, MCP, and testing documentation.

### Out of scope

- Recursive walking, glob matching, pagination, metadata parsing, or filtering
  by audio extension.
- Filesystem mutation, root creation, authentication, or dependencies.
- Changes to existing album operation behavior, REST/MCP routes/tools, or
  GraphQL operation names and contracts.
- A new web UI, browser directory picker, or a Bruno request that writes data.

## 4. Functional Requirements

- **FR-1** The CLI MUST register `manage-albums list` with required
  `--source-dir <dir>`, default-empty `--prefix <prefix>`, and existing
  plaintext/JSON `--format` support.
- **FR-2** REST MUST expose `GET /manage-albums/list`; it MUST accept optional
  `prefix` as a query string and use the `web serve` configured source root
  rather than any client root override.
- **FR-3** GraphQL MUST expose `albumList(input: AlbumListInput!): [String!]!`,
  where the input has optional `prefix`; the generated `schema.gql` MUST be
  regenerated through application initialization and committed.
- **FR-4** MCP MUST register a read-only `manage_albums_list` tool accepting an
  optional string `prefix` and returning JSON tool content from the same shared
  operation.
- **FR-5** Empty `prefix` MUST select the source root. Every non-empty prefix
  MUST end with `/` and select that source-root-relative directory.
- **FR-6** The shared operation MUST return only immediate entries, MUST NOT
  recurse, and MUST return a lexically sorted array of source-root-relative
  paths, appending `/` to actual directory entries.
- **FR-7** The operation MUST list files and directories without parsing audio
  metadata or filtering extensions.
- **FR-8** Absolute prefixes, NUL-containing prefixes, non-empty prefixes
  lacking a trailing `/`, lexical traversal, and reachable symlink escapes MUST
  fail before enumeration with a `UserInputError` identifying `prefix`.
- **FR-9** Missing or non-directory source roots/selected directories MUST
  produce the existing adapter-specific user-error flow without raw Node.js
  errors or stack traces.
- **FR-10** REST error responses MUST be HTTP 400 with the existing bad-request
  JSON body; GraphQL MUST map failures to `BAD_USER_INPUT`; MCP MUST return its
  existing input-error tool content; CLI MUST use `Command.error`.
- **FR-11** Bruno MUST include successful REST/GraphQL root-list requests and
  REST/GraphQL traversal requests that assert each public error contract.
- **FR-12** Existing command registration and public GraphQL/MCP documentation
  MUST include the new operation.

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
- **NFR-6 — File size** No created source or test file MAY exceed 200 lines.
- **NFR-7 — No new dependencies** The implementation MUST use Node.js standard
  library APIs and existing project dependencies only.
- **NFR-8 — Scope discipline** `git --no-pager diff --stat -- src/commands/manage-audiobooks
  src/web/modules/graphql/audiobook* src/web/controllers/manage-audiobooks.controller.ts`
  MUST be empty after implementation.

## 6. Acceptance Criteria

1. Every execution method lists direct root/nested entries in identical sorted
   source-root-relative string-array form.
2. Each adapter rejects malformed/traversing prefixes through its documented
   error contract before any directory entries are returned.
3. The generated SDL exposes `AlbumListInput` and `albumList`.
4. Focused unit/adapter tests, REST and GraphQL Bruno requests, `npm run lint`,
   `npm run build`, and `npm test` exit 0.
