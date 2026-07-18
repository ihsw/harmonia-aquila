# Tasks: Move Unit Tests to `__tests__`

> ## Hard constraints (re-read before starting)
>
> - **DO NOT START** any task below until the user explicitly directs you to. This file is delivered as a plan, not as a work order.
> - **No `npx`** in any form. Forbidden in **all** invocations. Any command line containing the substring `npx` is a violation and must be rewritten before execution. Use `./node_modules/.bin/<tool>` or `npm run <script>` exclusively.
> - **No edits outside** test files/helpers, `package.json`, `eslint.config.mjs`, `tsconfig.eslint.json`, `tsconfig.json` if needed, `vitest.config.ts`, and `docs/testing.md` for this spec (NFR-7). If a real bug surfaces elsewhere, STOP and surface it; do not patch silently.
> - After **every** source code file modification, including `.ts` files under `src/`, `__tests__/`, or root TypeScript config files, run `npm run lint` and fix reported issues before moving on (NFR-1). Do this per source-code edit, not per task.
> - Mark the matching `- [x]` checkbox **immediately** when each task is finished, so progress is resumable.

## Phase 1 — Pre-flight

### 1.1 Confirm baseline state

- [x] Run `git status --short` and note any pre-existing user changes.
- [x] Run `npm run lint` and capture the baseline exit code.
- [x] Run `npm run build` and capture whether test artifacts are currently emitted under `build/dist`.
- [x] Run `npm test` and capture the baseline pass/fail count.

### 1.2 Audit test-only helper usage

- [x] Search for imports of `test-helpers` outside `src/**/*.test.ts`.
- [x] If production code imports `src/test-helpers.ts`, STOP and document the conflict before moving it.
- [x] If only tests import it, plan to move it to `__tests__/test-helpers.ts` per FR-2.

## Phase 2 — Move tests and helpers

### 2.1 Create the new test tree

- [x] Create root-level `__tests__/` with `commands/manage-albums/`, `commands/manage-albums/helpers/`, and `commands/manage-audiobooks/` subdirectories.
- [x] Move `src/test-helpers.ts` to `__tests__/test-helpers.ts` if the Phase 1.2 audit allows it.
- [x] Move `src/command-utils.test.ts` to `__tests__/command-utils.test.ts`.
- [x] Run `npm run lint`. Fix issues. Re-run until clean.

### 2.2 Move album command tests

- [x] Move `src/commands/manage-albums/fix-tags.test.ts` to `__tests__/commands/manage-albums/fix-tags.test.ts`.
- [x] Move `src/commands/manage-albums/organize-files.test.ts` to `__tests__/commands/manage-albums/organize-files.test.ts`.
- [x] Move `src/commands/manage-albums/summarize-source-dir.test.ts` to `__tests__/commands/manage-albums/summarize-source-dir.test.ts`.
- [x] Move `src/commands/manage-albums/helpers/utils.test.ts` to `__tests__/commands/manage-albums/helpers/utils.test.ts`.
- [x] Run `npm run lint`. Fix issues. Re-run until clean.

### 2.3 Move audiobook command tests

- [x] Move `src/commands/manage-audiobooks/copy-and-rename.test.ts` to `__tests__/commands/manage-audiobooks/copy-and-rename.test.ts`.
- [x] Move `src/commands/manage-audiobooks/convert-file.test.ts` to `__tests__/commands/manage-audiobooks/convert-file.test.ts`.
- [x] Move `src/commands/manage-audiobooks/crawl.test.ts` to `__tests__/commands/manage-audiobooks/crawl.test.ts`.
- [x] Move `src/commands/manage-audiobooks/merge.test.ts` to `__tests__/commands/manage-audiobooks/merge.test.ts`.
- [x] Move `src/commands/manage-audiobooks/set-metadata.test.ts` to `__tests__/commands/manage-audiobooks/set-metadata.test.ts`.
- [x] Move `src/commands/manage-audiobooks/validate.test.ts` to `__tests__/commands/manage-audiobooks/validate.test.ts`.
- [x] Run `npm run lint`. Fix issues. Re-run until clean.

## Phase 3 — Rewrite imports and configuration

### 3.1 Update moved test imports

- [x] Rewrite production imports in `__tests__/**/*.test.ts` to point into `src/` with NodeNext `.js` specifiers.
- [x] Rewrite shared helper imports to point at `__tests__/test-helpers.js` from the correct relative depth.
- [x] Rewrite any `vi.mock` module specifiers so they match the moved tests' production imports.
- [x] Run `npm run lint`. Fix issues. Re-run until clean.

### 3.2 Update Vitest discovery

- [x] Change `vitest.config.ts` from `src/**/*.test.ts` discovery to `__tests__/**/*.test.ts` discovery.
- [x] Preserve existing `node` environment and `build/**` / `node_modules/**` exclusions.
- [x] Run `npm run lint`. Fix issues. Re-run until clean.

### 3.3 Update lint and build configuration

- [x] Update `package.json` so `npm run lint` covers production source and the root `__tests__/` tree.
- [x] Leave `tsconfig.json` unchanged if `include: ["src"]` is sufficient; otherwise add defensive test excludes without widening build input.
- [x] Run `npm run lint`. Fix issues. Re-run until clean.

## Phase 4 — Focused verification

### 4.1 Run representative focused tests

- [x] Run `./node_modules/.bin/vitest run __tests__/command-utils.test.ts` and fix any import issues.
- [x] Run `./node_modules/.bin/vitest run __tests__/commands/manage-albums/fix-tags.test.ts` and fix any import/mock issues.
- [x] Run `./node_modules/.bin/vitest run __tests__/commands/manage-audiobooks/merge.test.ts` and fix any import/mock issues.
- [x] Run `npm run lint`. Fix issues. Re-run until clean after any source/config edit.

### 4.2 Prove production build excludes tests

- [x] Run `npm run build` and ensure it exits 0.
- [x] Run `find build/dist -path '*__tests__*' -o -name '*.test.js' -o -name '*.test.d.ts'` and ensure it prints no paths.
- [x] Confirm `build/dist/index.js` still exists.

## Phase 5 — Documentation

### 5.1 Update testing documentation

- [x] Update `docs/testing.md` so layout descriptions and focused examples reference `__tests__/` paths.
- [x] Ensure documentation commands use `npm run <script>` or `./node_modules/.bin/<tool>` only.
- [x] Run `npm run lint` if any source/config files were changed after the last lint checkpoint.

## Phase 6 — Final verification

### 6.1 Full command suite

- [x] `npm run lint` — exit 0.
- [x] `npm run build` — exit 0.
- [x] `find build/dist -path '*__tests__*' -o -name '*.test.js' -o -name '*.test.d.ts'` — no output.
- [x] `npm test` — exit 0 with baseline pass count preserved except for documented naming/path-only changes.

### 6.2 Scope verification

- [x] `git --no-pager diff --stat -- bin etc reports` — output MUST show no unintended changes (NFR-7).
- [x] `git --no-pager diff --stat -- package.json eslint.config.mjs tsconfig.eslint.json tsconfig.json vitest.config.ts docs/testing.md src __tests__` — output MUST list only files expected by `design.md` §2.

