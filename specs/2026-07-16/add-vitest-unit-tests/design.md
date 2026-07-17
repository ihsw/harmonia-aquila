# Design: Add Vitest Unit Tests

> Scope reminder: this spec touches only test infrastructure, `src/**`
> testability seams and tests, and testing documentation. No production
> behavior changes, Docker execution, real-media fixtures, or `npx`.

## 1. Overview

Install Vitest as the TypeScript-native unit-test runner and place tests beside
the modules they exercise using `*.test.ts`. This keeps imports relative,
allows Vitest to compile the existing ESM TypeScript source, and makes lint's
existing `./src` scope include test sources (FR-1 through FR-3).

Command tests will invoke Commander registrations in process, capture their
structured JSON output, and mock external module boundaries. This validates
the options-to-operation contract while avoiding fragile subprocess tests.
Where a command cannot be tested without private implementation access, extract
a small typed operation or dependency boundary; retain the command registration
as a thin adapter (FR-5 through FR-9).

## 2. File layout

### Modified and new files

```text
package.json                                      (modified: Vitest scripts/dependency)
package-lock.json                                 (modified: resolved dependency graph)
vitest.config.ts                                  (new: test discovery and execution config)
src/command-utils.test.ts                         (new)
src/commands/manage-albums/**/*.test.ts           (new)
src/commands/manage-audiobooks/**/*.test.ts       (new)
src/**                                            (modified only for narrow typed test seams)
docs/testing.md                                   (new)
```

### Files explicitly not modified

- `src/index.ts` — command registration remains the CLI entrypoint.
- `docs/mcp-server.md` — this spec does not implement or alter MCP design.
- `etc/**` and user media folders — tests use temporary directories only.

## 3. Test runner and scripts

Use one root `vitest.config.ts` with Node test environment, `src/**/*.test.ts`
inclusion, and exclusions for `build/**` and `node_modules/**`. The package
scripts are:

```json
{
  "test": "vitest run",
  "test:watch": "vitest"
}
```

Use `npm test` for the full suite. Focused work uses
`./node_modules/.bin/vitest run src/path/example.test.ts`; no command uses
`npx` (FR-1, FR-2, FR-3, NFR-4).

## 4. Test boundaries and fixtures

| Boundary | Test approach | Reason |
| --- | --- | --- |
| `music-metadata` | `vi.mock` deterministic `parseFile` result | Avoid real media files |
| `node-taglib-sharp` | `vi.mock` typed fake `File.createFromPath` | Avoid native metadata writes |
| filesystem | `mkdtemp` under OS temp directory and cleanup | Prove collision/copy behavior safely |
| `m4b-tool` helper | mock `mergeWithM4bTool` | Prove planning and invocation without Docker |
| Commander output/errors | isolated `Command`, captured output, exit override | Preserve CLI observable contract |

Mocks must be reset between tests. Metadata fixtures should be factory
functions with only fields consumed by the source module, rather than shared
binary fixtures. Tests should assert JSON rows and error text, not private
implementation details (FR-7 through FR-9).

## 5. Coverage matrix

| Area | Required successful behavior | Required safety/error behavior |
| --- | --- | --- |
| `command-utils` | JSON rows and existing-path check | rejected output format |
| album helpers | supported FLAC/MP3 discovery | non-audio entry and invalid limit |
| `summarize-source-dir` | metadata JSON dry run | `limit` or invalid directory |
| `fix-tags` | planned tag changes | conflicting strategy or existing destination |
| `organize-files` | planned metadata-based copy | duplicate/existing destination or missing tag |
| `validate` | matching M4B filename | mismatch or missing metadata |
| `copy-and-rename` | planned metadata-derived copy | already-valid filename or collision |
| `crawl` | categorizes valid and invalid M4Bs | malformed/missing metadata becomes row |
| `merge` | grouped merge plan | duplicate destination; dry run does not call tool |
| `convert-file` | conversion plan | no inputs, duplicate destination, or bad metadata |
| `set-metadata` | metadata-write plan | same/non-M4B/existing destination |

This is an initial behavioral baseline, not a coverage-percentage target.
Coverage thresholds are intentionally deferred until the suite has stabilized
(FR-4 through FR-8).

## 6. Testability seams

Prefer exported, typed operation functions that accept native option objects
and return existing JSON row types. Keep Commander-specific parsing and
`writeRows` in registrations. If extraction would create an oversized change,
inject only the external function used by the test, for example metadata
reading or m4b-tool merging.

Do not expose mutable production state solely for tests. Do not add a generic
test-only CLI option, change default `execute` behavior, or bypass destination
checks. The suite must prove these existing guarantees rather than weaken them
(FR-9, NFR-8).

## 7. Migration strategy

1. Establish the runner and green baseline with utility and helper tests.
2. Add album command tests, extracting minimal seams only where necessary.
3. Add audiobook tests with mocked media/native/Docker boundaries.
4. Update testing documentation and run the final verification set.

## 8. Risk Table

| Risk | Likelihood | Mitigation |
| --- | --- | --- |
| Native tag library fails during test import | Medium | Mock it before importing affected modules |
| Commander exits the process on invalid options | Medium | Use an isolated command with exit override |
| Tests accidentally run Docker | Low | Mock m4b-tool helper; assert no call for dry run |
| Mock shapes drift from metadata API | Medium | Use typed fixture factories and test consumed fields |
| Test seams alter production behavior | Low | Keep adapters thin and assert CLI JSON/error parity |

## 9. Verification

After every `src/**/*.ts` edit:

1. `npm run lint` (NFR-1).

At the end:

1. `npm run lint` — must exit 0.
2. `npm run build` — must exit 0.
3. `npm test` — must exit 0.
4. `git --no-pager diff --stat -- etc docs/mcp-server.md` — must show no
   unintended files (NFR-7).
