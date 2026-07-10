# Design: process missing OC Remix source albums

## Inputs

- Source summary: `specs/2026-07-09/process-new-source-albums/candidate-summary.json`
- Analysis artifacts: `reports/album-organization-audit/2026-07-09-new-source-files-audit/missing-albums-spec-analysis-20260709-191046/`
- Source root: `etc/1-source-files`
- Destination root: `etc/3-organized-files`

## Staging model

All tag repair happens in a processing-run staging directory. The original source tree is never modified. For folders with sidecars, create an audio-only staging input first, then run `fix-tags` from that audio-only input into a fixed staging folder.

## Executable workflows

- Blood on the Asphalt: copy source audio files to audio-only staging, set album artist to `OverClocked ReMix`, then organize 24 tracks.
- Super Metroid: organize directly with `--ignore-audio-files-without-tracks`, intentionally skipping the single trackless continuity mix and copying 19 tracks.
- Xenogears: run `fix-tags --set-album "Xenogears - Humans + Gears"` for both FLAC discs into staging, combine both fixed disc outputs into one flat staging folder, then organize 33 tracks into `OverClocked ReMix/Xenogears - Humans + Gears`.

## Blocked workflows

Chrono Symphonic can be staged with `--set-album-artist`, but all FLAC files still lack track numbers, so `organize-files --ignore-audio-files-without-tracks` plans zero tracks. Multi-disc albums that already have a partial destination folder are blocked by the current `organize-files` safety rule. They need a separate full-album replacement workflow rather than merging additional discs into an existing folder.

## Artwork handling

Artwork is selected with the existing square/front-cover heuristic and stored in `candidate-summary.json` under `albumArt.likelyAlbumArtFiles`. Copy selected artwork after audio organization succeeds.
