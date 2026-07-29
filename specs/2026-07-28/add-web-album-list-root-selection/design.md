# Design: Add Web Album List Root Selection

> Scope reminder: this spec touches only web album-list adapters, their focused
> tests, generated GraphQL SDL, Bruno requests/environment, and related docs.
> No shared library/CLI changes, dependencies, unrelated operations, or `npx`.

## 1. Overview

Use the existing thin-adapter pattern. Each `web serve` adapter parses an
optional `useScratchDir` value and selects one of the already normalized roots
from `WebPathResolver` before calling `listAlbumSourceDir`. The shared list
operation remains unchanged and continues to own prefix confinement,
enumeration, formatting, and ordering (FR-1 through FR-9).

The selector matches `albumOrganizeFiles`: only literal boolean `true` selects
scratch; omitted and explicit `false` select source. REST accepts the textual
query representations `true` and `false`; GraphQL and MCP accept native
booleans. No public contract accepts a root path.

## 2. File layout

### Modified files

```text
src/web/schemas/request-schemas.ts
src/web/controllers/manage-albums.controller.ts
src/web/modules/graphql/album.inputs.ts
src/web/modules/graphql/album.resolver.ts
src/web/modules/graphql/schema.gql
src/web/schemas/mcp/manage-albums.ts
src/web/servers/mcp-tools/manage-albums/list.ts
__tests__/web/controllers.test.ts
__tests__/web/graphql/album.resolver.test.ts
__tests__/web/graphql/graphql.integration.test.ts
__tests__/web/mcp.manage-albums.test.ts
collections/harmonia-aquila-web/environments/local.yml
collections/harmonia-aquila-web/mcp/tools-list.yml
docs/graphql.md
docs/mcp-server.md
docs/testing.md
```

### New collection requests

```text
collections/harmonia-aquila-web/manage-albums/list-scratch.yml
collections/harmonia-aquila-web/graphql/album-list-scratch.yml
collections/harmonia-aquila-web/mcp/call-manage-albums-list.yml
collections/harmonia-aquila-web/mcp/call-manage-albums-list-scratch.yml
```

### Files explicitly NOT modified

- `src/lib/albums/list.ts` and its tests: root-confined listing is already
  generic enough for either server-selected root.
- `src/commands/manage-albums/**` and command tests: the CLI retains its
  explicit `--source-dir` contract.
- `src/web/providers/path-resolver.ts`: it already exposes normalized
  `sourceDir` and `scratchDir`.
- Audiobook code, other album operations, dependencies, and media fixtures.

## 3. Root-selection mapping

Use the same expression at each thin adapter:

```ts
const sourceDir = useScratchDir === true
  ? pathResolver.scratchDir
  : pathResolver.sourceDir
```

| Surface | Input | Omitted/false | True |
| --- | --- | --- | --- |
| REST | `useScratchDir=true|false` query | `sourceDir` | `scratchDir` |
| GraphQL | `AlbumListInput.useScratchDir?: boolean` | `sourceDir` | `scratchDir` |
| MCP | tool argument `useScratchDir?: boolean` | `sourceDir` | `scratchDir` |

The selected path is passed as `listAlbumSourceDir({ sourceDir, ...prefix })`.
The option name remains `sourceDir` because changing the shared library would
needlessly alter the CLI contract and expand scope. Web startup has already
validated and realpathed both candidate roots.

## 4. Surface changes

### 4.1 REST

Add `useScratchDir: optionalQueryBoolean()` to `listAlbumQuerySchema`.
`ManageAlbumsController.list` selects the root after successful parsing and
passes the optional prefix unchanged. Array values, arbitrary strings, and
other invalid representations continue through `parseRequest` to HTTP 400
without a library call (FR-1, FR-4 through FR-6).

### 4.2 GraphQL

Add nullable `Boolean` field `useScratchDir` to `AlbumListInput`. The resolver
uses the exact-true selector and continues returning `[String!]!`. Regenerate
`schema.gql` via application initialization; do not hand-edit it (FR-2, FR-4,
FR-8, FR-9).

### 4.3 MCP

Add `useScratchDir: z.boolean().optional()` to
`manageAlbumsListInputSchema`. The handler selects the root, while tool
discovery retains `readOnlyHint: true` and updates human-readable metadata to
say “source or scratch directory” (FR-3, FR-4, FR-7, FR-10).

