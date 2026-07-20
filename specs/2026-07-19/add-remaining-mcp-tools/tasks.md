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

- [ ] Inspect `src/web/servers/mcp-tools/**`, `src/web/schemas/mcp/**`, and `src/web/servers/mcp-server.ts`.
- [ ] Inspect the manage-albums and manage-audiobooks REST controllers for option mapping parity.
- [ ] Do **not** run whole-codebase `npm run lint` as a pre-flight baseline; reserve it for final verification.

### 1.2 Confirm worktree scope

- [ ] Check `git --no-pager status --short` and avoid reverting unrelated user changes.
- [ ] Confirm `package.json` and `package-lock.json` remain out of scope.

## Phase 2 — Shared MCP helpers

### 2.1 Add or confirm shared response helper

- [ ] If repeated JSON text-content construction appears in more than two tools, add `src/web/servers/mcp-tools/helpers.ts`.
- [ ] Keep helper exports typed without `any` and compatible with MCP `CallToolResult`.
- [ ] If created, run `npm run lint -- src/web/servers/mcp-tools/helpers.ts`. Fix issues. Re-run until clean.

## Phase 3 — Manage-albums tools

### 3.1 Add album MCP schemas

- [ ] Add tool name constants and input schemas for `manage_albums_fix_tags` and `manage_albums_organize_files` in `src/web/schemas/mcp/manage-albums.ts`.
- [ ] Preserve the existing summarize source directory schema and tool name.
- [ ] Run `npm run lint -- src/web/schemas/mcp/manage-albums.ts`. Fix issues. Re-run until clean.

### 3.2 Add fix-tags tool

- [ ] Create `src/web/servers/mcp-tools/manage-albums/fix-tags.ts`.
- [ ] Map input fields to `fixAlbumTags` with configured `sourceDir` and `destDir`, excluding root override inputs.
- [ ] Preserve optional option handling and `execute` dry-run behavior.
- [ ] Run `npm run lint -- src/web/servers/mcp-tools/manage-albums/fix-tags.ts`. Fix issues. Re-run until clean.

### 3.3 Add organize-files tool

- [ ] Create `src/web/servers/mcp-tools/manage-albums/organize-files.ts`.
- [ ] Map input fields to `organizeAlbumFiles` with configured `sourceDir` and `destDir`, excluding root override inputs.
- [ ] Preserve optional option handling and `execute` dry-run behavior.
- [ ] Run `npm run lint -- src/web/servers/mcp-tools/manage-albums/organize-files.ts`. Fix issues. Re-run until clean.

### 3.4 Update album tool group

- [ ] Update `src/web/servers/mcp-tools/manage-albums/index.ts` to return summarize, fix-tags, and organize-files in deterministic order.
- [ ] Run `npm run lint -- src/web/servers/mcp-tools/manage-albums/index.ts`. Fix issues. Re-run until clean.

## Phase 4 — Manage-audiobooks tools

### 4.1 Add audiobook MCP schemas

- [ ] Create `src/web/schemas/mcp/manage-audiobooks.ts` with tool name constants and input schemas for all six audiobook tools.
- [ ] Update `src/web/schemas/mcp/index.ts` to export audiobook schemas.
- [ ] Run `npm run lint -- src/web/schemas/mcp/manage-audiobooks.ts`. Fix issues. Re-run until clean.
- [ ] Run `npm run lint -- src/web/schemas/mcp/index.ts`. Fix issues. Re-run until clean.

### 4.2 Add validate and crawl tools

- [ ] Create `src/web/servers/mcp-tools/manage-audiobooks/validate.ts`.
- [ ] Create `src/web/servers/mcp-tools/manage-audiobooks/crawl.ts`.
- [ ] Resolve `fileName`/`dirName` through `WebPathResolver.resolveSource` and call the matching domain functions.
- [ ] Run `npm run lint -- src/web/servers/mcp-tools/manage-audiobooks/validate.ts`. Fix issues. Re-run until clean.
- [ ] Run `npm run lint -- src/web/servers/mcp-tools/manage-audiobooks/crawl.ts`. Fix issues. Re-run until clean.

### 4.3 Add copy-and-rename and convert-file tools

