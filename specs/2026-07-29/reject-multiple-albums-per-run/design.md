# Design: Reject Multiple Albums Per Validation or Organization Run

> Scope reminder: this spec changes shared album planning, validation and
> organization invocation points, CLI descriptions, focused tests, safe Bruno
> requests, and related docs only. No schema/transport/SDL, media fixture,
> dependency, audiobook, or `npx` changes.

## 1. Overview

Add a second shared output-identity invariant beside
`assertSingleArtistPerAlbumDirectory`. The new guard receives the already
normalized `AlbumOutputIdentity` values, extracts unique album directories,
sorts them, and rejects more than one. Both operations call it at the same
domain preflight boundary, so every adapter receives the same
`UserInputError` without implementing client-specific counting (FR-1–FR-6,
NFR-6).

For organization, call the new guard after exact duplicate file destinations
and before the existing artist guard and all destination inspection. For
validation, build one array of identities from rows with computable
destinations, then call the album guard followed by the artist guard. This
preserves existing row-level issues and makes multiple-album precedence
explicit (FR-4–FR-10).

## 2. File layout

### Modified production files

```text
src/lib/albums/organization-plan.ts
src/lib/albums/organize-files.ts
src/lib/albums/validate.ts
src/commands/manage-albums/organize-files.ts
src/commands/manage-albums/validate.ts
```

### Test files

```text
__tests__/lib/albums/multiple-album-guard.test.ts                 (new)
__tests__/commands/manage-albums/organize-files-errors.test.ts    (new)
__tests__/commands/manage-albums/validate.test.ts
__tests__/web/manage-albums-organization-errors.test.ts           (new)
__tests__/web/manage-albums-validation-errors.test.ts
__tests__/web/graphql/album.resolver.test.ts
__tests__/web/graphql/graphql.integration.test.ts
__tests__/web/mcp.manage-albums-operations.test.ts
__tests__/web/mcp.manage-albums-validate.test.ts
```

Keep existing large controller/integration files from growing when a focused
error test can prove the same boundary. Parameterize existing conflict tests
with the old and new messages where practical.

### New Bruno request group

```text
collections/harmonia-aquila-web/multiple-album-conflicts/
  graphql-organize-files.yml
  graphql-validate.yml
  mcp-organize-files.yml
  mcp-validate.yml
  rest-organize-files.yml
  rest-validate.yml
```

### Modified documentation

```text
docs/album-organization.md
docs/graphql.md
docs/mcp-server.md
docs/testing.md
```

### Files explicitly NOT modified

- `src/web/controllers/manage-albums.controller.ts`,
  `src/web/modules/graphql/album.resolver.ts`, and MCP tool adapters: they
  already delegate and preserve `UserInputError`.
- `src/web/schemas/**`, GraphQL inputs/SDL, MCP schemas, and request helpers:
  no public input or response shape changes.
- `etc/**`: live fixtures use read-only source tracks copied into temporary
  directories.
- Package manifests, MCP server/controller, audiobook code, and unrelated
  album operations.

## 3. Shared single-album guard

Add this adjacent to the existing identity guard:

```ts
export function assertSingleAlbumDirectory(
  identities: Iterable<AlbumOutputIdentity>,
): void {
  const albumDirectories = [...new Set(
    [...identities].map(identity => identity.albumDirectory),
  )].sort()

  if (albumDirectories.length > 1) {
    throw new UserInputError(
      `Multiple albums found: ${albumDirectories.join(', ')}`,
    )
  }
}
```

The implementation MAY use a loop instead of materializing the iterable twice,
but it MUST preserve lexical sorting and exact text. It receives normalized
segments and no roots, so it cannot expose absolute paths (FR-1–FR-3).

| Identity set | Result |
| --- | --- |
| empty | pass |
| `Album A`, `Album A` | pass |
| raw `A/B`, `A:B` → normalized `A-B`, `A-B` | pass |
| `Album B`, `Album A`, `Album B` | `Multiple albums found: Album A, Album B` |

