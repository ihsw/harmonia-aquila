# Design: Add Web GraphQL Support

> Scope reminder: this spec touches dependency manifests, `src/web/modules`,
> GraphQL tests, and `docs/graphql.md` only. No REST controllers, MCP tools,
> CLI/domain services, collections, or `npx`.

## 1. Overview

Use a code-first adapter module named `graphql` beneath
`src/web/modules/graphql`. `GraphQLModule.forRoot` with `ApolloDriver` emits a
sorted SDL file at `src/web/modules/graphql/schema.gql` (FR-1, FR-2, FR-10).
Decorated classes provide GraphQL's explicit schema contract while existing
domain option/output interfaces remain framework-independent (FR-3).

Four thin query resolvers and six thin mutation resolvers validate only through
GraphQL's declared input shape, resolve every path using `WebPathResolver`, and
delegate to existing domain functions. This preserves validation, defaults, and
side effects while avoiding controller-to-resolver calls or duplicated business
logic (FR-4 through FR-8, NFR-8).

GraphQL-specific error filtering translates expected `UserInputError` values
to `BAD_USER_INPUT`; all other failures are logged through the existing Pino
logger and surfaced as a generic internal error. The filter must not alter the
existing global HTTP filter or disclose sensitive paths (FR-9, FR-11).

## 2. File layout

### Modified and new files

```text
package.json
package-lock.json
src/web/modules/app.module.ts
src/web/modules/graphql/graphql.module.ts
src/web/modules/graphql/graphql-error.filter.ts
src/web/modules/graphql/graphql.types.ts
src/web/modules/graphql/album.resolver.ts
src/web/modules/graphql/audiobook.resolver.ts
src/web/modules/graphql/schema.gql
__tests__/web/graphql/album.resolver.test.ts
__tests__/web/graphql/audiobook.resolver.test.ts
__tests__/web/graphql/graphql.integration.test.ts
__tests__/web/bootstrap.test.ts                         (only if needed)
docs/graphql.md
```

### Files explicitly NOT modified

- `src/lib/**`: domain services stay the source of truth for behavior.
- `src/web/controllers/**`: REST remains an independent, unchanged adapter.
- `src/web/servers/**` and `src/web/schemas/**`: MCP schemas/tools remain
  unchanged.
- `src/web/main.ts`: existing bootstrap logging and server lifecycle remain
  unchanged.
- `collections/**`: GraphQL integration is covered by Vitest, not Bruno in
  this scope.

## 3. Module and schema configuration

`createAppModule(roots)` imports a dynamic `createGraphqlModule(roots)`.
The module registers `GraphQLModule.forRoot<ApolloDriverConfig>` with the
Apollo driver, `path: '/graphql'`, `autoSchemaFile` targeting the committed
SDL, and `sortSchema: true`. The dynamic module provides a
`WebPathResolver` constructed from the normalized roots so its resolvers have
the same path boundary as controllers (FR-2, FR-7).

The implementation MUST install only the four direct runtime packages below;
use the compatible current NestJS 11 line selected by npm:

| Package | Purpose |
| --- | --- |
| `@nestjs/graphql` | Nest code-first decorators and GraphQL module |
| `@nestjs/apollo` | Apollo driver |
| `@apollo/server` | Apollo Server runtime peer |
| `graphql` | GraphQL runtime peer |

The generated `schema.gql` is a tracked artifact. Regenerate it through normal
application initialization after type/resolver edits and include its intentional
diff; do not hand-edit it (FR-1, FR-10).

## 4. Contract and resolver mapping

Keep path, option, and service mapping centralized in the two resolvers. Input
classes use `@InputType()` and `@Field`; result classes use `@ObjectType()` and
`@Field`. Optional fields use nullable GraphQL fields. Existing output unions
that are serialized as a number or string become `String` only where necessary
to preserve a stable scalar contract; nullable service fields remain nullable.

| GraphQL operation | Kind | Input type | Result type | Service |
| --- | --- | --- | --- | --- |
| `albumSummarizeSourceDir` | Query | `AlbumSummaryInput` | `AlbumSummaryRow` | `summarizeAlbumSourceDir` |
| `albumValidateSourceDir` | Query | `AlbumValidationInput` | `AlbumValidationRow` | `validateAlbumSourceDir` |
| `audiobookValidate` | Query | `AudiobookValidationInput` | `AudiobookValidationRow` | `validateAudiobook` |
| `audiobookCrawl` | Query | `AudiobookCrawlInput` | `AudiobookCrawlRow` | `crawlAudiobooks` |
| `albumFixTags` | Mutation | `AlbumFixTagsInput` | `AlbumFixTagsRow` | `fixAlbumTags` |
| `albumOrganizeFiles` | Mutation | `AlbumOrganizeFilesInput` | `AlbumOrganizeFilesRow` | `organizeAlbumFiles` |
| `audiobookCopyAndRename` | Mutation | `AudiobookCopyAndRenameInput` | `AudiobookCopyAndRenameRow` | `copyAndRenameAudiobook` |
| `audiobookConvertFiles` | Mutation | `AudiobookConvertFilesInput` | `AudiobookConvertFilesRow` | `convertAudiobookFiles` |
| `audiobookMerge` | Mutation | `AudiobookMergeInput` | `AudiobookMergeRow` | `mergeAudiobooks` |
| `audiobookSetMetadata` | Mutation | `AudiobookSetMetadataInput` | `AudiobookSetMetadataRow` | `setAudiobookMetadata` |

