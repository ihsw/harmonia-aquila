# Requirements: Add Vitest Coverage

## 1. Background

Harmonia Aquila already uses Vitest for the TypeScript test suite through
`npm test`, and `vitest.config.ts` defines the current Node test environment and
test file include pattern. The project does not currently expose a first-class
coverage command or configure Vitest coverage output.

The repository already ignores `reports/` while preserving `reports/.gitkeep`,
which makes `reports/coverage/` the preferred destination for generated coverage
artifacts. Adding coverage should improve test visibility without changing the
normal `npm test` behavior.

## 2. Goal

Add a repeatable Vitest coverage workflow that reports coverage for production
TypeScript under `src/**`, writes machine-readable and human-readable artifacts
under `reports/coverage/`, and can be run locally or in CI without changing
existing tests or runtime behavior.

## 3. Scope

### In scope

- `package.json` and `package-lock.json` for a coverage script and any required
  Vitest coverage provider dependency.
- `vitest.config.ts` for coverage include/exclude patterns, reporters, output
  directory, and threshold policy.
- `.gitignore` only if generated coverage artifacts are not already ignored.
- Existing Vitest tests under `__tests__/**` only if a coverage-specific failure
  exposes a test isolation issue that blocks the coverage command.
- Optional test documentation in an existing README or docs file if the project
  already documents test commands.

### Out of scope

- Adding broad new product test cases to raise coverage percentages.
- Changing production behavior under `src/**`.
- Replacing Vitest with another test runner.
- Adding CI workflow files unless the user explicitly requests CI wiring.
- Publishing coverage to an external service.
- Moving test files or reorganizing the test suite.

## 4. Functional Requirements

- **FR-1** `package.json` MUST provide an `npm run test:coverage` command that
  runs Vitest coverage without using `npx`.
- **FR-2** Vitest coverage MUST use a supported Vitest coverage provider for
  Vitest 4 and MUST be installed in `devDependencies` if it is not already
  present.
- **FR-3** Coverage collection MUST include production TypeScript files under
  `src/**/*.ts`.
- **FR-4** Coverage collection MUST exclude tests, build output, dependency
  folders, generated reports, and non-production config/spec files.
- **FR-5** Coverage output MUST include terminal text output plus persisted
  artifacts suitable for local browsing and CI consumption.
- **FR-6** Persisted coverage artifacts MUST be written under
  `reports/coverage/`.
- **FR-7** The existing `npm test` command MUST continue to run tests without
  collecting coverage by default.
- **FR-8** Initial coverage thresholds MUST be baseline-safe: they MAY document
  the measured baseline, but they MUST NOT fail the first coverage run solely
  because the existing suite is below an aspirational target.

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
- **NFR-3 — Build parity** `npm run build` MUST exit 0 after the spec is
  complete.
- **NFR-4 — Tests** `npm test` MUST exit 0 after the spec is complete.
- **NFR-5 — Coverage command** `npm run test:coverage` MUST exit 0 after the
  spec is complete.
- **NFR-6 — Strict TypeScript / no any** TypeScript changes MUST preserve strict
  typing, MUST NOT add `any`, and MUST NOT add `// @ts-` escapes.
- **NFR-7 — Scope discipline** Final diffs MUST be limited to the files listed
  in scope unless a blocker is documented and approved by the user.
- **NFR-8 — Artifact hygiene** Generated coverage artifacts MUST remain ignored
  by git.

## 6. Acceptance Criteria

1. `npm run test:coverage` exits 0 and prints a coverage summary.
2. `reports/coverage/` contains persisted coverage output after the coverage
   command runs.
3. `npm test` still exits 0 without requiring coverage.
4. `npm run lint`, `npm run build`, and `npm test` all exit 0.
5. `git --no-pager status --short reports/coverage` shows no tracked or
   untracked coverage artifacts.
