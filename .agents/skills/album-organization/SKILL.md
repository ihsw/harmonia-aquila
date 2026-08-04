---
name: album-organization
description: Audit, validate, repair metadata, deduplicate, and safely organize FLAC/MP3 albums with Harmonia Aquila through its CLI, REST API, GraphQL API, or MCP tool API. Use for album-sized batches, large music intake trees, mixed-quality duplicates, incomplete metadata, combined metadata-and-folder dry runs, and reviewed organization execution.
---

# Album Organization

Preserve the source tree. Use `organize-files` to plan metadata repairs and the
resulting folder layout together, then execute that exact reviewed plan. Do not
stage repaired files or call a separate tag-fixing operation.

## Establish the boundary

Work on one album-sized flat directory at a time. Album audio supports `.flac`
and `.mp3`. During organization, direct regular `.avif`, `.bmp`, `.gif`,
`.jpeg`, `.jpg`, `.png`, `.tif`, `.tiff`, and `.webp` files are treated as
album art. Reject other sidecars, subdirectories, and symlinks unless
`ignoreNonAudioFiles` is deliberately enabled. Keep ambiguous duplicates in
quarantine rather than deleting them.

Before using a web API, determine the `--source-dir` and `--dest-dir` supplied
to `web serve`. API paths are relative to those configured roots. Never infer a
root, pass a host path, or attempt traversal.

Choose one interface for the workflow:

| Operation | CLI | REST | GraphQL | MCP |
| --- | --- | --- | --- | --- |
| list | `manage-albums list` | `GET /manage-albums/list` | `albumList` | `manage_albums_list` |
| summarize | `manage-albums summarize-source-dir` | `GET /manage-albums/summarize-source-dir` | `albumSummarizeSourceDir` | `manage_albums_summarize_source_dir` |
| validate | `manage-albums validate` | `GET /manage-albums/validate` | `albumValidateSourceDir` | `manage_albums_validate` |
| repair and organize | `manage-albums organize-files` | `POST /manage-albums/organize-files` | `albumOrganizeFiles` | `manage_albums_organize_files` |

## Respect root semantics

| Interface | Input selection | Organized output |
| --- | --- | --- |
| CLI | explicit flat `--source-dir` | explicit `--dest-dir` |
| REST / GraphQL | complete configured source root | configured destination root |
| MCP | slash-terminated `albumDir` under source | configured destination root |

For REST or GraphQL, start `web serve` with the exact flat candidate as its
source root and a separate destination root. For MCP, discover `albumDir` with
`manage_albums_list`; use `./` for files directly in a configured root.

REST query booleans are `true`/`false` strings, and REST/GraphQL `limit` values
are strings. MCP uses native booleans and non-negative integers. MCP
`albumDir` and non-empty list prefixes must end in `/`.

## Use the combined workflow

1. List and select one flat candidate directory.
2. Summarize every track. Inspect album, grouping, original album, artist,
   album artist, title, subtitle, track/disc numbers, year, quality, label,
   publisher, and producer metadata.
3. Reconcile duplicates before writes. Compare normalized disc/track and title,
   title/subtitle swaps, extension, bitrate, sample rate, and likely
   destination. Prefer a complete, better-tagged lossless copy; quarantine
   uncertain alternatives.
4. Run baseline validation with the filename strategies intended for the final
   layout. Use it to identify missing metadata, disc-set issues, duplicate
   destinations, and normalization conflicts. A repairable baseline failure is
   input to the combined plan, not permission to bypass validation.
5. Dry-run `organize-files` once with every required repair and filename option.
   It parses each source once, projects the repaired metadata, and plans the
   final destination from that effective metadata without writing.
6. Review every row. Confirm `fileType`, action, and destination. For `audio`
   rows, also confirm `tagChanges`, effective album/artist/track/disc fields,
   and filename strategies. For `albumArt` rows, confirm each recognized source
   image appears once at the effective album root, never under `Disc DD`.
7. Repeat the identical request with only `execute`/`--execute` added. Execution
   repairs a temporary copy, verifies it, and publishes it at the organized
   destination. Images are staged and published without metadata writes. It
   never changes source audio or images.
8. Retain the dry-run and execution rows as audit evidence and require parity
   apart from the action changing from `would copy` to `copied`.

Never use `limit` for final validation or execution because it can hide
conflicts. The limit selects audio only; art is planned only when at least one
audio row survives. Keep `destinationStrategy` at `error` unless the user has reviewed
the exact destination file. `ignore` and `overwrite` apply only to exact files;
they are not duplicate-resolution or album-directory cleanup tools.

## Choose metadata options deliberately

- Use `albumStrategy: grouping` or `originalalbum` only after verifying that
  field is canonical; otherwise use `setAlbum` or leave album unchanged.
