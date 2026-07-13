---
name: audiobook-organization
description: Use Harmonia Aquila to safely audit and organize M4B audiobook files whose filenames must match embedded performer and title metadata.
---

# Audiobook Organization

Use this skill when reviewing, renaming, staging, or organizing local
audiobooks. It applies only to `.m4b` files and requires every audiobook to
pass Harmonia Aquila validation before it is moved, renamed, or accepted into
an organized library.

## Mental model

An audiobook is valid only when it is an M4B file whose exact filename follows:

```text
Performer - Title.m4b
```

`Performer` must exactly match the embedded artist. `Title` uses the embedded
album when present and otherwise falls back to the embedded title.
For example, embedded performer `Thomas Sowell` and title
`Basic Economics, 5th Edition` require:

```text
Thomas Sowell - Basic Economics, 5th Edition.m4b
```

Use `manage-audiobooks` for all audiobook operations. The validator reads the
embedded metadata, rejects non-M4B files, rejects missing performer or title
metadata, and rejects filename mismatches.

## Merge M4B or MP3 source groups into M4B

Use `merge` when a source tree contains M4B or MP3 audiobook tracks. It groups
tracks within the same source directory by their embedded `artist` and
album-first title metadata, merges each group through `m4b-tool`, and writes:

```text
Performer - Album.m4b
```

The command sets the output M4B's performer and title to these values, then
validates that the filename exactly matches its metadata. It rejects M4B and
MP3 files without both fields rather than inferring a name from a directory or
filename.

Plan the merge before writing any files:

```sh
harmonia-aquila manage-audiobooks merge \
  --source-dir "$AUDIOBOOK_SOURCE_DIR" \
  --dest-dir "$M4B_STAGE_DIR" \
  --jobs 16 \
  --format json
```

After reviewing the proposed destinations and resolving any missing-metadata or
destination-collision errors, execute the merge:

```sh
harmonia-aquila manage-audiobooks merge \
  --source-dir "$AUDIOBOOK_SOURCE_DIR" \
  --dest-dir "$M4B_STAGE_DIR" \
  --jobs 16 \
  --execute \
  --format json
```

The source directory is mounted read-only inside the `m4b-tool` Docker
container. `--jobs` is passed to `m4b-tool merge` and defaults to `16`. Merging
requires Docker and pulls
`sandreas/m4b-tool:latest` when the image is unavailable locally.

## Convert one audiobook file into M4B

Use `convert-file` for one or more standalone audiobook files, usually MP3s.
Repeat `--file-name` for each source. The command reads the embedded `artist`
and `album` tags, then produces and validates:

```text
Performer - Album.m4b
```

Plan the conversion before writing:

```sh
harmonia-aquila manage-audiobooks convert-file \
  --file-name "$AUDIOBOOK_FILE_1" \
  --file-name "$AUDIOBOOK_FILE_2" \
  --dest-dir "$M4B_STAGE_DIR" \
  --jobs 16 \
  --concurrency 4 \
  --format json
```

After reviewing its metadata-derived filename, add `--execute`:

```sh
harmonia-aquila manage-audiobooks convert-file \
  --file-name "$AUDIOBOOK_FILE_1" \
  --file-name "$AUDIOBOOK_FILE_2" \
  --dest-dir "$M4B_STAGE_DIR" \
  --jobs 16 \
  --concurrency 4 \
  --execute \
  --format json
```

`--jobs` defaults to `16` for each `m4b-tool` process. `--concurrency` defaults
to `4` and limits simultaneous file conversions. Source files are mounted
read-only and remain unchanged. The command rejects sources without an embedded
artist and album, duplicate metadata-derived destinations, and existing
destinations.

## Validate one audiobook

```sh
harmonia-aquila manage-audiobooks validate \
  --file-name "$AUDIOBOOK_FILE" \
  --format json
```

A successful JSON result contains `filename`, `performer`, `title`, and
`"valid": true`. Treat any non-zero exit as a blocked audiobook; do not rename
or move it until the metadata or filename discrepancy is deliberately
resolved.

## Copy a metadata-derived filename

For an M4B with complete metadata but an invalid filename, plan a copy into a
separate staging directory:

```sh
harmonia-aquila manage-audiobooks copy-and-rename \
  --file-name "$AUDIOBOOK_FILE" \
  --dest-dir "$STAGING_DIR" \
  --format json
```

The dry run reports the destination `Performer - Title.m4b` name. Add
`--execute` only after reviewing it:

```sh
harmonia-aquila manage-audiobooks copy-and-rename \
  --file-name "$AUDIOBOOK_FILE" \
  --dest-dir "$STAGING_DIR" \
  --execute \
  --format json
```

This command refuses source files that already have a valid filename and
refuses to overwrite an existing destination. It always preserves the source
file.

## Batch validation workflow

1. Preserve the original audiobook tree as read-only and create separate
   `audit/`, `staging/`, `organized/`, and `quarantine/` directories.
2. Identify candidate files and exclude every file whose extension is not
   `.m4b`.
3. Run `harmonia-aquila manage-audiobooks validate --file-name <candidate>
   --format json` once per candidate, saving each result with the audiobook
   name.
4. For each failure, determine whether the filename, performer metadata, or
   title metadata is wrong. Do not infer or invent missing metadata.
5. Quarantine uncertain, corrupt, or non-M4B files rather than deleting them.
6. Move or rename only files with a saved successful validation result, and
   preserve the original until the destination has been reviewed.

## Safety rules

- Outside the explicit `merge` and `convert-file` workflows, never treat
  `.mp3`, `.m4a`, `.flac`, or any non-M4B extension as an audiobook input.
- Never rename or move an audiobook before validation succeeds.
- Never use a filename that only approximately matches metadata; capitalization,
  punctuation, spacing, performer, and title must all match exactly.
- Never overwrite an existing destination; treat that as a duplicate or
  naming-conflict investigation.
- Preserve the original source and validation JSON artifacts until a human has
  reviewed the organized destination.

## Expected outcome

The organized library contains only validated `.m4b` audiobook files. Every
accepted filename exactly matches its embedded `Performer - Title` metadata,
and every excluded file remains available for review in the source or
quarantine tree.
