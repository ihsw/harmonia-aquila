# Design: process Iced Earth albums

## Inputs and outputs

- Source root: `etc/1-source-files/Iced.Earth.-.The.Whole.Discography.(1991-2008).(22CDs).[EAC-FLAC-APE].by.Calimeero`
- Destination root: `etc/3-organized-files`
- Processing run: `reports/album-organization-audit/2026-07-09-iced-earth-processing/<run-id>/`
- Workflow inventory: `candidate-summary.json` and `executable-workflows.md`

The source package contains artwork and other sidecars, while `fix-tags` accepts only a flat directory of FLAC or MP3 files. Each workflow therefore copies its source FLAC files to `audio-only/<workflow-id>/`, uses `fix-tags` to write to `fixed-tags/<workflow-id>/`, and organizes only that fixed staging directory. Nothing writes to the source package.

## Tag repair and organization

For every workflow, first run and save the JSON dry-run output:

```sh
node build/dist/index.js fix-tags \
  --source-dir "$RUN/audio-only/$WORKFLOW_ID" \
  --dest-dir "$RUN/fixed-tags/$WORKFLOW_ID" \
  --set-artist "Iced Earth" \
  --set-album "$ALBUM_NAME" \
  --reset-track \
  --format json
```

After reviewing the planned `newAlbum`, `newArtists`, and `newTrackNumber` values, repeat with `--execute`. This deliberately normalizes artist, album, and sequential track numbers from each flat staged input's alphabetical filenames.

Then dry-run, review, and execute:

```sh
node build/dist/index.js organize-files \
  --source-dir "$RUN/fixed-tags/$WORKFLOW_ID" \
  --dest-dir etc/3-organized-files \
  --artist-filename-strategy artist \
  --format json
```

Do not use overwrite behavior. Any existing destination or predicted filename collision blocks that workflow.

## Multi-disc policy

`fix-tags` is non-recursive and `--reset-track` orders a flat input by filename. Combining discs would either collide on filenames such as `01 - ...flac` or lose disc boundaries. Days of Purgatory, Alive in Athens, Dark Genesis, and The Glorious Burden are therefore separate workflow inputs and final folders. The `Dark Genesis` box-set discs use `Dark Genesis - <disc title> (Disc N)` to avoid colliding with earlier standalone album folders.

## Artwork policy

Each executable workflow has one selected front image in `executable-workflows.md`. Copy it only after the corresponding audio workflow succeeds:

```sh
test ! -e "etc/3-organized-files/Iced Earth/$ALBUM_NAME/cover.jpg"
install -m 0644 "$ARTWORK_SOURCE" \
  "etc/3-organized-files/Iced Earth/$ALBUM_NAME/cover.jpg"
```

An existing `cover.jpg` is a destination collision, including if it is byte-identical; do not replace it in this workflow. For multi-disc releases, use disc-specific `Front (N-M).jpg` where available; otherwise copy the shared front image to every disc folder. Do not copy the artwork for the blocked APE release.

## Blocked release

`2008 - The Crucible of Man [EAC-APE]/CDImage.ape` and its cue sheet are unsupported: Harmonia Aquila only accepts `.flac` and `.mp3`, and the image is not split into tracks. A separate, explicit workflow must losslessly transcode and split it before it can enter this process.
