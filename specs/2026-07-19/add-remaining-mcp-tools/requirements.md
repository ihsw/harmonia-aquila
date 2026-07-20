# Requirements: Add Remaining MCP Tools

## 1. Background

The web-scoped MCP endpoint currently exposes only `manage_albums_summarize_source_dir`. The 2026-07-19 spec `refactor-mcp-tool-registration` prepared `src/web/servers/mcp-tools/**` and `src/web/schemas/mcp/**` so tools can be added as focused files and registered through the existing array/reduce registry.

The REST web controllers already expose the remaining `manage-albums` and `manage-audiobooks` functionality through typed Zod request schemas, `WebPathResolver`, and shared domain functions under `src/lib/**`. This spec adds MCP tools for that same functionality while preserving the MCP endpoint, transport, and existing summarize tool behavior.

## 2. Goal

The MCP `tools/list` response MUST expose tools matching all existing `manage-albums` and `manage-audiobooks` web functionality, and each tool MUST call the same shared domain function with equivalent option mapping, path-root enforcement, dry-run defaults, and error behavior.

## 3. Scope

### In scope

- MCP tool schemas under `src/web/schemas/mcp/**`.
- MCP tool definitions under `src/web/servers/mcp-tools/manage-albums/**` and `src/web/servers/mcp-tools/manage-audiobooks/**`.
- Shared MCP tool helpers under `src/web/servers/mcp-tools/**` if needed to avoid duplicated response or option mapping code.
- Web MCP tests under `__tests__/web/**`.
- Bruno MCP collection requests under `collections/harmonia-aquila-web/mcp/**`.
- `docs/mcp-server.md` only if the current tool surface description needs updating.

### Out of scope

- Changing REST route paths, REST request schemas, REST response shapes, or REST controller behavior.
- Changing CLI command behavior or shared domain function behavior under `src/lib/**`.
- Adding dependencies or changing package metadata.
- Changing `/mcp` transport setup, local-origin enforcement, protocol version handling, or Streamable HTTP session behavior.
- Implementing a separate stdio MCP server.
- Adding write/execution side effects beyond what existing domain functions already perform when `execute: true` is supplied.

## 4. Functional Requirements

- **FR-1** `tools/list` MUST expose exactly nine tools: three `manage-albums` tools and six `manage-audiobooks` tools matching the operation map in `design.md`.
- **FR-2** Each MCP tool MUST have a stable snake_case name derived from the existing command/route name and MUST be grouped under the existing manage-albums or manage-audiobooks registry entrypoint.
- **FR-3** Each tool input schema MUST validate the same field names and types accepted by the corresponding REST JSON body or query contract, adjusted only where MCP structured input naturally uses booleans/numbers instead of query strings.
- **FR-4** Each tool handler MUST call the same shared domain function as the corresponding REST controller and MUST preserve option defaults such as `jobs: "16"` and `concurrency: "4"` where the REST controller currently applies them.
- **FR-5** Path-bearing inputs MUST be resolved through `WebPathResolver.resolveSource` or `WebPathResolver.resolveDest` with the same field names and source/destination root semantics as REST controllers.
- **FR-6** Tools whose REST body forbids `sourceDir` and/or `destDir` overrides MUST NOT expose those fields in MCP schemas; source/destination roots MUST continue to come from `web serve --source-dir` and `--dest-dir`.
- **FR-7** Successful tool calls MUST return MCP text content containing JSON for the domain rows/results so existing clients and Bruno can parse the content consistently.
- **FR-8** Validation, traversal, and domain `UserInputError` failures MUST remain observable through the existing MCP tool error shape and MUST include useful field/root context.
- **FR-9** Existing `manage_albums_summarize_source_dir` behavior MUST remain unchanged except that `tools/list` now includes the additional tools.
- **FR-10** Bruno and unit coverage MUST prove at least one happy path and one invalid/path failure for every new tool group, with focused per-tool assertions for option mapping that differs from REST defaults.

## 5. Non-Functional Requirements

- **NFR-1 — Lint after every source code file modification** After every modification of a source code file (for example, a `.ts` file) under `src/**` or `__tests__/**`, `npm run lint -- <modified-file>` MUST be run so only the modified file is linted, and any reported issues MUST be fixed before moving on. This applies per source-code edit, not per-task. Whole-codebase `npm run lint` MUST be reserved for final verification after all TypeScript modifications are complete.
- **NFR-2 — Typecheck** `npm run build` MUST exit 0 after the spec is complete.
- **NFR-3 — Tests** `npm test` MUST exit 0 after the spec is complete.
- **NFR-4 — No `npx`** `npx` is forbidden in all forms. Any command line containing the substring `npx` is a violation. Use `./node_modules/.bin/<tool>` or `npm run <script>` exclusively.
- **NFR-5 — File size** No new or modified source file SHOULD exceed 200 lines; split schemas and tools by operation/group instead of growing large registry files.
- **NFR-6 — Type safety** Strict TypeScript MUST be preserved; no `any`, no `// @ts-...` escapes, and no broad casts around MCP handler input.
- **NFR-7 — No new dependencies** The implementation MUST use existing packages and MUST NOT modify `package.json` or `package-lock.json`.
- **NFR-8 — Behavioral parity** MCP tool handlers MUST preserve domain option mapping, path-root restrictions, dry-run/execute behavior, and JSON text content shape relative to existing REST/domain behavior.
- **NFR-9 — Scope discipline** `git --no-pager diff --stat -- src/web __tests__/web collections/harmonia-aquila-web docs/mcp-server.md` MUST list only expected MCP tool, test, collection, and directly related doc updates.

## 6. Acceptance Criteria

1. `tools/list` returns exactly the nine expected MCP tool names in deterministic group order.
2. Each new tool has a dedicated schema export and tool definition file or a justified grouped file that stays under 200 lines.
3. `npm run lint`, `npm run build`, and `npm test` exit 0.
4. `cd collections/harmonia-aquila-web && ../../node_modules/.bin/bru run . -r --env local --bail` passes against a live `web serve` process.
