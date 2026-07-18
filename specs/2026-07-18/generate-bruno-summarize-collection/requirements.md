# Requirements: Generate Bruno Summarize Collection

## 1. Background

The repository now has `web serve` route support for `GET /manage-albums/summarize-source-dir`, and the directory-constrained follow-up spec requires running the server with `--source-dir` and `--dest-dir`. The live local fixture roots for this API smoke path are `etc/1-source-files/` and `etc/2-destination-files/`.

The `extern/bruno-starter-guide/` submodule demonstrates Bruno's OpenCollection YAML layout: an `opencollection.yml` file at the collection root, request YAML files with `info`, `http`, `runtime`, and `settings` sections, and `environments/local.yml` for variables. The installed `@usebruno/cli` exposes `./node_modules/.bin/bru run [paths...]` with `--env`, `--env-file`, `--output`, `--format`, `--reporter-*`, `--tests-only`, and `--bail` options.

## 2. Goal

Create a committed Bruno collection that exercises the local Harmonia Aquila web API by issuing `GET /manage-albums/summarize-source-dir` against a live `web serve` process started with `etc/1-source-files/` as `--source-dir` and `etc/2-destination-files/` as `--dest-dir`. Completion requires proving the collection can be run by `./node_modules/.bin/bru run`.

## 3. Scope

### In scope

- A new Bruno OpenCollection under `collections/harmonia-aquila-web/`.
- One environment file for local web serving.
- One request for `GET /manage-albums/summarize-source-dir`.
- Bruno assertions/tests that fail when the API is unreachable, non-200, or does not return a JSON array.
- Verification commands that start `web serve` and run `bru run` against the collection.

### Out of scope

- Adding Bruno requests for any endpoint other than `GET /manage-albums/summarize-source-dir`.
- Modifying `extern/bruno-starter-guide/**`; it is reference material only.
- Modifying live media fixture contents under `etc/1-source-files/**` or `etc/2-destination-files/**`.
- Adding package dependencies or changing `@usebruno/cli`.
- Changing web route behavior, server implementation, or TypeScript source unless a blocker is discovered and explicitly approved.

## 4. Functional Requirements

- **FR-1** The implementation MUST create `collections/harmonia-aquila-web/opencollection.yml` using the OpenCollection metadata pattern observed in `extern/bruno-starter-guide/opencollection.yml`.
- **FR-2** The implementation MUST create `collections/harmonia-aquila-web/environments/local.yml` with variables for `baseUrl`, `summarizeDirName`, and any optional query parameters needed by the request.
- **FR-3** The implementation MUST create a Bruno request for `GET {{baseUrl}}/manage-albums/summarize-source-dir` with a query value that targets the configured live source root, preferably `dirName=.` unless implementation discovers the endpoint requires a named child directory.
- **FR-4** The request MUST include either runtime tests or assertions proving HTTP status `200` and a JSON array response body.
- **FR-5** The collection MUST be runnable from the command line with `./node_modules/.bin/bru run` without `npx`.
- **FR-6** Verification MUST start the built web server with `--source-dir etc/1-source-files --dest-dir etc/2-destination-files --host 127.0.0.1 --port <port>` before running Bruno.
- **FR-7** Verification MUST run `./node_modules/.bin/bru run` against the created request or folder using the local environment and MUST fail the task if Bruno exits non-zero.
- **FR-8** The collection MUST NOT depend on external network access; every request URL MUST target the local `web serve` instance.

## 5. Non-Functional Requirements

- **NFR-1 (lint after every source code file modification)** After every modification of a source code file (for example, a `.ts` file), `npm run lint -- <modified-file>` MUST be run so only the modified file is linted, and any reported issues MUST be fixed before moving on. This applies per source-code edit, not per-task. Whole-codebase `npm run lint` MUST be reserved for final verification after all TypeScript modifications are complete.
- **NFR-2 (typecheck)** `npm run build` MUST exit 0 before running the live web server verification.
- **NFR-3 (tests)** `npm test` SHOULD exit 0 if any TypeScript source or tests are changed; otherwise Bruno live verification is the required behavioral test.
- **NFR-4 (no `npx`)** `npx` is forbidden in all forms. Any command line containing the substring `npx` is a violation. Use `./node_modules/.bin/<tool>` or `npm run <script>` exclusively.
- **NFR-5 (no new dependencies)** The implementation MUST NOT add runtime or development dependencies.
- **NFR-6 (scope discipline)** `git --no-pager diff --stat -- extern src __tests__ package.json package-lock.json` MUST show no unintended changes unless implementation discovers and reports a blocker that requires code changes.
- **NFR-7 (live fixture safety)** Verification MUST NOT modify files under `etc/1-source-files/**` or `etc/2-destination-files/**`.

## 6. Acceptance Criteria

1. The collection exists under `collections/harmonia-aquila-web/` and follows the starter-guide OpenCollection YAML style.
2. `npm run build` exits 0.
3. A `web serve` process is started with `etc/1-source-files/` and `etc/2-destination-files/`.
4. `./node_modules/.bin/bru run <created request or folder> --env local --bail` exits 0 against the live server.
5. The Bruno request fails if the endpoint returns a non-200 status or a non-array body.
