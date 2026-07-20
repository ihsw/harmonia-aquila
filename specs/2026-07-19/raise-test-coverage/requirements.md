# Requirements: Raise Test Coverage

## 1. Background

The `add-vitest-coverage` spec added `npm run test:coverage` and writes
coverage artifacts to `reports/coverage/`. The current coverage baseline from
`reports/coverage/coverage-summary.json` is approximately 61.09% statements,
61.38% lines, 72.58% functions, and 49.80% branches.

Several production files now show zero or minimal coverage. Some are thin
command registration entrypoints, while others contain important boundary logic
around metadata parsing, native tag writes, and external `m4b-tool` execution.
This spec targets the latter first so coverage increases also improve confidence
in behavior that is risky to change.

## 2. Goal

Add focused Vitest coverage for zero-coverage and minimal-coverage production
files, prioritizing important logic and external-boundary adapters, while
preserving runtime behavior and keeping generated coverage artifacts ignored.

## 3. Scope

### In scope

- New and modified tests under `__tests__/**`.
- Test-only mocks and fixtures for `music-metadata`, `node-taglib-sharp`,
  `child_process`, filesystem operations, and command construction.
- Minimal behavior-preserving TypeScript changes under `src/**` only if a file
  cannot be tested safely without a narrow testability seam.
- Optional coverage threshold updates in `vitest.config.ts` after the measured
  baseline improves.
- `docs/testing.md` only if new testing conventions or coverage thresholds need
  documentation.

### Out of scope

- Changing production behavior or user-facing CLI/web output.
- Adding new runtime dependencies.
- Replacing Vitest or the V8 coverage provider.
- Testing Docker, `m4b-tool`, or native tag libraries through real external
  processes during the normal suite.
- Chasing 100% coverage for every file.
- Tracking generated coverage artifacts under git.

## 4. Functional Requirements

- **FR-1** The implementation MUST run `npm run test:coverage` before adding
  tests and record the baseline summary in the task notes.
- **FR-2** The implementation MUST add focused tests for every production file
  currently below 5% line coverage unless the file is explicitly classified as
  an entrypoint or pure re-export and documented in task notes.
- **FR-3** The implementation MUST add focused tests for at least three
  production files currently between 5% and 65% line coverage, prioritizing
  files with domain logic or external-boundary behavior.
- **FR-4** Tests for external-boundary code MUST mock process execution, native
  tag writes, metadata reads, and filesystem writes at the boundary; they MUST
  NOT invoke Docker, real `m4b-tool`, or real native metadata writes.
- **FR-5** Thin command index/entrypoint files MAY be covered with command
  registration smoke tests or MAY be excluded from threshold targets only when
  the exclusion is documented and does not hide domain logic.
- **FR-6** The final `npm run test:coverage` result MUST improve global
  statement, line, function, and branch percentages compared with the baseline
  captured in FR-1.
- **FR-7** The final `npm run test:coverage` result SHOULD reach at least 70%
  global line coverage and 60% global branch coverage. If either target is not
  reached, the implementation MUST document the blocker in task notes.
- **FR-8** Any added coverage thresholds in `vitest.config.ts` MUST be no higher
  than the measured final coverage and MUST NOT make unrelated future test runs
  flaky.

## 5. Non-Functional Requirements

- **NFR-1 — Lint after every source code file modification** After every
  modification of a source code file (for example, a `.ts` file) under the
  scope of this spec, `npm run lint -- <modified-file>` MUST be run so only the
  modified file is linted, and any reported issues MUST be fixed before moving
  on. This applies per source-code edit, not per-task. Whole-codebase
  `npm run lint` MUST be reserved for final verification after all TypeScript
  modifications are complete.
- **NFR-2 — No `npx`** `npx` is forbidden in **all** forms (no `--no-install`,
  no one-off Vitest/tsc invocations). Any command line containing the substring
  `npx` is a violation. Use `./node_modules/.bin/<tool>` or
  `npm run <script>` exclusively.
- **NFR-3 — No new dependencies** This coverage work MUST use Vitest, Node
  built-ins, and already installed dependencies.
- **NFR-4 — Strict TypeScript / no any** Test and source changes MUST preserve
  strict typing, MUST NOT add `any`, and MUST NOT add `// @ts-` escapes.
- **NFR-5 — File size** New or modified test files SHOULD stay under 200 lines.
  If a suite would exceed that, split by module or behavior group.
- **NFR-6 — Build parity** `npm run build` MUST exit 0 after the spec is
  complete.
- **NFR-7 — Tests** `npm test` MUST exit 0 after the spec is complete.
- **NFR-8 — Coverage command** `npm run test:coverage` MUST exit 0 after the
  spec is complete.
- **NFR-9 — Artifact hygiene** `git --no-pager status --short reports/coverage`
  MUST show no generated coverage artifacts.

## 6. Acceptance Criteria

1. `npm run test:coverage` exits 0 and shows improved global statement, line,
   function, and branch percentages versus the captured baseline.
2. Every non-excluded file below 5% line coverage has focused test coverage.
3. At least three prioritized files between 5% and 65% line coverage gain
   focused test coverage.
4. `npm run lint`, `npm run build`, and `npm test` exit 0.
5. Generated coverage artifacts remain ignored by git.
