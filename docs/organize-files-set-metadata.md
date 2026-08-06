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
      "title": "Song",
      "year": 1986
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
      year: 1986
    }]
  }) { action destination tagChanges { newTrackNumber newTitle year newYear } }
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
| `sourceIndex` | positive integer | Optional; concatenate mode only. 1-based `--source-dirs` position |
| `year` | integer 1000–9999 | Optional; set-only. Omit to leave the source year untouched |

Unknown files, duplicates, missing coverage, invalid extensions or paths,
empty values, and invalid integers fail before writes. JSON/CSV file parsing
for the CLI preserves the same validation; CSV follows RFC 4180 quoting.

### `year`

`year` overwrites the release year tag, which is the only way to correct
reissue and deluxe pressings that carry the reissue year instead of the
original — a 1986 album tagged `2009` by its 2009 remaster, for example.
`tagChanges` reports the pair as `year` (current) and `newYear` (proposed).

Three rules:

- **Set-only.** There is no clear semantic; omitting `year` leaves the tag
  alone. Unlike `discNumber`/`discTotal`, it cannot be blanked.
- **Range-checked.** Values outside 1000–9999, non-integers, and non-numeric
  strings are rejected before any write, naming the offending record index.
- **Permitted under concatenate**, unlike the disc fields — `year` carries no
  disc identity, so it is not rejected by `--disc-strategy concatenate`.

The CLI accepts a numeric string (`"1986"`) from JSON or a CSV column, matching
how it already coerces `trackNumber`; an empty CSV cell counts as absent. REST,
GraphQL, and MCP accept only a JSON number, with GraphQL typing it as `Int`.

> Before `year` was supported, an unrecognized `year` key in a `setMetadata`
> record was **silently accepted and discarded** — no error, no tag write.
> Manifests written against older builds therefore appeared to succeed while
> having no effect on the year tag.

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
- A `filename` that appears in more than one source directory **must** carry
  `sourceIndex`, the 1-based position of its directory in `--source-dirs`.
  Disc-local rips often reuse the same numbered filenames per disc, so
  `sourceIndex` is what tells two same-named files apart; without it the run
  is rejected before any write, naming the filename and every directory
  holding it. Filenames unique across all directories need no `sourceIndex`,
  and supplying it outside concatenate mode is an error.
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
`101 - Enter the Realm.flac`, `102 - Colors.flac`, and
`201 - Burnt Offerings.flac`. The embedded disc number keeps them distinct even
though their `trackNumber` values repeat across discs — identical titles on
different discs are fine. `discNumber`/`discTotal` on the output rows come from
directory order (`1/2`, `2/2`), never from this file.

No filename repeats above, so no record needs `sourceIndex`. When one does
repeat — as in Dark Genesis, where `04 - curse the sky.flac` is on both disc 1
and disc 2 — give each of its records the position of its own directory and
leave every other record alone:

```json
[
  { "filename": "04 - curse the sky.flac", "sourceIndex": 1, "artist": "Iced Earth", "album": "Dark Genesis", "trackNumber": 4, "title": "Curse the Sky" },
  { "filename": "04 - curse the sky.flac", "sourceIndex": 2, "artist": "Iced Earth", "album": "Dark Genesis", "trackNumber": 4, "title": "Curse the Sky" }
]
```

These resolve to `104 - Curse the Sky.flac` and `204 - Curse the Sky.flac`. In
CSV, add a `sourceIndex` column and leave it blank on every unambiguous row.
