# GraphQL API

`web serve` exposes a code-first Apollo GraphQL API at `POST /graphql`. The
schema is available in `src/web/modules/graphql/schema.gql`.

All inputs use paths relative to the source, destination, or scratch root
configured when starting `web serve`; clients cannot override those roots.

## Operations

| Queries | Mutations |
| --- | --- |
| `albumList` | |
| `albumSummarizeSourceDir` | `albumOrganizeFiles` |
| `albumValidateSourceDir` | |
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
    discNumber
    discTotal
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

Mutations are dry runs unless `execute: true` is explicit. Organization plans
paths from repaired metadata and returns both effects without writing files:

```graphql
mutation {
  albumOrganizeFiles(input: { discStrategy: "infer" }) {
    fileType
    filename
    album
    discNumber
    discTotal
    destination
    tagChanges {
      newDiscNumber
      newDiscTotal
    }
  }
}
```

Organization rows form a discriminated result. Every row includes `fileType`,
`action`, `filename`, and `destination`. Audio rows use `fileType: "audio"`
and populate metadata and filename fields. Adjacent recognized images use
`fileType: "albumArt"`; audio-only fields such as `album`, `discNumber`, and
`tagChanges` are null. Recognized `.avif`, `.bmp`, `.gif`, `.jpeg`, `.jpg`,
`.png`, `.tif`, `.tiff`, and `.webp` files are placed at the album root rather
than under `Disc DD`. Destination collision handling applies to both variants.

`albumOrganizeFiles` defaults its output root to the configured
`--source-dir`; set `useScratchDir: true` to select `--scratch-dir` instead.
It never accepts a client-supplied root path or changes source audio.

Disc metadata may be absent when selected track numbers are unique. Repeated
track numbers without effective disc numbers return `BAD_USER_INPUT` with the
duplicate track groups, the `missing disc number` reason, and `setMetadata` or
explicit-inference guidance. `setMetadata` is a host-readable path to a
whole-album JSON/CSV file, not an inline JSON blob. Disc inference is opt-in through
`discStrategy: "infer"` and uses filename order; omitted/default input never
infers. A repeated or decreased track number starts the next disc. Review the
dry-run values before passing `execute: true`. Multi-disc organization places
tracks below `Disc DD` while preserving the flat unique-track path.

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
