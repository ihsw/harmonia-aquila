# Design: Raise Test Coverage

> Scope reminder: this spec touches **only** `__tests__/**`, narrowly scoped
> testability seams in `src/**` when unavoidable, optional threshold settings in
> `vitest.config.ts`, and `docs/testing.md` if coverage conventions change. No
> runtime behavior changes, no new dependencies, no real Docker/native metadata
> writes, no `npx`.

## 1. Overview

Use the new Vitest coverage workflow as a feedback loop: capture baseline,
target the lowest-coverage production files first, add isolated unit tests, and
rerun coverage after each phase. The approach emphasizes external-boundary mocks
and small module-level tests rather than broad end-to-end tests, satisfying
FR-2 through FR-6 without making the suite slower or dependent on local media
tools.

The implementation should prioritize files where coverage adds confidence:
metadata parsing/writing adapters, `m4b-tool` command construction, path and
error branches, and command registration factories. Thin entrypoints may be
tested with smoke tests or documented as exclusions when they contain no domain
logic (FR-5).

## 2. Coverage baseline and target list

Baseline from the current `reports/coverage/coverage-summary.json`:

| Metric | Baseline |
| ------ | -------- |
| Statements | 61.09% |
| Lines | 61.38% |
| Functions | 72.58% |
| Branches | 49.80% |

### Priority 1 — zero or minimal line coverage

| File | Line coverage | Proposed disposition |
| ---- | ------------- | -------------------- |
| `src/lib/albums/audio-tags.ts` | 0% | Add unit tests with mocked `music-metadata` and `node-taglib-sharp`. |
| `src/lib/audiobooks/m4b-tool.ts` | 3.03% | Add unit tests with mocked child-process execution. |
| `src/commands/manage-albums/helpers/set-metadata.ts` | 1.35% | Add tests around option validation/planning helpers with native writes mocked. |
| `src/commands/manage-audiobooks/helpers/audiobook-file.ts` | 0% | Add thin adapter forwarding tests or document as pure wrapper. |
| `src/commands/manage-audiobooks/helpers/m4b-tool.ts` | 0% | Add thin adapter forwarding tests or document as pure wrapper. |
| `src/commands/manage-albums/index.ts` | 0% | Add command registration smoke test or document as thin index. |
| `src/commands/manage-audiobooks/index.ts` | 0% | Add command registration smoke test or document as thin index. |
| `src/commands/web/index.ts` | 0% | Add command registration smoke test or document as thin index. |
| `src/index.ts` | 0% | Prefer documenting as executable entrypoint unless safe import test exists. |

### Priority 2 — below or near 65% line coverage

| File | Line coverage | Proposed focus |
| ---- | ------------- | -------------- |
| `src/lib/audiobooks/set-metadata.ts` | 48.38% | Destination validation, metadata write error path, success row shape. |
| `src/lib/audiobooks/convert-file.ts` | 58.62% | Empty input, concurrency/job mapping, failed conversion propagation. |
| `src/lib/albums/fix-tags.ts` | 62.87% | Strategy branches, invalid metadata branches, collision/error paths. |
| `src/commands/manage-audiobooks/crawl.ts` | 62.5% | Missing/invalid option branches at command boundary. |
| `src/lib/errors.ts` | 50% | Error class construction and non-Harmonia error handling. |

## 3. Test patterns

### 3.1 Native metadata modules

Mock native and metadata dependencies at the module boundary:

```ts
vi.mock('music-metadata', () => ({ parseFile: vi.fn() }))
vi.mock('node-taglib-sharp', () => ({ File: { createFromPath: vi.fn() } }))
```

Tests should assert normalized metadata values, error propagation, and tag-write
calls without opening real audio files.

### 3.2 Child-process and tool execution

Mock `child_process` or the repository's process wrapper at the lowest stable
boundary. Tests should assert command arguments, error handling, and parsed
outputs without invoking Docker or `m4b-tool`.

### 3.3 Command registration and thin adapters

For index modules and command factories, instantiate commands and inspect
subcommand names/options. Avoid parsing process arguments from executable
entrypoints. For pure wrappers, one forwarding test is enough unless the wrapper
contains validation logic.

## 4. Modified files

Expected additions or edits:

```text
__tests__/lib/albums/audio-tags.test.ts
__tests__/lib/audiobooks/m4b-tool.test.ts
__tests__/commands/manage-albums/helpers/set-metadata.test.ts
__tests__/commands/manage-audiobooks/helpers/*.test.ts
__tests__/commands/*/index.test.ts
__tests__/commands/web/index.test.ts
__tests__/lib/audiobooks/{set-metadata,convert-file}.test.ts
__tests__/lib/albums/fix-tags.test.ts
__tests__/lib/errors.test.ts
vitest.config.ts                         (optional threshold update only)
docs/testing.md                          (optional convention note only)
```

Files explicitly not modified unless a blocker is documented:

- `package.json` and `package-lock.json` — coverage tooling already exists.
- Production `src/**` files — no behavior changes; testability seams only if
  unavoidable.
- Generated files under `reports/coverage/**`.

## 5. Threshold strategy

Do not add thresholds until after tests are added and final coverage is known.
If thresholds are added, start with conservative global minimums no higher than
the measured final output. Prefer thresholds that prevent regression from the
new baseline rather than aspirational values.

## 6. Risk Table

| Risk | Likelihood | Mitigation |
| ---- | ---------- | ---------- |
| Tests accidentally invoke native media tools | Medium | Mock `music-metadata`, `node-taglib-sharp`, child process execution, Docker/m4b boundaries. |
| Coverage improves by testing trivial indexes only | Medium | Require Priority 1 domain-boundary files and at least three Priority 2 files. |
| Mock-heavy tests couple to implementation details | Medium | Assert public row shapes, errors, and boundary calls rather than private local variables. |
| Global 70%/60% target is too high for one pass | Medium | Treat as SHOULD; document blocker if not reached while still requiring all metrics improve. |

## 7. Verification

After every source code file edit:

1. `npm run lint -- <modified-file>` — lint only the file just modified
   (NFR-1)

Once at end of spec:

1. `npm run lint` — whole-codebase last-call lint after all TypeScript
   modifications are complete; must exit 0.
2. `npm run build` — must exit 0.
3. `npm test` — must exit 0.
4. `npm run test:coverage` — must exit 0 and improve global statement, line,
   function, and branch percentages versus the captured baseline.
5. `git --no-pager status --short reports/coverage` — must show no generated
   coverage artifacts.
6. `git --no-pager diff --stat -- __tests__ src vitest.config.ts docs/testing.md specs/2026-07-19/raise-test-coverage/tasks.md` — must list only expected test, approved seam, optional config/doc, and task files.