- Use `albumArtistsStrategy: aggregate` to derive album artists from the
  selected tracks, or `setAlbumArtist` for a known value. Do not combine these
  with incompatible swap options.
- Use `setArtist` for a known uniform track artist. Use
  `swapArtistAlbumartist` only after inspecting every source row.
- Disc metadata may be absent when selected track numbers are unique. Repeated
  track numbers without effective disc numbers are a blocker; do not treat
  distinct titles as a substitute for disc identity. The organization error
  groups duplicate tracks: use a CLI `setMetadata` JSON/CSV path or complete
  inline REST/GraphQL/MCP records for incorrect numbering; use explicit
  inference only for real discs.
- Use `discStrategy: infer` only when filename order and track-number resets
  reliably define disc boundaries. It is never automatic. Review every
  proposed disc number, total, metadata change, and `Disc DD` destination.
- Use `resetTrack` only when alphabetical source order is the intended album
  order.
- Use `producerStrategy: aggregate` or `copy-from-album-artists` only when the
  catalog convention requires it.
- Use artist filename strategy `albumartist` for compilations with reliable
  album-artist tags. Use `label` or `producer` only for intentionally organized
  catalogs.
- Use title filename strategy `subtitle` only when subtitle contains the
  intended filename title.
- Use `setMetadata` when each track needs an explicit artist, album, track,
  title, or disc value. The CLI accepts a JSON/CSV path; REST, GraphQL, and MCP
  accept the complete record array inline. Read
  [the set-metadata contract](../../../docs/organize-files-set-metadata.md)
  before constructing the JSON or CSV file.

## CLI playbook

Prefer JSON output so the plan can be compared mechanically.

```sh
harmonia-aquila manage-albums summarize-source-dir \
  --dir-name "$SOURCE_DIR" --format json

harmonia-aquila manage-albums validate \
  --dir-name "$SOURCE_DIR" \
  --artist-filename-strategy albumartist \
  --title-filename-strategy title \
  --format json

harmonia-aquila manage-albums organize-files \
  --source-dir "$SOURCE_DIR" --dest-dir "$ORGANIZED_DIR" \
  --set-album "Canonical Album" \
  --set-album-artist "Various Artists" \
  --artist-filename-strategy albumartist \
  --title-filename-strategy title \
  --format json
# Review every row, then repeat the same command with --execute.
```

Use `manage-albums list --source-dir ROOT --prefix "path/" --format json` to
navigate a large tree.

## REST playbook

Configure the exact candidate as the server source root. Summarize and validate
with GET requests, then send all repair and layout options in one dry-run POST:

```sh
curl -X POST "$BASE_URL/manage-albums/organize-files" \
  -H 'Content-Type: application/json' \
  -d '{
    "setAlbum":"Canonical Album",
    "setAlbumArtist":"Various Artists",
    "artistFilenameStrategy":"albumartist",
    "titleFilenameStrategy":"title"
  }'
# Review, then repeat the same body with "execute":true.
```

REST returns user-input failures as HTTP 400. Do not send configured root
overrides in request bodies.

For whole-album repairs, send `setMetadata` as a non-empty JSON record array;
never send a server-host manifest path.

## GraphQL playbook

Request both organization fields and nested metadata changes:

```graphql
mutation DryRunOrganize {
  albumOrganizeFiles(input: {
    setAlbum: "Canonical Album"
    setAlbumArtist: "Various Artists"
    artistFilenameStrategy: "albumartist"
    titleFilenameStrategy: "title"
  }) {
    action
    fileType
    filename
    album
    artistFilename
    destination
    tagChanges { newAlbum newAlbumArtists newDiscNumber newDiscTotal }
  }
}
```

Repeat with `execute: true` only after review. Treat GraphQL errors with
`extensions.code: BAD_USER_INPUT` as blockers.

GraphQL `setMetadata` is the typed equivalent of the REST record array, not a
filepath string.

## MCP playbook

1. Call `manage_albums_list` and descend through slash-terminated prefixes.
2. Call `manage_albums_summarize_source_dir` for the selected `dirName`.
3. Call `manage_albums_validate` with that `dirName` and intended filename
   strategies.
4. Call `manage_albums_organize_files` with the selected `albumDir`, every
   required repair option, and the intended filename strategies. Omit
   `execute`, parse and review the JSON rows in `content[0].text`, then repeat
   the identical input with `execute: true`.

When explicit per-file repair is required, include one inline `setMetadata`
record for every selected audio file. MCP does not read metadata manifest
paths.

MCP always reads selected albums from the configured source root and publishes
organized output under the configured destination root. Treat tool-error
content as failure, including path, schema, metadata conflict, duplicate,
collision, and multiple-album/artist errors.

The desired outcome is one reviewed operation that produces one selected copy
of every track and recognized adjacent image, applies approved metadata repairs
only to destination audio copies, and publishes collision-free audio plus album
art whose execution matches its dry run.
