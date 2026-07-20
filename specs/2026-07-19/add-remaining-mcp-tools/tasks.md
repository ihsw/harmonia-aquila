# Tasks: Add Remaining MCP Tools

> ## Hard constraints (re-read before starting)
>
> - **DO NOT START** any task below until the user explicitly directs you to.
>   This file is delivered as a plan, not as a work order.
> - **No `npx`** in any form. Forbidden in **all** invocations
>   (no `--no-install`, no one-off Vitest/tsc runs, etc.). Any command line
>   containing the substring `npx` is a violation and must be rewritten before
>   execution. Use `./node_modules/.bin/<tool>` or `npm run <script>`
>   exclusively.
> - **No edits outside MCP schemas/tools under `src/web/**`, web MCP tests under
>   `__tests__/web/**`, Bruno MCP requests under
>   `collections/harmonia-aquila-web/mcp/**`, and `docs/mcp-server.md`** for this
>   spec unless a blocker is found and the user explicitly approves expanding
>   scope.
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

### 1.1 Confirm current MCP registry and domain surface

- [x] Inspect `src/web/servers/mcp-tools/**`, `src/web/schemas/mcp/**`, and `src/web/servers/mcp-server.ts`.
- [x] Inspect the manage-albums and manage-audiobooks REST controllers for option mapping parity.
- [x] Do **not** run whole-codebase `npm run lint` as a pre-flight baseline; reserve it for final verification.

### 1.2 Confirm worktree scope

- [x] Check `git --no-pager status --short` and avoid reverting unrelated user changes.
- [x] Confirm `package.json` and `package-lock.json` remain out of scope.

## Phase 2 — Shared MCP helpers

### 2.1 Add or confirm shared response helper

- [x] If repeated JSON text-content construction appears in more than two tools, add `src/web/servers/mcp-tools/helpers.ts`.
- [x] Keep helper exports typed without `any` and compatible with MCP `CallToolResult`.
- [x] If created, run `npm run lint -- src/web/servers/mcp-tools/helpers.ts`. Fix issues. Re-run until clean.

## Phase 3 — Manage-albums tools

### 3.1 Add album MCP schemas

- [x] Add tool name constants and input schemas for `manage_albums_fix_tags` and `manage_albums_organize_files` in `src/web/schemas/mcp/manage-albums.ts`.
- [x] Preserve the existing summarize source directory schema and tool name.
- [x] Run `npm run lint -- src/web/schemas/mcp/manage-albums.ts`. Fix issues. Re-run until clean.

### 3.2 Add fix-tags tool

- [x] Create `src/web/servers/mcp-tools/manage-albums/fix-tags.ts`.
- [x] Map input fields to `fixAlbumTags` with configured `sourceDir` and `destDir`, excluding root override inputs.
- [x] Preserve optional option handling and `execute` dry-run behavior.
- [x] Run `npm run lint -- src/web/servers/mcp-tools/manage-albums/fix-tags.ts`. Fix issues. Re-run until clean.

### 3.3 Add organize-files tool

- [x] Create `src/web/servers/mcp-tools/manage-albums/organize-files.ts`.
- [x] Map input fields to `organizeAlbumFiles` with configured `sourceDir` and `destDir`, excluding root override inputs.
- [x] Preserve optional option handling and `execute` dry-run behavior.
- [x] Run `npm run lint -- src/web/servers/mcp-tools/manage-albums/organize-files.ts`. Fix issues. Re-run until clean.

### 3.4 Update album tool group

- [x] Update `src/web/servers/mcp-tools/manage-albums/index.ts` to return summarize, fix-tags, and organize-files in deterministic order.
- [x] Run `npm run lint -- src/web/servers/mcp-tools/manage-albums/index.ts`. Fix issues. Re-run until clean.

## Phase 4 — Manage-audiobooks tools

### 4.1 Add audiobook MCP schemas

- [x] Create `src/web/schemas/mcp/manage-audiobooks.ts` with tool name constants and input schemas for all six audiobook tools.
- [x] Update `src/web/schemas/mcp/index.ts` to export audiobook schemas.
- [x] Run `npm run lint -- src/web/schemas/mcp/manage-audiobooks.ts`. Fix issues. Re-run until clean.
- [x] Run `npm run lint -- src/web/schemas/mcp/index.ts`. Fix issues. Re-run until clean.

### 4.2 Add validate and crawl tools

- [x] Create `src/web/servers/mcp-tools/manage-audiobooks/validate.ts`.
- [x] Create `src/web/servers/mcp-tools/manage-audiobooks/crawl.ts`.
- [x] Resolve `fileName`/`dirName` through `WebPathResolver.resolveSource` and call the matching domain functions.
- [x] Run `npm run lint -- src/web/servers/mcp-tools/manage-audiobooks/validate.ts`. Fix issues. Re-run until clean.
- [x] Run `npm run lint -- src/web/servers/mcp-tools/manage-audiobooks/crawl.ts`. Fix issues. Re-run until clean.

