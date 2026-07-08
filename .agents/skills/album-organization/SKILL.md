---
name: album-organization
description: Use Harmonia Aquila to audit, normalize, deduplicate, and safely organize large local album folders containing mixed-quality FLAC/MP3 files.
---

# Album Organization

Use this skill when cleaning up a large local music collection or intake folder where albums may be incomplete, inconsistently tagged, mixed between FLAC and MP3, duplicated across folders, or duplicated within an album.

The intent is to move cautiously from analysis to reversible staging to final copy. Preserve the original source tree until the organized destination has been reviewed.

## Mental model

Harmonia Aquila works on one flat source directory at a time and supports `.flac` and `.mp3` files. The source directory for each command must contain only supported audio files, not subdirectories, artwork, cue sheets, logs, or other sidecar files. For a very large messy collection, first break the work into album-sized or candidate-album batches, then run the commands below on each batch.

Prefer JSON output for large collections because it can be saved, diffed, queried, and checked for duplicate songs before anything is copied or changed.

## Core commands

### Inspect a candidate album folder

```sh
harmonia-aquila summarize-source-dir --dir-name "$SOURCE_DIR" --format json
```

Use this before copying or fixing tags. Review:

- `album`, `grouping`, `artist`, and `albumartist` for inconsistent album identity.
- `title`, `subtitle`, and `year` for missing or conflicting track names.
- `bitrate`, `sampleRate`, and file extension to compare quality when duplicates exist.
- `label`, `publisher`, and `grouping` when the artist metadata is unreliable or compilation-like.

For very large batches, use `--limit <count>` during initial probing, then rerun without a limit for the final audit.

### Normalize album tags into a clean staging destination

```sh
harmonia-aquila fix-tags \
  --source-dir "$SOURCE_DIR" \
  --dest-dir "$TAGGED_STAGE_DIR" \
  --album-strategy grouping \
  --album-artists-strategy aggregate \
  --producer-strategy aggregate \
  --format json
```

Run without `--execute` first. The dry run shows intended metadata changes without copying or writing tags. Add `--execute` only after the JSON output looks correct.

Useful strategies:

- `--album-strategy grouping` treats `grouping` as the canonical album name.
- `--album-artists-strategy aggregate` builds album artists from the tracks in the same grouping.
- `--producer-strategy aggregate` builds producer metadata from the tracks in the same grouping.
- `--producer-strategy copy-from-album-artists` can be useful when producer metadata should mirror album artists.
- `--swap-artist-albumartist` is for folders where artist and albumartist were reversed; do not combine it with `--album-artists-strategy`.
- `--destination-strategy error` is the safest default; use `ignore` or `overwrite` only when rerunning a known staging operation.

### Organize clean files into the final folder structure

```sh
harmonia-aquila organize-files \
  --source-dir "$TAGGED_STAGE_DIR" \
  --dest-dir "$ORGANIZED_DIR" \
  --artist-filename-strategy artist \
  --title-filename-strategy title \
  --format json
```

Run without `--execute` first. The command plans copies into:

```text
ArtistName/AlbumName/TrackNumber - Title.ext
```

It fails rather than silently overwriting if two files resolve to the same destination. Treat that as a duplicate-song signal: inspect the duplicate tracks, choose the best source, remove or quarantine the loser from the staging input, and rerun.

Useful filename strategies:

- `--artist-filename-strategy albumartist` for albums with reliable album artist tags.
- `--artist-filename-strategy label` or `producer` for label catalogs, DJ sets, production libraries, or folders where performer metadata is noisy.
- `--title-filename-strategy subtitle` when the actual track title is stored in subtitle.

Add `--execute` only after the planned destinations are collision-free and human-readable.

## Large-folder cleanup workflow

1. Create working directories outside the original source, for example `audit/`, `tagged-stage/`, `organized/`, and `quarantine/`.
2. Split the large folder into candidate album folders that contain only `.flac` and `.mp3` files.
3. Run `summarize-source-dir --format json` for each candidate and save the output with the batch name.
4. Identify duplicates before copying:
   - Same normalized `trackNumber` plus same or similar `title`.
   - Same `title` with different extension, bitrate, or sample rate.
   - Same song appearing under `title` in one file and `subtitle` in another.
   - Same destination predicted by `organize-files`.
5. Prefer the highest-quality complete copy when duplicates conflict. Usually prefer FLAC over MP3, higher bitrate over lower bitrate, and complete metadata over blank metadata.
6. Quarantine uncertain duplicates instead of deleting them.
7. Use `fix-tags` into a staging directory to normalize album-level metadata.
8. Use `organize-files` from staging into the final organized directory.
9. Keep command JSON outputs as audit artifacts until the organized library has been reviewed.

## Safety rules

- Never run `--execute` on the first pass.
- Never use the original messy folder as the destination.
- Resolve duplicate destination errors deliberately; do not work around them with overwrite behavior.
- Preserve excluded or suspicious files in quarantine until a human review is complete.
- If metadata is too incomplete for `organize-files`, repair tags first rather than inventing filenames from partial data.

## Expected outcome

The final library should contain one chosen copy of each album track, organized by artist and album, with album-level metadata normalized enough that rerunning the dry-run commands produces predictable, collision-free output.
