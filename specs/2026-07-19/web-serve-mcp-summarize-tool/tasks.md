# Tasks: Web Serve MCP Summarize Tool

> ## Hard constraints (re-read before starting)
>
> - **DO NOT START** any task below until the user explicitly directs you to.
>   This file is delivered as a plan, not as a work order.
> - **No `npx`** in any form. Forbidden in **all** invocations
>   (no `--no-install`, no one-off Vitest/tsc runs, etc.). Any command line
>   containing the substring `npx` is a violation and must be rewritten before
>   execution. Use `./node_modules/.bin/<tool>` or `npm run <script>`
>   exclusively.
> - **No edits outside `package.json`, `package-lock.json`, `src/web/**`,
>   `__tests__/web/**`, `collections/harmonia-aquila-web/**`,
>   `docs/mcp-server.md`, and `docs/testing.md`** for the duration of this spec
>   (NFR-9). If a real bug surfaces elsewhere, STOP and surface it; do not patch
>   silently.
> - After **every** source code file modification (for example, a `.ts` edit),
>   run `npm run lint -- <modified-file>` and fix any reported issues before
>   moving on (NFR-1). This MUST lint only the file just modified. Do this per
>   source-code edit, not per-task.
> - Run whole-codebase `npm run lint` only as a last-call verification after all
>   TypeScript modifications are complete. Do not use whole-codebase lint as a
>   pre-flight baseline.
> - Mark the matching `- [x]` checkbox **immediately** when each task is
>   finished, so progress is resumable.

## Phase 1 - Pre-flight

### 1.1 Confirm current MCP and web baseline

- [x] Do **not** run whole-codebase `npm run lint` as a pre-flight baseline;
      reserve it for final verification after all TypeScript modifications are
      complete.
- [x] Inspect `package.json` and `package-lock.json` to confirm whether
      `@modelcontextprotocol/sdk` is already installed.
- [x] Inspect `src/web/app.module.ts`, `src/web/main.ts`,
      `src/web/manage-albums.controller.ts`, `src/web/path-resolver.ts`, and
      `src/web/request-schemas.ts`.
- [x] Inspect `collections/harmonia-aquila-web/**` and `docs/testing.md` for
      existing Bruno conventions.
- [x] Run `./node_modules/.bin/vitest run __tests__/web` and capture the
      baseline pass/fail count.

## Phase 2 - Dependency and MCP server layer

### 2.1 Add MCP SDK only if needed

- [x] If `@modelcontextprotocol/sdk` is absent, run
      `npm install @modelcontextprotocol/sdk` to update `package.json` and
      `package-lock.json`.
- [x] If the SDK is already present, do not modify package metadata.
- [x] Confirm no other dependency was added.

### 2.2 Add MCP schemas

- [x] Create `src/web/mcp-schemas.ts` with typed Zod schemas for
      `manage_albums_summarize_source_dir` input and any protocol-facing helper
      types needed by the controller.
- [x] Ensure `limit` is accepted as a non-negative integer and transformed to
      the existing domain string option only in the handler layer.
- [x] Run `npm run lint -- src/web/mcp-schemas.ts`. Fix issues. Re-run until
      clean.

### 2.3 Add MCP tool/server factory

- [x] Create `src/web/mcp-server.ts` to register exactly one MCP tool named
      `manage_albums_summarize_source_dir`.
- [x] Wire the handler to `WebPathResolver.resolveSource` and
      `summarizeAlbumSourceDir`.
- [x] Ensure invalid input and path traversal errors are returned through the
      chosen MCP error shape without invoking the domain function.
- [x] Run `npm run lint -- src/web/mcp-server.ts`. Fix issues. Re-run until
      clean.

## Phase 3 - Web controller wiring

### 3.1 Add `/mcp` Nest controller

- [x] Create `src/web/mcp.controller.ts` with POST handling for MCP messages and
      GET behavior that returns 405 unless SSE support is explicitly
      implemented.
