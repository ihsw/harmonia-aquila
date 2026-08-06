# GraphQL API

`web serve` exposes a code-first Apollo GraphQL API at `POST /graphql`. The
schema is available in `src/web/modules/graphql/schema.gql`.

All inputs use paths relative to the source or destination root configured when
starting `web serve`; clients cannot override those roots.

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
source-relative `prefix` to list one subdirectory:

```graphql
query {
  albumList(input: { prefix: "" })
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
`.png`, `.tif`, `.tiff`, and `.webp` files are placed at the album root
alongside the audio tracks. Destination collision handling applies to both
variants.

`albumOrganizeFiles` reads album input from the configured `--source-dir` and
publishes output to the configured `--dest-dir`. It never accepts a
client-supplied root path or changes source audio.

For concatenation, pass `albumDirs: ["disc-1", "disc-2"]` with
`discStrategy: "concatenate"`. The mutation resolves each entry independently
within the selected source root, requires at least two unique
directories, preserves local track numbers, and assigns canonical disc metadata
from array order. With two directories, their tracks receive disc `1/2` and
`2/2`; correct values are preserved and missing, partial, or conflicting values
are repaired on destination copies. MP3 copies encode those values in ID3v2
`TPOS`, while FLAC copies use `DISCNUMBER` and `DISCTOTAL`. The physical output
remains one flat album directory with no `Disc DD` component; each filename
instead carries its disc number ahead of the track number. For example,
local tracks `1,2` and `1` return `trackNumber` values `01,02,01` with
`discNumber`/`discTotal` values `01/02,01/02,02/02`, written as `101 - …`,
`102 - …`, and `201 - …`.

`albumArtStrategy: "first" | "last" | "neither"` is only valid in this mode
and is required when multiple source directories contain art that would land on
the same album-root destination. Exact duplicate flat audio destinations fail
before any write. These semantics supersede the initial global-track/cleared-
disc concatenate behavior.

Disc metadata may be absent when selected track numbers are unique. Repeated
track numbers without effective disc numbers return `BAD_USER_INPUT` with the
duplicate track groups, the `missing disc number` reason, and `setMetadata` or
explicit-inference guidance. `setMetadata` is a typed list of whole-album
records with `filename`, `artist`, `album`, `trackNumber`, `title`, optional
disc fields, an optional `year` (`Int`, 1000–9999, set-only, and permitted
under `discStrategy: "concatenate"` unlike the disc fields), and an optional
`sourceIndex` (the 1-based `albumDirs` position,
required only for a filename that repeats across directories under
`discStrategy: "concatenate"`); it is never a server-host filepath.
`AlbumMetadataChangesRow` reports the year as the `year`/`newYear` pair. Disc inference is opt-in through
`discStrategy: "infer"` and uses filename order; omitted/default input never
infers. A repeated or decreased track number starts the next disc. Review the
dry-run values before passing `execute: true`. Multi-disc organization prefixes
each filename with its disc number while preserving the flat unique-track path.

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
