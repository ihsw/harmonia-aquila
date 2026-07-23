# Design: Add Manage Albums List

> Scope reminder: this spec adds one shared album operation and thin CLI, REST,
> GraphQL, and MCP adapters with focused tests/docs/Bruno coverage. No
> dependencies, writes, unrelated command families, or `npx`.

## 1. Overview

Implement `listAlbumSourceDir` as the source of truth for prefix validation,
root containment, direct-entry enumeration, and output ordering. All adapters
pass their authoritative source root to this function; no adapter implements
its own path traversal rules (FR-1 through FR-10).

Prefix is a directory selector, not a filename filter. `''` selects the root;
all other values must end in `/`. Results are root-relative strings and add a
trailing `/` for direct directories, which supports safe client navigation
without revealing absolute host paths (FR-5 through FR-7).

## 2. File layout

### Modified and new files

```text
src/lib/albums/list.ts
src/commands/manage-albums/list.ts
src/commands/manage-albums/index.ts
src/web/schemas/request-schemas.ts
src/web/controllers/manage-albums.controller.ts
src/web/schemas/mcp/manage-albums.ts
src/web/servers/mcp-tools/manage-albums/list.ts
src/web/servers/mcp-tools/manage-albums/index.ts
src/web/modules/graphql/album.inputs.ts
src/web/modules/graphql/album.resolver.ts
src/web/modules/graphql/schema.gql
__tests__/lib/albums/list.test.ts
__tests__/commands/manage-albums/list.test.ts
__tests__/commands/index-registration.test.ts
__tests__/web/controllers.test.ts
__tests__/web/mcp-test-helpers.ts
__tests__/web/mcp.manage-albums.test.ts
__tests__/web/graphql/album.resolver.test.ts
__tests__/web/graphql/graphql.integration.test.ts
collections/harmonia-aquila-web/environments/local.yml
collections/harmonia-aquila-web/manage-albums/list.yml
collections/harmonia-aquila-web/manage-albums/list-path-traversal.yml
collections/harmonia-aquila-web/graphql/album-list.yml
collections/harmonia-aquila-web/graphql/album-list-path-traversal.yml
docs/graphql.md
docs/mcp-server.md
docs/testing.md
```

### Files explicitly NOT modified

- `src/commands/manage-audiobooks/**` and audiobook GraphQL/controller code.
- Existing album commands, routes, MCP tools, GraphQL operations, and Bruno
  request contracts.
- `package.json`, `package-lock.json`, and `etc/**`.

## 3. Shared listing operation

`src/lib/albums/list.ts` exports:

```ts
export interface ListAlbumSourceDirOptions {
  prefix?: string
  sourceDir: string
}

export type ListAlbumSourceDirJsonOutput = string[]

export async function listAlbumSourceDir(
  options: ListAlbumSourceDirOptions,
): Promise<ListAlbumSourceDirJsonOutput>
```

Normalize and realpath `sourceDir`, requiring an existing directory. Validate
prefix before calling `readdir`: empty selects root; non-empty must be
non-absolute, NUL-free, and slash-terminated. Resolve it against the normalized
root, prove lexical containment with `path.relative`, then realpath reachable
candidates and re-check containment to stop symlink escape (FR-5, FR-8).

Call `readdir(selectedDirectory, { withFileTypes: true })` once. Map direct
entries as `prefix + entry.name`, suffix only `entry.isDirectory()` values with
`/`, and lexical-sort the output. Do not recurse, stat child entries, parse
metadata, or filter extensions (FR-6, FR-7).

## 4. Adapter mapping

| Surface | Public contract | Adapter binding |
| --- | --- | --- |
| CLI | `manage-albums list --source-dir <dir> [--prefix <prefix>]` | Calls the library with CLI root; `writeRows` formats result. |
| REST | `GET /manage-albums/list?prefix=<prefix>` | Parses optional query prefix; passes `WebPathResolver.sourceDir`; `throwHttpError` maps failures. |
| GraphQL | `albumList(input: AlbumListInput!)` | Adds `AlbumListInput.prefix?: string`; resolver passes `WebPathResolver.sourceDir`; existing filter maps errors. |
| MCP | `manage_albums_list({ prefix? })` | Adds optional schema field and read-only registration; returns `jsonToolContent`. |

