# Tasks: Move Unit Tests to `__tests__`

> ## Hard constraints (re-read before starting)
>
> - **DO NOT START** any task below until the user explicitly directs you to. This file is delivered as a plan, not as a work order.
> - **No `npx`** in any form. Forbidden in **all** invocations. Any command line containing the substring `npx` is a violation and must be rewritten before execution. Use `./node_modules/.bin/<tool>` or `npm run <script>` exclusively.
> - **No edits outside** test files/helpers, `package.json`, `tsconfig.json` if needed, `vitest.config.ts`, and `docs/testing.md` for this spec (NFR-7). If a real bug surfaces elsewhere, STOP and surface it; do not patch silently.
> - After **every** source code file modification, including `.ts` files under `src/`, `__tests__/`, or root TypeScript config files, run `npm run lint` and fix reported issues before moving on (NFR-1). Do this per source-code edit, not per task.
> - Mark the matching `- [x]` checkbox **immediately** when each task is finished, so progress is resumable.

## Phase 1 — Pre-flight

### 1.1 Confirm baseline state

- [ ] Run `git status --short` and note any pre-existing user changes.
- [ ] Run `npm run lint` and capture the baseline exit code.
- [ ] Run `npm run build` and capture whether test artifacts are currently emitted under `build/dist`.
- [ ] Run `npm test` and capture the baseline pass/fail count.

### 1.2 Audit test-only helper usage

- [ ] Search for imports of `test-helpers` outside `src/**/*.test.ts`.
- [ ] If production code imports `src/test-helpers.ts`, STOP and document the conflict before moving it.
- [ ] If only tests import it, plan to move it to `__tests__/test-helpers.ts` per FR-2.

## Phase 2 — Move tests and helpers

### 2.1 Create the new test tree

- [ ] Create root-level `__tests__/` with `commands/manage-albums/`, `commands/manage-albums/helpers/`, and `commands/manage-audiobooks/` subdirectories.
- [ ] Move `src/test-helpers.ts` to `__tests__/test-helpers.ts` if the Phase 1.2 audit allows it.
- [ ] Move `src/command-utils.test.ts` to `__tests__/command-utils.test.ts`.
- [ ] Run `npm run lint`. Fix issues. Re-run until clean.

### 2.2 Move album command tests

- [ ] Move `src/commands/manage-albums/fix-tags.test.ts` to `__tests__/commands/manage-albums/fix-tags.test.ts`.
- [ ] Move `src/commands/manage-albums/organize-files.test.ts` to `__tests__/commands/manage-albums/organize-files.test.ts`.
- [ ] Move `src/commands/manage-albums/summarize-source-dir.test.ts` to `__tests__/commands/manage-albums/summarize-source-dir.test.ts`.
- [ ] Move `src/commands/manage-albums/helpers/utils.test.ts` to `__tests__/commands/manage-albums/helpers/utils.test.ts`.
- [ ] Run `npm run lint`. Fix issues. Re-run until clean.

### 2.3 Move audiobook command tests

- [ ] Move `src/commands/manage-audiobooks/copy-and-rename.test.ts` to `__tests__/commands/manage-audiobooks/copy-and-rename.test.ts`.
- [ ] Move `src/commands/manage-audiobooks/convert-file.test.ts` to `__tests__/commands/manage-audiobooks/convert-file.test.ts`.
- [ ] Move `src/commands/manage-audiobooks/crawl.test.ts` to `__tests__/commands/manage-audiobooks/crawl.test.ts`.
- [ ] Move `src/commands/manage-audiobooks/merge.test.ts` to `__tests__/commands/manage-audiobooks/merge.test.ts`.
- [ ] Move `src/commands/manage-audiobooks/set-metadata.test.ts` to `__tests__/commands/manage-audiobooks/set-metadata.test.ts`.
- [ ] Move `src/commands/manage-audiobooks/validate.test.ts` to `__tests__/commands/manage-audiobooks/validate.test.ts`.
- [ ] Run `npm run lint`. Fix issues. Re-run until clean.

## Phase 3 — Rewrite imports and configuration

### 3.1 Update moved test imports

- [ ] Rewrite production imports in `__tests__/**/*.test.ts` to point into `src/` with NodeNext `.js` specifiers.
- [ ] Rewrite shared helper imports to point at `__tests__/test-helpers.js` from the correct relative depth.
- [ ] Rewrite any `vi.mock` module specifiers so they match the moved tests' production imports.
- [ ] Run `npm run lint`. Fix issues. Re-run until clean.

### 3.2 Update Vitest discovery

- [ ] Change `vitest.config.ts` from `src/**/*.test.ts` discovery to `__tests__/**/*.test.ts` discovery.
- [ ] Preserve existing `node` environment and `build/**` / `node_modules/**` exclusions.
- [ ] Run `npm run lint`. Fix issues. Re-run until clean.

### 3.3 Update lint and build configuration

- [ ] Update `package.json` so `npm run lint` covers production source and the root `__tests__/` tree.
- [ ] Leave `tsconfig.json` unchanged if `include: ["src"]` is sufficient; otherwise add defensive test excludes without widening build input.
- [ ] Run `npm run lint`. Fix issues. Re-run until clean.

## Phase 4 — Focused verification

### 4.1 Run representative focused tests

- [ ] Run `./node_modules/.bin/vitest run __tests__/command-utils.test.ts` and fix any import issues.
- [ ] Run `./node_modules/.bin/vitest run __tests__/commands/manage-albums/fix-tags.test.ts` and fix any import/mock issues.
- [ ] Run `./node_modules/.bin/vitest run __tests__/commands/manage-audiobooks/merge.test.ts` and fix any import/mock issues.
- [ ] Run `npm run lint`. Fix issues. Re-run until clean after any source/config edit.

### 4.2 Prove production build excludes tests

- [ ] Run `npm run build` and ensure it exits 0.
- [ ] Run `find build/dist -path '*__tests__*' -o -name '*.test.js' -o -name '*.test.d.ts'` and ensure it prints no paths.
- [ ] Confirm `build/dist/index.js` still exists.

## Phase 5 — Documentation

### 5.1 Update testing documentation

- [ ] Update `docs/testing.md` so layout descriptions and focused examples reference `__tests__/` paths.
- [ ] Ensure documentation commands use `npm run <script>` or `./node_modules/.bin/<tool>` only.
- [ ] Run `npm run lint` if any source/config files were changed after the last lint checkpoint.

## Phase 6 — Final verification

### 6.1 Full command suite

- [ ] `npm run lint` — exit 0.
- [ ] `npm run build` — exit 0.
- [ ] `find build/dist -path '*__tests__*' -o -name '*.test.js' -o -name '*.test.d.ts'` — no output.
- [ ] `npm test` — exit 0 with baseline pass count preserved except for documented naming/path-only changes.

### 6.2 Scope verification

- [ ] `git --no-pager diff --stat -- bin etc reports` — output MUST show no unintended changes (NFR-7).
- [ ] `git --no-pager diff --stat -- package.json tsconfig.json vitest.config.ts docs/testing.md src __tests__` — output MUST list only files expected by `design.md` §2.

