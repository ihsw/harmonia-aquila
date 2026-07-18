# Requirements: Move Unit Tests to `__tests__`

## 1. Background

The 2026-07-16 spec `add-vitest-unit-tests` introduced Vitest and colocated unit tests under `src/**` using `*.test.ts`. That layout works for discovery via `vitest.config.ts`, but `tsconfig.json` currently has `rootDir: "./src"` and `include: ["src"]`, so `npm run build` compiles colocated test files into `build/dist` along with production CLI code.

This repository publishes/runs the CLI from `build/dist/index.js`; build output should contain production sources only. Unit tests and shared test helpers should live outside the production source tree while remaining easy to run and lint.

## 2. Goal

Move all unit tests and test-only helpers into a root-level `__tests__/` directory, update configuration and documentation so Vitest still runs the same suite, and ensure `npm run build` no longer emits test files or test-only helpers.

## 3. Scope

### In scope

- Move existing `src/**/*.test.ts` files into `__tests__/` while preserving their command/domain grouping.
- Move test-only shared utilities from `src/test-helpers.ts` into `__tests__/test-helpers.ts` if they are not used by production code.
- Update import paths in moved tests.
- Update `vitest.config.ts` test discovery to target `__tests__/**/*.test.ts`.
- Update `package.json` lint coverage so `npm run lint` includes both production TypeScript and the new test tree.
- Update `docs/testing.md` to document the new paths and focused-test command examples.
- Update `tsconfig.json` only if needed to explicitly keep tests outside production builds.

### Out of scope

- Adding, deleting, or materially rewriting unit test cases.
- Changing production CLI behavior, command output, file organization behavior, or metadata behavior.
- Adding new dependencies or replacing Vitest/ESLint/TypeScript.
- Introducing coverage thresholds.
- Moving production source files out of `src/`.
- Editing media fixtures or user media folders.

## 4. Functional Requirements

- **FR-1** All current unit test files currently matching `src/**/*.test.ts` MUST be moved under a root-level `__tests__/` directory and MUST keep equivalent grouping by feature area.
- **FR-2** Test-only helpers currently in `src/test-helpers.ts` MUST be moved under `__tests__/` unless an audit proves they are imported by production code.
- **FR-3** Moved tests MUST import production modules from `src/` using correct relative ESM-compatible paths and MUST retain existing observable assertions.
- **FR-4** `vitest.config.ts` MUST discover tests from `__tests__/**/*.test.ts` and MUST NOT depend on colocated `src/**/*.test.ts` discovery.
- **FR-5** `npm run build` MUST NOT emit any `.test.js`, `.test.d.ts`, test helper, or `__tests__` artifact under `build/dist`.
- **FR-6** `npm test` MUST run the same migrated unit test suite successfully from the new locations.
- **FR-7** `npm run lint` MUST lint production source files and migrated test files from the new `__tests__/` tree.
- **FR-8** `docs/testing.md` MUST show the new root-level test layout and focused Vitest examples using `__tests__/...` paths.

## 5. Non-Functional Requirements

- **NFR-1 — Lint after every source code file modification** After every modification of a source code file, including `.ts` files under `src/`, `__tests__/`, or root TypeScript config files, `npm run lint` MUST be run and reported issues MUST be fixed before moving on.
- **NFR-2 — No `npx`** `npx` is forbidden in **all** forms. Use `./node_modules/.bin/<tool>` or `npm run <script>` exclusively.
- **NFR-3 — TypeScript build** `npm run build` MUST exit 0 after the migration is complete.
- **NFR-4 — Tests** `npm test` MUST exit 0 after the migration is complete.
- **NFR-5 — No new dependencies** The migration MUST NOT add runtime or development dependencies.
- **NFR-6 — Behavioral parity** The migrated tests MUST preserve the same assertions and production behavior coverage unless a pre-existing flaky or invalid assertion is documented before any change.
- **NFR-7 — Scope discipline** Implementation MUST NOT modify `bin/**`, `etc/**`, `reports/**`, media folders, or unrelated specs.
- **NFR-8 — File size** No newly produced or heavily edited source/test/config file MAY exceed 200 lines.

## 6. Acceptance Criteria

1. `find build/dist -path '*__tests__*' -o -name '*.test.js' -o -name '*.test.d.ts'` produces no test build artifacts after `npm run build`.
2. `npm run build` exits 0 and `build/dist/index.js` remains present.
3. `npm test` exits 0 and runs the migrated suite from `__tests__/`.
4. `npm run lint` exits 0 and includes both `src` and `__tests__` in its configured scope.
5. `docs/testing.md` references `__tests__/` paths for focused test examples.

