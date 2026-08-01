---
name: album-organization
description: Audit, validate, repair, deduplicate, stage, and safely organize FLAC/MP3 albums with Harmonia Aquila through its CLI, REST API, GraphQL API, or MCP tool API. Use for album-sized batches, large music intake trees, mixed-quality duplicates, incomplete metadata, dry-run planning, and staged organization workflows.
---

# Album Organization

Preserve the original source tree. Move from read-only inspection to dry-run
planning, reversible staging, and only then explicit execution. Keep uncertain
duplicates in quarantine rather than deleting them.

## Establish the operating boundary

Work on one album-sized flat directory at a time. Album operations support
`.flac` and `.mp3`; subdirectories and sidecars are errors unless the operation
supports `ignoreNonAudioFiles` and it is deliberately enabled. Validation and
organization reject more than one normalized album per call and reject one
normalized album that maps to multiple normalized artist directories.

Before using a web API, determine the `--source-dir`, `--scratch-dir`, and
`--dest-dir` supplied to `web serve`. API paths are relative to those
server-controlled roots. Never infer a root or attempt traversal.

Choose the available interface and keep one workflow on that interface unless
its root semantics require a server restart:

| Operation | CLI | REST | GraphQL | MCP |
| --- | --- | --- | --- | --- |
| list | `manage-albums list` | `GET /manage-albums/list` | `albumList` | `manage_albums_list` |
| summarize | `manage-albums summarize-source-dir` | `GET /manage-albums/summarize-source-dir` | `albumSummarizeSourceDir` | `manage_albums_summarize_source_dir` |
| validate | `manage-albums validate` | `GET /manage-albums/validate` | `albumValidateSourceDir` | `manage_albums_validate` |
| fix tags | `manage-albums fix-tags` | `POST /manage-albums/fix-tags` | `albumFixTags` | `manage_albums_fix_tags` |
| organize | `manage-albums organize-files` | `POST /manage-albums/organize-files` | `albumOrganizeFiles` | `manage_albums_organize_files` |

## Respect interface-specific roots

Do not assume equal-looking inputs have equal behavior:

| Interface | Candidate selection | Tag-fix destination | Organization source and destination |
| --- | --- | --- | --- |
| CLI | explicit directory arguments | explicit `--dest-dir` | explicit source and destination |
| REST / GraphQL | summarize and validate accept a source-relative `dirName`; fix-tags always consumes the complete configured source root | configured scratch root | always consumes the complete source root; `useScratchDir: true` selects scratch as the **output**, otherwise output is the source root |
| MCP | list an album and pass its slash-terminated `albumDir`; validation may select source or scratch | configured scratch root | `useScratchDir: true` selects scratch as the **input**; output is always the configured destination root |

REST and GraphQL cannot directly organize the output of `fix-tags` in the same
server run. To continue through those APIs, restart `web serve` with the staged
flat directory as `--source-dir`, a separate empty directory as
`--scratch-dir`, and call organize with `useScratchDir: true`. Prefer CLI or MCP
when restarting is undesirable.

REST query booleans are `true`/`false` strings, and REST/GraphQL `limit` values
are strings. MCP inputs use native booleans and non-negative integers. MCP
`albumDir` and non-empty list `prefix` values must end in `/`; use `./` to
select files directly in a configured root.

## Run the safe workflow

1. List or otherwise select one candidate album directory.
2. Summarize every track. Inspect `album`, `grouping`, `originalalbum`,
   `artist`, `albumartist`, `title`, `subtitle`, `year`, bitrate, sample rate,
   label, and publisher. Use validation rows to inspect normalized track numbers
   and predicted destinations.
3. Reconcile duplicates before writes. Compare normalized track number and
   title, title/subtitle swaps, extension, bitrate, sample rate, and predicted
   destination. Usually retain complete FLAC over MP3 and higher-quality,
   better-tagged copies; quarantine ambiguous losers.
4. Validate with the same artist/title filename strategies intended for
   organization. Treat invalid rows, duplicate destinations, multiple albums,
   and multiple artists as blockers.
5. If tags need repair, dry-run tag fixing into a separate staging root. Review
   every proposed field and destination, then repeat with explicit execution.
6. Validate the staged directory. Do not organize merely because tag fixing
   succeeded.
7. Dry-run organization. Confirm the complete plan is collision-free and has
   the form `ArtistName/AlbumName/TrackNumber - Title.ext`.
8. Rerun the same plan with explicit execution. Keep summaries, validation
   rows, and dry-run rows as audit artifacts until human review is complete.

Never use `limit` for final validation or execution; it can hide conflicts.
Never use the original messy directory as a staging or organization
destination. Never use overwrite to evade duplicate or existing-album errors.

## CLI playbook

Prefer JSON output for auditability. Use the installed executable name or the
built repository entrypoint consistently.

