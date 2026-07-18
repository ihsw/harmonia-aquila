# Requirements: Constrain Web Serve Directories

## 1. Background

The 2026-07-18 spec `add-web-serve-supercommand` introduced `harmonia-aquila web serve` and NestJS route handlers under `src/web/**`. Those routes currently accept request-supplied absolute or relative filesystem paths such as `dirName`, `sourceDir`, `destDir`, `fileName`, `sourceFilepath`, and `destFilepath`, then pass them to shared library functions.

For a long-running HTTP server, caller-supplied paths need a request-independent boundary. This spec adds two required server startup options, `--source-dir` and `--dest-dir`, and makes applicable routes resolve request paths inside those roots while rejecting directory traversal or absolute-path escape attempts.

## 2. Goal

`web serve` MUST start only when both a source root and destination root are supplied, and all route handlers that read input files/directories or write output files/directories MUST constrain those paths to the configured root. Existing route URLs and response shapes remain stable; only unsafe or missing path input changes to a deterministic HTTP 400.

## 3. Scope

### In scope

- `src/commands/web/serve.ts` option parsing and help text.
- `src/web/main.ts`, `src/web/app.module.ts`, and new or modified web context/provider files.
- `src/web/manage-albums.controller.ts` and `src/web/manage-audiobooks.controller.ts` request path mapping.
- `src/web/request-options.ts` and `src/web/http-errors.ts` only as needed for path validation and error reporting.
- `__tests__/web/**` and focused command tests for `web serve --help` / missing option behavior.
- `package.json` scripts only if test or smoke commands need an existing npm-script update.

### Out of scope

- Changing CLI behavior for non-web commands such as `manage-albums` and `manage-audiobooks`.
- Changing HTTP route paths, HTTP methods, successful JSON response shapes, or shared library row shapes.
- Adding authentication, authorization, TLS, CORS policy, request size limits, job queues, or persistence.
- Creating new media fixtures outside test-managed temporary directories.
- Adding new runtime dependencies.

## 4. Functional Requirements

- **FR-1** `web serve` MUST accept `--source-dir <dir>` and `--dest-dir <dir>` options and MUST fail before server bootstrap with a Commander usage error when either option is missing or empty.
- **FR-2** `web serve --help` MUST list `--source-dir`, `--dest-dir`, `--host`, and `--port`.
- **FR-3** Server startup MUST resolve `--source-dir` and `--dest-dir` to absolute normalized roots before constructing route handlers.
- **FR-4** Any request path mapped to the source root MUST remain inside `--source-dir` after resolution, including when the request supplies `..`, `.`, symlinks where resolvable, repeated separators, URL-encoded traversal, or an absolute path.
- **FR-5** Any request path mapped to the destination root MUST remain inside `--dest-dir` after resolution, including when the request supplies `..`, `.`, symlinks where resolvable, repeated separators, URL-encoded traversal, or an absolute path.
- **FR-6** Directory traversal or root escape attempts MUST return HTTP 400 using the existing error envelope and MUST NOT call the underlying shared library operation.
- **FR-7** Missing path values that remain required by a route MUST continue to return HTTP 400 using the existing error envelope.
- **FR-8** `GET /manage-albums/summarize-source-dir` MUST resolve `dirName` inside the source root before calling `summarizeAlbumSourceDir`.
- **FR-9** `POST /manage-albums/fix-tags` MUST use the configured source root for the effective `sourceDir` and the configured destination root for the effective `destDir`; request body overrides for those root fields MUST be rejected or ignored consistently with the design, and all optional metadata strategy fields MUST retain existing behavior.
- **FR-10** `POST /manage-albums/organize-files` MUST use the configured source root for the effective `sourceDir` and the configured destination root for the effective `destDir`; request body overrides for those root fields MUST be rejected or ignored consistently with the design, and all optional flags/strategies MUST retain existing behavior.
- **FR-11** `GET /manage-audiobooks/validate` MUST resolve `fileName` inside the source root before calling `validateAudiobook`.
- **FR-12** `GET /manage-audiobooks/crawl` MUST resolve `dirName` inside the source root before calling `crawlAudiobooks`.
- **FR-13** `POST /manage-audiobooks/copy-and-rename` MUST resolve `fileName` inside the source root and use the configured destination root for `destDir`.
- **FR-14** `POST /manage-audiobooks/convert-file` MUST resolve every `fileName` entry inside the source root and use the configured destination root for `destDir`.
- **FR-15** `POST /manage-audiobooks/merge` MUST use the configured source root for `sourceDir` and the configured destination root for `destDir`.
- **FR-16** `POST /manage-audiobooks/set-metadata` MUST resolve `sourceFilepath` inside the source root and `destFilepath` inside the destination root.
- **FR-17** Route handlers MAY accept relative request paths for nested files or directories, but MUST NOT require clients to know absolute server filesystem paths.

## 5. Non-Functional Requirements

- **NFR-1 (lint after every source code file modification)** After every modification of a source code file (for example, a `.ts` file) under `src/**` or `__tests__/**`, `npm run lint` MUST be run and any reported issues fixed before moving on. This applies per source-code edit, not per-task.
- **NFR-2 (typecheck)** `npm run build` MUST exit 0 after the spec is complete.
- **NFR-3 (tests)** `npm test` MUST exit 0 after the spec is complete.
- **NFR-4 (no `npx`)** `npx` is forbidden in all forms (no `--no-install`, no one-off Vitest/tsc invocations). Any command line containing the substring `npx` is a violation. Use `./node_modules/.bin/<tool>` or `npm run <script>` exclusively.
- **NFR-5 (file size)** No new or modified source file SHOULD exceed 200 lines; if an existing file crosses that threshold, extract a focused helper instead of growing the controller.
- **NFR-6 (type safety)** Strict TypeScript MUST be preserved; no `any`, no `// @ts-...` escapes, and no broad success-shaped fallbacks for invalid path input.
- **NFR-7 (scope discipline)** `git --no-pager diff --stat -- bin etc reports extern` MUST show no unintended changes from this spec.
- **NFR-8 (behavioral parity)** Existing route methods, route paths, non-path option names, successful response shapes, and shared library dry-run/execute behavior MUST remain unchanged.
- **NFR-9 (no new dependencies)** The implementation MUST NOT add runtime or development dependencies for path validation.

## 6. Acceptance Criteria

1. `node build/dist/index.js web serve --help` lists `--source-dir`, `--dest-dir`, `--host`, and `--port`.
2. Running `node build/dist/index.js web serve --source-dir <tmp-source> --dest-dir <tmp-dest> --host 127.0.0.1 --port 0` starts in an automated smoke path and closes cleanly.
3. Missing `--source-dir` or `--dest-dir` fails before binding a server.
4. Web tests prove safe relative request paths are resolved under the configured roots and traversal attempts return HTTP 400 without invoking the shared library mock.
5. `npm run lint`, `npm run build`, and `npm test` all exit 0.
