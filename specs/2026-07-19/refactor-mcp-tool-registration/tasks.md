# Tasks: Refactor MCP Tool Registration

> ## Hard constraints (re-read before starting)
>
> - **DO NOT START** any task below until the user explicitly directs you to.
>   This file is delivered as a plan, not as a work order.
> - **No `npx`** in any form. Forbidden in **all** invocations
>   (no `--no-install`, no one-off Vitest/tsc runs, etc.). Any command line
>   containing the substring `npx` is a violation and must be rewritten before
>   execution. Use `./node_modules/.bin/<tool>` or `npm run <script>`
>   exclusively.
> - **No edits outside MCP-related files under `src/web/**`, web MCP tests under
>   `__tests__/web/**`, and Bruno MCP collection files** for this spec unless a
>   blocker is found and the user explicitly approves expanding scope.
> - After **every** source code file modification (for example, a `.ts` edit),
>   run `npm run lint -- <modified-file>` and fix any reported issues before
>   moving on (NFR-1). This MUST lint only the file just modified. Do this per
>   source-code edit, not per-task.
> - Run whole-codebase `npm run lint` only as a last-call verification after all
>   TypeScript modifications are complete, including not using whole-codebase
>   lint as a pre-flight baseline.
> - Mark the matching `- [x]` checkbox **immediately** when each task is
>   finished, so progress is resumable.

## Phase 1 — Pre-flight

### 1.1 Confirm current MCP surface

- [ ] Inspect `src/web/servers/mcp-server.ts`, `src/web/schemas/mcp-schemas.ts`, `src/web/controllers/mcp.controller.ts`, and `__tests__/web/mcp.controller.test.ts`.
- [ ] Inspect current `manage-albums` and `manage-audiobooks` controller/domain operation names for the future tool map.
- [ ] Do **not** run whole-codebase `npm run lint` as a pre-flight baseline; reserve it for final verification.

### 1.2 Confirm scope and existing worktree

- [ ] Check `git --no-pager status --short` and avoid reverting unrelated user changes.
- [ ] Confirm `package.json` and `package-lock.json` do not need dependency changes for this refactor.

## Phase 2 — Shared registry shape

### 2.1 Add MCP tool shared types

- [ ] Create `src/web/servers/mcp-tools/types.ts` with `WebMcpToolContext` and a reusable tool registration type.
- [ ] Keep any MCP SDK typing workaround centralized in this file or `mcp-server.ts`; do not use `any`.
- [ ] Run `npm run lint -- src/web/servers/mcp-tools/types.ts`. Fix issues. Re-run until clean.

### 2.2 Add root tool registry entrypoint

- [ ] Create `src/web/servers/mcp-tools/index.ts` that composes all tool groups into one readonly array.
- [ ] Ensure group ordering is deterministic: manage-albums first, manage-audiobooks second.
- [ ] Run `npm run lint -- src/web/servers/mcp-tools/index.ts`. Fix issues. Re-run until clean.

## Phase 3 — Schema organization

### 3.1 Move current MCP album schema

- [ ] Move `MANAGE_ALBUMS_SUMMARIZE_SOURCE_DIR_TOOL_NAME` and `manageAlbumsSummarizeSourceDirInputSchema` into `src/web/schemas/mcp/manage-albums.ts`.
- [ ] Add `src/web/schemas/mcp/index.ts` only if it improves imports without duplicating constants.
- [ ] Delete or reduce `src/web/schemas/mcp-schemas.ts` so there is not a second active definition of the same constants.
- [ ] Run `npm run lint -- src/web/schemas/mcp/manage-albums.ts`. Fix issues. Re-run until clean.
- [ ] If created, run `npm run lint -- src/web/schemas/mcp/index.ts`. Fix issues. Re-run until clean.

## Phase 4 — Tool groups

### 4.1 Extract summarize source directory tool

