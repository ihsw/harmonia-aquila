# Design: Move Unit Tests to `__tests__`

> Scope reminder: this spec touches **only** test files/helpers, test/build/lint configuration, and testing documentation. No production behavior changes, no new dependencies, no media-folder edits, and no `npx`.

## 1. Overview

Use a root-level test-tree migration: production TypeScript stays under `src/`, while unit tests and test-only helpers move to `__tests__/`. Because `tsconfig.json` builds `include: ["src"]`, placing tests outside `src/` prevents `npm run build` from compiling test files into `build/dist` (FR-1, FR-2, FR-5).

Vitest will become responsible for compiling/running the root test tree via `include: ['__tests__/**/*.test.ts']`. Imports in tests will change from colocated paths to relative paths that point back into `src/` (FR-3, FR-4, FR-6). Lint must be widened from `eslint ./src` to include `__tests__` so test files keep the same quality gates after moving (FR-7, NFR-1).

## 2. File layout

### Modified and moved files

```text
package.json                                      (modified: lint script includes __tests__)
tsconfig.json                                    (modified only if explicit test exclusion is needed)
vitest.config.ts                                 (modified: test include points at __tests__)
docs/testing.md                                  (modified: examples use __tests__ paths)
src/command-utils.test.ts                        -> __tests__/command-utils.test.ts
src/test-helpers.ts                              -> __tests__/test-helpers.ts
src/commands/manage-albums/**/*.test.ts          -> __tests__/commands/manage-albums/**/*.test.ts
src/commands/manage-audiobooks/**/*.test.ts      -> __tests__/commands/manage-audiobooks/**/*.test.ts
```

### Files explicitly NOT modified

- `src/index.ts` — CLI entrypoint remains production-only.
- `src/commands/**` production modules — imports may be consumed by tests, but behavior is not changed by this migration.
- `bin/**`, `etc/**`, and `reports/**` — unrelated operational and generated files.
- `package-lock.json` — no dependency changes are planned.

## 3. Target test-tree shape

The new root test tree mirrors the existing `src` grouping without duplicating the leading `src` segment:

| Current path | Target path |
| --- | --- |
| `src/command-utils.test.ts` | `__tests__/command-utils.test.ts` |
| `src/test-helpers.ts` | `__tests__/test-helpers.ts` |
| `src/commands/manage-albums/fix-tags.test.ts` | `__tests__/commands/manage-albums/fix-tags.test.ts` |
| `src/commands/manage-albums/organize-files.test.ts` | `__tests__/commands/manage-albums/organize-files.test.ts` |
| `src/commands/manage-albums/summarize-source-dir.test.ts` | `__tests__/commands/manage-albums/summarize-source-dir.test.ts` |
| `src/commands/manage-albums/helpers/utils.test.ts` | `__tests__/commands/manage-albums/helpers/utils.test.ts` |
| `src/commands/manage-audiobooks/copy-and-rename.test.ts` | `__tests__/commands/manage-audiobooks/copy-and-rename.test.ts` |
| `src/commands/manage-audiobooks/convert-file.test.ts` | `__tests__/commands/manage-audiobooks/convert-file.test.ts` |
| `src/commands/manage-audiobooks/crawl.test.ts` | `__tests__/commands/manage-audiobooks/crawl.test.ts` |
| `src/commands/manage-audiobooks/merge.test.ts` | `__tests__/commands/manage-audiobooks/merge.test.ts` |
| `src/commands/manage-audiobooks/set-metadata.test.ts` | `__tests__/commands/manage-audiobooks/set-metadata.test.ts` |
| `src/commands/manage-audiobooks/validate.test.ts` | `__tests__/commands/manage-audiobooks/validate.test.ts` |

## 4. Configuration changes

| File | Current state | Required state |
| --- | --- | --- |
| `vitest.config.ts` | `include: ['src/**/*.test.ts']` | `include: ['__tests__/**/*.test.ts']` with existing `build/**` and `node_modules/**` excludes preserved. |
| `package.json` | `lint: eslint ./src` | Lint command includes `src`, `__tests__`, and root TypeScript config files that are part of the test setup if needed. |
| `tsconfig.json` | `include: ['src']` | May remain unchanged if tests are outside `src`; optionally add explicit excludes for `__tests__` and `**/*.test.ts` for defensive clarity. |
| `docs/testing.md` | Focused examples reference `src/**/*.test.ts` | Examples reference `__tests__/**/*.test.ts`. |

No path alias is introduced. Relative imports keep the package simple and avoid TypeScript module-resolution churn (NFR-5).

## 5. Import rewrite rules

Moved tests should import production code from the mirrored relative depth:

```ts
// before: src/commands/manage-albums/fix-tags.test.ts
import { registerFixTagsCommand } from './fix-tags.js'
import { createTempDir } from '../../test-helpers.js'

// after: __tests__/commands/manage-albums/fix-tags.test.ts
import { registerFixTagsCommand } from '../../../src/commands/manage-albums/fix-tags.js'
import { createTempDir } from '../../test-helpers.js'
```

Rules:

1. Production imports point into `src/` and retain `.js` specifiers required by NodeNext ESM.
2. Test-helper imports point within `__tests__/`.
3. Mock module specifiers are updated to match the production import specifier used by the moved test.
4. Assertions and fixtures are otherwise preserved (FR-3, NFR-6).

## 6. Migration strategy

1. Capture the current baseline with lint, build, and tests.
2. Create the `__tests__/` tree and move tests/helpers without changing assertions.
3. Rewrite imports and Vitest discovery in one coherent step.
4. Widen lint coverage and run `npm run lint` immediately after each TypeScript/config edit.
5. Run build and artifact checks to prove tests are absent from `build/dist`.
6. Update `docs/testing.md` after commands and paths are verified.

## 7. Risk Table

| Risk | Likelihood | Mitigation |
| ---- | ---------- | ---------- |
| Relative imports become incorrect after moving deeply nested tests | Medium | Use a path mapping table and run focused Vitest files before full suite. |
| `vi.mock` specifiers no longer match imported modules | Medium | Update mock strings alongside imports and verify affected tests individually. |
| Tests stop being linted after leaving `src` | Medium | Update `package.json` lint script and make `npm run lint` part of every edit checkpoint. |
| TypeScript build still emits old test artifacts from stale `build/dist` | Low | Clean or inspect `build/dist` after build; acceptance check searches for test artifacts. |
| A helper moved from `src` was actually used by production code | Low | Grep for `test-helpers` imports before moving; stop if any production import exists. |

## 8. Verification

After every source code/config edit:

1. `npm run lint` — must exit 0 (NFR-1).

Focused checks during migration:

1. `./node_modules/.bin/vitest run __tests__/command-utils.test.ts` — verifies root-level imports.
2. `./node_modules/.bin/vitest run __tests__/commands/manage-albums/fix-tags.test.ts` — verifies nested command imports/mocks.
3. `./node_modules/.bin/vitest run __tests__/commands/manage-audiobooks/merge.test.ts` — verifies nested audiobook imports/mocks.

At the end:

1. `npm run lint` — must exit 0.
2. `npm run build` — must exit 0.
3. `find build/dist -path '*__tests__*' -o -name '*.test.js' -o -name '*.test.d.ts'` — must print no paths.
4. `npm test` — must exit 0.
5. `git --no-pager diff --stat -- bin etc reports` — must show no unintended files.