- [ ] Create `src/web/servers/mcp-tools/manage-audiobooks/copy-and-rename.ts`.
- [ ] Create `src/web/servers/mcp-tools/manage-audiobooks/convert-file.ts`.
- [ ] Resolve source file paths, use configured `destDir`, preserve `execute`, and default `jobs`/`concurrency` to REST-equivalent strings where omitted.
- [ ] Run `npm run lint -- src/web/servers/mcp-tools/manage-audiobooks/copy-and-rename.ts`. Fix issues. Re-run until clean.
- [ ] Run `npm run lint -- src/web/servers/mcp-tools/manage-audiobooks/convert-file.ts`. Fix issues. Re-run until clean.

### 4.4 Add merge and set-metadata tools

- [ ] Create `src/web/servers/mcp-tools/manage-audiobooks/merge.ts`.
- [ ] Create `src/web/servers/mcp-tools/manage-audiobooks/set-metadata.ts`.
- [ ] Use configured roots for merge and resolve source/destination file paths for set-metadata.
- [ ] Run `npm run lint -- src/web/servers/mcp-tools/manage-audiobooks/merge.ts`. Fix issues. Re-run until clean.
- [ ] Run `npm run lint -- src/web/servers/mcp-tools/manage-audiobooks/set-metadata.ts`. Fix issues. Re-run until clean.

### 4.5 Update audiobook tool group

- [ ] Update `src/web/servers/mcp-tools/manage-audiobooks/index.ts` to return all six tools in deterministic order.
- [ ] Run `npm run lint -- src/web/servers/mcp-tools/manage-audiobooks/index.ts`. Fix issues. Re-run until clean.

## Phase 5 — Tests

### 5.1 Update MCP tool-list tests

- [ ] Update web MCP tests to expect exactly nine tool names in deterministic order.
- [ ] If `__tests__/web/mcp.controller.test.ts` exceeds 200 lines, split MCP tests by group before adding broad coverage.
- [ ] Run `npm run lint -- <modified-test-file>` for each modified test file. Fix issues. Re-run until clean.

### 5.2 Add manage-albums MCP handler tests

- [ ] Add tests proving fix-tags and organize-files call the expected domain mocks with configured roots and mapped options.
- [ ] Add at least one invalid input or domain error case that preserves MCP error shape.
- [ ] Run `./node_modules/.bin/vitest run __tests__/web`.

### 5.3 Add manage-audiobooks MCP handler tests

- [ ] Add tests for validate, crawl, copy-and-rename, convert-file, merge, and set-metadata option/path mapping.
- [ ] Add traversal/error coverage for source and destination path handling.
- [ ] Run `./node_modules/.bin/vitest run __tests__/web`.

## Phase 6 — Bruno MCP collection

### 6.1 Update tools-list request

- [ ] Update `collections/harmonia-aquila-web/mcp/tools-list.yml` to assert exactly nine expected tool names.
- [ ] Keep initialize request behavior unchanged.

### 6.2 Add representative MCP tool calls

- [ ] Add Bruno MCP requests for album fix-tags and organize-files.
- [ ] Add Bruno MCP requests for representative audiobook happy paths and contract/path failures listed in `design.md` §7.2.
- [ ] Keep assertions semantic and specific: status, JSON-RPC id, tool content parseability, tool count/name, and source/destination root messages.

## Phase 7 — Documentation

### 7.1 Update current MCP surface docs

- [ ] Update `docs/mcp-server.md` if it still says the web `/mcp` endpoint is limited to one tool.
- [ ] Do not document the future stdio MCP server as implemented.

## Phase 8 — Verification

### 8.1 Focused verification

- [ ] `./node_modules/.bin/vitest run __tests__/web` — exit 0.
- [ ] `npm run build` — exit 0 before live Bruno verification.

### 8.2 Live Bruno verification

- [ ] Start `npm run web:serve -- --source-dir etc/albums --dest-dir etc/albums/3-organized-files --host 127.0.0.1 --port 3000` and capture the specific PID.
- [ ] `cd collections/harmonia-aquila-web && ../../node_modules/.bin/bru run . -r --env local --bail` — exit 0.
- [ ] Stop the captured `web serve` PID using `kill <PID>`.

### 8.3 Full verification

- [ ] `npm run lint` — whole-codebase last-call lint after all TypeScript modifications are complete; exit 0.
- [ ] `npm run build` — exit 0.
- [ ] `npm test` — exit 0.
- [ ] `git --no-pager diff --stat -- src/web __tests__/web collections/harmonia-aquila-web docs/mcp-server.md` lists only expected MCP tool, test, collection, and doc files.
