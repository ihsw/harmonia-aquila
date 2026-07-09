# Requirements: process new source albums

Generated: 2026-07-09T16:42:59.954734

## Scope

Process the current album-sized folders under `etc/1-source-files` into `etc/3-organized-files` using `organize-files` with `--ignore-non-audio-files` so sidecar artwork and text files do not block otherwise valid audio folders.

## Functional requirements

1. Preserve `etc/1-source-files` as read-only input.
2. Run `organize-files` dry-run immediately before every execute step.
3. Use `--ignore-non-audio-files` for every candidate in this spec.
4. Copy only one source for each resolved destination album folder; prefer FLAC/flacs over MP3/mp3s alternates.
5. Do not merge into an existing destination album folder; any existing resolved destination must block.
6. Copy each candidate's `albumArt.likelyAlbumArtFiles` into its destination album folder after the audio copy succeeds.
7. Leave candidates with missing required metadata blocked until tags are repaired.

## Counts

| Category | Count |
|---|---:|
| Total source album folders | 41 |
| Executable candidates | 18 |
| Blocked candidates | 23 |
| Duplicate destination groups | 17 |
| Executable candidates with likely album art | 17 |
| Likely artwork files to copy | 17 |