REST adds `listAlbumQuerySchema` with optional string `prefix`; it must reject
non-string query values before the library call. GraphQL uses `[String]` return
decorator semantics and generated SDL `[String!]!`. MCP follows the existing
`manage-albums/summarize-source-dir.ts` factory and has `readOnlyHint: true`
(FR-2 through FR-4, FR-10).

## 5. Tests and Bruno requests

| Area | Required coverage |
| --- | --- |
| Library | Root/nested prefixes, direct-only output, sort, directory suffix, arbitrary file extensions, malformed prefix, traversal, absolute, NUL, missing/non-directory, and symlink escape. |
| CLI | Options, JSON/plaintext output, registration, and `Command.error` behavior. |
| REST | Query mapping, root use, malformed/traversal 400, and no domain call on invalid input. |
| GraphQL | Input mapping, root use, output scalar array, `BAD_USER_INPUT`, and regenerated schema availability. |
| MCP | Tool discovery, input mapping, JSON response, traversal error, and read-only annotation. |
| Bruno REST | `list.yml` asserts HTTP 200/data array; traversal asserts HTTP 400 and source-root message. |
| Bruno GraphQL | `album-list.yml` asserts HTTP 200/no errors/data array; traversal asserts HTTP 200 and `BAD_USER_INPUT`. |

Use existing `local.yml` variables: add a blank `albumListPrefix` and a
slash-terminated fixture-relative `albumListNestedPrefix`. Existing
`traversalDirName` supplies `..` for both traversal requests. No request uses
an absolute filesystem path or performs a write (FR-11).

## 6. Migration strategy

1. Add library tests and implement the shared containment/listing contract.
2. Add/lint CLI command and registration.
3. Add/lint REST schema/controller and MCP schema/tool/registration.
4. Add/lint GraphQL input/resolver, initialize the app to regenerate SDL.
5. Add focused adapter tests, Bruno REST/GraphQL requests, and docs.
6. Run live Bruno requests against `web serve` with `etc` as both roots, then
   final verification.

## 7. Risk Table

| Risk | Likelihood | Mitigation |
| --- | --- | --- |
| Traversal or symlink bypass leaks root contents | Medium | Centralize lexical and realpath containment; test every adapter's error mapping. |
| Adapters disagree on output/path semantics | Medium | All call one typed operation; adapter tests assert exact calls and arrays. |
| GraphQL SDL drifts from decorators | Low | Regenerate only through initialization and test query availability. |
| Bruno expects REST error semantics for GraphQL | Medium | Assert REST 400 separately from GraphQL's HTTP 200 error envelope. |
| Directory listing recurses or yields nondeterministic order | Low | Single `readdir`, no recursion, explicit sort, nested fixture test. |

## 8. Verification

After every source-file edit:

1. `npm run lint -- <modified-file>` (NFR-1).

Focused checks:

1. `./node_modules/.bin/vitest run __tests__/lib/albums/list.test.ts`
2. `./node_modules/.bin/vitest run __tests__/commands/manage-albums/list.test.ts`
3. `./node_modules/.bin/vitest run __tests__/web/controllers.test.ts __tests__/web/mcp.manage-albums.test.ts`
4. `./node_modules/.bin/vitest run __tests__/web/graphql/album.resolver.test.ts __tests__/web/graphql/graphql.integration.test.ts`

Final checks:

1. `npm run lint`
2. `npm run build`
3. `npm test`
4. `cd collections/harmonia-aquila-web && ../../node_modules/.bin/bru run manage-albums graphql --env local --bail`
5. `git --no-pager diff --stat -- src/commands/manage-audiobooks src/web/modules/graphql/audiobook* src/web/controllers/manage-audiobooks.controller.ts`
