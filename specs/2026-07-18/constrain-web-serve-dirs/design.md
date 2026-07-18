# Design: Constrain Web Serve Directories

> Scope reminder: this spec touches **only** `src/commands/web/**`, `src/web/**`,
> `__tests__/web/**`, focused `__tests__/commands/**` files if needed, and
> package scripts only if they already exist for this workflow. No edits to
> non-web command behavior, `bin`, `etc`, `reports`, `extern`, generated
> `build/**`, or media folders; no new dependencies; no `npx`.

## 1. Overview

Use a request-context boundary pattern. `src/commands/web/serve.ts` parses and validates `--source-dir` / `--dest-dir`, `src/web/main.ts` receives absolute root paths, and controllers use a small injected path resolver before calling shared library functions. This satisfies FR-1 through FR-7 without changing route URLs or shared library APIs.

The resolver should be the only place that knows how to join request paths to roots. Controllers remain thin adapters: read query/body values, resolve path-bearing fields against either the source or destination root, pass non-path options through unchanged, and let `throwHttpError` preserve the existing HTTP error envelope (FR-8 through FR-17, NFR-8).

Prefer deterministic rejection over silent path rewriting. If a client supplies an absolute path, a traversal segment, or a value that resolves outside the configured root, the resolver throws the same user-input error type already mapped to HTTP 400. Do not call shared library operations after validation fails (FR-6).

## 2. File layout

### Modified and new files

```text
src/commands/web/serve.ts                  (modified: add --source-dir/--dest-dir parsing)
src/web/main.ts                            (modified: accept and pass web roots)
src/web/app.module.ts                      (modified: provide web root context)
src/web/path-resolver.ts                   (new: root normalization + request path validation)
src/web/manage-albums.controller.ts        (modified: resolve album route paths)
src/web/manage-audiobooks.controller.ts    (modified: resolve audiobook route paths)
src/web/request-options.ts                 (modified only if helper reuse is needed)
src/web/http-errors.ts                     (modified only if error mapping needs a named code)
__tests__/web/controllers.test.ts          (modified: root-aware mapping and traversal tests)
__tests__/web/bootstrap.test.ts            (modified: create app with roots)
__tests__/commands/web*.test.ts            (new or modified only if command coverage exists)
package.json                               (modified only if an existing npm script must include args)
```

### Files explicitly NOT modified

- `src/lib/**` shared operations stay path-agnostic so CLI behavior remains unchanged.
- `src/commands/manage-albums/**` and `src/commands/manage-audiobooks/**` stay unchanged; this is web-only scoping.
- `build/**` is generated output and must not be hand-edited.
- `extern/**`, `bin/**`, `etc/**`, and `reports/**` are outside this spec.

## 3. Web root model

Add a small immutable context:

```ts
export interface WebRoots {
  sourceDir: string
  destDir: string
}
```

`serveWeb(options)` should accept `{ host, port, sourceDir, destDir }`. `createWebApp(roots)` should build the Nest app with a provider that exposes normalized roots to controllers. If the current static `AppModule` shape makes provider injection awkward, use a `createAppModule(roots)` dynamic module factory rather than global mutable state.

Startup path normalization should:

1. Reject empty strings (FR-1).
2. Resolve roots to absolute paths with Node `path.resolve`.
3. Canonicalize existing roots with `fs.realpath` where possible.
4. Preserve clear errors if a configured root does not exist or is not accessible; do not silently create roots.

## 4. Request path resolver

The resolver exposes two methods:

```ts
resolveSource(requestPath: string, fieldName: string): Promise<string>
resolveDest(requestPath: string, fieldName: string): Promise<string>
```

Implementation rules:

| Step | Behavior |
| ---- | -------- |
| Decode/normalize | Use the already-parsed NestJS string value; do not manually URL-decode again. |
| Reject ambiguous values | Empty strings, `.` when a file is required, and values with null bytes are HTTP 400. |
| Absolute input | Treat as invalid for request payloads unless it is already inside the matching root after normalization; prefer rejecting absolute input for simpler client contract. |
| Join | Resolve relative values with `path.resolve(root, requestPath)`. |
| Boundary check | Use `path.relative(root, candidate)` and reject when it starts with `..` or is absolute. |
| Symlink check | If the candidate exists, compare `fs.realpath(candidate)` against the canonical root. If a destination path does not exist yet, check the closest existing parent. |
| Error | Throw a typed user-input error that maps to HTTP 400 and names the offending field. |

This keeps traversal handling local and testable (FR-4 through FR-6). The exact error message may be new, but it should be stable enough for tests, for example: `fileName must stay within --source-dir`.

## 5. Route mapping

