# Requirements: Add Web Serve Supercommand

## 1. Background

`src/index.ts` currently registers two Commander supercommands:
`manage-albums` and `manage-audiobooks`. Their subcommands contain both CLI
option parsing and reusable file/media behavior in the same modules under
`src/commands/**`, which makes the behavior available only through Commander.

The requested change adds a third supercommand, `web`, with one subcommand,
`serve`, that starts an HTTP server exposing GET and POST endpoints for the
same album and audiobook operations. The web layer needs shared business
functions, so command-specific logic must be extracted into `src/lib/**` and
called by both Commander handlers and HTTP handlers.

The request names `@nextjs/common`; the repository currently depends on
`@nestjs/common`. This spec treats the requested package as NestJS
`@nestjs/common` unless the user corrects the package name before
implementation. Because `@nestjs/common` does not start a server by itself,
server bootstrap dependencies are explicitly in scope.

## 2. Goal

After the change, users can run `harmonia-aquila web serve` to start a local
HTTP server that accepts JSON/query requests for `manage-albums` and
`manage-audiobooks` functionality. Existing CLI commands MUST keep their
current names, options, validation behavior, dry-run/execute semantics, and JSON
row shapes while sharing implementation with the new web API.

## 3. Scope

### In scope

- `src/index.ts` root command registration.
- New `src/commands/web/**` Commander registration for `web serve`.
- New `src/web/**` NestJS module/controller/bootstrap files.
- New `src/lib/**` shared album, audiobook, output, validation, and filesystem
  functions used by CLI and web entrypoints.
- Refactoring existing `src/commands/manage-albums/**` and
  `src/commands/manage-audiobooks/**` command modules to thin CLI adapters.
- Unit tests under `__tests__/**` for extracted libs, CLI adapter parity, and
  HTTP controller behavior.
- `package.json`, `package-lock.json`, and TypeScript/lint/test config changes
  needed for NestJS server dependencies and decorators.

### Out of scope

- Browser UI, static assets, templates, authentication, sessions, or user
  accounts.
- Long-running job queues, persistence, database storage, or request history.
- Network exposure beyond a local bind host/port supplied to `web serve`.
- Changing media metadata semantics, filename rules, row shapes, or CLI command
  paths unrelated to adding `web`.
- Backward-compatible HTTP endpoints beyond the routes defined in FR-4.

## 4. Functional Requirements

- **FR-1** The root CLI MUST register a `web` supercommand with a `serve`
  subcommand.
- **FR-2** `web serve` MUST accept `--host <host>` defaulting to `127.0.0.1`
  and `--port <port>` defaulting to `3000`; invalid ports MUST produce a
  Commander-facing error before server bootstrap.
- **FR-3** `web serve` MUST start a NestJS HTTP server using `@nestjs/common`
  application modules/controllers plus the required NestJS bootstrap package(s).
- **FR-4** The server MUST expose these endpoints:

| Method | Path | Shared operation |
| ------ | ---- | ---------------- |
| `GET` | `/manage-albums/summarize-source-dir` | `manage-albums summarize-source-dir` |
| `POST` | `/manage-albums/fix-tags` | `manage-albums fix-tags` |
| `POST` | `/manage-albums/organize-files` | `manage-albums organize-files` |
| `GET` | `/manage-audiobooks/validate` | `manage-audiobooks validate` |
| `GET` | `/manage-audiobooks/crawl` | `manage-audiobooks crawl` |
| `POST` | `/manage-audiobooks/copy-and-rename` | `manage-audiobooks copy-and-rename` |
| `POST` | `/manage-audiobooks/convert-file` | `manage-audiobooks convert-file` |
| `POST` | `/manage-audiobooks/merge` | `manage-audiobooks merge` |
| `POST` | `/manage-audiobooks/set-metadata` | `manage-audiobooks set-metadata` |

- **FR-5** GET endpoints MUST read scalar options from query parameters, and
  POST endpoints MUST read options from a JSON request body.
- **FR-6** HTTP responses for successful operations MUST be JSON arrays matching
  the corresponding CLI `--format json` row shape.
- **FR-7** HTTP write-capable endpoints MUST preserve CLI dry-run safety:
  `execute` defaults to `false`, and files/metadata are changed only when the
  request explicitly sends `execute: true`.
- **FR-8** HTTP failures MUST return a JSON error object with `statusCode`,
  `error`, and `message`, with client input errors mapped to 400 and unexpected
  operational failures mapped to 500.
- **FR-9** Existing `manage-albums` and `manage-audiobooks` CLI commands MUST
  call the same `src/lib/**` functions used by the web controllers.
- **FR-10** CLI plaintext output MUST remain a CLI-only adapter concern; shared
  library functions MUST return typed rows/results and MUST NOT call
  `console.info`, `console.table`, or Commander `command.error`.
- **FR-11** Web and CLI execution MUST preserve bounded concurrency behavior
  already present in album/audiobook operations that use `p-limit`.

## 5. Non-Functional Requirements

- **NFR-1 (lint after every source code file modification)** After every
  modification of a source code file (for example, a `.ts` file) under `src/` or
  `__tests__/`, `npm run lint` MUST be run and any reported issues fixed before
  moving on. This applies per source-code edit, not per-task.
- **NFR-2 (build)** `npm run build` MUST exit 0 after the spec is complete.
- **NFR-3 (tests)** `npm test` MUST exit 0 after the spec is complete.
- **NFR-4 (no `npx`)** `npx` is forbidden in **all** forms (no `--no-install`,
  no one-off Vitest/tsc invocations). Any command line containing the substring
  `npx` is a violation. Use `npm run <script>` or existing binaries under
  `./node_modules/.bin/` exclusively.
- **NFR-5 (file size)** No file produced by this spec MAY exceed 200 lines.
- **NFR-6 (type safety)** Strict TypeScript; no `any`, no `// @ts-...` escapes.
- **NFR-7 (behavioral parity)** Existing CLI command names, options, defaults,
  validations, dry-run/execute behavior, and JSON row shapes MUST be preserved.
- **NFR-8 (dependency discipline)** New runtime dependencies MAY be added only
  for NestJS HTTP bootstrap and request handling. If `@nextjs/common` is truly
  required instead of existing `@nestjs/common`, implementation MUST stop and
  ask the user before changing packages.
- **NFR-9 (scope discipline)** `git --no-pager diff --stat -- bin etc reports`
  MUST show no unintended media/operational file changes after implementation.

## 6. Acceptance Criteria

1. `node build/dist/index.js web --help` lists `serve`, and
   `node build/dist/index.js web serve --help` lists `--host` and `--port`.
2. Starting `node build/dist/index.js web serve --host 127.0.0.1 --port 0`
   starts an HTTP server without registering duplicate CLI commands.
3. Each endpoint in FR-4 has unit coverage proving request mapping, response
   row shape, and error mapping for at least one validation failure.
4. Existing CLI unit tests still pass and continue asserting current CLI
   behavior through Commander adapters.
5. `npm run lint`, `npm run build`, and `npm test` exit 0.
