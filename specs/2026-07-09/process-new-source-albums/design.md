# Design: process new source albums

## Inputs

- Source root: `etc/1-source-files`
- Destination root: `etc/3-organized-files`
- Audit artifacts: `reports/album-organization-audit/2026-07-09-new-source-files-audit/`
- Machine-readable spec: `candidate-summary.json`

## Candidate selection

The audit runs `summarize-source-dir --format json --ignore-non-audio-files` and `organize-files --format json --ignore-non-audio-files` for each flat source folder containing `.flac` or `.mp3` files. Candidates that dry-run successfully are grouped by resolved `Artist/Album` destination folder. If multiple candidates resolve to the same destination, exactly one is selected and the rest are blocked; FLAC/flacs sources are preferred over MP3/mp3s sources.

## Artwork handling

Artwork is discovered from the candidate's shared album package root, not only from the flat audio folder. Valid images are ranked by square dimensions and front/cover-like names. The selected `albumArt.likelyAlbumArtFiles` entries should be copied into the destination album folder after the audio files are organized.

## Execution safety

Before executing a candidate, rerun the listed dry-run command and confirm it still succeeds and does not report an existing destination album folder. Execute only the selected candidates. Blocked alternates and metadata failures stay in source until a later human review or tag-repair pass.