## 4. Operation integration and precedence

### 4.1 Organization

`PlannedCopy` already implements `AlbumOutputIdentity`. Keep the existing
metadata parse and duplicate destination block, then order the guards:

```ts
// existing exact duplicate destination rejection
assertSingleAlbumDirectory(plannedCopies)
assertSingleArtistPerAlbumDirectory(plannedCopies)
// existing pathExists checks and optional writes
```

Because all selected files have valid required metadata at this point, every
planned copy contributes an album identity. The guard runs for dry-run and
execute and precedes `pathExists`, `mkdir`, and `copyFile` (FR-4, FR-7–FR-9).

### 4.2 Validation

After duplicate destination issues are applied, build identities once:

```ts
const outputIdentities = rows
  .filter(row => row.destination !== '')
  .map(row => ({
    albumDirectory: sanitizePathSegment(row.album),
    artistDirectory: sanitizePathSegment(row.artistFilename),
  }))

assertSingleAlbumDirectory(outputIdentities)
assertSingleArtistPerAlbumDirectory(outputIdentities)
```

Rows missing album, artist, title, or track continue as invalid rows and do not
participate because they cannot produce an output identity. `limit` and file
filtering have already run. This matches the current multi-artist behavior
and avoids replacing useful row-level diagnostics (FR-5–FR-8).

### 4.3 Error precedence

| Condition | Result retained |
| --- | --- |
| Organization missing required metadata | Existing file-specific metadata error |
| Exact duplicate file destination | Existing duplicate error/invalid rows |
| More than one normalized album | New exact multiple-album error |
| One album mapped to multiple artists | Existing exact multi-artist error |
| Existing destination path | Existing destination error |

A fixture containing multiple albums and a same-album/multi-artist subgroup
therefore returns the multiple-album error. A one-album multi-artist fixture
continues returning the old error unchanged (NFR-7).

## 5. Client mapping

| Client | Production change | Validation failure | Organization failure |
| --- | --- | --- | --- |
| CLI | Update both descriptions only. | Commander error; no rows. | Commander error; no rows or writes. |
| REST | None. | HTTP 400 existing body. | HTTP 400 existing body. |
| GraphQL | None. | `BAD_USER_INPUT`. | `BAD_USER_INPUT`. |
| MCP | None. | Tool error; read-only retained. | Tool error; dry-run/root semantics retained. |

Focused tests mock the domain boundary for client translation and use real
metadata mocks for domain behavior. Existing schema, annotation, root-routing,
and response tests remain unchanged (FR-11–FR-15).

## 6. Tests

### 6.1 Domain coverage

The new focused domain file creates temporary audio placeholders and mocks
`music-metadata`. It covers:

- exact sorted error from both operations;
- raw album values that sanitize to one output name;
- dry-run and execute organization with no destination inspection/writes;
- one album with multiple tracks;
- limit-before-guard behavior;
- multiple-album precedence over multi-artist;
- old one-album/multi-artist error unchanged;
- validation invalid rows remain rows and do not create identities.

Use spies or an empty destination assertion to prove no `pathExists`, `mkdir`,
or `copyFile` work occurs after a multiple-album conflict. Split further if
needed to keep every new file below 200 lines.

### 6.2 Client coverage

| Test | Change |
| --- | --- |
| CLI validate | Parameterize the existing Commander error test with old and new messages; assert no output. |
| CLI organize | New focused mocked-domain error test; assert description, Commander error, and no output. |
| REST validate | Parameterize focused validation error test. |
| REST organize | New focused controller error test, avoiding the oversized general controller file. |
| GraphQL resolver | Parameterize validation and organization propagation with both messages. |
| GraphQL HTTP | Use the new validation message in existing `BAD_USER_INPUT` integration coverage; resolver tests retain old-error coverage. |
| MCP validate | Parameterize tool-error test with both messages. |
| MCP organize | Parameterize tool-error test with both messages. |

## 7. Temporary Bruno fixture

