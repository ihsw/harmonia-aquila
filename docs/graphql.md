# GraphQL API

`web serve` exposes a code-first Apollo GraphQL API at `POST /graphql`. The
schema is available in `src/web/modules/graphql/schema.gql`.

All inputs use paths relative to the source, destination, or scratch root
configured when starting `web serve`; clients cannot override those roots.

## Operations

| Queries | Mutations |
| --- | --- |
| `albumList` | |
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

List direct entries at the configured source root, or provide a slash-terminated
selected-root-relative `prefix` to list one subdirectory. Omitted or false
`useScratchDir` selects `--source-dir`; true selects `--scratch-dir`:

```graphql
query {
  albumList(input: { prefix: "" })
  stagedAlbums: albumList(input: { prefix: "", useScratchDir: true })
}
```

`albumList` never accepts a client-supplied root path.

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

`albumFixTags` always plans or writes its output under the configured
`--scratch-dir`. `albumOrganizeFiles` defaults its output root to the configured
`--source-dir`; set `useScratchDir: true` to select `--scratch-dir` instead.
Neither mutation accepts a client-supplied root path.

`albumOrganizeFiles` accepts one normalized album directory per request. More
than one album returns `BAD_USER_INPUT` with a message beginning
`Multiple albums found:`. The operation also rejects one album directory
associated with multiple artist directories. These safeguards apply to dry
runs and `execute: true`, cannot be bypassed, and run before destination
inspection or writes.

`albumValidateSourceDir` applies the same one-album and artist safeguards before
returning validation rows. Multiple albums or artists are returned as
`BAD_USER_INPUT`; missing metadata and exact duplicate file destinations
continue to appear as invalid rows.

GraphQL errors with `extensions.code` equal to `BAD_USER_INPUT` identify
invalid inputs or paths outside configured roots. Unexpected failures return
`INTERNAL_SERVER_ERROR` without exposing filesystem paths or stack traces.
