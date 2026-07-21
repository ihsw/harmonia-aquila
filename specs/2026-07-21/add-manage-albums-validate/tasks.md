# Tasks: Add Manage Albums Validate

> ## Hard constraints (re-read before starting)
>
> - **DO NOT START** any task below until the user explicitly directs you to.
>   This file is delivered as a plan, not as a work order.
> - **No `npx`** in any form. Forbidden in all invocations
>   (no `--no-install`, no one-off Vitest/tsc runs, etc.). Any command line
>   containing the substring `npx` is a violation and must be rewritten before
>   execution. Use `./node_modules/.bin/<tool>` or `npm run <script>`
>   exclusively.
> - **No edits outside** album domain/CLI/web/MCP surfaces, related tests, Bruno
>   requests, and directly related docs listed in `requirements.md` §3 unless a
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

### 1.1 Confirm current album surfaces

- [x] Inspect `src/lib/albums/**`, `src/commands/manage-albums/**`,
      `src/web/controllers/manage-albums.controller.ts`, and existing MCP
      manage-albums tools.
- [x] Inspect existing command/web/MCP tests for reusable fixture and mock
      patterns.
- [x] Do **not** run whole-codebase `npm run lint` as a pre-flight baseline;
      reserve it for final verification.

### 1.2 Confirm worktree scope

- [x] Run `git --no-pager status --short` and identify unrelated user changes
      before editing.
- [x] Confirm `package.json` and `package-lock.json` remain out of scope.

## Phase 2 — Domain validation service

### 2.1 Extract shared organization helpers

- [x] Extract strategy parsing, artist/title selection, path-segment
      sanitization, and track formatting from `organize-files.ts` only as needed
      for reuse by validation.
- [x] Preserve existing `organize-files` behavior and public row shape.
- [x] Run `npm run lint -- <modified-helper-or-organize-file>`. Fix issues.
      Re-run until clean.

### 2.2 Add `validateAlbumSourceDir`

- [x] Create `src/lib/albums/validate.ts` with the option and row types from
      `design.md` §3.
- [x] Implement read-only metadata validation, missing-field issue collection,
      relative destination planning, and duplicate destination issue detection.
- [x] Run `npm run lint -- src/lib/albums/validate.ts`. Fix issues. Re-run
      until clean.

### 2.3 Add domain tests

- [x] Create `__tests__/lib/albums/validate.test.ts` covering valid rows,
      missing metadata, duplicate destination issues, invalid limit/strategy,
      and non-audio handling.
- [x] Run `npm run lint -- __tests__/lib/albums/validate.test.ts`. Fix issues.
      Re-run until clean.
- [x] Run `./node_modules/.bin/vitest run __tests__/lib/albums/validate.test.ts`.

## Phase 3 — CLI command

### 3.1 Register `manage-albums validate`

- [x] Create `src/commands/manage-albums/validate.ts` with Commander options
      matching FR-1 and output through `writeRows`.
- [x] Update `src/commands/manage-albums/index.ts` to register validate between
      summarize and fix-tags.
- [x] Run `npm run lint -- src/commands/manage-albums/validate.ts`. Fix issues.
      Re-run until clean.
- [x] Run `npm run lint -- src/commands/manage-albums/index.ts`. Fix issues.
      Re-run until clean.

### 3.2 Add CLI tests

- [x] Create `__tests__/commands/manage-albums/validate.test.ts` for JSON
      output, option mapping, and `UserInputError` command handling.
- [x] Update `__tests__/commands/index-registration.test.ts` if it asserts
      command lists.
- [x] Run `npm run lint -- __tests__/commands/manage-albums/validate.test.ts`.
      Fix issues. Re-run until clean.
- [x] Run `./node_modules/.bin/vitest run __tests__/commands/manage-albums/validate.test.ts __tests__/commands/index-registration.test.ts`.

## Phase 4 — REST web controller

### 4.1 Add request schema and controller route

- [x] Add `validateAlbumQuerySchema` to
      `src/web/schemas/request-schemas.ts`, reusing existing query boolean and
      string helpers.
- [x] Add `GET /manage-albums/validate` to
      `src/web/controllers/manage-albums.controller.ts`, resolving `dirName`
      with `WebPathResolver.resolveSource`.
- [x] Run `npm run lint -- src/web/schemas/request-schemas.ts`. Fix issues.
      Re-run until clean.