Create a temporary server tree outside the repository:

```text
<temp>/
  source/
    across.mp3      (copy of one Across the Universe sample)
    requiem.mp3     (copy of one Requiem for a Dream sample)
  scratch/
  destination/
```

Start `web serve` with `source/` as its source root. Each new request targets
the selected root itself:

| Surface | Validate input | Organize input | Expected |
| --- | --- | --- | --- |
| REST | `dirName=.` | empty dry-run body | HTTP 400, exact prefix |
| GraphQL | `dirName: "."` | empty input | `BAD_USER_INPUT`, exact prefix |
| MCP | `dirName: "."` | `albumDir: "./"` | tool error, exact prefix |

Run only `multiple-album-conflicts/` against this special server. No request
sets execute. Stop the captured process, remove the two known copied files,
and remove the known empty directories with `rmdir`. Never modify the source
samples or `etc/**` (FR-16, NFR-9).

## 8. Migration strategy

1. Add focused domain tests for the new invariant and existing precedence.
2. Add the shared guard and invoke it from organization and validation.
3. Add CLI descriptions and focused error translation tests.
4. Add REST, GraphQL, and MCP translation coverage without adapter changes.
5. Add the temporary-fixture Bruno group and update documentation.
6. Run focused checks, final lint/build/tests, live Bruno checks, and scope
   verification.

## 9. Risk Table

| Risk | Likelihood | Mitigation |
| --- | --- | --- |
| Raw album tags are compared instead of output identities | Medium | Reuse `sanitizePathSegment` identities and test equivalent sanitized names. |
| Invalid validation rows become fatal | Medium | Include only rows with computable destinations and retain invalid-row tests. |
| Existing multi-artist error changes | Medium | Run album guard first but assert the exact old error for a one-album fixture. |
| Execute mode writes before rejection | Low | Place guard before path inspection and assert destination remains empty. |
| Limit behavior becomes surprising | Medium | Document and test that limit selects files before the guard. |
| Adapter logic diverges | Low | Make no adapter production changes; mock shared errors at boundaries. |
| Live fixture mutates committed media | Low | Copy two known files into temporary roots and remove only captured paths. |
| Existing tests exceed 200 lines | High | Add focused files and parameterize current cases instead of growing catch-all tests. |

## 10. Verification

After every source code file edit:

1. `npm run lint -- <modified-file>` (NFR-1).

Focused checks:

1. `./node_modules/.bin/vitest run __tests__/lib/albums/multiple-album-guard.test.ts __tests__/lib/albums/validate.test.ts`
2. `./node_modules/.bin/vitest run __tests__/commands/manage-albums/validate.test.ts __tests__/commands/manage-albums/organize-files.test.ts __tests__/commands/manage-albums/organize-files-errors.test.ts`
3. `./node_modules/.bin/vitest run __tests__/web/manage-albums-validation-errors.test.ts __tests__/web/manage-albums-organization-errors.test.ts`
4. `./node_modules/.bin/vitest run __tests__/web/graphql/album.resolver.test.ts __tests__/web/graphql/graphql.integration.test.ts`
5. `./node_modules/.bin/vitest run __tests__/web/mcp.manage-albums-validate.test.ts __tests__/web/mcp.manage-albums-operations.test.ts`

Final checks:

1. `npm run lint`
2. `npm run build`
3. `npm test`
4. Create the temporary source/scratch/destination tree from section 7, start
   `npm run web:serve` with those captured roots, then run
   `cd collections/harmonia-aquila-web &&
   ../../node_modules/.bin/bru run multiple-album-conflicts -r --env local
   --bail`.
5. Stop the captured server process; remove only the two known temporary audio
   copies and captured empty directories.
6. `git --no-pager diff --stat -- package.json package-lock.json etc
   src/lib/audiobooks src/commands/manage-audiobooks src/web/schemas
   src/web/servers/mcp-server.ts src/web/controllers/mcp.controller.ts
   src/web/modules/graphql/schema.gql` — empty.
