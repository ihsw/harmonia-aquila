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

- [ ] Check `git --no-pager status --short` and avoid reverting unrelated user
      changes.
- [ ] Confirm whether `@vitest/coverage-v8` is already present in
      `package.json` or `package-lock.json`.
- [ ] Run `npm test` and capture the current pass/fail count as the baseline.
- [ ] Do **not** run whole-codebase `npm run lint` as a pre-flight baseline;
      reserve it for final verification.

### 1.2 Confirm artifact ignore behavior

- [ ] Inspect `.gitignore` and confirm generated `reports/coverage/` artifacts
      will remain ignored.
- [ ] If `.gitignore` already ignores `reports/`, leave it unchanged.

## Phase 2 — Package coverage command

### 2.1 Install coverage provider if needed

- [ ] If `@vitest/coverage-v8` is absent, run
      `npm install --save-dev @vitest/coverage-v8`.
- [ ] Confirm `package.json` and `package-lock.json` both reflect the provider
      change when installation is required.

### 2.2 Add coverage script

- [ ] Add `"test:coverage": "vitest run --coverage"` to `package.json`.
- [ ] Confirm existing `test` and `test:watch` scripts remain unchanged.

## Phase 3 — Vitest configuration

### 3.1 Configure coverage

- [ ] Update `vitest.config.ts` with a `coverage` block using provider `v8`.
- [ ] Set `reportsDirectory` to `reports/coverage`.
- [ ] Set reporters to include terminal text plus persisted `html`, `lcov`,
      and `json-summary` output.
- [ ] Include `src/**/*.ts` and exclude tests, build output, dependencies,
      reports, and config/spec files.
- [ ] Run `npm run lint -- vitest.config.ts`. Fix issues. Re-run until clean.

### 3.2 Keep thresholds baseline-safe

- [ ] Do not add aspirational hard thresholds.
- [ ] If any threshold is configured, run `npm run test:coverage` first and set
      thresholds no higher than the measured baseline.

## Phase 4 — Coverage command verification

### 4.1 Run coverage

- [ ] Run `npm run test:coverage` — exit 0.
- [ ] Confirm terminal output includes a coverage summary.
- [ ] Confirm `reports/coverage/` exists after the command.
- [ ] Run `git --no-pager status --short reports/coverage` and confirm no
      generated coverage artifacts appear.

### 4.2 Fix coverage-only blockers if they appear

- [ ] If a test fails only under coverage, make the smallest isolation-focused
      test fix.
- [ ] For each modified test file, run `npm run lint -- <modified-test-file>`.
      Fix issues. Re-run until clean.
- [ ] Re-run `npm run test:coverage` after any blocker fix.

## Phase 5 — Documentation

### 5.1 Update test command docs if present

- [ ] Search for existing documentation of `npm test` or test commands.
- [ ] If such documentation exists, add `npm run test:coverage` alongside it.
- [ ] Do not create new documentation solely for this feature unless the user
      requests it.

## Phase 6 — Final verification

### 6.1 Full verification

- [ ] `npm run lint` — whole-codebase last-call lint after all TypeScript
      modifications are complete; exit 0.
- [ ] `npm run build` — exit 0.
- [ ] `npm test` — exit 0 and matches the Phase 1 baseline except for
      documented changes.
- [ ] `npm run test:coverage` — exit 0.

### 6.2 Scope verification

- [ ] `git --no-pager status --short reports/coverage` — output MUST be empty
      or contain no generated coverage artifacts.
- [ ] `git --no-pager diff --stat -- package.json package-lock.json vitest.config.ts .gitignore` — output MUST list only expected coverage changes.
