# Requirements: Refactor Web Validation to Zod

## 1. Background

`web serve` route handlers currently validate request query/body input through custom helpers in `src/web/request-options.ts` (`requiredString`, `optionalString`, `optionalBoolean`, `stringArray`, `rejectPresent`, and `bodyRecord`). The validation is spread across `src/web/manage-albums.controller.ts` and `src/web/manage-audiobooks.controller.ts`, which makes the request contract harder to audit as the HTTP surface grows.

The repository already has `zod` in `package.json` dependencies. This spec refactors the web request validation layer to use Zod schemas while preserving the existing route URLs, request option names, response shapes, directory-root path restrictions, and HTTP 400 error envelope.

## 2. Goal

All `web serve` request handlers MUST validate incoming query/body data through typed Zod schemas before invoking path resolution or shared library functions. Existing Bruno collection requests and web unit tests MUST continue to pass, except where assertions are intentionally updated to match equivalent Zod-backed validation messages.

## 3. Scope

### In scope

- `src/web/request-options.ts` replacement or reduction to Zod-backed parsing helpers.
- New `src/web/request-schemas.ts` or equivalent schema module.
- `src/web/manage-albums.controller.ts` and `src/web/manage-audiobooks.controller.ts`.
- `src/web/http-errors.ts` only if Zod errors need central mapping to the current HTTP error envelope.
- `__tests__/web/**` updates for Zod-backed request validation.
- Bruno collection assertions under `collections/harmonia-aquila-web/**` only if validation messages change while preserving status-code semantics.

### Out of scope

- Changing `web serve` route paths, HTTP methods, successful response shapes, or shared library option object names.
- Changing CLI command validation for non-web commands.
- Replacing directory traversal protection in `src/web/path-resolver.ts`; Zod may validate field shape, but the resolver remains authoritative for filesystem boundaries.
- Adding dependencies other than using the existing `zod` package already present in `package.json`.
- Modifying live fixture contents under `etc/1-source-files/**` or `etc/2-destination-files/**`.

## 4. Functional Requirements

- **FR-1** Each route handler MUST parse its request query/body through a named Zod schema before calling shared library functions.
- **FR-2** The Zod schemas MUST preserve current accepted request shapes: GET query values as strings, POST bodies as JSON objects, booleans as JSON booleans or query-string `"true"` / `"false"` where currently accepted, and `fileName` as either a string or string array for `convert-file`.
- **FR-3** Missing required fields MUST continue to produce HTTP 400 with the existing envelope shape `{ statusCode: 400, error: "Bad Request", message: string }`.
- **FR-4** Invalid type/value fields MUST produce HTTP 400 and MUST NOT call path resolution or shared library functions.
- **FR-5** Body root override restrictions (`sourceDir`, `destDir`) MUST remain enforced for routes where roots are configured by `web serve --source-dir` / `--dest-dir`.
- **FR-6** Path traversal and root escape violations MUST remain enforced by `WebPathResolver` after Zod parsing, and MUST continue to return HTTP 400.
- **FR-7** Parsed schema output MUST be strongly typed and used directly by controllers without `any`, unsafe casts, or duplicate ad hoc parsing logic.
- **FR-8** Existing Bruno collection happy-path, contract-error, and security-violation requests MUST pass against a live `web serve` process after the refactor.

## 5. Non-Functional Requirements

- **NFR-1 (lint after every source code file modification)** After every modification of a source code file (for example, a `.ts` file) under `src/**` or `__tests__/**`, `npm run lint -- <modified-file>` MUST be run so only the modified file is linted, and any reported issues MUST be fixed before moving on. This applies per source-code edit, not per-task. Whole-codebase `npm run lint` MUST be reserved for final verification after all TypeScript modifications are complete.
- **NFR-2 (typecheck)** `npm run build` MUST exit 0 after the spec is complete.
- **NFR-3 (tests)** `npm test` MUST exit 0 after the spec is complete.
- **NFR-4 (no `npx`)** `npx` is forbidden in all forms. Any command line containing the substring `npx` is a violation. Use `./node_modules/.bin/<tool>` or `npm run <script>` exclusively.
- **NFR-5 (file size)** No new or modified source file SHOULD exceed 200 lines; extract schemas/helpers rather than growing controllers.
- **NFR-6 (type safety)** Strict TypeScript MUST be preserved; no `any`, no `// @ts-...` escapes, and no broad success-shaped fallbacks for invalid requests.
- **NFR-7 (no new dependencies)** The implementation MUST use the existing `zod` dependency and MUST NOT add runtime or development dependencies.
- **NFR-8 (behavioral parity)** Existing route methods, paths, non-path option names, path-root restrictions, dry-run/execute behavior, and JSON response shapes MUST remain unchanged.

## 6. Acceptance Criteria

1. `src/web/**` request parsing is Zod-backed and controllers no longer manually compose request options with `requiredString` / `optionalBoolean` style helpers.
2. Invalid request shapes return HTTP 400 without invoking path resolution or shared library mocks.
3. `npm run lint`, `npm run build`, and `npm test` exit 0.
4. The full Bruno collection passes with `cd collections/harmonia-aquila-web && ../../node_modules/.bin/bru run . -r --env local --bail` against a live `web serve` process.