- [x] Add local-origin validation before protocol handling.
- [x] Run `npm run lint -- src/web/mcp.controller.ts`. Fix issues. Re-run until
      clean.

### 3.2 Register the controller

- [x] Update `src/web/app.module.ts` so `createAppModule` registers the MCP
      controller and any web-scoped MCP provider.
- [x] Run `npm run lint -- src/web/app.module.ts`. Fix issues. Re-run until
      clean.

## Phase 4 - Unit and integration tests

### 4.1 Add MCP web tests

- [x] Create `__tests__/web/mcp.controller.test.ts` or equivalent focused web
      tests for initialize/tool listing, successful tool call, invalid input,
      traversal rejection, and unsafe Origin rejection.
- [x] Assert `tools/list` exposes exactly one tool:
      `manage_albums_summarize_source_dir`.
- [x] Assert traversal and invalid input do not call `summarizeAlbumSourceDir`.
- [x] Run `npm run lint -- __tests__/web/mcp.controller.test.ts`. Fix issues.
      Re-run until clean.

### 4.2 Update bootstrap tests only if useful

- [x] If route-level bootstrap coverage is added, update
      `__tests__/web/bootstrap.test.ts` without duplicating all MCP behavior.
- [x] If modified, run `npm run lint -- __tests__/web/bootstrap.test.ts`. Fix
      issues. Re-run until clean.
- [x] Run `./node_modules/.bin/vitest run __tests__/web`.

## Phase 5 - Bruno MCP collection

### 5.1 Add local environment variables

- [x] Update `collections/harmonia-aquila-web/environments/local.yml` with MCP
      variables such as `mcpProtocolVersion`, `mcpRequestId`, and any
      session variable needed by the implemented SDK flow.
- [x] Keep existing REST variables intact.

### 5.2 Add MCP requests

- [x] Add `collections/harmonia-aquila-web/mcp/initialize.yml`.
- [x] Add `collections/harmonia-aquila-web/mcp/initialized.yml` only if the
      implemented MCP session flow requires the initialized notification.
- [x] Add `collections/harmonia-aquila-web/mcp/tools-list.yml`.
- [x] Add
      `collections/harmonia-aquila-web/mcp/call-manage-albums-summarize-source-dir.yml`.
- [x] Add
      `collections/harmonia-aquila-web/mcp/call-manage-albums-summarize-source-dir-path-traversal.yml`.
- [x] Assert status codes, JSON-RPC ids, exact tool count/name, successful tool
      content array parsing, and traversal/source-root failure semantics.

## Phase 6 - Documentation

### 6.1 Update directly related docs

- [x] Update `docs/mcp-server.md` to distinguish this scoped `web serve` MCP
      endpoint from the broader future stdio MCP server, if the current doc
      would otherwise be misleading.
- [x] Update `docs/testing.md` with MCP Bruno smoke instructions if the existing
      Bruno section does not cover the new requests clearly.

## Phase 7 - Verification

### 7.1 Focused verification

- [x] `./node_modules/.bin/vitest run __tests__/web` - exit 0.
- [x] `npm run build` - exit 0 before live Bruno verification.

### 7.2 Live Bruno verification

- [x] Start
      `npm run web:serve -- --source-dir etc/1-source-files --dest-dir etc/2-destination-files --host 127.0.0.1 --port 3000`
      and capture the specific PID.
- [x] `cd collections/harmonia-aquila-web && ../../node_modules/.bin/bru run . -r --env local --bail`
      - exit 0.
- [x] Stop the captured `web serve` PID using `kill <PID>`.

### 7.3 Full verification

- [x] `npm run lint` - whole-codebase last-call lint after all TypeScript
      modifications are complete; exit 0.
- [x] `npm run build` - exit 0.
- [x] `npm test` - exit 0.
- [x] `git --no-pager diff --stat -- package.json package-lock.json src/web __tests__/web collections/harmonia-aquila-web docs/mcp-server.md docs/testing.md`
      lists only expected files.
