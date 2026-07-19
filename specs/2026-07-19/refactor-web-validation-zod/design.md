# Design: Refactor Web Validation to Zod

> Scope reminder: this spec touches **only** `src/web/**`, `__tests__/web/**`,
> and `collections/harmonia-aquila-web/**` if validation-message assertions need
> equivalent updates. No changes to non-web CLI commands, `src/lib/**`, live
> fixtures, or generated `build/**`; no new dependencies; no `npx`.

## 1. Overview

Use a schema-first controller adapter pattern. Each web route gets a Zod schema that describes its accepted query or body shape, and controllers consume the parsed schema output instead of manually calling `requiredString`, `optionalString`, `optionalBoolean`, `stringArray`, and `rejectPresent`. This satisfies FR-1 through FR-7 while keeping controllers thin.

Zod is not responsible for filesystem boundary enforcement. Schema parsing confirms that path-bearing fields are present and have acceptable scalar/array shapes; `WebPathResolver` continues to resolve source/destination roots and reject traversal or root escapes (FR-6).

Validation errors should still flow through `throwHttpError` into the current HTTP 400 envelope. Prefer one small adapter that converts `ZodError` into `UserInputError` or lets `throwHttpError` recognize Zod errors and format a stable message (FR-3, FR-4).

## 2. File layout

### Modified and new files

```text
src/web/request-schemas.ts                 (new: Zod schemas and parse helpers)
src/web/request-options.ts                 (modified or deleted: retire manual helpers)
src/web/http-errors.ts                     (modified only if mapping ZodError centrally)
src/web/manage-albums.controller.ts        (modified: use parsed schema output)
src/web/manage-audiobooks.controller.ts    (modified: use parsed schema output)
__tests__/web/controllers.test.ts          (modified: validation and mapping parity)
collections/harmonia-aquila-web/**/*.yml   (modified only if error-message assertions change)
```

### Files explicitly NOT modified

- `src/lib/**` remains the shared domain layer used by CLI and web.
- `src/commands/**` remains unchanged; this is web request validation only.
- `src/web/path-resolver.ts` remains the source/destination boundary authority.
- `etc/1-source-files/**` and `etc/2-destination-files/**` remain unchanged.

## 3. Schema helpers

Add focused primitives in `src/web/request-schemas.ts`:

```ts
import { z } from 'zod'

const queryBoolean = z.enum(['true', 'false']).transform(value => value === 'true')
const bodyBoolean = z.boolean()
const optionalQueryString = z.string().optional()
const requiredQueryString = z.string({ error: 'field is required' })
```

Exact syntax may vary with installed Zod v4 APIs. Keep helpers small and typed; do not hide schema output behind `unknown` or `any`.

For POST bodies, use strict object schemas when feasible so unexpected `sourceDir` / `destDir` overrides can be rejected with explicit messages where existing behavior requires it. If Zod's default unknown-key handling is used, add targeted refinements for root override keys before stripping unknown keys.

## 4. Route schema mapping

| Route | Schema output |
| ----- | ------------- |
| `GET /manage-albums/summarize-source-dir` | `{ dirName: string, ignoreNonAudioFiles?: boolean, limit?: string }` |
| `POST /manage-albums/fix-tags` | optional strategy/metadata fields, optional booleans, no `sourceDir`/`destDir` overrides |
| `POST /manage-albums/organize-files` | optional strategy/boolean/limit fields, no `sourceDir`/`destDir` overrides |
| `GET /manage-audiobooks/validate` | `{ fileName: string }` |
| `GET /manage-audiobooks/crawl` | `{ dirName: string }` |
| `POST /manage-audiobooks/copy-and-rename` | `{ fileName: string, execute?: boolean }`, no `destDir` override |
| `POST /manage-audiobooks/convert-file` | `{ fileName: string[], concurrency?: string, jobs?: string, author?: string, narrator?: string, title?: string, execute?: boolean }`, no `destDir` override |
| `POST /manage-audiobooks/merge` | optional `jobs`, `bypassMetadata`, `execute`, no `sourceDir`/`destDir` overrides |
| `POST /manage-audiobooks/set-metadata` | required `author`, `destFilepath`, `sourceFilepath`, `title`; optional `narrator`, `execute` |

`convert-file.fileName` should preserve current behavior: missing `fileName` parses to an empty array so the existing shared function can return `at least one --file-name is required`, while non-string/non-array values fail at the web request contract layer.

## 5. Error mapping

Recommended shape:

```ts
export function parseRequest<T>(schema: z.ZodType<T>, value: unknown): T {
  const result = schema.safeParse(value)

  if (!result.success) {
    throw new UserInputError(formatZodIssues(result.error))
  }

  return result.data
}
```

`formatZodIssues` should produce concise messages that name the offending field. Exact wording may differ from legacy helper messages if tests and Bruno assertions are updated to check stable semantics rather than brittle full strings.

## 6. Test updates

### 6.1 What stays the same

- Controller tests keep mocking shared library functions.
- Path traversal tests keep proving invalid paths do not call shared library mocks.
- Successful route mapping tests keep asserting parsed values passed to shared functions.

### 6.2 What changes

- Add tests that invalid requests fail before `WebPathResolver` or shared library calls.
- Update tests that asserted helper-specific messages only when Zod message text changes.
- Add focused coverage for `convert-file.fileName` string, string-array, empty/missing, and invalid-type cases.

### 6.3 Coverage parity table

| Current behavior | Required disposition |
| ---------------- | -------------------- |
| Missing required query/body field returns 400 | Keep. |
| Invalid boolean returns 400 | Keep. |
| Root override fields return 400 | Keep. |
| Path traversal returns 400 via `WebPathResolver` | Keep. |
| Successful request option mapping | Keep. |

## 7. Migration strategy

1. Confirm current package has `zod` and no dependency change is needed.
2. Add schema helpers and one read-only GET schema first.
3. Refactor album controller routes, linting only each modified file after each edit.
4. Refactor audiobook controller routes, linting only each modified file after each edit.
5. Update controller tests and Bruno assertions only where messages change.
6. Run final full verification.

## 8. Risk Table

| Risk | Likelihood | Mitigation |
| ---- | ---------- | ---------- |
| Zod messages differ from legacy helper messages | High | Assert stable semantics and HTTP envelope; update Bruno assertions to check field/context substrings. |
| Unknown body keys are silently stripped | Medium | Use strict schemas or explicit root override checks before stripping. |
| `convert-file.fileName` behavior changes | Medium | Add targeted tests for string, array, missing/empty, and invalid type. |
| Path traversal gets validated too early with less context | Low | Keep path boundary checks in `WebPathResolver`. |
| Controllers grow too large | Medium | Put schemas and parse helpers in `request-schemas.ts`. |

## 9. Verification

After every source code file edit:

1. `npm run lint -- <modified-file>` — lint only the file just modified (NFR-1).

Focused checks during implementation:

1. `./node_modules/.bin/vitest run __tests__/web`

At the end:

1. `npm run lint` — whole-codebase last-call lint after all TypeScript modifications are complete; must exit 0.
2. `npm run build` — must exit 0.
3. `npm test` — must exit 0.
4. Start `npm run web:serve -- --source-dir etc/1-source-files --dest-dir etc/2-destination-files --host 127.0.0.1 --port 3000` and capture the server PID.
5. `cd collections/harmonia-aquila-web && ../../node_modules/.bin/bru run . -r --env local --bail` — must exit 0.
6. Stop the captured server PID.
7. `git --no-pager diff --stat -- src/web __tests__/web collections/harmonia-aquila-web package.json package-lock.json` — must list only expected files.
