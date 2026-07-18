# Tasks: Add Web Serve Supercommand

> ## Hard constraints (re-read before starting)
>
> - **DO NOT START** any task below until the user explicitly directs you to.
>   This file is delivered as a plan, not as a work order.
> - **No `npx`** in any form. Forbidden in **all** invocations
>   (no `--no-install`, no one-off Vitest/tsc runs, etc.). Any command line
>   containing the substring `npx` is a violation and must be rewritten before
>   execution. Use `npm run <script>` or existing binaries under
>   `./node_modules/.bin/` exclusively.
> - **No edits outside `src/**`, `__tests__/**`, TypeScript/lint/test config,
>   `package.json`, and `package-lock.json`** for this spec (NFR-9). If a real
>   bug surfaces elsewhere, STOP and surface it; do not patch silently.
> - After **every** source code file modification (for example, a `.ts` edit),
>   run `npm run lint` and fix any reported issues before moving on (NFR-1).
>   Do this per source-code edit, not per-task.
> - Mark the matching `- [x]` checkbox **immediately** when each task is
>   finished, so progress is resumable.

## Phase 1 — Pre-flight

### 1.1 Confirm baseline

- [x] Run `git --no-pager status --short` and note existing unrelated changes.
- [x] Run `npm run lint` and capture the baseline result.
- [x] Run `npm run build` and capture the baseline result.
- [x] Run `npm test` and capture the baseline test count/result.

### 1.2 Confirm NestJS package intent

- [x] Inspect `package.json` and `package-lock.json` for the current NestJS
      dependency set.
- [x] If the user has not clarified `@nextjs/common`, proceed with existing
      `@nestjs/common` per `requirements.md` NFR-8.
- [ ] If the user insists on a real `@nextjs/common` package, STOP and revise
      the spec before implementation.

## Phase 2 — Dependency and config setup

### 2.1 Add minimal NestJS bootstrap dependencies

- [x] Add only the NestJS packages required to create and listen with an HTTP
      server, plus required peers if missing.
- [x] Update `package-lock.json` through the package manager, not by hand.
- [x] Run `npm run lint`. Fix issues. Re-run until clean.

### 2.2 Adjust TypeScript config only if required

- [x] Enable decorator/config options only if NestJS controllers/modules require
      them.
- [x] Keep build/test/editor config separation intact.
- [x] Run `npm run lint`. Fix issues. Re-run until clean.

## Phase 3 — Shared library extraction

### 3.1 Add shared error and option helpers

- [x] Create typed user-input error helpers under `src/lib/**` for messages that
      can map to Commander errors or HTTP 400 responses.
- [x] Move generic output/result helpers only if they are needed by multiple
      adapters.
- [x] Run `npm run lint`. Fix issues. Re-run until clean.

### 3.2 Extract album operations

- [x] Move reusable behavior for `summarize-source-dir`, `fix-tags`, and
      `organize-files` into `src/lib/albums/**`.
- [x] Keep CLI modules as thin adapters that parse Commander options, call the
      shared functions, and write CLI output.
- [x] Preserve all current JSON row shapes, validation messages, and dry-run
      defaults.
- [x] Run `npm run lint`. Fix issues. Re-run until clean.

### 3.3 Extract audiobook operations

- [x] Move reusable behavior for `validate`, `crawl`, `copy-and-rename`,
      `convert-file`, `merge`, and `set-metadata` into
      `src/lib/audiobooks/**`.
- [x] Keep CLI modules as thin adapters that parse Commander options, call the
      shared functions, and write CLI output.
- [x] Preserve existing `p-limit` concurrency behavior and write-operation
      safeguards.
- [x] Run `npm run lint`. Fix issues. Re-run until clean.

## Phase 4 — Web server implementation

### 4.1 Add NestJS web module and controllers

- [x] Create `src/web/app.module.ts`, album controller, audiobook controller,
      and shared HTTP error mapping.
- [x] Implement every endpoint listed in `requirements.md` FR-4.
- [x] Map GET query parameters and POST JSON bodies to shared library option
      objects.
- [x] Run `npm run lint`. Fix issues. Re-run until clean.

### 4.2 Add server bootstrap helper

- [x] Create a bootstrap helper that can create/listen/close the app in tests
      without importing `src/index.ts`.
- [x] Ensure successful route responses are JSON arrays and errors use the
      FR-8 envelope.
- [x] Run `npm run lint`. Fix issues. Re-run until clean.

### 4.3 Register `web serve`

- [x] Add `src/commands/web/index.ts` and `src/commands/web/serve.ts`.
- [x] Register `web` from `src/index.ts` alongside `manage-albums` and
      `manage-audiobooks`.
- [x] Validate `--host` and `--port` before server bootstrap.
- [x] Run `npm run lint`. Fix issues. Re-run until clean.

## Phase 5 — Unit tests

### 5.1 Update CLI parity tests

- [x] Update existing command tests for changed import/mocking paths after
      extraction.
- [x] Assert existing CLI rows and errors remain unchanged.
- [x] Run focused affected tests with `./node_modules/.bin/vitest run
      __tests__/commands`.
- [x] Run `npm run lint`. Fix issues. Re-run until clean.

### 5.2 Add shared library tests

- [x] Add `__tests__/lib/albums/**` tests for extracted album behavior.
- [x] Add `__tests__/lib/audiobooks/**` tests for extracted audiobook behavior.
- [x] Cover at least one success, dry-run safety, and validation error per
      operation family.
- [x] Run focused tests with `./node_modules/.bin/vitest run __tests__/lib`.
- [x] Run `npm run lint`. Fix issues. Re-run until clean.

### 5.3 Add web tests

- [x] Add controller tests proving GET query mapping and POST body mapping.
- [x] Add error-mapping tests for at least one client validation failure and
      one unexpected failure.
- [x] Add one bootstrap smoke test that starts and closes the server without
      using a fixed public port.
- [x] Run focused tests with `./node_modules/.bin/vitest run __tests__/web`.
- [x] Run `npm run lint`. Fix issues. Re-run until clean.

## Phase 6 — Verification

### 6.1 Full verification

- [x] `npm run lint` — exit 0.
- [x] `npm run build` — exit 0.
- [x] `npm test` — exit 0; pass count changes are explained by added tests.

### 6.2 CLI and web smoke checks

- [x] `node build/dist/index.js web --help` lists `serve`.
- [x] `node build/dist/index.js web serve --help` lists `--host` and `--port`.
- [x] Start `node build/dist/index.js web serve --host 127.0.0.1 --port 0` in
      the automated smoke path and close it cleanly.

### 6.3 Scope verification

- [x] `git --no-pager diff --stat -- bin etc reports` outputs no unintended
      files.
- [x] `git --no-pager diff --stat` lists only the expected source, test, config,
      and dependency files from `design.md` §2.

## Phase 7 — Documentation

### 7.1 Update user-facing documentation if present

- [x] If a CLI usage document exists, add `web serve` and endpoint examples.
- [x] If no usage document exists, do not create broad new docs unless the user
      requests them; rely on Commander help and tests.