- [ ] Create `src/web/servers/mcp-tools/manage-albums/summarize-source-dir.ts`.
- [ ] Move the current inline metadata and handler for `manage_albums_summarize_source_dir` into the new tool factory.
- [ ] Preserve `WebPathResolver.resolveSource`, `optionalEntry`, `limit` number-to-string conversion, JSON text response content, and read-only annotation behavior.
- [ ] Run `npm run lint -- src/web/servers/mcp-tools/manage-albums/summarize-source-dir.ts`. Fix issues. Re-run until clean.

### 4.2 Add manage-albums group

- [ ] Create `src/web/servers/mcp-tools/manage-albums/index.ts`.
- [ ] Export a function that returns a readonly array containing only the summarize source directory tool registration for now.
- [ ] Run `npm run lint -- src/web/servers/mcp-tools/manage-albums/index.ts`. Fix issues. Re-run until clean.

### 4.3 Add manage-audiobooks future group

- [ ] Create `src/web/servers/mcp-tools/manage-audiobooks/index.ts`.
- [ ] Export a function that returns an empty readonly array for now and does not register placeholder tools.
- [ ] Run `npm run lint -- src/web/servers/mcp-tools/manage-audiobooks/index.ts`. Fix issues. Re-run until clean.

## Phase 5 — Server factory refactor

### 5.1 Replace inline registration with reduce

- [ ] Update `src/web/servers/mcp-server.ts` to build `WebMcpToolContext` from injected dependencies.
- [ ] Replace the inline `server.registerTool(...)` call with `getWebMcpToolRegistrations(context).reduce(...)`.
- [ ] Keep `handleHttpRequest` transport behavior unchanged.
- [ ] Run `npm run lint -- src/web/servers/mcp-server.ts`. Fix issues. Re-run until clean.

### 5.2 Remove stale imports

- [ ] Remove direct domain, schema, and `optionalEntry` imports from `mcp-server.ts` if they are now owned by the tool file.
- [ ] Search for stale imports of `src/web/schemas/mcp-schemas.ts` and old inline schema paths.

## Phase 6 — Tests and Bruno

### 6.1 Update MCP web tests

- [ ] Update `__tests__/web/mcp.controller.test.ts` imports to the new schema path.
- [ ] Add or preserve an assertion that `tools/list` exposes exactly one tool.
- [ ] Add direct registry coverage if needed to prove empty future groups do not add tools.
- [ ] Run `npm run lint -- __tests__/web/mcp.controller.test.ts`. Fix issues. Re-run until clean.
- [ ] Run `./node_modules/.bin/vitest run __tests__/web/mcp.controller.test.ts`.

### 6.2 Update Bruno only if required

- [ ] Inspect `collections/harmonia-aquila-web/mcp/**` for assumptions affected by tool order or metadata.
- [ ] If modified, keep assertions behaviorally equivalent and run no source lint for collection YAML files.

## Phase 7 — Verification

### 7.1 Focused verification

- [ ] `./node_modules/.bin/vitest run __tests__/web` — exit 0.
- [ ] `npm run build` — exit 0 before live Bruno verification.

### 7.2 Live Bruno verification

- [ ] Start `npm run web:serve -- --source-dir etc/albums --dest-dir etc/albums/3-organized-files --host 127.0.0.1 --port 3000` and capture the specific PID.
- [ ] `cd collections/harmonia-aquila-web && ../../node_modules/.bin/bru run . -r --env local --bail` — exit 0.
- [ ] Stop the captured `web serve` PID using `kill <PID>`.

### 7.3 Full verification

- [ ] `npm run lint` — whole-codebase last-call lint after all TypeScript modifications are complete; exit 0.
- [ ] `npm run build` — exit 0.
- [ ] `npm test` — exit 0.
- [ ] `git --no-pager diff --stat -- src/web __tests__/web collections/harmonia-aquila-web` lists only expected MCP registry refactor files.

## Phase 8 — Documentation

### 8.1 Update directly related docs only

- [ ] If an existing MCP architecture document references inline tool registration in `mcp-server.ts`, update it to mention the registry pattern.
- [ ] If no such document exists, do not create broad new docs; this spec is sufficient.
