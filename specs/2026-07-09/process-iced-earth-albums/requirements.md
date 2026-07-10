# Requirements: process Iced Earth albums

Generated: 2026-07-09

## Scope

Create a safe, staged plan to organize the Iced Earth FLAC albums in `etc/1-source-files/Iced.Earth.-.The.Whole.Discography.(1991-2008).(22CDs).[EAC-FLAC-APE].by.Calimeero` into `etc/3-organized-files/Iced Earth`, normalize each processed input with `fix-tags`, and copy selected cover artwork into each resulting album folder.

## Functional requirements

1. The source package MUST remain read-only. All audio-tag changes MUST be written only to a dated fixed-tag staging directory.
2. Every FLAC disc input MUST first be copied into an audio-only staging directory because `fix-tags` rejects source directories containing artwork, logs, cue sheets, or nested directories.
3. Every executable workflow MUST dry-run then execute `fix-tags` with `--set-artist "Iced Earth"`, a workflow-specific `--set-album`, and `--reset-track`.
4. Multi-disc sources MUST be processed as separate disc workflows. Their output album names MUST include the disc number so that duplicate filenames and independently reset track numbers cannot collide.
5. `organize-files` MUST dry-run before execution and use `--artist-filename-strategy artist`, producing `Iced Earth/<album>/NN - Title.flac`.
6. After a successful organize execution, the selected source front artwork MUST be copied as `cover.jpg` into the matching destination album folder without overwriting an existing file.
7. `2008 - The Crucible of Man [EAC-APE]` MUST remain blocked: its `CDImage.ape` is unsupported by the CLI and cannot be safely represented as individual tracks by this workflow.
8. The processing-run summary MUST record dry-run and execution results, destination paths, track counts, copied artwork, and the APE blocker.
9. Existing destination folders MUST NOT be modified, merged, or deleted by this spec. A destination collision is a blocker requiring separate review.

## Counts

| Category | Count |
|---|---:|
| Source album packages | 14 |
| Processable FLAC packages | 13 |
| Executable FLAC disc workflows | 21 |
| Planned FLAC tracks | 197 |
| Planned destination album folders | 21 |
| Artwork copies | 21 |
| Blocked APE workflows | 1 |
