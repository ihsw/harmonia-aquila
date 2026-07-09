# Requirements: process new source albums

Generated: 2026-07-09T16:56:23.527754

## Scope

Process the current album-sized folders under `etc/1-source-files` into `etc/3-organized-files` with every organized album under the OC Remix parent directory. The source metadata stores that parent as `OverClocked ReMix`; use `--artist-filename-strategy albumartist` for candidates whose `albumartist` metadata is consistently `OverClocked ReMix`.

## Functional requirements

1. Preserve `etc/1-source-files` as read-only input.
2. Run `summarize-source-dir --format json --ignore-non-audio-files` for each source folder before processing.
3. Run `organize-files` dry-run immediately before every execute step.
4. Use `--ignore-non-audio-files --artist-filename-strategy albumartist` for every executable candidate.
5. Do not use `artist`, `label`, or `producer` for the current executable set: `artist` resolves to individual remixers, while `label` and `producer` are absent from the FLAC sources.
6. Block folders whose metadata cannot produce the OC Remix parent via `albumartist`; repair tags before organizing them.
7. Copy only one source for each resolved `OverClocked ReMix/<Album>` destination folder; prefer FLAC/flacs over MP3/mp3s alternates.
8. Do not merge into an existing destination album folder; any existing resolved destination must block at execution time.
9. Copy each candidate's `albumArt.likelyAlbumArtFiles` into its destination album folder after the audio copy succeeds.

## Counts

| Category | Count |
|---|---:|
| Total source album folders | 41 |
| Executable candidates | 7 |
| Blocked candidates | 34 |
| Duplicate destination groups | 7 |
| Metadata-repair blockers | 5 |
| Dry-run failure blockers | 2 |
| Duplicate album-folder collision blockers | 10 |
| Executable candidates with likely album art | 7 |
| Likely artwork files to copy | 7 |
