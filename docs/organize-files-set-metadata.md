# `organize-files` whole-album metadata

`manage-albums organize-files` can apply explicit per-track metadata before
publishing organized destination copies. Every selected audio file requires
exactly one record, matched by its bare `.flac` or `.mp3` `filename`.

## CLI manifest file

The CLI retains its host-readable JSON/CSV filepath contract:

```sh
npm run build
./build/dist/index.js manage-albums organize-files \
  --source-dir "$SOURCE_DIR" --dest-dir "$DEST_DIR" \
  --set-metadata album-metadata.json --format json
# Review, then repeat the identical command with --execute.
```

## REST, GraphQL, and MCP inline records

Web APIs accept the JSON record array directly; they do not accept or read a
metadata filepath. REST example:

```json
{
  "setMetadata": [
    {
      "filename": "01 - song.flac",
      "artist": "Artist",
      "album": "Album",
      "trackNumber": 1,
      "title": "Song"
    }
  ]
}
```

GraphQL uses the equivalent typed list:

```graphql
mutation {
  albumOrganizeFiles(input: {
    setMetadata: [{
      filename: "01 - song.flac"
      artist: "Artist"
      album: "Album"
      trackNumber: 1
      title: "Song"
    }]
  }) { action destination tagChanges { newTrackNumber newTitle } }
}
```

For MCP, place the same JSON array in
`manage_albums_organize_files.arguments.setMetadata` alongside `albumDir`.
Omit `execute` for review, then repeat the identical API input with
`execute: true`.

## Record contract

| Field | Type | Rules |
| --- | --- | --- |
| `filename` | string | Bare `.flac`/`.mp3` filename; exact source key |
| `artist` | string | Non-empty |
| `album` | string | Non-empty |
| `trackNumber` | positive integer | Greater than zero |
| `title` | string | Non-empty |
| `discNumber` | positive integer | Optional; required with `discTotal` |
| `discTotal` | positive integer | Optional; at least `discNumber` |

Unknown files, duplicates, missing coverage, invalid extensions or paths,
empty values, and invalid integers fail before writes. JSON/CSV file parsing
for the CLI preserves the same validation; CSV follows RFC 4180 quoting.

`setMetadata` conflicts with set-artist, set-album, non-default album strategy,
track reset, and artist/album-artist swap options. Disc inference also
conflicts when records contain disc fields. Album-artist and producer options
remain compatible.

Organization fields use proposed metadata and `tagChanges` shows the current
and new values. Execution repairs a temporary destination copy before
publishing it; source files are never changed.

## Concatenate mode (`--source-dirs` / `sourceDirs` / `albumDirs`)

`setMetadata` is also supported with `--disc-strategy concatenate`, which
unblocks fully tagless multi-disc sources: a record's `trackNumber` becomes
the local sort/validation fallback whenever a file has no embedded track tag.
Three additional rules apply only in this mode:

- Records **must not** set `discNumber`/`discTotal` — concatenate always
  derives disc identity from `--source-dirs` order.
- `filename` **must be unique across every source directory combined**, not
  just within one directory, since disc-local rips often reuse the same
  numbered filenames per disc.
- Coverage is checked against the union of every directory's files, not
  directory-by-directory.

Worked example — two fully tagless discs where each disc's own track numbers
restart at `1`:

```sh
./build/dist/index.js manage-albums organize-files \
  --source-dirs "/music/Days of Purgatory/01" "/music/Days of Purgatory/02" \
  --dest-dir "$DEST_DIR" \
  --disc-strategy concatenate \
  --set-metadata days-of-purgatory-metadata.json \
  --format json
```

```json
[
  { "filename": "01 - enter the realm.flac", "artist": "Iced Earth", "album": "Days of Purgatory", "trackNumber": 1, "title": "Enter the Realm" },
  { "filename": "02 - colors.flac", "artist": "Iced Earth", "album": "Days of Purgatory", "trackNumber": 2, "title": "Colors" },
  { "filename": "01 - burnt offerings.flac", "artist": "Iced Earth", "album": "Days of Purgatory", "trackNumber": 1, "title": "Burnt Offerings" }
]
```

The first two records (disc 1) and the third record (disc 2) resolve to
distinct destination filenames because their titles differ, even though their
`trackNumber` values repeat across discs. `discNumber`/`discTotal` on the
output rows come from directory order (`1/2`, `2/2`), never from this file.