```sh
harmonia-aquila manage-albums summarize-source-dir \
  --dir-name "$SOURCE_DIR" --format json

harmonia-aquila manage-albums validate \
  --dir-name "$SOURCE_DIR" \
  --artist-filename-strategy artist \
  --title-filename-strategy title \
  --format json

harmonia-aquila manage-albums fix-tags \
  --source-dir "$SOURCE_DIR" --dest-dir "$TAGGED_STAGE_DIR" \
  --album-strategy grouping --format json
# Repeat only after review, adding --execute.

harmonia-aquila manage-albums validate \
  --dir-name "$TAGGED_STAGE_DIR" --format json

harmonia-aquila manage-albums organize-files \
  --source-dir "$TAGGED_STAGE_DIR" --dest-dir "$ORGANIZED_DIR" \
  --artist-filename-strategy artist \
  --title-filename-strategy title \
  --format json
# Repeat only after review, adding --execute.
```

Use `manage-albums list --source-dir ROOT --prefix "path/" --format json` to
discover immediate entries when navigating a large tree.

## REST playbook

Configure `web serve --source-dir` to the exact flat candidate before fix-tags
or organization. Example read-only requests:

```sh
curl --get "$BASE_URL/manage-albums/summarize-source-dir" \
  --data-urlencode 'dirName=.' \
  --data-urlencode 'ignoreNonAudioFiles=false'

curl --get "$BASE_URL/manage-albums/validate" \
  --data-urlencode 'dirName=.' \
  --data-urlencode 'artistFilenameStrategy=artist' \
  --data-urlencode 'titleFilenameStrategy=title'
```

Dry-run tag repair with a JSON body and omit `execute`:

```sh
curl -X POST "$BASE_URL/manage-albums/fix-tags" \
  -H 'Content-Type: application/json' \
  -d '{"albumStrategy":"grouping"}'
```

After reviewing, repeat with `"execute":true`. Restart the server with that
staging directory as the source and a separate organized-output directory as
scratch; then dry-run organization with:

```sh
curl -X POST "$BASE_URL/manage-albums/organize-files" \
  -H 'Content-Type: application/json' \
  -d '{"artistFilenameStrategy":"artist","titleFilenameStrategy":"title","useScratchDir":true}'
```

Repeat with `"execute":true` only after reviewing the returned rows. REST
returns user-input failures as HTTP 400.

## GraphQL playbook

Use `POST /graphql`. Request the fields needed to assess the plan; omitted
fields are not returned.

```graphql
query AuditAlbum {
  albumSummarizeSourceDir(input: { dirName: "." }) {
    filename album artist albumartist title grouping bitrate sampleRate
  }
  albumValidateSourceDir(input: { dirName: "." }) {
    filename status issues destination
  }
}

mutation DryRunFix {
  albumFixTags(input: { albumStrategy: "grouping" }) {
    album artist title newAlbum
  }
}

mutation DryRunOrganize {
  albumOrganizeFiles(input: {
    artistFilenameStrategy: "artist"
    titleFilenameStrategy: "title"
    useScratchDir: true
  }) {
    action filename destination
  }
}
```

Use the same restart sequence as REST between fix-tags and organization. Add
`execute: true` only after review. Treat GraphQL errors with
`extensions.code: BAD_USER_INPUT` as blockers.

## MCP playbook

Prefer MCP for a single server run with per-album source selection:

1. Call `manage_albums_list` with `{ "prefix": "" }`; descend with returned
   slash-terminated directory prefixes.
2. Call `manage_albums_summarize_source_dir` with the selected relative
   `dirName`.
3. Call `manage_albums_validate` with that `dirName` and intended strategies.
4. Call `manage_albums_fix_tags` with the returned `albumDir` and repair
   options. Omit `execute`, review parsed JSON from `content[0].text`, then
   repeat with `execute: true`.
5. Call `manage_albums_list` with `{ "useScratchDir": true }` to inspect the
   staged files. Fix-tags writes them directly into the scratch root, so
   validate with `{ "dirName": ".", "useScratchDir": true }`.
6. Call `manage_albums_organize_files` with
   `{ "albumDir": "./", "useScratchDir": true }` plus the intended filename
   strategies. Omit `execute`, review, then repeat with `execute: true`.

MCP success content is a JSON string in `content[0].text`, not
`structuredContent`; parse it before evaluating rows. Treat tool-error content
as failure, including path, schema, duplicate, multiple-album, and
multiple-artist errors.

## Choose repair and filename strategies deliberately

- Use album strategy `grouping` or `originalalbum` only when that field is the
  verified canonical album name; otherwise use `setAlbum` or leave unchanged.
- Use album-artists strategy `aggregate` to derive album artists from tracks,
  or `setAlbumArtist` for a known value. Do not combine either with an
  incompatible artist/albumartist swap.
- Use producer strategy `aggregate` or `copy-from-album-artists` only when the
  collection convention requires it.
- Use artist filename strategy `albumartist` for compilations with reliable
  album-artist tags; use `label` or `producer` only for intentionally
  label-/producer-organized catalogs.
- Use title filename strategy `subtitle` only when subtitle holds the intended
  filename title.
- Keep destination strategy `error`. `ignore` and `overwrite` are tag-staging
  rerun controls, not duplicate-resolution tools.

The outcome is one selected copy of every track, a reviewed and reproducible
metadata repair plan, valid staged metadata, and a collision-free organized
album whose final dry run matches the executed plan.
