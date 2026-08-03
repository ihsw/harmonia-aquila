# Design: Replace Album Organization API Metadata Paths with Inline JSON

> Scope reminder: this spec touches only album set-metadata internals, REST,
> GraphQL, and MCP organize inputs/adapters, affected tests/collections/docs/
> skill, generated SDL, and this spec. No CLI contract change, real media edit,
> new dependency, or `npx`.

## 1. Overview

Use thin API adapters over one in-memory metadata-record contract. REST,
GraphQL, and MCP accept a native array under the existing `setMetadata` key and
map it to a distinct internal inline-record option. The CLI continues mapping
its filepath string to the existing manifest option. The domain chooses one
metadata source, normalizes records, reconciles them against selected files,
and enters the unchanged combined planner (FR-1–FR-8).

The JSON value is an array, not a JSON-encoded string or `{ records: [...] }`
wrapper. This mirrors the existing JSON manifest root, produces useful API
schemas, and removes remote host-path reads instead of hiding them behind a
temporary file (FR-7, NFR-9). The contract is independent of `execute`: dry
run and execution consume the same input and differ only by the existing
boolean (FR-9–FR-12).

## 2. File layout

### Modified or added files

```text
src/web/schemas/request-schemas.ts                     REST record/body schema
src/web/controllers/manage-albums.controller.ts        REST inline mapping
src/web/schemas/mcp/manage-albums.ts                    MCP record schema
src/web/servers/mcp-tools/manage-albums/organize-files.ts MCP inline mapping
src/web/modules/graphql/album.inputs.ts                 typed record input/list
src/web/modules/graphql/album.resolver.ts               GraphQL inline mapping
src/web/modules/graphql/schema.gql                      generated contract delta
src/lib/albums/metadata-fix-types.ts                    distinct inline option
src/lib/albums/metadata-fix-options.ts                  source/conflict normalization
src/lib/albums/organize-files.ts                        choose path or records
src/commands/manage-albums/helpers/set-metadata.ts      file parsing reuse
src/commands/manage-albums/helpers/set-metadata-records.ts focused validation/reconciliation
__tests__/commands/manage-albums/helpers/set-metadata.test.ts CLI file regression
__tests__/commands/manage-albums/organize-files.test.ts CLI contract regression
__tests__/lib/albums/organize-files-set-metadata-input.test.ts domain parity
__tests__/web/manage-albums-organize-metadata.test.ts   REST dry-run/execute
__tests__/web/graphql/album.resolver.test.ts            GraphQL mapping/errors
__tests__/web/graphql/album-organize-output.integration.test.ts SDL/protocol
__tests__/web/mcp.manage-albums-operations.test.ts      MCP discovery/mapping
__tests__/web/mcp.manage-albums-set-metadata.test.ts    MCP protocol behavior
collections/harmonia-aquila-web/{manage-albums,graphql,mcp}/**
docs/{album-organization,graphql,mcp-server,organize-files-set-metadata,testing}.md
.agents/skills/album-organization/SKILL.md
```

Exact test splits MAY change after the pre-flight line-count audit, but no
touched source/test file may exceed 200 lines (NFR-5).

### Files explicitly not modified

- CLI option registration and command mapping: `--set-metadata
  <json-or-csv-path>` remains unchanged.
- Organization planner, executor, album-art planner, validation, and audio-tag
  writer: they already consume reconciled effective metadata safely.
- Audiobook inputs, resolvers, controllers, and tools.
- `etc/**`, package manifests, root configuration, and historical specs.

## 3. Public and internal contracts

### REST and MCP

REST and MCP expose equivalent native JSON records. Each adapter may use its
surface's established Zod import/style, but both must enforce the same contract
and deterministic field rules (FR-1–FR-3).

```ts
setMetadata: z.array(z.object({
  album: z.string().min(1),
  artist: z.string().min(1),
  discNumber: z.number().int().positive().optional(),
  discTotal: z.number().int().positive().optional(),
  filename: z.string().min(1),
  title: z.string().min(1),
  trackNumber: z.number().int().positive(),
})).min(1).optional()
```

Both APIs require native JSON numbers. JSON-encoded arrays, numeric strings,
and filepath strings are invalid. REST preserves existing unknown-body-field
behavior and HTTP error translation; MCP preserves tool-error translation.

### GraphQL

```graphql
input AlbumSetMetadataRecordInput {
  album: String!
  artist: String!
  discNumber: Int
  discTotal: Int
  filename: String!
  title: String!
  trackNumber: Int!
}

input AlbumOrganizeFilesInput {
  setMetadata: [AlbumSetMetadataRecordInput!]
  # existing fields unchanged
}
```

GraphQL list omission remains equivalent to no metadata repair. A supplied
empty list is rejected by resolver/domain validation because GraphQL SDL cannot
express non-empty list length. Positive integer and cross-field validation also
occurs before organization, with `BAD_USER_INPUT` translation (FR-2, FR-10).

### Internal separation

```ts
interface MetadataFixOptions {
  setMetadata?: string                      // CLI manifest path
  setMetadataRecords?: SetMetadataRecord[]  // REST/GraphQL/MCP records
}
```

API adapters map public `setMetadata` to internal `setMetadataRecords`; only
the CLI populates the path option. Normalization treats either source as
activating existing conflicts and rejects both together (FR-6–FR-8).

## 4. Record validation and organization flow

Extract record construction, validation, duplicate detection, and selected-file
reconciliation from near-limit `set-metadata.ts` into a focused helper. The
CLI JSON/CSV parser and API inputs share one canonical `SetMetadataRecord`
normalization and filename reconciliation path (NFR-5, NFR-7).

