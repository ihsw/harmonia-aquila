# Design: Reject Multi-Artist Same-Name Album Output

> Scope reminder: this spec touches the album organization service, the CLI
> description, affected client tests and Bruno requests, and public operation
> documentation only. No new dependencies, no transport/schema changes, and
> no `npx`.

## 1. Overview

Use a domain-owned preflight guard. Once `organizeAlbumFiles` has parsed valid
metadata and constructed all `PlannedCopy` records, it already has the exact
planned relative destination for every selected source file. Extend the plan
with the sanitized artist and album directory identities, then group the plan
by album identity and reject a group containing more than one artist identity
(FR-1, FR-2).

The check sits after metadata validation and duplicate-file-destination
detection, but before any `pathExists`, `mkdir`, or `copyFile` work. That keeps
the outcome dry-run-first and prevents partial effects in execute mode
(FR-3–FR-5). REST, GraphQL, and MCP already delegate directly to this service,
so their production adapters should require no behavior code change. Their
tests, Bruno requests, and docs are modified to lock in the client contracts
(FR-7–FR-10, NFR-4).

## 2. File layout

### Modified files

```text
src/lib/albums/organize-files.ts
src/commands/manage-albums/organize-files.ts
__tests__/commands/manage-albums/organize-files.test.ts
__tests__/web/controllers.test.ts
__tests__/web/mcp.manage-albums.test.ts
__tests__/web/graphql/album.resolver.test.ts
__tests__/web/graphql/graphql.integration.test.ts
collections/harmonia-aquila-web/manage-albums/organize-files*.yml
collections/harmonia-aquila-web/graphql/album-organize-files*.yml
collections/harmonia-aquila-web/mcp/call-manage-albums-organize-files*.yml
docs/mcp-server.md
docs/graphql.md
docs/album-organization.md
```

### Files explicitly NOT modified

- `src/lib/albums/organization-plan.ts`, unless exporting a small normalized
  album-directory helper avoids duplicating its existing sanitization logic.
- `src/web/controllers/manage-albums.controller.ts`,
  `src/web/modules/graphql/album.resolver.ts`, and
  `src/web/servers/mcp-tools/manage-albums/organize-files.ts`: each already
  delegates to the service and preserves the required error translation.
- `src/web/schemas/**` and `src/web/modules/graphql/schema.gql`: no request or
  response contract changes are needed.
- `src/commands/manage-albums/index.ts`, audiobook source, package manifests,
  and transport/bootstrap source.

## 3. Domain planning guard

Add `artistDirectory` and `albumDirectory` to the private `PlannedCopy`, using
the same `sanitizePathSegment` output that `getAlbumDestination` uses. Do not
use raw metadata: values such as `A/B` and `A:B` must compare by their actual
output directory names. A plan is conflicting when this mapping is not
one-to-one in the album-to-artist direction:

```ts
// valid: one album output name, one artist output name
'Same Album' -> Set(['Artist A'])

// invalid: one album output name, multiple artist output names
'Same Album' -> Set(['Artist A', 'Artist B'])
```

Build the error in stable sorted album/artist order. Its text names output
segments only, such as `Multiple artists resolve to the same album directory:
Same Album (Artist A, Artist B)`. It must contain no absolute path. Perform
this guard after exact duplicate destination detection so its existing, more
specific error remains unchanged, and before every destination existence check
or execution side effect (FR-2–FR-5).

## 4. Client mapping

| Client | Production change | Required coverage/documentation |
| --- | --- | --- |
| CLI | Amend `organize-files` description/help. | Add dry-run and execute failure tests; assert command error and no copied output. |
| REST | None expected; controller already maps `UserInputError` to HTTP 400. | Add controller/integration failure assertion; add a Bruno 400 request. |
| GraphQL | None expected; existing filter maps the error to `BAD_USER_INPUT`. | Add resolver error propagation and HTTP integration assertions; add GraphQL Bruno error request and docs guidance. |
| MCP | None expected; handler already returns the MCP tool failure. | Add tool-call failure assertion; add MCP Bruno error request and docs guidance. |

The fixture must use two source files with distinct artists and the same album
name, while retaining distinct tracks/titles so it does not trigger the older
exact-file-destination guard first. A second fixture with the same artist,
same album, and distinct tracks proves the guard does not reject ordinary
multi-track albums (FR-5, FR-10).

## 5. Tests and collection contracts

The domain/CLI suite uses mocked parsed metadata and temporary roots. Its
execute case spies on or verifies the destination remains empty, proving the
guard precedes writes. Adapter unit tests may mock `organizeAlbumFiles` to
reject with `UserInputError`, which isolates each adapter’s translation; one
REST, GraphQL, and MCP integration/Bruno request uses the shared fixture or a
focused service mock as appropriate to prove end-to-end presentation.

| Surface | Expected failure |
| --- | --- |
| CLI | Commander command error containing the deterministic conflict text. |
| REST | HTTP 400 with the existing `{ error, message, statusCode }` body. |
| GraphQL | HTTP 200 GraphQL response with `errors[0].extensions.code = BAD_USER_INPUT`. |
| MCP | Existing tool-call error content containing the conflict text. |

No input type, output row, HTTP route, MCP name, or GraphQL SDL changes. The
new error is the intentional behavioral delta documented by FR-2 and FR-6–9.

## 6. Migration strategy

1. Add the service-level guard and domain/CLI regression cases.
2. Confirm CLI help communicates the safeguard.
3. Add adapter unit/integration coverage for REST, GraphQL, and MCP error
   translation without duplicating the rule.
4. Add the three Bruno error requests and document the non-bypassable rule.
5. Run focused checks, then complete final repository verification.

## 7. Risk Table

| Risk | Likelihood | Mitigation |
| --- | --- | --- |
| A raw-metadata comparison misses an on-disk name collision | Medium | Group sanitized output segments, not raw tags. |
| The guard rejects a normal multi-track album | Medium | Test a same-artist, same-album, distinct-track fixture. |
| Execute mode writes before detecting the conflict | Low | Place the guard before all stat/mkdir/copy paths and assert an empty destination. |
| Client error contracts diverge | Low | Add focused parity tests and Bruno assertions for all four clients. |
| A future adapter reimplements the rule | Low | Keep detection in the domain service and state the ownership boundary in docs/tests. |

## 8. Verification

After every source-code edit:

1. `npm run lint -- <modified-file>` (NFR-1).

Focused checks:

1. `./node_modules/.bin/vitest run __tests__/commands/manage-albums/organize-files.test.ts`
2. `./node_modules/.bin/vitest run __tests__/web/controllers.test.ts __tests__/web/mcp.manage-albums.test.ts`
3. `./node_modules/.bin/vitest run __tests__/web/graphql/album.resolver.test.ts __tests__/web/graphql/graphql.integration.test.ts`
4. Run the affected REST, GraphQL, and MCP Bruno folders against a temporary
   `web serve` instance; then stop that process and confirm no fixture changes.

Final checks:

1. `npm run lint`
2. `npm run build`
3. `npm test`
4. `git --no-pager diff --stat -- src/lib/audiobooks src/commands/manage-audiobooks package.json package-lock.json`
   must be empty.
