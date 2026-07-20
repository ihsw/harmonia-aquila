# Tasks: Add Vitest Coverage

> ## Hard constraints (re-read before starting)
>
> - **DO NOT START** any task below until the user explicitly directs you to.
>   This file is delivered as a plan, not as a work order.
> - **No `npx`** in any form. Forbidden in **all** invocations
>   (no `--no-install`, no one-off Vitest/tsc runs, etc.). Any command line
>   containing the substring `npx` is a violation and must be rewritten before
>   execution. Use `./node_modules/.bin/<tool>` or `npm run <script>`
>   exclusively.
> - **No edits outside `package.json`, `package-lock.json`, `vitest.config.ts`,
>   `.gitignore` if needed, existing test command documentation if present, and
>   narrowly scoped test isolation fixes if coverage exposes a blocker** for
>   this spec. If a real bug surfaces elsewhere, STOP and surface it; do not
>   patch silently.
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

### 1.1 Confirm baseline and package state

- [x] Check `git --no-pager status --short` and avoid reverting unrelated user
      changes.
- [x] Confirm whether `@vitest/coverage-v8` is already present in
      `package.json` or `package-lock.json`.
- [x] Run `npm test` and capture the current pass/fail count as the baseline.
- [x] Do **not** run whole-codebase `npm run lint` as a pre-flight baseline;
      reserve it for final verification.

### 1.2 Confirm artifact ignore behavior

- [x] Inspect `.gitignore` and confirm generated `reports/coverage/` artifacts
      will remain ignored.
- [x] If `.gitignore` already ignores `reports/`, leave it unchanged.

## Phase 2 — Package coverage command

### 2.1 Install coverage provider if needed

- [x] If `@vitest/coverage-v8` is absent, run
      `npm install --save-dev @vitest/coverage-v8`.
- [x] Confirm `package.json` and `package-lock.json` both reflect the provider
      change when installation is required.

### 2.2 Add coverage script

- [x] Add `"test:coverage": "vitest run --coverage"` to `package.json`.
- [x] Confirm existing `test` and `test:watch` scripts remain unchanged.

## Phase 3 — Vitest configuration

### 3.1 Configure coverage

- [x] Update `vitest.config.ts` with a `coverage` block using provider `v8`.
- [x] Set `reportsDirectory` to `reports/coverage`.
- [x] Set reporters to include terminal text plus persisted `html`, `lcov`,
      and `json-summary` output.
- [x] Include `src/**/*.ts` and exclude tests, build output, dependencies,
      reports, and config/spec files.
- [x] Run `npm run lint -- vitest.config.ts`. Fix issues. Re-run until clean.

### 3.2 Keep thresholds baseline-safe

- [x] Do not add aspirational hard thresholds.
- [x] If any threshold is configured, run `npm run test:coverage` first and set
      thresholds no higher than the measured baseline.

## Phase 4 — Coverage command verification

### 4.1 Run coverage

- [x] Run `npm run test:coverage` — exit 0.
- [x] Confirm terminal output includes a coverage summary.
- [x] Confirm `reports/coverage/` exists after the command.
- [x] Run `git --no-pager status --short reports/coverage` and confirm no
      generated coverage artifacts appear.

### 4.2 Fix coverage-only blockers if they appear

- [x] If a test fails only under coverage, make the smallest isolation-focused
      test fix.
- [x] For each modified test file, run `npm run lint -- <modified-test-file>`.
      Fix issues. Re-run until clean.
- [x] Re-run `npm run test:coverage` after any blocker fix.

## Phase 5 — Documentation

### 5.1 Update test command docs if present

- [x] Search for existing documentation of `npm test` or test commands.
- [x] If such documentation exists, add `npm run test:coverage` alongside it.
- [x] Do not create new documentation solely for this feature unless the user
      requests it.

## Phase 6 — Final verification

### 6.1 Full verification

- [x] `npm run lint` — whole-codebase last-call lint after all TypeScript
      modifications are complete; exit 0.
- [x] `npm run build` — exit 0.
- [x] `npm test` — exit 0 and matches the Phase 1 baseline except for
      documented changes.
- [x] `npm run test:coverage` — exit 0.

### 6.2 Scope verification

- [x] `git --no-pager status --short reports/coverage` — output MUST be empty
      or contain no generated coverage artifacts.
- [x] `git --no-pager diff --stat -- package.json package-lock.json vitest.config.ts .gitignore` — output MUST list only expected coverage changes.