| Route | Source-root fields | Destination-root fields | Notes |
| ----- | ------------------ | ----------------------- | ----- |
| `GET /manage-albums/summarize-source-dir` | `dirName` | none | Relative `dirName` selects a subdirectory under `--source-dir`. |
| `POST /manage-albums/fix-tags` | effective `sourceDir` | effective `destDir` | Prefer configured roots; reject request body `sourceDir` / `destDir` if present to avoid ambiguity. |
| `POST /manage-albums/organize-files` | effective `sourceDir` | effective `destDir` | Same root-only behavior as `fix-tags`. |
| `GET /manage-audiobooks/validate` | `fileName` | none | File path resolved under `--source-dir`. |
| `GET /manage-audiobooks/crawl` | `dirName` | none | Directory path resolved under `--source-dir`. |
| `POST /manage-audiobooks/copy-and-rename` | `fileName` | effective `destDir` | Prefer configured `destDir`; reject request body `destDir` if present. |
| `POST /manage-audiobooks/convert-file` | every `fileName` | effective `destDir` | Validate all files before invoking conversion. |
| `POST /manage-audiobooks/merge` | effective `sourceDir` | effective `destDir` | Prefer configured roots; reject request body root overrides if present. |
| `POST /manage-audiobooks/set-metadata` | `sourceFilepath` | `destFilepath` | Both fields remain required but are relative to their matching roots. |

For routes where the configured root is the whole operation root, rejecting request `sourceDir`/`destDir` overrides is clearer than accepting but ignoring them. Use a 400 message like `sourceDir is configured by web serve --source-dir` so clients know how to migrate (FR-9, FR-10, FR-13 through FR-15).

## 6. Test updates

### 6.1 What stays the same

- Controller tests continue to instantiate controllers and mock shared library functions.
- Bootstrap tests continue to create and close a Nest app without relying on a public fixed port.
- Existing successful response shapes and error envelopes stay unchanged.

### 6.2 What changes

Add tests for:

1. `web serve --help` exposes the two new options.
2. Missing `--source-dir` and missing `--dest-dir` fail before `serveWeb` is called.
3. A safe relative path is passed to a shared library mock as an absolute path under the configured root.
4. `../escape`, absolute paths outside the root, and symlink escapes return HTTP 400 and do not call the shared library mock.
5. Routes using configured operation roots reject request body root overrides.
6. `convert-file` validates every `fileName` before invoking the shared operation.

### 6.3 Coverage parity table

| Original coverage | Disposition |
| ----------------- | ----------- |
| `__tests__/web/controllers.test.ts` route mapping | Keep and update to include injected roots. |
| `__tests__/web/bootstrap.test.ts` app creation | Keep and update to pass temp roots. |
| CLI command tests for non-web commands | Keep unchanged. |
| Shared library tests | Keep unchanged; scoping is enforced before library calls. |

## 7. Migration strategy

1. Confirm baseline status, lint, build, and tests.
2. Add root options to `web serve` and fail fast before bootstrap.
3. Add the web root provider/dynamic module and update bootstrap tests.
4. Add `path-resolver.ts` with focused unit coverage through controller tests.
5. Update album controllers, then run lint and focused web tests.
6. Update audiobook controllers, then run lint and focused web tests.
7. Run full verification and scope checks.

## 8. Risk Table

| Risk | Likelihood | Mitigation |
| ---- | ---------- | ---------- |
| Clients currently send absolute paths | Medium | FR-17 allows relative paths; use explicit 400 messages for root fields and document the changed contract in tests. |
| Symlink traversal is missed | Medium | Canonicalize configured roots and existing candidates/parents with `fs.realpath`. |
| Destination files may not exist yet | Medium | Validate the closest existing parent and ensure the resolved final path remains under `--dest-dir`. |
| Dynamic Nest module complicates tests | Low | Keep provider shape small and instantiate through `createWebApp(roots)` only. |
| Library behavior accidentally changes | Low | Do not edit `src/lib/**`; assert controller mocks receive expected absolute paths. |

## 9. Verification

After every source code file edit:

1. `npm run lint` — must exit 0 (NFR-1).

Focused checks during implementation:

1. `./node_modules/.bin/vitest run __tests__/web`
2. `./node_modules/.bin/vitest run __tests__/commands`

At the end:

1. `npm run lint` — must exit 0.
2. `npm run build` — must exit 0.
3. `npm test` — must exit 0.
4. `node build/dist/index.js web serve --help` — must list `--source-dir` and `--dest-dir`.
5. Start `node build/dist/index.js web serve --source-dir <tmp-source> --dest-dir <tmp-dest> --host 127.0.0.1 --port 0` in an automated smoke path and close it cleanly.
6. `git --no-pager diff --stat -- bin etc reports extern` — must show no unintended files.