### 4.3 Add copy-and-rename and convert-file tools

- [x] Create `src/web/servers/mcp-tools/manage-audiobooks/copy-and-rename.ts`.
- [x] Create `src/web/servers/mcp-tools/manage-audiobooks/convert-file.ts`.
- [x] Resolve source file paths, use configured `destDir`, preserve `execute`, and default `jobs`/`concurrency` to REST-equivalent strings where omitted.
- [x] Run `npm run lint -- src/web/servers/mcp-tools/manage-audiobooks/copy-and-rename.ts`. Fix issues. Re-run until clean.
- [x] Run `npm run lint -- src/web/servers/mcp-tools/manage-audiobooks/convert-file.ts`. Fix issues. Re-run until clean.

### 4.4 Add merge and set-metadata tools

- [x] Create `src/web/servers/mcp-tools/manage-audiobooks/merge.ts`.
- [x] Create `src/web/servers/mcp-tools/manage-audiobooks/set-metadata.ts`.
- [x] Use configured roots for merge and resolve source/destination file paths for set-metadata.
- [x] Run `npm run lint -- src/web/servers/mcp-tools/manage-audiobooks/merge.ts`. Fix issues. Re-run until clean.
- [x] Run `npm run lint -- src/web/servers/mcp-tools/manage-audiobooks/set-metadata.ts`. Fix issues. Re-run until clean.

### 4.5 Update audiobook tool group

- [x] Update `src/web/servers/mcp-tools/manage-audiobooks/index.ts` to return all six tools in deterministic order.
- [x] Run `npm run lint -- src/web/servers/mcp-tools/manage-audiobooks/index.ts`. Fix issues. Re-run until clean.

## Phase 5 — Tests

### 5.1 Update MCP tool-list tests

- [x] Update web MCP tests to expect exactly nine tool names in deterministic order.
- [x] If `__tests__/web/mcp.controller.test.ts` exceeds 200 lines, split MCP tests by group before adding broad coverage.
- [x] Run `npm run lint -- <modified-test-file>` for each modified test file. Fix issues. Re-run until clean.

### 5.2 Add manage-albums MCP handler tests

- [x] Add tests proving fix-tags and organize-files call the expected domain mocks with configured roots and mapped options.
- [x] Add at least one invalid input or domain error case that preserves MCP error shape.
- [x] Run `./node_modules/.bin/vitest run __tests__/web`.

### 5.3 Add manage-audiobooks MCP handler tests

- [x] Add tests for validate, crawl, copy-and-rename, convert-file, merge, and set-metadata option/path mapping.
- [x] Add traversal/error coverage for source and destination path handling.
- [x] Run `./node_modules/.bin/vitest run __tests__/web`.

## Phase 6 — Bruno MCP collection

### 6.1 Update tools-list request

- [x] Update `collections/harmonia-aquila-web/mcp/tools-list.yml` to assert exactly nine expected tool names.
- [x] Keep initialize request behavior unchanged.

### 6.2 Add representative MCP tool calls

- [x] Add Bruno MCP requests for album fix-tags and organize-files.
- [x] Add Bruno MCP requests for representative audiobook happy paths and contract/path failures listed in `design.md` §7.2.
- [x] Keep assertions semantic and specific: status, JSON-RPC id, tool content parseability, tool count/name, and source/destination root messages.

## Phase 7 — Documentation

### 7.1 Update current MCP surface docs

- [x] Update `docs/mcp-server.md` if it still says the web `/mcp` endpoint is limited to one tool.
- [x] Do not document the future stdio MCP server as implemented.

## Phase 8 — Verification

### 8.1 Focused verification

- [x] `./node_modules/.bin/vitest run __tests__/web` — exit 0.
- [x] `npm run build` — exit 0 before live Bruno verification.

### 8.2 Live Bruno verification

- [x] Start `npm run web:serve -- --source-dir etc/albums --dest-dir etc/albums/3-organized-files --host 127.0.0.1 --port 3000` and capture the specific PID.
- [x] `cd collections/harmonia-aquila-web && ../../node_modules/.bin/bru run . -r --env local --bail` — exit 0.
- [x] Stop the captured `web serve` PID using `kill <PID>`.

### 8.3 Full verification

- [x] `npm run lint` — whole-codebase last-call lint after all TypeScript modifications are complete; exit 0.
- [x] `npm run build` — exit 0.
- [x] `npm test` — exit 0.
- [x] `git --no-pager diff --stat -- src/web __tests__/web collections/harmonia-aquila-web docs/mcp-server.md` lists only expected MCP tool, test, collection, and doc files.
