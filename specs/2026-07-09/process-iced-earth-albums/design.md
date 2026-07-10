# Design: process Iced Earth albums

## Inputs and outputs

- Source root: `etc/1-source-files/Iced.Earth.-.The.Whole.Discography.(1991-2008).(22CDs).[EAC-FLAC-APE].by.Calimeero`
- Destination root: `etc/3-organized-files`
- Processing run: `reports/album-organization-audit/2026-07-09-iced-earth-processing/<run-id>/`
- Workflow inventory: `candidate-summary.json` and `executable-workflows.md`

The source package contains artwork and other sidecars, while `fix-tags` accepts only a flat directory of FLAC or MP3 files. Each workflow therefore copies its source FLAC files to `audio-only/<workflow-id>/`, uses `fix-tags` to write to `fixed-tags/<workflow-id>/`, and organizes only that fixed staging directory. Nothing writes to the source package.

## Tag repair and organization

The source FLAC files carry no `title` and no `trackNumber`, so a plain
`--set-artist`/`--set-album`/`--reset-track` pass would still leave
`organize-files` without titles to build `NN - Title.flac` names. Instead, every
workflow is driven by its versioned metadata manifest under
`specs/2026-07-09/process-iced-earth-albums/metadata/<workflow-id>.csv`, which
supplies the complete `artist`, `album`, `trackNumber`, and `title` for each
staged file. This resolves the previous missing-title organization blocker.

Each manifest is the committed source of truth. During a dated processing run,
copy the workflow manifest into the run for auditability and pass it to
`fix-tags`:

```sh
mkdir -p "$RUN/metadata"
cp "specs/2026-07-09/process-iced-earth-albums/metadata/$WORKFLOW_ID.csv" \
  "$RUN/metadata/$WORKFLOW_ID.csv"
```

For every workflow, first run and save the JSON dry-run output:

```sh
node build/dist/index.js fix-tags \
  --source-dir "$RUN/audio-only/$WORKFLOW_ID" \
  --dest-dir "$RUN/fixed-tags/$WORKFLOW_ID" \
  --set-metadata "$RUN/metadata/$WORKFLOW_ID.csv" \
  --format json
```

The manifest's bare `filename` values are the mapping key against the flat
`audio-only/$WORKFLOW_ID/` directory; `fix-tags` fails the whole run if any
manifest filename is unknown or any source file lacks a record. Do not combine
`--set-metadata` with `--set-artist`, `--set-album`, or `--reset-track`: the
command rejects them because `--set-metadata` already owns artist, album,
track-number, and title. After reviewing the planned `newArtists`, `newAlbum`,
`newTrackNumber`, and `newTitle` values, repeat with `--execute`.

Then dry-run, review, and execute:

```sh
node build/dist/index.js organize-files \
  --source-dir "$RUN/fixed-tags/$WORKFLOW_ID" \
  --dest-dir etc/3-organized-files \
  --artist-filename-strategy artist \
  --format json
```

Do not use overwrite behavior. Any existing destination or predicted filename collision blocks that workflow.

## Metadata manifests

The 21 manifests live in `specs/2026-07-09/process-iced-earth-albums/metadata/`,
one CSV per workflow, following `docs/fix-tags-set-metadata.md`. Every CSV uses
the header `filename,artist,album,trackNumber,title`; `artist` is always
`Iced Earth`; `album` exactly matches the workflow final album; `trackNumber` is
the leading two-digit filename ordinal; and `title` is a cautious, consistent
title-cased rendering of the remaining filename stem (casing only — no invented
punctuation). Example (`metadata/iced-earth-1991.csv`):

```csv
filename,artist,album,trackNumber,title
01 - iced earth.flac,Iced Earth,Iced Earth,1,Iced Earth
07 - funeral.flac,Iced Earth,Iced Earth,7,Funeral
```

Together the manifests contain 197 records that exactly cover the 197 source
FLAC files.

## Multi-disc policy

`fix-tags` is non-recursive and each manifest supplies its own per-file track
numbers and disc-specific album. Combining discs into one flat input would
collide on filenames such as `01 - ...flac` or lose disc boundaries. Days of
Purgatory, Alive in Athens, Dark Genesis, and The Glorious Burden are therefore
separate workflow inputs, manifests, and final folders. The `Dark Genesis`
box-set discs use `Dark Genesis - <disc title> (Disc N)` to avoid colliding with
earlier standalone album folders.

## Artwork policy

Each executable workflow has one selected front image in `executable-workflows.md`. Copy it only after the corresponding audio workflow succeeds:

```sh
test ! -e "etc/3-organized-files/Iced Earth/$ALBUM_NAME/cover.jpg"
install -m 0644 "$ARTWORK_SOURCE" \
  "etc/3-organized-files/Iced Earth/$ALBUM_NAME/cover.jpg"
```

An existing `cover.jpg` is a destination collision, including if it is byte-identical; do not replace it in this workflow. For multi-disc releases, use disc-specific `Front (N-M).jpg` where available; otherwise copy the shared front image to every disc folder. Do not copy artwork for the blocked releases (the corrupted Dark Saga source and the APE image); The Dark Saga's artwork copy is deferred until its source is repaired and it organizes successfully.

## Blocked releases

`1996 - The Dark Saga [EAC-FLAC]/02 - i died for you.flac` has a corrupted FLAC
header: reading it with the CLI's tag library fails with `FLAC header not found
after any starting tags`. Because `fix-tags` scans the whole flat source
directory, the entire Dark Saga workflow is blocked until that source file is
repaired or re-ripped. Its manifest (`metadata/the-dark-saga.csv`) is still
produced and validated independently of the audio (the manifest maps the ten
expected filenames), and can be applied with `--set-metadata` once the corrupted
file is fixed. Do not repair the audio in this spec.

`2008 - The Crucible of Man [EAC-APE]/CDImage.ape` and its cue sheet are
unsupported: Harmonia Aquila only accepts `.flac` and `.mp3`, and the image is
not split into tracks. A separate, explicit workflow must losslessly transcode
and split it before it can enter this process.