The type file contains only GraphQL contracts. It includes all existing row
fields, including arrays (`albumartists`, `issues`), nullable metadata fields
(`narrator`, merge `performer`/`title`), and `sourceFiles` as `Int`. Strategy
values remain strings for compatibility with existing service parsers; a future
enum migration is deliberately out of scope (FR-3, FR-6).

Resolver mapping follows this pattern:

```ts
@Query(() => [AlbumSummaryRow])
public async albumSummarizeSourceDir(
  @Args('input') input: AlbumSummaryInput,
): Promise<SummarizeSourceDirJsonOutput> {
  return summarizeAlbumSourceDir({
    ...optionalEntry('ignoreNonAudioFiles', input.ignoreNonAudioFiles),
    ...optionalEntry('limit', input.limit),
    dirName: await this.pathResolver.resolveSource(input.dirName, 'dirName'),
  })
}
```

Mutations use the configured `sourceDir` and/or `destDir` where their REST
counterpart does, and resolve user-supplied filenames with the appropriate
resolver method before invoking the service. `audiobookConvertFiles` converts
each input filename before calling the service and defaults `concurrency` and
`jobs`; `audiobookSetMetadata` resolves source and destination separately
(FR-6, FR-7, FR-8).

## 5. Errors and logging

`graphql-error.filter.ts` implements a narrowly-scoped Nest GraphQL exception
filter. It recognizes `UserInputError` and returns `GraphQLError` with the
original safe validation message and `BAD_USER_INPUT`. Other errors are logged
with the existing Nest/Pino logger without raw GraphQL variables, then return a
new generic `GraphQLError` with `INTERNAL_SERVER_ERROR`.

The filter applies only to resolver execution. REST keeps `throwHttpError` and
the web logging exception filter, so REST error JSON/status behavior is
unaffected (FR-9, FR-11).

## 6. Test updates

| Test file | Required coverage |
| --- | --- |
| `album.resolver.test.ts` | Both album queries, both album mutations, options, dry-run default, source traversal, and service delegation. |
| `audiobook.resolver.test.ts` | Both audiobook queries, all four mutations, source/destination traversal, array path resolution, and conversion/merge defaults. |
| `graphql.integration.test.ts` | HTTP `POST /graphql`, typed query/mutation result shape, SDL operation availability, `BAD_USER_INPUT`, internal-error masking, and REST/MCP coexistence. |
| `bootstrap.test.ts` | Update only if current app initialization needs an explicit assertion for the configured GraphQL endpoint. |

Mock domain services at the module boundary for resolver mapping tests. Use
temporary roots and a real initialized app only in integration tests. Do not
exercise Docker, media parsing, or writes in GraphQL tests; those belong to
existing domain suites.

## 7. Migration strategy

1. Install the direct GraphQL dependencies through npm and verify lockfile
   compatibility.
2. Add decorated contracts, error filtering, resolvers, and the dynamic
   `graphql` module.
3. Import the module from `createAppModule`, initialize it, and regenerate the
   tracked schema.
4. Add resolver and HTTP integration tests for all operations and errors.
5. Document the endpoint and safe usage, then run final verification.

## 8. Risk Table

| Risk | Likelihood | Mitigation |
| --- | --- | --- |
| GraphQL module cannot inject root-scoped path resolver | Medium | Construct `WebPathResolver` from normalized roots within the dynamic module and test traversal. |
| Decorator metadata produces nullable or inaccurate SDL | Medium | Use explicit `@Field` thunks/options and assert generated SDL/contracts in integration tests. |
| Resolver duplicates or diverges from REST defaults | Medium | Map every operation against controller behavior and unit-test exact service calls. |
| Error responses reveal filesystem details | Medium | Filter only expected input errors; mask all other errors and test both paths. |
| Generated SDL is nondeterministic | Low | Enable `sortSchema`, track it, and regenerate only through initialization. |
| Apollo packages conflict with Express 5 | Low | Let npm resolve the documented compatible peer set before code edits and capture the resolved lockfile. |

## 9. Verification

After every source code file edit:

1. `npm run lint -- <modified-file>` — lint only that modified file (NFR-1).

Focused checks:

1. `./node_modules/.bin/vitest run __tests__/web/graphql/album.resolver.test.ts`
2. `./node_modules/.bin/vitest run __tests__/web/graphql/audiobook.resolver.test.ts`
3. `./node_modules/.bin/vitest run __tests__/web/graphql/graphql.integration.test.ts`
4. `npm run build` — also regenerates/verifies the committed SDL during app initialization.

Final checks:

1. `npm run lint` — last-call lint after all TypeScript edits complete.
2. `npm run build`
3. `npm test`
4. `git --no-pager diff --stat -- src/lib src/commands src/web/controllers src/web/servers collections` — empty.
5. `git --no-pager diff --stat -- package.json package-lock.json src/web/modules __tests__/web docs/graphql.md` — only the expected files above.
