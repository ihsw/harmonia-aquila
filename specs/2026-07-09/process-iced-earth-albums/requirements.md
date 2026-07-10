# Requirements: process Iced Earth albums

Generated: 2026-07-09

## Scope

Create a safe, staged plan to organize the Iced Earth FLAC albums in `etc/1-source-files/Iced.Earth.-.The.Whole.Discography.(1991-2008).(22CDs).[EAC-FLAC-APE].by.Calimeero` into `etc/3-organized-files/Iced Earth`, normalize each processed input with `fix-tags`, and copy selected cover artwork into each resulting album folder.

The source FLAC files carry no per-track `title` and no `trackNumber` (every source track reads `title=undefined`, `track=0`). Setting only artist/album/track is therefore insufficient: `organize-files` cannot derive `NN - Title.flac` names without titles. This spec resolves that previous missing-title organization blocker by driving `fix-tags` from a per-workflow metadata manifest that supplies the complete artist, album, track number, and title for every staged file.

## Functional requirements

1. The source package MUST remain read-only. All audio-tag changes MUST be written only to a dated fixed-tag staging directory.
2. Every FLAC disc input MUST first be copied into an audio-only staging directory because `fix-tags` rejects source directories containing artwork, logs, cue sheets, or nested directories.
3. Every executable workflow MUST dry-run then execute `fix-tags` with a single `--set-metadata <workflow manifest>` argument that supplies the complete `artist`, `album`, `trackNumber`, and `title` for every staged file. `--set-artist`, `--set-album`, and `--reset-track` MUST NOT be used: `--set-metadata` owns those fields and rejects them as conflicting options.
4. Each workflow MUST have exactly one versioned metadata manifest committed under `specs/2026-07-09/process-iced-earth-albums/metadata/<workflow-id>.csv`. Each manifest MUST be a complete, flat mapping whose `filename` values exactly cover the workflow's staged source directory (no unknown filenames, no missing coverage), with columns `filename,artist,album,trackNumber,title`; `artist` is `Iced Earth`, `album` exactly matches the workflow final album, `trackNumber` derives from the leading two-digit filename ordinal, and `title` is derived from the remaining filename stem.
5. Multi-disc sources MUST be processed as separate disc workflows. Their output album names MUST include the disc number so that duplicate filenames and per-manifest track numbers cannot collide.
6. `organize-files` MUST dry-run before execution and use `--artist-filename-strategy artist`, producing `Iced Earth/<album>/NN - Title.flac`.
7. After a successful organize execution, the selected source front artwork MUST be copied as `cover.jpg` into the matching destination album folder without overwriting an existing file.
8. `1996 - The Dark Saga [EAC-FLAC]` MUST remain blocked: its source file `02 - i died for you.flac` has a corrupted FLAC header (`FLAC header not found after any starting tags`), so `fix-tags` cannot read the flat source directory. Its manifest (`metadata/the-dark-saga.csv`) MUST still be produced and validated independently of the audio, and MAY be applied via `--set-metadata` once the corrupted source file is repaired.
9. `2008 - The Crucible of Man [EAC-APE]` MUST remain blocked: its `CDImage.ape` is unsupported by the CLI and cannot be safely represented as individual tracks by this workflow.
10. The processing-run summary MUST record dry-run and execution results, destination paths, track counts, copied artwork, the referenced metadata manifests, and both blockers (corrupted Dark Saga source and the APE image).
11. Existing destination folders MUST NOT be modified, merged, or deleted by this spec. A destination collision is a blocker requiring separate review.

## Counts

| Category | Count |
|---|---:|
| Source album packages | 14 |
| Processable FLAC packages | 13 |
| FLAC disc workflows with metadata manifests | 21 |
| Metadata manifest CSV files | 21 |
| Manifest track records (total) | 197 |
| Executable disc workflows (source ready to run) | 20 |
| Planned organized FLAC tracks (executable now) | 187 |
| Planned destination album folders | 20 |
| Artwork copies | 20 |
| Blocked disc workflows (corrupted Dark Saga source) | 1 |
| Blocked APE workflows | 1 |
