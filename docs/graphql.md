# GraphQL API

`web serve` exposes a code-first Apollo GraphQL API at `POST /graphql`. The
schema is available in `src/web/modules/graphql/schema.gql`.

All inputs use paths relative to the source or destination root configured when
starting `web serve`; clients cannot override those roots.

## Operations

| Queries | Mutations |
| --- | --- |
| `albumSummarizeSourceDir` | `albumFixTags` |
| `albumValidateSourceDir` | `albumOrganizeFiles` |
| `audiobookValidate` | `audiobookCopyAndRename` |
| `audiobookCrawl` | `audiobookConvertFiles` |
| | `audiobookMerge` |
| | `audiobookSetMetadata` |

For example, summarize a source subdirectory:

```graphql
query {
  albumSummarizeSourceDir(input: { dirName: "." }) {
    filename
    artist
    album
    title
  }
}
```

Mutations are dry runs unless `execute: true` is explicit. This mutation
returns the proposed tag changes without writing files:

```graphql
mutation {
  albumFixTags(input: { albumStrategy: "grouping" }) {
    album
    artist
    title
  }
}
```

GraphQL errors with `extensions.code` equal to `BAD_USER_INPUT` identify
invalid inputs or paths outside configured roots. Unexpected failures return
`INTERNAL_SERVER_ERROR` without exposing filesystem paths or stack traces.