The operation order is:

1. REST/MCP schemas or GraphQL coercion validate container and scalar types.
2. The adapter passes records in memory; no metadata path is resolved or written.
3. Domain normalization validates records, source exclusivity, and conflicts.
4. CLI callers parse their file; API callers use inline records.
5. Existing selection runs, followed by exact whole-selection reconciliation.
6. Existing projection, disc validation, audio/art planning, collision
   preflight, and optional staged execution run unchanged.

Reconciliation stays after selection so current `limit` and trackless-filter
semantics remain. Final validation/execution must not use `limit` to evade
whole-album coverage (FR-4, FR-12).

## 5. Surface mapping

| Surface | Public `setMetadata` after change | Internal mapping | Contract delta |
| --- | --- | --- | --- |
| CLI | JSON/CSV filepath string | `setMetadata` | none |
| REST | native record array | `setMetadataRecords` | breaking body type |
| GraphQL | typed record input list | `setMetadataRecords` | breaking input type and SDL delta |
| MCP | native record array | `setMetadataRecords` | breaking tool input type |

No API string/array union is provided: accepting strings would retain the
remote host-path capability FR-7 removes. Endpoint/mutation/tool names, all
other inputs, output rows, error channels, and execute defaults remain stable.

## 6. Test updates

### 6.1 Shared and CLI parity

- Compare CLI file-backed and API inline records and require identical plans,
  tag changes, destinations, and executed destination metadata.
- Cover missing, unknown, duplicate, unsafe filename, invalid value, empty
  input, and simultaneous path/record sources before writes.
- Preserve CLI JSON and CSV filepath dry-run/execute tests unchanged.

### 6.2 API contracts

- REST: assert body validation, adapter mapping, HTTP 400 errors, dry run, and
  `execute: true` with source preservation.
- GraphQL: assert typed input discovery/generated SDL, resolver mapping,
  `BAD_USER_INPUT`, dry run, and `execute: true` source preservation.
- MCP: assert `tools/list`, argument rejection, adapter mapping, tool errors,
  and protocol-level whole-album dry run.
- Use a shared Requiem-style fixture concept across surfaces: unique effective
  tracks and complete required metadata repair incorrect extras in one array.

## 7. Migration strategy

1. Capture baseline status/tests, all four public contracts, SDL, and line counts.
2. Extract shared record normalization/reconciliation without behavior changes.
3. Add the distinct inline-record domain option and file/record parity tests.
4. Replace REST and MCP strings with native arrays and update adapters/tests.
5. Add the GraphQL record input/list, resolver validation, SDL, and tests.
6. Update collections, active guidance, and CLI-vs-API examples.
7. Run focused checks followed by final lint, build, full tests, smoke, and scope audits.

## 8. Risk Table

| Risk | Likelihood | Mitigation |
| --- | --- | --- |
| An API accepts partial album patches | Medium | Reuse exact selected-set reconciliation on every surface. |
| CLI filepath behavior regresses | Medium | Keep a distinct option and preserve JSON/CSV dry-run/execute tests. |
| REST, GraphQL, and MCP validation drift | Medium | Share canonical domain validation and equivalent contract matrices. |
| API adapter retains arbitrary host reads | Low | Reject strings and assert only records reach the domain. |
| GraphQL accepts an empty list | Medium | Add explicit resolver/domain validation and `BAD_USER_INPUT` tests. |
| Invalid input reaches execution | Low | Validate and reconcile before planner/collision/executor calls. |
| Near-limit modules exceed 200 lines | High | Extract focused source/test modules before adding behavior. |
| Real album data is modified | Low | Use temporary fixtures; collection smoke requests stay dry-run-only. |

## 9. Verification

After every TypeScript source/test edit:

1. `npm run lint -- <modified-file>` — exit 0 before the next edit (NFR-1).

Focused checks:

1. `./node_modules/.bin/vitest run __tests__/commands/manage-albums/helpers/set-metadata.test.ts __tests__/commands/manage-albums/organize-files.test.ts __tests__/lib/albums/organize-files-set-metadata-input.test.ts`
2. `./node_modules/.bin/vitest run __tests__/web/manage-albums-organize-metadata.test.ts __tests__/web/controllers.test.ts`
3. `./node_modules/.bin/vitest run __tests__/web/graphql/album.resolver.test.ts __tests__/web/graphql/album-organize-output.integration.test.ts`
4. `./node_modules/.bin/vitest run __tests__/web/mcp.manage-albums-operations.test.ts __tests__/web/mcp.manage-albums-set-metadata.test.ts`

Final checks, only after all TypeScript edits:

1. `npm run lint`
2. `npm run build`
3. `npm test`
4. Run affected REST, GraphQL, and MCP Bruno dry-run requests against isolated configured roots; never set `execute: true` in collections.
5. Review and retain only the expected `AlbumSetMetadataRecordInput` generated SDL delta.
6. `git diff --check`
7. `git status --short -- etc`
8. `git diff -- package.json package-lock.json`
9. `git --no-pager diff --stat -- src __tests__ docs collections .agents/skills/album-organization`

## 10. Resolved decisions

1. “JSON blob” means a native JSON array of records for REST and MCP and the equivalent typed GraphQL list; it is not a JSON string or wrapper object.
2. REST, GraphQL, and MCP filepath forms are intentionally removed rather than supported as unions.
3. The CLI remains the sole filepath surface and retains both JSON and CSV manifest support.
4. Whole-album coverage means every selected audio file, not album art; recognized art remains in the adjacent-image plan.
5. Dry run and execution use exactly the same metadata input contract; only the existing `execute` boolean differs.
