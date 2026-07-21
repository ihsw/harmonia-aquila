# Requirements: Add Manage Albums Validate

## 1. Background

The album command group currently exposes `manage-albums summarize-source-dir`,
`manage-albums fix-tags`, and `manage-albums organize-files` through the
Commander CLI, the Nest web controller, and the web-scoped MCP tool registry.
`organize-files` already performs strong validation while planning copies, but
it is coupled to destination planning and dry-run copy output.

Users need a read-only validation operation that answers whether a source album
directory is ready to organize. The operation should reuse existing album file
discovery, supported extension, metadata parsing, strategy, and duplicate-path
rules where possible, but it must not require a destination directory and must
not write files or tags.

This spec builds on the existing web/MCP wiring from
`specs/2026-07-19/add-remaining-mcp-tools/` and the current REST request schema
patterns under `src/web/schemas/request-schemas.ts`.

## 2. Goal

Add `manage-albums validate` as a read-only album validation feature available
from the CLI, `web serve` REST controller, and web MCP tooling. Done means all
three surfaces call the same album domain service, return the same JSON row
shape, reject invalid paths/options consistently, and are covered by unit tests
plus Bruno smoke coverage.

## 3. Scope

### In scope

- Album domain validation service under `src/lib/albums/**`.
- CLI command registration under `src/commands/manage-albums/**`.
- REST route and schemas under `src/web/controllers/**` and
  `src/web/schemas/**`.
- MCP schema/tool registration under `src/web/schemas/mcp/**` and
  `src/web/servers/mcp-tools/manage-albums/**`.
- Unit tests under `__tests__/commands/**`, `__tests__/lib/albums/**`, and
  `__tests__/web/**`.
- Bruno REST/MCP requests under `collections/harmonia-aquila-web/**`.
- Directly related docs under `docs/**`.

### Out of scope

- Writing tags, copying audio files, or adding any `--execute` mode to
  validation.
- Changing existing `summarize-source-dir`, `fix-tags`, or `organize-files`
  behavior except for extracting shared helpers needed by validation.
- Adding a stdio MCP server or changing the `/mcp` transport protocol.
- Adding package dependencies or changing package manager tooling.
- Processing real album collections as part of implementation.

## 4. Functional Requirements

- **FR-1** The CLI MUST expose `manage-albums validate --dir-name <dirName>`
  with `--ignore-non-audio-files`, `--limit <count>`,
  `--artist-filename-strategy <strategy>`, `--title-filename-strategy
  <strategy>`, and `--format <format>` options.
- **FR-2** The validation service MUST inspect only supported album audio files
  (`.flac`, `.mp3`) discovered by the existing album file helper and MUST honor
  the same non-audio-file and limit semantics as `summarize-source-dir` and
  `organize-files`.
- **FR-3** The validation service MUST parse metadata for each selected audio
  file and report whether the file has the metadata required for organization:
  album, selected artist filename field, track number, and selected title
  filename field.
- **FR-4** The validation service MUST detect duplicate relative organization
  destinations using the same artist/title strategy defaults and path
  sanitization semantics as `organize-files`, without requiring or checking a
  real destination root.
- **FR-5** Successful validation MUST return an array of row objects containing
  at least `filename`, `status`, `album`, `artistFilename`,
  `artistFilenameStrategy`, `titleFilename`, `titleFilenameStrategy`,
  `trackNumber`, `destination`, and `issues`, where `status` is `valid` or
  `invalid` and `issues` is an array of stable strings.
- **FR-6** Validation MUST be read-only: it MUST NOT copy files, write tags,
  create directories, delete files, or require an `execute` option on any
  surface.
- **FR-7** The web controller MUST expose `GET /manage-albums/validate` with
  query parameters equivalent to the CLI options, resolving `dirName` inside the
  configured `web serve --source-dir`.
- **FR-8** The MCP registry MUST expose a read-only
  `manage_albums_validate` tool with structured inputs equivalent to the REST
  route and JSON text content matching the validation row array.
- **FR-9** CLI, REST, and MCP validation MUST reject unsupported strategies,
  invalid limits, path traversal, non-directory targets, and unparseable audio
  files with existing project error handling conventions.
- **FR-10** Tool lists and docs MUST include `manage_albums_validate` in the
  deterministic manage-albums order: summarize, validate, fix-tags,
  organize-files.

## 5. Non-Functional Requirements

- **NFR-1 — Lint after every source code file modification** After every
  modification of a source code file (for example, a `.ts` file),
  `npm run lint -- <modified-file>` MUST be run so only the modified file is
  linted, and any reported issues MUST be fixed before moving on. This applies
  per source-code edit, not per-task. Whole-codebase `npm run lint` MUST be
  reserved for final verification after all TypeScript modifications are
  complete.
- **NFR-2 (typecheck/build)** `npm run build` MUST exit 0 after the spec is
  complete.
- **NFR-3 (tests)** `npm test` MUST exit 0 after the spec is complete.
- **NFR-4 (No `npx`)** `npx` is forbidden in all forms (no `--no-install`, no
  one-off test or TypeScript invocations). Any command line containing the
  substring `npx` is a violation. Use `./node_modules/.bin/<tool>` or
  `npm run <script>` exclusively.
- **NFR-5 (file size)** New source files SHOULD stay under 200 lines; if shared
  album planning helpers make that impractical, split helpers rather than
  growing one file.
- **NFR-6 (type safety)** Strict TypeScript MUST be preserved with no `any`, no
  unnecessary casts, and no `// @ts-...` escapes.
- **NFR-7 (no new dependencies)** The implementation MUST NOT add package
  dependencies.
- **NFR-8 (scope discipline)** The final diff MUST be limited to the in-scope
  files listed in §3 unless the user explicitly approves expanding scope.
- **NFR-9 (behavioral parity)** Existing CLI commands, REST routes, MCP tools,
  status codes, and JSON row shapes MUST remain unchanged except for the new
  validation capability and expanded tool list.

## 6. Acceptance Criteria

1. `manage-albums validate --dir-name <dir> --format json` returns validation
   rows and performs no writes.
2. `GET /manage-albums/validate?dirName=<dir>` returns the same row shape while
   enforcing the configured web source root.
3. MCP `tools/list` includes `manage_albums_validate`, and `tools/call` returns
   parseable JSON text content for valid input.
4. Focused command, domain, web controller, and MCP tests cover success,
   invalid metadata, duplicate destination, invalid option, and path traversal
   behavior.
5. `npm run lint`, `npm run build`, and `npm test` exit 0.
