# Requirements: process missing OC Remix source albums

Generated: 2026-07-09T19:12:51.661947

## Scope

Create a safe processing plan for source folders that were not fully handled by `specs/2026-07-09/process-new-source-albums/`. The plan uses `fix-tags` to repair album-level metadata in staging, then uses `organize-files` to copy eligible albums into `etc/3-organized-files` under `OverClocked ReMix/`.

## Functional requirements

1. Preserve `etc/1-source-files` as read-only input.
2. Use `fix-tags --set-album-artist "OverClocked ReMix"` for source folders missing the OC Remix album artist.
3. Use `fix-tags --set-album "Xenogears - Humans + Gears"` for Xenogears FLAC sources so the destination album folder matches the source album folder name rather than `http://xenogears.ocremix.org - Humans + Gears`.
4. For source folders containing non-audio sidecars but requiring `fix-tags`, first copy only supported audio files into an audio-only staging input, because `fix-tags` remains strict about non-audio entries.
5. Run every `fix-tags` operation as a dry-run before `--execute`; execute only into staging, never back into `etc/1-source-files`.
6. Run `organize-files --ignore-non-audio-files --artist-filename-strategy albumartist` from fixed staging or source as specified by `candidate-summary.json`.
7. Use `--ignore-audio-files-without-tracks` only for workflows that intentionally skip trackless files, currently Super Metroid.
8. Copy each executable workflow's `albumArt.likelyAlbumArtFiles` into the destination album folder after audio organization succeeds.
9. Leave Chrono Symphonic blocked until track numbers are repaired; setting album artist alone leaves zero organizable tracks.
10. Leave existing partial multi-disc album conflicts blocked until a full-album replacement workflow moves aside the existing partial destination and organizes all FLAC discs together.

## Counts

| Category | Count |
|---|---:|
| Executable workflows | 3 |
| Executable tracks planned | 76 |
| Blocked workflows | 11 |
| Blocked track-number repairs | 2 |
| Blocked existing partial album replacements | 9 |
| Executable workflows with likely album art | 2 |
| Likely artwork files to copy | 2 |
