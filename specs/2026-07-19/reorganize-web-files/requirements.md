# Requirements: Reorganize Web Files

## 1. Background

`src/web/` currently keeps NestJS controllers, app bootstrap, request schemas, MCP server code, HTTP error mapping, and path resolution in a single flat directory. The directory is still small, but recent web specs added Zod-backed validation and MCP support, so the flat layout now mixes several responsibilities that will become harder to navigate as more routes or tools are added.

This spec reorganizes only the `src/web/**` source layout into logical subdirectories such as `controllers`, `schemas`, `modules`, `providers`, and `servers`. The refactor MUST preserve current route behavior, MCP behavior, importable TypeScript symbols, and `web serve` runtime behavior while improving file discoverability.

## 2. Goal

`src/web/` MUST be reorganized into responsibility-based subdirectories with updated imports and tests, while all existing web routes, MCP endpoint behavior, validation semantics, JSON response shapes, and path-root protections remain unchanged.

## 3. Scope

### In scope

- Moving existing `src/web/*.ts` files into logical subdirectories under `src/web/**`.
- Updating imports within `src/web/**`, `src/commands/web/**`, and `__tests__/web/**` that reference moved files.
- Updating any web-focused test mocks or module imports required by the new paths.
- Updating directly related documentation only if it already references the old flat `src/web/` filenames.

### Out of scope

- Changing route paths, HTTP methods, status codes, JSON response shapes, or Bruno collection request contracts.
- Changing validation logic, Zod schema behavior, path traversal checks, MCP tool schema behavior, or shared library function behavior.
- Adding, removing, or changing runtime/development dependencies.
- Moving non-web files outside import updates required to keep moved web files compiling.
- Renaming exported classes/functions unless required to avoid misleading names after a move.
- Replacing NestJS, MCP SDK, or Zod patterns.

## 4. Functional Requirements

- **FR-1** The implementation MUST move `src/web` files into responsibility-based subdirectories and leave no controller, schema, provider, module, server bootstrap, or HTTP utility file stranded at the root unless `design.md` explicitly marks it as a root barrel.
- **FR-2** The new layout MUST include `controllers`, `schemas`, `modules`, `providers`, and `servers` groupings, with equivalent names if a file's responsibility makes a plural/singular variation clearer.
- **FR-3** All imports in `src/web/**`, `src/commands/web/**`, and `__tests__/web/**` MUST resolve to the moved files without compatibility shims that duplicate implementation logic.
- **FR-4** Existing HTTP routes MUST keep the same controller paths, methods, request parsing behavior, successful response bodies, and error envelope shapes.
- **FR-5** Existing MCP behavior MUST keep the same `/mcp` endpoint semantics, local-origin restrictions, tool name, tool input schema, and tool response content shape.
- **FR-6** `WebPathResolver` root normalization and source/destination path restriction behavior MUST remain unchanged.
- **FR-7** The final layout MUST be documented in `design.md` as an old-path to new-path mapping so future moves can be audited mechanically.
- **FR-8** Tests MUST be updated only for import paths or mocks required by the move; assertions MUST NOT be weakened to accommodate behavior changes.

## 5. Non-Functional Requirements

- **NFR-1 — Lint after every source code file modification** After every modification of a source code file (for example, a `.ts` file) under `src/**` or `__tests__/**`, `npm run lint -- <modified-file>` MUST be run so only the modified file is linted, and any reported issues MUST be fixed before moving on. This applies per source-code edit, not per-task. Whole-codebase `npm run lint` MUST be reserved for final verification after all TypeScript modifications are complete.
- **NFR-2 — Typecheck** `npm run build` MUST exit 0 after the spec is complete.
- **NFR-3 — Tests** `npm test` MUST exit 0 after the spec is complete.
- **NFR-4 — No `npx`** `npx` is forbidden in all forms. Any command line containing the substring `npx` is a violation. Use `./node_modules/.bin/<tool>` or `npm run <script>` exclusively.
- **NFR-5 — File size** No new or modified source file SHOULD exceed 200 lines; if a moved file already approaches that limit, this spec MUST NOT make it materially larger.
- **NFR-6 — Type safety** Strict TypeScript MUST be preserved; no `any`, no `// @ts-...` escapes, and no broad success-shaped fallbacks.
- **NFR-7 — No new dependencies** The implementation MUST NOT add runtime or development dependencies.
- **NFR-8 — Behavioral parity** Existing route methods, paths, validation semantics, MCP behavior, path-root restrictions, dry-run/execute behavior, and JSON response shapes MUST remain unchanged.
- **NFR-9 — Scope discipline** `git --no-pager diff --stat -- src/web src/commands/web __tests__/web` MUST list only moved web files and directly necessary import/test updates.

## 6. Acceptance Criteria

1. `src/web/**` uses the approved logical subdirectory layout from `design.md`.
2. No old root-level implementation file remains in `src/web/` unless intentionally retained as a small barrel or root entrypoint in `design.md`.
3. `npm run lint`, `npm run build`, and `npm test` exit 0.
4. The full Bruno collection passes against a live `web serve` process without route, schema, or assertion weakening.
