# Tasks: Constrain Web Serve Directories

> ## Hard constraints (re-read before starting)
>
> - **DO NOT START** any task below until the user explicitly directs you to.
>   This file is delivered as a plan, not as a work order.
> - **No `npx`** in any form. Forbidden in **all** invocations
>   (no `--no-install`, no one-off Vitest/tsc runs, etc.). Any command line
>   containing the substring `npx` is a violation and must be rewritten before
>   execution. Use `npm run <script>` or existing binaries under
>   `./node_modules/.bin/` exclusively.
> - **No edits outside `src/commands/web/**`, `src/web/**`,
>   `__tests__/web/**`, focused `__tests__/commands/**` files, and
>   package scripts only if needed** for this spec (NFR-7). If a real bug
>   surfaces elsewhere, STOP and surface it; do not patch silently.
> - After **every** source code file modification (for example, a `.ts` edit),
>   run `npm run lint` and fix any reported issues before moving on (NFR-1).
>   Do this per source-code edit, not per-task.
> - Mark the matching `- [x]` checkbox **immediately** when each task is
>   finished, so progress is resumable.

## Phase 1 — Pre-flight

### 1.1 Confirm baseline and current state

- [x] Run `git --no-pager status --short` and note existing unrelated changes.
- [x] Run `npm run lint` and capture the baseline result.
- [x] Run `npm run build` and capture the baseline result.
- [x] Run `npm test` and capture the baseline test count/result.
- [x] Inspect `src/commands/web/serve.ts`, `src/web/main.ts`, `src/web/app.module.ts`, and both controllers before editing.

## Phase 2 — Web serve option parsing

### 2.1 Add required root options

- [x] Update `src/commands/web/serve.ts` to accept `--source-dir <dir>` and `--dest-dir <dir>` in addition to existing `--host` and `--port`.
- [x] Validate that both options are present and non-empty before calling `serveWeb`.
- [x] Pass parsed roots to `serveWeb` without changing `--host` / `--port` behavior.
- [x] Run `npm run lint`. Fix issues. Re-run until clean.

### 2.2 Cover command behavior

- [x] Add or update focused command tests proving help text includes both new options.
- [x] Add or update focused command tests proving missing `--source-dir` or `--dest-dir` fails before bootstrap.
- [x] Run the focused command test file with `./node_modules/.bin/vitest run <path-to-command-test>`.
- [x] Run `npm run lint`. Fix issues. Re-run until clean.

## Phase 3 — Web root context and resolver

### 3.1 Add web root provider

- [x] Update `src/web/main.ts` so `createWebApp` and `serveWeb` accept normalized `sourceDir` and `destDir` roots.
- [x] Update `src/web/app.module.ts` with a provider or dynamic module factory that exposes those roots to controllers.
- [x] Update bootstrap tests to pass temporary source/destination roots.
- [x] Run `npm run lint`. Fix issues. Re-run until clean.

### 3.2 Add path resolver

- [x] Create `src/web/path-resolver.ts` with source-root and destination-root resolution helpers.
- [x] Reject empty path values, null bytes, traversal outside the root, and absolute paths outside the matching root.
- [x] Canonicalize configured roots and existing candidate paths/parents with `fs.realpath` where possible.
- [x] Throw typed user-input errors that map to the existing HTTP 400 envelope.
- [x] Run `npm run lint`. Fix issues. Re-run until clean.

## Phase 4 — Album route scoping

### 4.1 Update album controller mappings

- [x] Resolve `GET /manage-albums/summarize-source-dir` `dirName` inside the source root.
- [x] Make `POST /manage-albums/fix-tags` use configured source/destination roots and reject body `sourceDir` / `destDir` overrides.
- [x] Make `POST /manage-albums/organize-files` use configured source/destination roots and reject body `sourceDir` / `destDir` overrides.
- [x] Preserve all non-path option behavior and response shapes.
- [x] Run `npm run lint`. Fix issues. Re-run until clean.

### 4.2 Cover album route scoping

- [x] Update `__tests__/web/controllers.test.ts` for safe relative album paths.
- [x] Add traversal tests proving unsafe album paths return HTTP 400 and do not call shared library mocks.
- [x] Add tests proving album root override body fields are rejected.
- [x] Run `./node_modules/.bin/vitest run __tests__/web/controllers.test.ts`.
- [x] Run `npm run lint`. Fix issues. Re-run until clean.

## Phase 5 — Audiobook route scoping

### 5.1 Update audiobook controller mappings

- [x] Resolve `validate.fileName`, `crawl.dirName`, `copy-and-rename.fileName`, every `convert-file.fileName`, and `set-metadata.sourceFilepath` inside the source root.
- [x] Resolve `set-metadata.destFilepath` inside the destination root.
- [x] Make `copy-and-rename`, `convert-file`, and `merge` use configured destination/source roots where applicable and reject request body root overrides.
- [x] Validate all path fields before invoking any shared audiobook operation.
- [x] Preserve all non-path option behavior and response shapes.
- [x] Run `npm run lint`. Fix issues. Re-run until clean.

### 5.2 Cover audiobook route scoping

- [x] Update `__tests__/web/controllers.test.ts` for safe relative audiobook paths.
- [x] Add traversal tests proving unsafe audiobook paths return HTTP 400 and do not call shared library mocks.
- [x] Add tests proving `convert-file` validates every file before invoking the shared operation.
- [x] Add tests proving audiobook root override body fields are rejected.
- [x] Run `./node_modules/.bin/vitest run __tests__/web/controllers.test.ts`.
- [x] Run `npm run lint`. Fix issues. Re-run until clean.

## Phase 6 — Verification

### 6.1 Focused verification

- [x] `./node_modules/.bin/vitest run __tests__/web` — exit 0.
- [x] Focused command tests for `web serve` — exit 0.
- [x] `node build/dist/index.js web serve --help` lists `--source-dir` and `--dest-dir` after a successful build.

### 6.2 Full verification

- [x] `npm run lint` — exit 0.
- [x] `npm run build` — exit 0.
- [x] `npm test` — exit 0; pass count changes are explained by added/updated tests.

### 6.3 Scope verification

- [x] `git --no-pager diff --stat -- bin etc reports extern` outputs no unintended files.
- [x] `git --no-pager diff --stat` lists only files allowed by `design.md` §2.

## Phase 7 — Documentation

### 7.1 Update directly related docs only

- [x] If an existing CLI usage document mentions `web serve`, update it to include `--source-dir` and `--dest-dir`.
- [x] If no usage document exists, do not create broad new docs unless the user requests them; rely on Commander help and tests.
