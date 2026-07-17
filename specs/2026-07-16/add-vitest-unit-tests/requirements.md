# Requirements: Add Vitest Unit Tests

## 1. Background

The project has TypeScript build and lint scripts, but `npm test` is a
placeholder that exits unsuccessfully and there are no test files. The CLI
contains album and audiobook operations that perform metadata reads, filesystem
work, and, in two audiobook workflows, Docker-backed `m4b-tool` work.

The MCP-server design documented in `docs/mcp-server.md` will require
repeatable verification of dry-run outputs, validation failures, and safe
write behavior. A test foundation is needed before that work so command logic
can be exercised without requiring audio fixtures, native tag writing, Docker,
or a network connection.

## 2. Goal

Provide a repository-native Vitest unit-test workflow where `npm test` runs
reliably from a clean checkout, tests are hermetic, and the initial suite
covers shared utilities plus every album and audiobook command's primary
dry-run and representative validation/error path without changing observable
CLI behavior.

## 3. Scope

### In scope

- `package.json` and `package-lock.json` test dependency and script changes.
- A root Vitest configuration when configuration is needed.
- Test-only fixtures and test modules under `src/**`.
- Minimal, behavior-preserving testability seams in `src/**` where needed.
- Testing documentation describing local test commands and hermetic test rules.

### Out of scope

- Implementing the MCP server described in `docs/mcp-server.md`.
- Changing album or audiobook metadata, filename, dry-run, or destination
  conflict behavior.
- Tests requiring real FLAC, MP3, or M4B media fixtures.
- Running Docker, pulling `sandreas/m4b-tool`, or testing third-party
  `m4b-tool` internals.
- End-to-end testing against a real user media library.
- Changing production dependencies other than adding Vitest development
  dependencies.

## 4. Functional Requirements

- **FR-1** The project MUST install Vitest as a development dependency and
  replace the placeholder `npm test` script with a non-watch Vitest test run.
- **FR-2** The project MUST provide a watch-mode test script using the
  locally installed Vitest binary.
- **FR-3** The Vitest configuration MUST discover only repository test files,
  exclude generated output and dependencies, and run TypeScript ESM tests
  without a separate transpilation step.
- **FR-4** The initial suite MUST unit-test `command-utils.ts` output-format
  and filesystem-existence behavior, including invalid output format handling.
- **FR-5** The initial suite MUST cover album helper validation and all three
  `manage-albums` subcommands with a successful dry run and at least one
  representative error or boundary case per command.
- **FR-6** The initial suite MUST cover all six `manage-audiobooks`
  subcommands with a successful dry run or validation result and at least one
  representative invalid-input, metadata, or destination-conflict result per
  command.
- **FR-7** Tests for metadata-dependent commands MUST replace
  `music-metadata` and `node-taglib-sharp` at the module boundary and assert
  command behavior from deterministic metadata responses.
- **FR-8** Tests for merge and conversion MUST mock the Docker/m4b-tool
  boundary and prove that dry runs never invoke it.
- **FR-9** Any testability seam introduced into production code MUST be
  narrow, typed, and preserve the existing Commander CLI's option parsing,
  stdout JSON shapes, error messages, and filesystem semantics.
- **FR-10** The repository MUST document how to run the full suite and an
  individual test file with `npm` scripts or the locally installed binary.

## 5. Non-Functional Requirements

- **NFR-1 — Lint after every source code file modification.** After every
  modification of a source code file under `src/`, `npm run lint` MUST run and
  all reported issues MUST be fixed before the next source-code edit.
- **NFR-2 (build)** `npm run build` MUST exit 0 after the spec is complete.
- **NFR-3 (tests)** `npm test` MUST exit 0 after the spec is complete.
- **NFR-4 — No `npx`.** `npx` is forbidden in all forms. Commands MUST use
  `npm run <script>` or `./node_modules/.bin/<tool>`.
- **NFR-5 (hermeticity)** Tests MUST use temporary directories and mocks; they
  MUST NOT access a user media collection, Docker daemon, network service, or
  absolute machine-specific path.
- **NFR-6 (type safety)** New code MUST satisfy strict TypeScript with no
  `any`, type-suppression comments, or untyped mock escape hatches.
- **NFR-7 (scope discipline)** Changes outside `package.json`,
  `package-lock.json`, `vitest.config.ts`, `src/**` test seams/tests, and
  testing documentation MUST NOT be made.
- **NFR-8 (behavioral parity)** Existing CLI command names, options, default
  values, exit behavior, JSON row shapes, dry-run actions, and collision
  protections MUST remain unchanged.

## 6. Acceptance Criteria

1. `npm install` produces a lockfile containing the selected Vitest dependency,
   `npm test` runs Vitest once, and `npm run test:watch` starts watch mode.
2. The suite includes deterministic tests satisfying FR-4 through FR-8 without
   Docker, network access, or real audio media.
3. `npm run lint`, `npm run build`, and `npm test` each exit 0.
4. A review of representative before/after CLI JSON output confirms NFR-8.
5. The testing guide gives copyable no-`npx` commands for full-suite and
   focused test execution.
