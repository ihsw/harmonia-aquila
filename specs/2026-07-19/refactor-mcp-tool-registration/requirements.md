# Requirements: Refactor MCP Tool Registration

## 1. Background

The current web-scoped MCP implementation registers `manage_albums_summarize_source_dir` inline inside `src/web/servers/mcp-server.ts`. That was appropriate while there was only one tool, but the project already exposes additional REST-backed operations through `manage-albums` and `manage-audiobooks` controllers. Adding those MCP tools directly to `WebMcpServerFactory.createServer()` would make the server factory large and hard to audit.

The 2026-07-19 spec `reorganize-web-files` established responsibility-based `src/web/**` folders, including `servers`, `schemas`, and `providers`. This spec builds on that layout by extracting MCP tool definitions into dedicated subfolders and subfiles so `server.registerTool` can eventually be driven by a simple `Array.reduce()` over tool registrations.

## 2. Goal

MCP tool registration MUST become data-driven: each tool lives in a focused file, tool groups are composed through typed arrays, and `WebMcpServerFactory` registers tools by reducing over a single tool-registration array. Existing MCP behavior MUST remain unchanged while the structure prepares for tools matching existing `manage-albums` and `manage-audiobooks` functionality.

## 3. Scope

### In scope

- `src/web/servers/mcp-server.ts` refactor from inline registration to typed array-driven registration.
- New MCP tool definition files under `src/web/servers/mcp-tools/**` or an equivalent subfolder under `src/web/servers/**`.
- New or moved MCP tool schemas under `src/web/schemas/mcp/**` or equivalent subfolders.
- Unit test import updates and coverage under `__tests__/web/**`.
- Bruno MCP collection updates only if tool metadata ordering or exported schema paths change assertions.
- Directly related spec/task documentation updates under this spec.

### Out of scope

- Implementing the remaining `manage-albums` or `manage-audiobooks` MCP tools in this spec.
- Changing `/mcp` HTTP method behavior, local-origin enforcement, JSON-RPC protocol flow, or MCP transport setup.
- Changing existing REST controllers, REST routes, REST request schemas, or domain functions.
- Changing the existing `manage_albums_summarize_source_dir` tool name, title, description, input schema semantics, read-only annotation, or response content shape.
- Adding dependencies or changing package metadata.
- Introducing a non-web stdio MCP server.

## 4. Functional Requirements

- **FR-1** `WebMcpServerFactory.createServer()` MUST register tools by reducing over a typed readonly array of MCP tool registrations instead of calling `server.registerTool(...)` inline for each tool.
- **FR-2** The existing `manage_albums_summarize_source_dir` tool MUST move into a dedicated tool definition file without changing its tool name, title, description, annotations, input schema, handler behavior, or returned content shape.
- **FR-3** Tool definitions MUST receive required web dependencies, including `WebPathResolver`, through an explicit context object rather than importing singleton runtime state.
- **FR-4** The tool registration type MUST be reusable for future tools and MUST model the fields needed by `server.registerTool`: name, metadata/options, and handler.
- **FR-5** The tool folder structure MUST group future tool definitions by functional area, with at least manage-albums and manage-audiobooks group entrypoints planned even if only the current album summarize tool is implemented now.
- **FR-6** Existing MCP unit tests and Bruno assertions MUST continue to observe exactly one registered tool until a future spec explicitly adds more tools.
- **FR-7** The refactor MUST include an explicit future-tool mapping table in `design.md` for the existing manage-albums and manage-audiobooks functionality.
- **FR-8** The implementation MUST NOT duplicate domain option mapping logic between the old inline registration and the new tool file; there must be one active implementation of the current tool handler.

## 5. Non-Functional Requirements

- **NFR-1 — Lint after every source code file modification** After every modification of a source code file (for example, a `.ts` file) under `src/**` or `__tests__/**`, `npm run lint -- <modified-file>` MUST be run so only the modified file is linted, and any reported issues MUST be fixed before moving on. This applies per source-code edit, not per-task. Whole-codebase `npm run lint` MUST be reserved for final verification after all TypeScript modifications are complete.
- **NFR-2 — Typecheck** `npm run build` MUST exit 0 after the spec is complete.
- **NFR-3 — Tests** `npm test` MUST exit 0 after the spec is complete.
- **NFR-4 — No `npx`** `npx` is forbidden in all forms. Any command line containing the substring `npx` is a violation. Use `./node_modules/.bin/<tool>` or `npm run <script>` exclusively.
- **NFR-5 — File size** No new or modified source file SHOULD exceed 200 lines; extract tool definitions, schemas, and shared types instead of growing `mcp-server.ts`.
- **NFR-6 — Type safety** Strict TypeScript MUST be preserved; no `any`, no `// @ts-...` escapes, and no broad casts around MCP handler signatures unless isolated and justified by SDK typing limitations already present in `mcp-server.ts`.
- **NFR-7 — No new dependencies** The implementation MUST use existing packages and MUST NOT modify `package.json` or `package-lock.json`.
- **NFR-8 — Behavioral parity** Existing `/mcp` initialize, `tools/list`, `tools/call`, traversal failure, invalid input failure, local-origin rejection, and response text content behavior MUST remain unchanged.
- **NFR-9 — Scope discipline** `git --no-pager diff --stat -- src/web __tests__/web collections/harmonia-aquila-web` MUST list only MCP registration refactor files and directly necessary test/collection import updates.

## 6. Acceptance Criteria

1. `src/web/servers/mcp-server.ts` contains no direct per-tool `server.registerTool(...)` call; registration is performed by reducing over a typed tool-registration array.
2. The current summarize source directory MCP tool lives in a dedicated tool file and is exported through a manage-albums tool group.
3. `tools/list` still returns exactly `manage_albums_summarize_source_dir`.
4. `npm run lint`, `npm run build`, `npm test`, and the existing Bruno collection all exit 0.