- [x] Run `npm run lint -- src/web/controllers/manage-albums.controller.ts`.
      Fix issues. Re-run until clean.

### 4.2 Add REST controller tests

- [x] Update `__tests__/web/controllers.test.ts` to cover validate success,
      path traversal, and invalid query options.
- [x] Run `npm run lint -- __tests__/web/controllers.test.ts`. Fix issues.
      Re-run until clean.
- [x] Run `./node_modules/.bin/vitest run __tests__/web/controllers.test.ts`.

## Phase 5 — MCP tooling

### 5.1 Add MCP schema and tool

- [x] Add `MANAGE_ALBUMS_VALIDATE_TOOL_NAME` and
      `manageAlbumsValidateInputSchema` to
      `src/web/schemas/mcp/manage-albums.ts`.
- [x] Create `src/web/servers/mcp-tools/manage-albums/validate.ts` as a
      read-only tool that resolves `dirName`, converts numeric `limit`, and
      returns `jsonToolContent(rows)`.
- [x] Run `npm run lint -- src/web/schemas/mcp/manage-albums.ts`. Fix issues.
      Re-run until clean.
- [x] Run `npm run lint -- src/web/servers/mcp-tools/manage-albums/validate.ts`.
      Fix issues. Re-run until clean.

### 5.2 Register and test MCP tool

- [x] Update `src/web/servers/mcp-tools/manage-albums/index.ts` to return
      summarize, validate, fix-tags, organize-files.
- [x] Update `__tests__/web/mcp.manage-albums.test.ts` for tool-list order,
      successful validate calls, invalid schema input, and traversal behavior.
- [x] Run `npm run lint -- src/web/servers/mcp-tools/manage-albums/index.ts`.
      Fix issues. Re-run until clean.
- [x] Run `npm run lint -- __tests__/web/mcp.manage-albums.test.ts`. Fix
      issues. Re-run until clean.
- [x] Run `./node_modules/.bin/vitest run __tests__/web/mcp.manage-albums.test.ts`.

## Phase 6 — Bruno and docs

### 6.1 Add Bruno REST requests

- [x] Add `collections/harmonia-aquila-web/manage-albums/validate.yml` with
      status and JSON-array assertions.
- [x] Add
      `collections/harmonia-aquila-web/manage-albums/validate-path-traversal.yml`
      with expected error assertions.

### 6.2 Add Bruno MCP requests

- [x] Add
      `collections/harmonia-aquila-web/mcp/call-manage-albums-validate.yml`.
- [x] Add
      `collections/harmonia-aquila-web/mcp/call-manage-albums-validate-path-traversal.yml`.
- [x] Update `collections/harmonia-aquila-web/mcp/tools-list.yml` to expect
      `manage_albums_validate` in deterministic order.

### 6.3 Update docs

- [x] Update `docs/mcp-server.md` so the current web MCP tool table includes
      `manage_albums_validate`.
- [x] Update `docs/testing.md` only if the Bruno smoke-test description names
      the exact tool count or album REST request set.

## Phase 7 — Verification

### 7.1 Focused checks

- [x] `./node_modules/.bin/vitest run __tests__/lib/albums/validate.test.ts` —
      exit 0.
- [x] `./node_modules/.bin/vitest run __tests__/commands/manage-albums/validate.test.ts` —
      exit 0.
- [x] `./node_modules/.bin/vitest run __tests__/web/controllers.test.ts __tests__/web/mcp.manage-albums.test.ts` —
      exit 0.
- [x] `npm run build` — exit 0 before live Bruno verification.

### 7.2 Live Bruno checks

- [x] Start `npm run web:serve -- --source-dir etc/albums/1-source-files --dest-dir etc/albums/3-organized-files --host 127.0.0.1 --port 3000` and capture the specific PID.
- [x] `cd collections/harmonia-aquila-web && ../../node_modules/.bin/bru run manage-albums/validate.yml mcp/call-manage-albums-validate.yml --env local --bail` —
      exit 0.
- [x] Stop the captured `web serve` process using `kill <PID>`.

### 7.3 Final full verification

- [x] `npm run lint` — whole-codebase last-call lint after all TypeScript
      modifications are complete; exit 0.
- [x] `npm run build` — exit 0.
- [x] `npm test` — exit 0.
- [x] `git --no-pager diff --stat -- src __tests__ collections docs` lists
      only expected files from `design.md` §2.
