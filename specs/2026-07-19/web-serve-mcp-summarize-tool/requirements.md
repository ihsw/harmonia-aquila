# Requirements: Web Serve MCP Summarize Tool

## 1. Background

`web serve` currently starts a Nest HTTP application with album and audiobook
controllers wired to a configured `--source-dir` and `--dest-dir`. Album
summarization is already exposed as
`GET /manage-albums/summarize-source-dir` and uses `WebPathResolver` to keep
`dirName` inside the configured source root.

The repository also has `docs/mcp-server.md`, which describes a broader future
stdio MCP server. This spec is intentionally narrower: add an MCP-compatible
HTTP endpoint to the existing `web serve` subcommand and expose only one tool,
`manage_albums_summarize_source_dir`.

The 2026-07-19 spec `refactor-web-validation-zod` centralized web request
validation in Zod. The new MCP controller should follow that schema-first
pattern and should not reintroduce ad hoc request parsing.

## 2. Goal

When `npm run web:serve` is started with `--source-dir` and `--dest-dir`, the
web server MUST expose an MCP Streamable HTTP endpoint at `/mcp`. MCP clients
MUST be able to initialize, list exactly one tool named
`manage_albums_summarize_source_dir`, and call that tool to receive the same
album summary rows returned by the existing album summarization operation.

## 3. Scope

### In scope

- `package.json` and `package-lock.json`, only to add the official MCP SDK if it
  is not already present.
- `src/web/**`, for the MCP controller, tool registration/handler, schemas, and
  Nest module wiring.
- `__tests__/web/**`, for controller/helper/bootstrap coverage.
- `collections/harmonia-aquila-web/**`, for Bruno requests that validate the
  MCP endpoint and tool behavior.
- `docs/mcp-server.md` and `docs/testing.md`, only if they need direct updates
  for the new web-served MCP endpoint or Bruno smoke workflow.

### Out of scope

- Do not implement the broader stdio MCP server described in
  `docs/mcp-server.md`.
- Do not expose any MCP tool other than `manage_albums_summarize_source_dir`.
- Do not add MCP tools for album fixing, album organizing, or any audiobook
  operation.
- Do not change the existing REST route paths, response envelopes, or Bruno
  requests except where shared collection setup must support `/mcp`.
- Do not change `src/lib/**` album or audiobook domain behavior.
- Do not add authentication beyond the local-origin protections required here.

## 4. Functional Requirements

- **FR-1** The web application MUST expose a single MCP endpoint at `/mcp` while
  `web serve` is running.
- **FR-2** The MCP endpoint MUST follow MCP Streamable HTTP shape: POST accepts
  JSON-RPC MCP messages, GET is either supported as an SSE stream or returns
  HTTP 405, and request examples include the required MCP HTTP headers.
- **FR-3** MCP initialization MUST advertise server metadata and tool
  capabilities sufficient for a client to call `tools/list` and `tools/call`.
- **FR-4** `tools/list` MUST return exactly one tool named
  `manage_albums_summarize_source_dir`.
- **FR-5** The tool input schema MUST accept `dirName: string`,
  `ignoreNonAudioFiles?: boolean`, and `limit?: number`, where `limit` is a
  non-negative integer when present.
- **FR-6** A successful tool call MUST resolve `dirName` through
  `WebPathResolver.resolveSource`, call `summarizeAlbumSourceDir`, and return
  the resulting rows in MCP tool result content.
- **FR-7** Path traversal or source-root escape attempts MUST be rejected before
  `summarizeAlbumSourceDir` is called, and the returned MCP error MUST include
  enough context to identify the source-root restriction.
- **FR-8** Invalid MCP tool arguments MUST fail request validation before any
  filesystem operation or domain operation is invoked.
- **FR-9** The MCP endpoint MUST NOT expose a generic command execution tool,
  arbitrary filesystem read/write tool, or any non-summarization operation.
- **FR-10** The Bruno collection MUST include live requests that initialize the
  MCP endpoint, list tools, call `manage_albums_summarize_source_dir`
  successfully, and validate a path-traversal rejection.

## 5. Non-Functional Requirements

- **NFR-1 (lint after every source code file modification)** After every
  modification of a source code file (for example, a `.ts` file),
  `npm run lint -- <modified-file>` MUST be run so only the modified file is
  linted, and any reported issues MUST be fixed before moving on. This applies
  per source-code edit, not per-task. Whole-codebase `npm run lint` MUST be
  reserved for final verification after all TypeScript modifications are
  complete.
- **NFR-2 (no `npx`)** `npx` is forbidden in all forms. Any command line
  containing the substring `npx` is a violation. Use `./node_modules/.bin/<tool>`
  or `npm run <script>` exclusively.
- **NFR-3 (typecheck)** `npm run build` MUST exit 0 after the spec is complete.
- **NFR-4 (tests)** `npm test` MUST exit 0 after the spec is complete.
- **NFR-5 (Bruno smoke)** The MCP Bruno requests MUST pass against a live
  `web serve` process rooted at `etc/1-source-files/` and
  `etc/2-destination-files/`.
- **NFR-6 (strict TypeScript)** New TypeScript MUST use strict types, no `any`,
  and no `// @ts-...` escapes.
- **NFR-7 (file size)** No TypeScript file produced by this spec MAY exceed 200
  lines.
- **NFR-8 (dependency discipline)** The only permitted new runtime dependency is
  `@modelcontextprotocol/sdk`, and it MUST be added only if not already present.
- **NFR-9 (scope discipline)** Final diffs MUST be limited to the in-scope paths
  in section 3 unless the user explicitly approves a scope expansion.
- **NFR-10 (local MCP safety)** The MCP HTTP endpoint MUST reject unsafe
  cross-origin browser requests using an Origin-header policy appropriate for a
  local filesystem server.

## 6. Acceptance Criteria

1. Starting `npm run web:serve -- --source-dir etc/1-source-files --dest-dir etc/2-destination-files --host 127.0.0.1 --port 3000` exposes `/mcp`.
2. `tools/list` returns exactly one tool named
   `manage_albums_summarize_source_dir`.
3. `tools/call` for `manage_albums_summarize_source_dir` with
   `dirName: "."` and `ignoreNonAudioFiles: true` returns album summary rows.
4. A traversal call such as `dirName: ".."` does not call the domain operation
   and returns an MCP error result or JSON-RPC error.
5. `cd collections/harmonia-aquila-web && ../../node_modules/.bin/bru run . -r --env local --bail` exits 0.
6. `npm run lint`, `npm run build`, and `npm test` exit 0.
