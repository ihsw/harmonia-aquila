# Design: process new source albums

## Inputs

- Source root: `etc/1-source-files`
- Destination root: `etc/3-organized-files`
- Reanalysis artifacts: `reports/album-organization-audit/2026-07-09-new-source-files-audit/reanalyze-overclock-remix-parent-20260709-165454/`
- Machine-readable spec: `candidate-summary.json`

## Artist-folder strategy

The intended parent is OC Remix. In the file metadata, the usable canonical value is `OverClocked ReMix` in `albumartist`. Therefore executable candidates use:

```sh
--artist-filename-strategy albumartist
```

The `artist` strategy is unsuitable because it resolves to individual remixers. The `label` strategy is only populated on MP3 alternates and missing from the preferred FLAC sources. The `producer` strategy is empty across the current source set. Blood on the Asphalt and Chrono Symphonic are blocked because they lack consistent `albumartist`, `label`, and `producer` metadata for OC Remix; repair tags before organizing them under the OC Remix parent.

## Candidate selection

The reanalysis runs `summarize-source-dir --format json --ignore-non-audio-files` for each flat source folder, then runs `organize-files --format json --ignore-non-audio-files --artist-filename-strategy albumartist` against a temporary empty destination for folders with consistent `OverClocked ReMix` album-artist metadata. Candidates are grouped by resolved `OverClocked ReMix/<Album>` destination folder. If multiple candidates resolve to the same destination, exactly one is selected and the rest are blocked; FLAC/flacs sources are preferred over MP3/mp3s sources.

## Artwork handling

Artwork is discovered from the candidate's shared album package root, not only from the flat audio folder. Valid images are ranked by square dimensions and front/cover-like names. The selected `albumArt.likelyAlbumArtFiles` entries should be copied into the destination album folder after the audio files are organized.

## Execution safety

Before executing a candidate, rerun the listed dry-run command against `etc/3-organized-files` and confirm it still succeeds. Execute only selected candidates. Blocked alternates, metadata-repair blockers, and any newly existing destinations stay in source until a later human review or tag-repair pass.
