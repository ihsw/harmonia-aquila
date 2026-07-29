# Design: Album Validation Collision Parity and MCP Fix-Tags Album Selection

> Scope reminder: this spec changes shared album collision planning, focused
> validation adapters/tests/docs, and MCP fix-tags selection only. REST and
> GraphQL fix-tags inputs, configured roots, `bin/web-serve.sh`, `etc/**`,
> dependencies, audiobooks, and `npx` are excluded.

## 1. Overview

Extract the existing organize-files album-to-artists assertion into shared
album planning code. Both `organizeAlbumFiles` and
`validateAlbumSourceDir` submit sanitized output identities to that guard
(FR-1–FR-6). The guard continues to own the exact deterministic
`UserInputError`; adapters only translate it using their established
Commander, HTTP, GraphQL, and MCP mechanisms (FR-7–FR-11, NFR-6).

Validation invokes the guard after rows have been built and exact duplicate
destination issues have been applied. It supplies identities only for rows
with computable destinations, so existing row-level reporting for missing
metadata remains intact. The selected strategy and limit are already reflected
in those rows (FR-4, FR-5).

For MCP fix-tags, reuse one `albumDir` Zod field definition for organize and
fix-tags. The handler resolves the value inside the configured source root and
passes that resolved directory to `fixAlbumTags`, while the destination remains
the configured scratch root (FR-12–FR-16, NFR-7).

## 2. File layout

### Modified files

```text
src/lib/albums/organization-plan.ts
src/lib/albums/organize-files.ts
src/lib/albums/validate.ts
src/commands/manage-albums/validate.ts
src/web/schemas/mcp/manage-albums.ts
src/web/servers/mcp-tools/manage-albums/fix-tags.ts
__tests__/lib/albums/validate.test.ts
__tests__/commands/manage-albums/validate.test.ts
__tests__/commands/manage-albums/organize-files.test.ts
__tests__/web/controllers.test.ts
__tests__/web/manage-albums-validation-errors.test.ts
__tests__/web/graphql/album.resolver.test.ts
__tests__/web/graphql/graphql.integration.test.ts
__tests__/web/mcp.manage-albums.test.ts
__tests__/web/mcp.manage-albums-operations.test.ts
__tests__/web/mcp.manage-albums-fix-tags.test.ts
collections/harmonia-aquila-web/manage-albums/validate*.yml
collections/harmonia-aquila-web/graphql/album-validate-source-dir*.yml
collections/harmonia-aquila-web/mcp/call-manage-albums-validate*.yml
collections/harmonia-aquila-web/mcp/call-manage-albums-fix-tags*.yml
docs/album-organization.md
docs/graphql.md
docs/mcp-server.md
```

Existing files in wildcard groups are edited where a current request can be
extended; add one focused conflict or invalid-input request only when needed.

### Files explicitly NOT modified

- `src/web/controllers/manage-albums.controller.ts` and
  `src/web/modules/graphql/album.resolver.ts`: validation already delegates and
  preserves `UserInputError`; source edits are allowed only if focused tests
  prove otherwise.
- `src/web/schemas/request-schemas.ts`,
  `src/web/modules/graphql/album.inputs.ts`, and generated `schema.gql`: REST
  and GraphQL contracts do not change.
- `src/lib/albums/fix-tags.ts`: it already accepts an explicit `sourceDir` and
  `destDir`; selection is an MCP adapter responsibility.
- `bin/web-serve.sh`, `etc/**`, audiobook code, package manifests, and root
  configuration.

## 3. Shared collision guard

Move the current deterministic grouping/error construction from
`organize-files.ts` to `organization-plan.ts` as a function over already
sanitized output identities:

```ts
export interface AlbumOutputIdentity {
  albumDirectory: string
  artistDirectory: string
}

export function assertSingleArtistPerAlbumDirectory(
  identities: Iterable<AlbumOutputIdentity>,
): void
```

The function groups `albumDirectory -> Set<artistDirectory>`, sorts album
entries and each artist set, and throws the unchanged `UserInputError` when a
set contains multiple artists. It receives no filesystem roots and therefore
cannot leak absolute paths (FR-1, FR-3).

`organizeAlbumFiles` keeps `albumDirectory` and `artistDirectory` in each
private planned copy, then calls the shared guard at the same point as today:
after exact duplicate-file-destination detection and before any `pathExists`,
`mkdir`, or `copyFile` call. Existing organize tests lock down behavior and
ordering (FR-6).

`validateAlbumSourceDir` maps only rows with non-empty destinations into
identities using `sanitizePathSegment(row.album)` and
`sanitizePathSegment(row.artistFilename)`. It calls the shared guard after
`addDuplicateDestinationIssues(rows)` and before returning rows. Missing
metadata and duplicate file destinations continue to be row issues rather than
exceptions (FR-2, FR-4, FR-5).

## 4. Validation client mapping

| Surface | Production change | Expected failure |
| --- | --- | --- |
| CLI | Help text may mention the collision; no adapter logic change. | Commander command failure; no JSON/plaintext rows. |
| REST | None expected. | HTTP 400 existing `{ error, message, statusCode }`. |
| GraphQL | None expected. | GraphQL error with `extensions.code = BAD_USER_INPUT`. |
| MCP | None expected. | Existing tool-error content with deterministic text. |

