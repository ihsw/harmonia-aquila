# Design: Add Vitest Coverage

> Scope reminder: this spec touches **only** `package.json`,
> `package-lock.json`, `vitest.config.ts`, `.gitignore` if needed, existing test
> command documentation if present, and narrowly scoped test isolation fixes if
> the coverage run exposes a blocker. No production behavior changes, no broad
> new test-writing campaign, no CI wiring, no `npx`.

## 1. Overview

Use Vitest's native coverage support rather than introducing a separate
coverage tool. The implementation adds a dedicated `test:coverage` script
(FR-1, FR-7), configures the Vitest coverage provider and reporters in
`vitest.config.ts` (FR-2 through FR-6), and writes all generated output beneath
`reports/coverage/` so the existing `reports/` ignore rule keeps artifacts out
of git (NFR-8).

The initial threshold policy is intentionally baseline-safe (FR-8). The first
coverage workflow should establish visibility and produce artifacts without
failing on arbitrary targets. Future specs can raise thresholds after adding
focused tests for low-coverage areas.

## 2. File layout

### Modified files

```text
package.json             (add test:coverage script and coverage provider dependency)
package-lock.json        (dependency lockfile update from npm install)
vitest.config.ts         (coverage configuration)
.gitignore               (only if reports/coverage is not already ignored)
```

### Files explicitly NOT modified

- `src/**` production behavior is out of scope.
- `__tests__/**` should not change unless coverage execution reveals an
  isolation-only blocker.
- `.github/workflows/**` CI wiring is out of scope until explicitly requested.
- `specs/**` other than this spec should not change during execution.

## 3. Package and command design

Add a package script that delegates to the installed Vitest binary through npm:

```json
{
  "scripts": {
    "test:coverage": "vitest run --coverage"
  }
}
```

If the coverage provider package is absent, install the Vitest 4-compatible
provider as a dev dependency with npm, updating both `package.json` and
`package-lock.json`:

```sh
npm install --save-dev @vitest/coverage-v8
```

No command in this spec uses `npx` (NFR-2).

## 4. Vitest coverage configuration

Extend the existing `vitest.config.ts` `test` block with a `coverage` section.
The shape should stay small and explicit:

```ts
coverage: {
  provider: 'v8',
  reportsDirectory: 'reports/coverage',
  reporter: ['text', 'html', 'lcov', 'json-summary'],
  include: ['src/**/*.ts'],
  exclude: [
    'build/**',
    'node_modules/**',
    'reports/**',
    '__tests__/**',
    'vitest.config.ts',
  ],
}
```

The final implementation may add narrowly justified exclusions for files that
are executable-only entrypoints or environment bootstrap code, but it MUST keep
coverage focused on production `src/**/*.ts` files (FR-3, FR-4).

## 5. Threshold policy

Do not add aspirational hard thresholds in the initial change. If Vitest config
needs an explicit threshold object, set only baseline-safe thresholds that are
less than or equal to the measured baseline from `npm run test:coverage`.

The implementer should record the measured global summary in the task notes if
thresholds are added. Otherwise the generated text and JSON summary are enough
to establish the baseline.

## 6. Test updates

### 6.1 What stays the same

- Existing test file discovery remains `__tests__/**/*.test.ts`.
- Existing `npm test` behavior remains `vitest run` without coverage.
- Existing test assertions and mocks remain unchanged unless they fail only
  under coverage instrumentation.

### 6.2 What changes

The new coverage command becomes the acceptance test for this feature:

```sh
npm run test:coverage
```

If a test fails only under coverage, fix the test isolation issue in the
smallest affected test file and run `npm run lint -- <modified-test-file>`
immediately after the edit (NFR-1).

### 6.3 Coverage parity table

| Area | Coverage behavior |
| ---- | ----------------- |
| `src/**/*.ts` | Included in coverage collection |
| `__tests__/**/*.ts` | Executed as tests, excluded from coverage target files |
| `build/**` | Excluded |
| `reports/**` | Excluded and ignored |
| `vitest.config.ts` | Excluded as test configuration |

## 7. Migration strategy

1. Confirm the current test baseline with `npm test`.
2. Install the Vitest coverage provider if absent.
3. Add `test:coverage` to `package.json`.
4. Add coverage configuration to `vitest.config.ts`.
5. Run targeted lint for `vitest.config.ts` after editing it.
6. Run `npm run test:coverage` and confirm `reports/coverage/` is created.
7. Run final lint, build, tests, and coverage verification.

## 8. Risk Table

| Risk | Likelihood | Mitigation |
| ---- | ---------- | ---------- |
| Coverage provider version mismatch with Vitest 4 | Medium | Install the matching `@vitest/coverage-v8` version through npm and verify the lockfile. |
| Coverage instrumentation exposes hidden test isolation issues | Low | Fix only the affected test isolation issue; do not broaden scope into a test-writing campaign. |
| Generated reports accidentally appear in git status | Low | Use `reports/coverage/` and verify artifact hygiene explicitly. |
| Initial thresholds fail existing baseline | Medium | Avoid aspirational thresholds in this first coverage workflow. |

## 9. Verification

After every source code file edit:

1. `npm run lint -- <modified-file>` — lint only the file just modified
   (NFR-1)

Once at end of spec:

1. `npm run lint` — whole-codebase last-call lint after all TypeScript
   modifications are complete; must exit 0.
2. `npm run build` — must exit 0.
3. `npm test` — must exit 0.
4. `npm run test:coverage` — must exit 0 and create `reports/coverage/`.
5. `git --no-pager status --short reports/coverage` — must show no tracked or
   untracked coverage artifacts.
6. `git --no-pager diff --stat -- package.json package-lock.json vitest.config.ts .gitignore` — must list only expected coverage configuration changes.
