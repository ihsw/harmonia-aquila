# `organize-files --set-metadata`

`manage-albums organize-files --set-metadata <path>` applies whole-album,
per-track metadata before publishing files at their organized destinations.
The JSON/CSV record's `filename` is matched exactly against the selected flat
source directory.

```sh
npm run build
./build/dist/index.js manage-albums organize-files \
  --source-dir "$SOURCE_DIR" \
  --dest-dir "$DEST_DIR" \
  --set-metadata album-metadata.json \
  --format json
./build/dist/index.js manage-albums organize-files \
  --source-dir "$SOURCE_DIR" \
  --dest-dir "$DEST_DIR" \
  --set-metadata album-metadata.json \
  --execute
```

Always review the dry run first. Organization fields use the proposed metadata
and `tagChanges` reports current values alongside `newArtists`, `newAlbum`,
`newTitle`, `newTrackNumber`, `newDiscNumber`, and `newDiscTotal`. Execution
repairs a temporary copy before publishing it; source files are never changed.

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

Every selected source file requires exactly one record. Unknown files,
duplicates, missing coverage, invalid extensions, paths, empty required values,
invalid integers, and malformed JSON/CSV fail before any file is written.

## Incompatible options

Because `--set-metadata` owns artist, album, track, title, and optional disc
fields, it conflicts with `--set-artist`, `--set-album`, non-default
`--album-strategy`, `--reset-track`, and `--swap-artist-albumartist`.
`--disc-strategy infer` also conflicts when records contain disc fields.
Album-artist and producer options remain compatible.

## JSON example

```json
[
  {
    "filename": "01 - song.flac",
    "artist": "Artist",
    "album": "Album",
    "trackNumber": 1,
    "discNumber": 1,
    "discTotal": 2,
    "title": "Song"
  }
]
```

## CSV example

```csv
filename,artist,album,trackNumber,title,discNumber,discTotal
"01 - song.flac",Artist,Album,1,Song,1,2
```

CSV follows RFC 4180 quoting. Extra JSON keys or CSV columns are ignored.