Unit tests mock the shared validation operation at adapter boundaries to prove
translation. The domain test uses two real temporary audio filenames with
mocked metadata so it proves strategy, sanitization, and limit semantics.
GraphQL HTTP integration should exercise the filter through a deterministic
mock or fixture without writing audio files (FR-7–FR-11).

## 5. MCP fix-tags `albumDir`

Define one private schema value and reuse it in both MCP input objects:

```ts
const albumDirSchema = z.string()
  .min(1, 'albumDir is required')
  .endsWith('/', 'albumDir must end with /')
```

`manageAlbumsFixTagsInputSchema.albumDir` is required. This is an intentional
MCP input-contract change: callers must first select an album directory, rather
than implicitly attempting to process the configured source root.

The handler becomes:

```ts
const sourceDir = await context.pathResolver.resolveSource(
  input.albumDir,
  'albumDir',
)

return jsonToolContent(await fixAlbumTags({
  destDir: context.pathResolver.scratchDir,
  sourceDir,
  // unchanged optional mappings
}))
```

The resolver performs containment and traversal checks before domain
invocation. `albumDir` never selects scratch as input and never affects output;
scratch remains the only fix-tags destination. Update the tool description and
MCP docs to direct callers to slash-terminated directories returned by
`manage_albums_list` (FR-12–FR-16).

## 6. Test and collection updates

| Area | Required coverage |
| --- | --- |
| Domain validation | Exact conflict message; sanitized-name conflict; same-artist success; missing/duplicate row behavior unchanged; limit applies before guard. |
| Organize regression | Existing exact conflict, no-write, and same-artist tests remain green after helper extraction. |
| CLI | Validation rejection uses Commander error path and emits no rows. |
| REST | Validation `UserInputError` maps to the exact HTTP 400 body. |
| GraphQL | Resolver preserves error; HTTP layer returns `BAD_USER_INPUT`. |
| MCP validate | Tool error contains the exact conflict and remains read-only. |
| MCP fix-tags | Required schema discovery; resolved source/scratch destination call; missing, malformed, traversal, and valid inputs. |
| Bruno/docs | Validation failure contracts where a deterministic fixture is available; fix-tags dry run supplies `albumDir`; no execute request. |

The existing MCP fix-tags Bruno request currently documents failure against a
non-flat configured root. Replace that expectation with a safe `limit: 0`
request against a listed album directory, then assert successful JSON tool
content. Add a traversal request if none exists. Do not alter REST or GraphQL
fix-tags requests because those APIs do not gain `albumDir`.

## 7. Migration strategy

1. Extract and regression-test the shared organization guard.
2. Invoke it from validation and add domain/CLI coverage.
3. Add REST, GraphQL, and MCP validation translation coverage.
4. Add the shared MCP `albumDir` schema and update fix-tags source resolution.
5. Update MCP tests, safe Bruno requests, and public docs.
6. Run focused checks, final lint/build/tests, and scope verification.

## 8. Risk Table

| Risk | Likelihood | Mitigation |
| --- | --- | --- |
| Validation compares raw tags instead of output names | Medium | Pass sanitized output identities to the shared guard and test punctuation collisions. |
| Existing invalid rows unexpectedly become exceptions | Medium | Exclude rows without computable destinations and retain missing/duplicate tests. |
| Organize guard ordering changes during extraction | Medium | Keep the call at its current location and rerun no-write regression tests. |
| MCP fix-tags escapes source root | Low | Resolve `albumDir` through `resolveSource` and test traversal before operation invocation. |
| Fix-tags writes outside scratch | Low | Exact-call tests use distinct roots and assert scratch as `destDir`. |
| Required `albumDir` surprises existing MCP clients | Medium | Treat it as intentional, expose it in discovery, and update docs/Bruno together. |
| Touched MCP test exceeds 200 lines | High | Split fix-tags or validation MCP cases into a focused test file if needed. |

## 9. Verification

After every source code file edit:

1. `npm run lint -- <modified-file>` (NFR-1).

Focused checks:

1. `./node_modules/.bin/vitest run __tests__/lib/albums/validate.test.ts`
2. `./node_modules/.bin/vitest run __tests__/commands/manage-albums/validate.test.ts __tests__/commands/manage-albums/organize-files.test.ts`
3. `./node_modules/.bin/vitest run __tests__/web/controllers.test.ts __tests__/web/manage-albums-validation-errors.test.ts`
4. `./node_modules/.bin/vitest run __tests__/web/graphql/album.resolver.test.ts __tests__/web/graphql/graphql.integration.test.ts`
5. `./node_modules/.bin/vitest run __tests__/web/mcp.manage-albums.test.ts __tests__/web/mcp.manage-albums-operations.test.ts __tests__/web/mcp.manage-albums-fix-tags.test.ts`

Final checks:

1. `npm run lint`
2. `npm run build`
3. `npm test`
4. Run affected Bruno requests against a temporary three-root `web serve`
   instance with every execute flag omitted, then stop the captured process.
5. Confirm source, scratch, destination, and `etc/**` are unchanged.
6. `git --no-pager diff --stat -- bin/web-serve.sh etc package.json package-lock.json src/lib/audiobooks src/commands/manage-audiobooks`
   shows no changes introduced by this spec.
