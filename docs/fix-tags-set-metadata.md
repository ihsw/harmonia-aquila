# fix-tags `--set-metadata`

`fix-tags --set-metadata <path>` writes whole-album, per-track metadata from a
single JSON or CSV file. Each record sets the **artist**, **album**,
**track number**, and **title** for one source audio file. The file's `filename`
column is the unambiguous mapping key against the source directory.

```sh
npm run build
./build/dist/index.js fix-tags \
  --source-dir "$SOURCE_DIR" \
  --dest-dir etc/2-fixed-tag-files \
  --set-metadata album-metadata.json \
  --format json
./build/dist/index.js fix-tags \
  --source-dir "$SOURCE_DIR" \
  --dest-dir etc/2-fixed-tag-files \
  --set-metadata album-metadata.json \
  --execute
```

Run the dry-run first. The dry-run JSON reports each track's current
`artist`/`album`/`title`/`trackNumber` alongside the planned
`newArtists`/`newAlbum`/`newTitle`/`newTrackNumber` values. Pass `--execute`
only after confirming the plan.

## Record contract

Every record — whether a JSON object or a CSV row — must contain all of these
fields:

| Field         | Type              | Rules                                                        |
| ------------- | ----------------- | ------------------------------------------------------------ |
| `filename`    | string            | Bare file name (no path separators) ending in `.flac`/`.mp3` |
| `artist`      | string            | Non-empty                                                    |
| `album`       | string            | Non-empty                                                    |
| `trackNumber` | positive integer  | `> 0`, integer; in CSV it is a digits-only string            |
| `title`       | string            | Non-empty                                                    |

The command validates strictly and exits with an error (no files copied or
written) when any of the following is true:

- a record is missing a required field or has an empty required string;
- a `trackNumber` is not a positive integer;
- a `filename` uses an unsupported extension or contains path separators;
- two records share the same `filename` (duplicate);
- a record's `filename` is not present in the source directory (unknown file);
- a source audio file has no matching record (missing coverage);
- the metadata file extension is neither `.json` nor `.csv`;
- a CSV is missing a required column, has a duplicate column, has an
  unterminated or malformed quoted field, or a row's field count differs from
  the header.

Extra JSON keys or CSV columns beyond the required set are ignored.

## Incompatible options

`--set-metadata` owns the artist, album, track-number, and title fields, so it
rejects options that independently target the same fields:

- `--set-artist`
- `--set-album`
- `--album-strategy` (any value other than `no change`)
- `--reset-track`
- `--swap-artist-albumartist` (it rewrites `artist` from `albumartist`)

Album-artist and producer options remain compatible because they target
different fields: `--set-album-artist`, `--album-artists-strategy`, and
`--producer-strategy` may be combined with `--set-metadata`.

## JSON example

```json
[
  {
    "filename": "01 - iced earth.flac",
    "artist": "Iced Earth",
    "album": "Iced Earth",
    "trackNumber": 1,
    "title": "Iced Earth"
  },
  {
    "filename": "07 - funeral.flac",
    "artist": "Iced Earth",
    "album": "Iced Earth",
    "trackNumber": 7,
    "title": "Funeral"
  }
]
```

## CSV example

The CSV header must include the five required columns in any order. Fields may
be quoted; embedded quotes are escaped by doubling them (`""`), following
RFC 4180.

```csv
filename,artist,album,trackNumber,title
"01 - iced earth.flac",Iced Earth,Iced Earth,1,Iced Earth
"07 - funeral.flac",Iced Earth,Iced Earth,7,"Funeral, ""Part 1"""
```

The second row's title parses to `Funeral, "Part 1"`.
