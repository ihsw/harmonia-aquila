# Tasks: Refactor Web Validation to Zod

> ## Hard constraints (re-read before starting)
>
> - **DO NOT START** any task below until the user explicitly directs you to.
>   This file is delivered as a plan, not as a work order.
> - **No `npx`** in any form. Forbidden in **all** invocations
>   (no `--no-install`, no one-off Vitest/tsc runs, etc.). Any command line
>   containing the substring `npx` is a violation and must be rewritten before
>   execution. Use `npm run <script>` or existing binaries under
>   `./node_modules/.bin/` exclusively.
> - **No edits outside `src/web/**`, `__tests__/web/**`, and
>   `collections/harmonia-aquila-web/**`** for this spec unless a blocker is
>   found and the user explicitly approves expanding scope.
> - After **every** source code file modification (for example, a `.ts` edit),
>   run `npm run lint -- <modified-file>` and fix any reported issues before
>   moving on (NFR-1). This MUST lint only the file just modified. Do this per
>   source-code edit, not per-task.
> - Run whole-codebase `npm run lint` only as a last-call verification after all
>   TypeScript modifications are complete.
> - Mark the matching `- [x]` checkbox **immediately** when each task is
>   finished, so progress is resumable.

## Phase 1 — Pre-flight

### 1.1 Confirm current validation surface

- [x] Inspect `package.json` and confirm `zod` is already available.
- [x] Inspect `src/web/request-options.ts`, both controllers, `http-errors.ts`, and current web tests.
- [x] Do **not** run whole-codebase `npm run lint` as a pre-flight baseline; reserve it for final verification.

## Phase 2 — Zod schema layer

### 2.1 Add schema helpers

- [x] Create `src/web/request-schemas.ts` with typed Zod primitives and a parse helper.
- [x] Convert Zod parse failures to `UserInputError` or equivalent HTTP 400 mapping.
- [x] Run `npm run lint -- src/web/request-schemas.ts`. Fix issues. Re-run until clean.

### 2.2 Retire manual helper usage

- [x] Decide whether `src/web/request-options.ts` should be deleted or reduced to compatibility exports during migration.
- [x] Remove unused manual helper code once controllers no longer import it.
- [x] Run `npm run lint -- src/web/request-options.ts` if the file remains modified. Fix issues. Re-run until clean.

## Phase 3 — Album routes

### 3.1 Refactor album controller validation

- [x] Update `summarize-source-dir`, `fix-tags`, and `organize-files` to parse request data with Zod schemas.
- [x] Preserve root override rejection, path resolution order, optional option behavior, and shared function option shapes.
- [x] Run `npm run lint -- src/web/manage-albums.controller.ts`. Fix issues. Re-run until clean.

### 3.2 Cover album validation

- [x] Update `__tests__/web/controllers.test.ts` for album Zod validation behavior.
- [x] Ensure invalid boolean, root override, missing required field, and traversal cases still return 400 without shared function calls.
- [x] Run `npm run lint -- __tests__/web/controllers.test.ts`. Fix issues. Re-run until clean.
- [x] Run `./node_modules/.bin/vitest run __tests__/web/controllers.test.ts`.

## Phase 4 — Audiobook routes

### 4.1 Refactor audiobook controller validation

- [x] Update `validate`, `crawl`, `copy-and-rename`, `convert-file`, `merge`, and `set-metadata` to parse request data with Zod schemas.
- [x] Preserve `convert-file.fileName` string-or-array behavior and missing/empty list semantics.
- [x] Preserve root override rejection and source/destination path resolution semantics.
- [x] Run `npm run lint -- src/web/manage-audiobooks.controller.ts`. Fix issues. Re-run until clean.

### 4.2 Cover audiobook validation

- [x] Update `__tests__/web/controllers.test.ts` for audiobook Zod validation behavior.
- [x] Add or preserve coverage for `convert-file.fileName` string, string-array, invalid-type, and traversal cases.
- [x] Run `npm run lint -- __tests__/web/controllers.test.ts`. Fix issues. Re-run until clean.
- [x] Run `./node_modules/.bin/vitest run __tests__/web/controllers.test.ts`.

## Phase 5 — Bruno compatibility

### 5.1 Update collection assertions only if needed

- [x] Run the current Bruno collection against the refactored server and identify any assertion failures caused only by equivalent Zod message wording.
- [x] If needed, update `collections/harmonia-aquila-web/**` assertions to check stable status codes and field/context substrings.
- [x] Do not weaken assertions for path traversal, root override, or missing required field semantics.

## Phase 6 — Verification

### 6.1 Focused verification

- [x] `./node_modules/.bin/vitest run __tests__/web` — exit 0.
- [x] `npm run build` — exit 0 before live Bruno verification.

### 6.2 Live Bruno verification

- [x] Start `npm run web:serve -- --source-dir etc/1-source-files --dest-dir etc/2-destination-files --host 127.0.0.1 --port 3000` and capture the specific PID.
- [x] `cd collections/harmonia-aquila-web && ../../node_modules/.bin/bru run . -r --env local --bail` — exit 0.
- [x] Stop the captured `web serve` PID using `kill <PID>`.

### 6.3 Full verification

- [x] `npm run lint` — whole-codebase last-call lint after all TypeScript modifications are complete; exit 0.
- [x] `npm run build` — exit 0.
- [x] `npm test` — exit 0.
- [x] `git --no-pager diff --stat -- src/web __tests__/web collections/harmonia-aquila-web package.json package-lock.json` lists only expected files.

## Phase 7 — Documentation

### 7.1 Update directly related docs only

- [x] If an existing web/API validation document exists, update it to mention Zod-backed request validation.
- [x] If no such document exists, do not create broad new docs unless the user requests them; tests and Bruno collection coverage are sufficient.
