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

- [ ] Run `git --no-pager status --short` and note existing unrelated changes.
- [ ] Run `npm run lint` and capture the baseline result.
- [ ] Run `npm run build` and capture the baseline result.
- [ ] Run `npm test` and capture the baseline test count/result.
- [ ] Inspect `src/commands/web/serve.ts`, `src/web/main.ts`, `src/web/app.module.ts`, and both controllers before editing.

## Phase 2 — Web serve option parsing

### 2.1 Add required root options

- [ ] Update `src/commands/web/serve.ts` to accept `--source-dir <dir>` and `--dest-dir <dir>` in addition to existing `--host` and `--port`.
- [ ] Validate that both options are present and non-empty before calling `serveWeb`.
- [ ] Pass parsed roots to `serveWeb` without changing `--host` / `--port` behavior.
- [ ] Run `npm run lint`. Fix issues. Re-run until clean.

### 2.2 Cover command behavior

- [ ] Add or update focused command tests proving help text includes both new options.
- [ ] Add or update focused command tests proving missing `--source-dir` or `--dest-dir` fails before bootstrap.
- [ ] Run the focused command test file with `./node_modules/.bin/vitest run <path-to-command-test>`.
- [ ] Run `npm run lint`. Fix issues. Re-run until clean.

## Phase 3 — Web root context and resolver

### 3.1 Add web root provider

- [ ] Update `src/web/main.ts` so `createWebApp` and `serveWeb` accept normalized `sourceDir` and `destDir` roots.
- [ ] Update `src/web/app.module.ts` with a provider or dynamic module factory that exposes those roots to controllers.
- [ ] Update bootstrap tests to pass temporary source/destination roots.
- [ ] Run `npm run lint`. Fix issues. Re-run until clean.

### 3.2 Add path resolver

- [ ] Create `src/web/path-resolver.ts` with source-root and destination-root resolution helpers.
- [ ] Reject empty path values, null bytes, traversal outside the root, and absolute paths outside the matching root.
- [ ] Canonicalize configured roots and existing candidate paths/parents with `fs.realpath` where possible.
- [ ] Throw typed user-input errors that map to the existing HTTP 400 envelope.
- [ ] Run `npm run lint`. Fix issues. Re-run until clean.

## Phase 4 — Album route scoping

### 4.1 Update album controller mappings

- [ ] Resolve `GET /manage-albums/summarize-source-dir` `dirName` inside the source root.
- [ ] Make `POST /manage-albums/fix-tags` use configured source/destination roots and reject body `sourceDir` / `destDir` overrides.
- [ ] Make `POST /manage-albums/organize-files` use configured source/destination roots and reject body `sourceDir` / `destDir` overrides.
- [ ] Preserve all non-path option behavior and response shapes.
- [ ] Run `npm run lint`. Fix issues. Re-run until clean.

### 4.2 Cover album route scoping

- [ ] Update `__tests__/web/controllers.test.ts` for safe relative album paths.
- [ ] Add traversal tests proving unsafe album paths return HTTP 400 and do not call shared library mocks.
- [ ] Add tests proving album root override body fields are rejected.
- [ ] Run `./node_modules/.bin/vitest run __tests__/web/controllers.test.ts`.
- [ ] Run `npm run lint`. Fix issues. Re-run until clean.

## Phase 5 — Audiobook route scoping

### 5.1 Update audiobook controller mappings

- [ ] Resolve `validate.fileName`, `crawl.dirName`, `copy-and-rename.fileName`, every `convert-file.fileName`, and `set-metadata.sourceFilepath` inside the source root.
- [ ] Resolve `set-metadata.destFilepath` inside the destination root.
- [ ] Make `copy-and-rename`, `convert-file`, and `merge` use configured destination/source roots where applicable and reject request body root overrides.
- [ ] Validate all path fields before invoking any shared audiobook operation.
- [ ] Preserve all non-path option behavior and response shapes.
- [ ] Run `npm run lint`. Fix issues. Re-run until clean.

### 5.2 Cover audiobook route scoping

- [ ] Update `__tests__/web/controllers.test.ts` for safe relative audiobook paths.
- [ ] Add traversal tests proving unsafe audiobook paths return HTTP 400 and do not call shared library mocks.
- [ ] Add tests proving `convert-file` validates every file before invoking the shared operation.
- [ ] Add tests proving audiobook root override body fields are rejected.
- [ ] Run `./node_modules/.bin/vitest run __tests__/web/controllers.test.ts`.
- [ ] Run `npm run lint`. Fix issues. Re-run until clean.

## Phase 6 — Verification

### 6.1 Focused verification

- [ ] `./node_modules/.bin/vitest run __tests__/web` — exit 0.
- [ ] Focused command tests for `web serve` — exit 0.
- [ ] `node build/dist/index.js web serve --help` lists `--source-dir` and `--dest-dir` after a successful build.

### 6.2 Full verification

- [ ] `npm run lint` — exit 0.
- [ ] `npm run build` — exit 0.
- [ ] `npm test` — exit 0; pass count changes are explained by added/updated tests.

### 6.3 Scope verification

- [ ] `git --no-pager diff --stat -- bin etc reports extern` outputs no unintended files.
- [ ] `git --no-pager diff --stat` lists only files allowed by `design.md` §2.

## Phase 7 — Documentation

### 7.1 Update directly related docs only

- [ ] If an existing CLI usage document mentions `web serve`, update it to include `--source-dir` and `--dest-dir`.
- [ ] If no usage document exists, do not create broad new docs unless the user requests them; rely on Commander help and tests.
