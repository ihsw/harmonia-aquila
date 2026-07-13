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

`Performer` and `Title` must exactly match the embedded M4B metadata fields.
For example, embedded performer `Thomas Sowell` and title
`Basic Economics, 5th Edition` require:

```text
Thomas Sowell - Basic Economics, 5th Edition.m4b
```

Use `manage-audiobooks` for all audiobook operations. The validator reads the
embedded metadata, rejects non-M4B files, rejects missing performer or title
metadata, and rejects filename mismatches.

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

- Never treat `.mp3`, `.m4a`, `.flac`, or any other extension as an audiobook
  input for this workflow.
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