## 5. Test updates

| Area | Required coverage |
| --- | --- |
| REST unit | Omitted and false select source; true selects scratch; prefix is preserved with scratch; repeated/invalid query value returns 400 without library invocation. |
| GraphQL resolver | Omitted and false select source; true selects scratch; scratch plus prefix maps exactly. |
| GraphQL integration | SDL accepts nullable Boolean; omitted/false/true queries succeed; invalid string value yields GraphQL validation error without resolver/domain invocation. |
| MCP | Calls map omitted/false to source and true to scratch; prefix survives; discovery schema exposes Boolean and stays read-only; invalid type is rejected before the library. |
| Regression | Existing traversal/error tests and response-array assertions remain unchanged. |

No new shared-library or command test is required because the library receives
one validated root exactly as before and the CLI is out of scope.

## 6. Bruno live proof

Create a `scratch-only/` marker directory inside the temporary scratch root
before starting `web serve`, and add `scratchAlbumEntry: scratch-only/` to the
local environment. The marker is setup data, not a list-operation side effect.

| Request | Selector | Assertion |
| --- | --- | --- |
| Existing REST `list.yml` | omitted | array response; source default preserved |
| New REST `list-scratch.yml` | query `true` | contains `scratch-only/` |
| New GraphQL `album-list-scratch.yml` | native `true` | contains `scratch-only/` |
| New MCP `call-manage-albums-list.yml` | omitted | JSON array; source default preserved |
| New MCP `call-manage-albums-list-scratch.yml` | native `true` | JSON array contains `scratch-only/` |

Retain the existing traversal requests for source-root errors. Focused unit
tests prove that the same prefix is evaluated against scratch when scratch is
selected. The live requests must not invoke a write-capable tool (FR-11,
FR-12).

## 7. Migration strategy

1. Extend focused tests with source/scratch and invalid-selector expectations.
2. Add REST parsing and controller selection, linting after each edit.
3. Add GraphQL input/resolver selection and regenerate SDL.
4. Add MCP schema/handler metadata and discovery/call coverage.
5. Add source/scratch Bruno requests and update documentation.
6. Run focused checks, then final lint/build/test and live collection.

## 8. Risk Table

| Risk | Likelihood | Mitigation |
| --- | --- | --- |
| Omitted selector accidentally changes the default | Medium | Exact-true selection plus omitted/false tests on all three surfaces. |
| Prefix is resolved against source after scratch selection | Medium | Assert the full `{ prefix, sourceDir: scratchDir }` call per adapter. |
| REST treats arbitrary truthy strings as true | Medium | Reuse `optionalQueryBoolean`; assert invalid/repeated values fail before invocation. |
| MCP loses read-only metadata while schema changes | Low | Keep and assert `readOnlyHint: true` during discovery. |
| Live checks only prove response shape | Medium | Seed and assert a scratch-only marker on each scratch request. |
| GraphQL decorators and committed SDL drift | Low | Regenerate through app initialization and run integration tests. |

## 9. Verification

After every source code file edit:

1. `npm run lint -- <modified-file>` — lint only the file just modified
   (NFR-1).

Focused checks:

1. `./node_modules/.bin/vitest run __tests__/web/controllers.test.ts`
2. `./node_modules/.bin/vitest run __tests__/web/graphql/album.resolver.test.ts __tests__/web/graphql/graphql.integration.test.ts`
3. `./node_modules/.bin/vitest run __tests__/web/mcp.manage-albums.test.ts`

Final checks:

1. `npm run lint`
2. `npm run build`
3. `npm test`
4. Create a temporary scratch root with `mktemp -d`, create its
   `scratch-only/` marker, start `npm run web:serve` with the configured example
   source/destination roots and that scratch root, then run
   `cd collections/harmonia-aquila-web && ../../node_modules/.bin/bru run . -r
   --env local --bail`.
5. Stop the captured server process and remove the known marker with `rmdir`,
   then remove the known temporary scratch root with `rmdir`.
6. `git --no-pager diff --stat -- src/lib src/commands
   src/web/controllers/manage-audiobooks.controller.ts
   src/web/modules/graphql/audiobook.resolver.ts` — empty.
7. `git --no-pager diff --stat -- package.json package-lock.json etc` — empty.
