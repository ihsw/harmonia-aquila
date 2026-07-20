# Tasks: Raise Test Coverage

> ## Hard constraints (re-read before starting)
>
> - **DO NOT START** any task below until the user explicitly directs you to.
>   This file is delivered as a plan, not as a work order.
> - **No `npx`** in any form. Forbidden in **all** invocations
>   (no `--no-install`, no one-off Vitest/tsc runs, etc.). Any command line
>   containing the substring `npx` is a violation and must be rewritten before
>   execution. Use `./node_modules/.bin/<tool>` or `npm run <script>`
>   exclusively.
> - **No edits outside `__tests__/**`, narrowly scoped testability seams in
>   `src/**` when unavoidable, optional threshold settings in
>   `vitest.config.ts`, optional coverage documentation in `docs/testing.md`,
>   and this spec's `tasks.md`** for the duration of this spec. If a real bug
>   surfaces elsewhere, STOP and surface it; do not patch silently.
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

### 1.1 Capture baseline

- [ ] Check `git --no-pager status --short` and avoid reverting unrelated user
      changes.
- [ ] Run `npm run test:coverage` and record the global statement, line,
      function, and branch percentages in a task note.
- [ ] Confirm `reports/coverage/coverage-summary.json` exists and identifies
      the same low-coverage files listed in `design.md` §2.
- [ ] Do **not** run whole-codebase `npm run lint` as a pre-flight baseline;
      reserve it for final verification.

### 1.2 Classify low-coverage files

- [ ] For each Priority 1 file in `design.md` §2, decide whether it receives
      tests or is documented as a thin entrypoint/wrapper exclusion.
- [ ] Record any exclusions as a blockquoted task note with rationale.

## Phase 2 — Priority 1 domain-boundary tests

### 2.1 Cover album audio tag helpers

- [ ] Add `__tests__/lib/albums/audio-tags.test.ts`.
- [ ] Mock `music-metadata` and `node-taglib-sharp` at the module boundary.
- [ ] Cover successful metadata reads, missing/invalid metadata branches, and
      tag write calls/errors without touching real media files.
- [ ] Run `npm run lint -- __tests__/lib/albums/audio-tags.test.ts`. Fix
      issues. Re-run until clean.

### 2.2 Cover audiobook m4b-tool library wrapper

- [ ] Add `__tests__/lib/audiobooks/m4b-tool.test.ts`.
- [ ] Mock process execution so tests never invoke Docker or `m4b-tool`.
- [ ] Cover command construction, success parsing, and failure propagation.
- [ ] Run `npm run lint -- __tests__/lib/audiobooks/m4b-tool.test.ts`. Fix
      issues. Re-run until clean.

### 2.3 Cover album set-metadata command helper

- [ ] Add `__tests__/commands/manage-albums/helpers/set-metadata.test.ts`.
- [ ] Mock native tag writes and filesystem boundaries.
- [ ] Cover option validation, dry-run/planning behavior, and write/error
      branches exposed by the helper.
- [ ] Run `npm run lint -- __tests__/commands/manage-albums/helpers/set-metadata.test.ts`.
      Fix issues. Re-run until clean.

## Phase 3 — Priority 1 thin wrappers and command indexes

### 3.1 Cover audiobook command helper wrappers

- [ ] Add tests for `src/commands/manage-audiobooks/helpers/audiobook-file.ts`
      and `src/commands/manage-audiobooks/helpers/m4b-tool.ts`, or document them
      as pure-wrapper exclusions.
- [ ] If tests are added, run `npm run lint -- <modified-test-file>` for each
      file. Fix issues. Re-run until clean.

### 3.2 Cover command index registration

- [ ] Add command registration smoke tests for `manage-albums`, `manage-audiobooks`,
      and `web` command indexes, or document any entrypoint exclusions.
- [ ] Assert subcommand names/options without parsing real process arguments.
- [ ] Run `npm run lint -- <modified-test-file>` for each modified test file.
      Fix issues. Re-run until clean.

## Phase 4 — Priority 2 focused coverage

### 4.1 Cover audiobook set-metadata and convert-file branches

- [ ] Extend or add tests for `src/lib/audiobooks/set-metadata.ts`.
- [ ] Extend or add tests for `src/lib/audiobooks/convert-file.ts`.
- [ ] Cover error propagation, destination handling, and option/concurrency
      branches with mocked external effects.
- [ ] Run `npm run lint -- <modified-test-file>` for each modified test file.
      Fix issues. Re-run until clean.

### 4.2 Cover album fix-tags and shared errors

- [ ] Extend or add tests for `src/lib/albums/fix-tags.ts`.
- [ ] Add tests for `src/lib/errors.ts`.
- [ ] Cover strategy/error branches that currently pull down branch coverage.
- [ ] Run `npm run lint -- <modified-test-file>` for each modified test file.
      Fix issues. Re-run until clean.

### 4.3 Cover command crawl branch gaps

- [ ] Extend `__tests__/commands/manage-audiobooks/crawl.test.ts` or add a
      focused companion test for command-boundary branch gaps.
- [ ] Run `npm run lint -- __tests__/commands/manage-audiobooks/crawl.test.ts`
      or the new modified test file. Fix issues. Re-run until clean.

## Phase 5 — Coverage threshold decision

### 5.1 Measure final coverage

- [ ] Run `npm run test:coverage` and compare all four global metrics against
      the Phase 1 baseline.
- [ ] Confirm statement, line, function, and branch coverage all improved.
- [ ] Confirm whether global line coverage reached 70% and branch coverage
      reached 60%; document blockers if not.

### 5.2 Optional threshold update

- [ ] Decide whether to add conservative global thresholds to `vitest.config.ts`.
- [ ] If thresholds are added, keep them no higher than final measured coverage.
- [ ] If `vitest.config.ts` is modified, run `npm run lint -- vitest.config.ts`.
      Fix issues. Re-run until clean.

## Phase 6 — Documentation

### 6.1 Update testing docs only if needed

- [ ] If thresholds or new coverage conventions are added, update
      `docs/testing.md`.
- [ ] If `docs/testing.md` is unchanged, document that no docs update was
      needed in a task note.

## Phase 7 — Final verification

### 7.1 Full verification

- [ ] `npm run lint` — whole-codebase last-call lint after all TypeScript
      modifications are complete; exit 0.
- [ ] `npm run build` — exit 0.
- [ ] `npm test` — exit 0.
- [ ] `npm run test:coverage` — exit 0 and metrics improved versus baseline.

### 7.2 Scope and artifact verification

- [ ] `git --no-pager status --short reports/coverage` — output MUST be empty
      or contain no generated coverage artifacts.
- [ ] `git --no-pager diff --stat -- __tests__ src vitest.config.ts docs/testing.md specs/2026-07-19/raise-test-coverage/tasks.md` — output MUST list only expected test, approved seam, optional config/doc, and task files.
