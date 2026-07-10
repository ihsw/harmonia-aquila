# Requirements: process Chrono Symphonic and Blood on the Asphalt

Generated: 2026-07-09T19:40:51.162187

## Scope

Create a safe processing plan for Chrono Symphonic and Blood on the Asphalt using staged `fix-tags` repairs before `organize-files` writes into `etc/3-organized-files`.

## Functional requirements

1. Preserve `etc/1-source-files` as read-only input.
2. Create audio-only staging inputs because source packages may contain sidecars and `fix-tags` is strict about non-audio entries.
3. For Chrono Symphonic, combine FLAC CD1 and CD2 into one audio-only staging input, then run `fix-tags --set-album-artist "OverClocked ReMix" --set-album "Chrono Symphonic" --reset-track` so track metadata becomes a continuous alphabetical 01-25 album sequence.
4. For Blood on the Asphalt, copy supported audio files into staging, then run `fix-tags --set-album-artist "OverClocked ReMix" --album-strategy originalalbum` so the destination album folder uses `Super Street Fighter 2 Turbo`.
5. Run every `fix-tags` command as a dry-run before `--execute`; execute only into staging.
6. Run `organize-files --ignore-non-audio-files --artist-filename-strategy albumartist` from fixed staging into `etc/3-organized-files`.
7. Copy selected `albumArt.likelyAlbumArtFiles` into each destination album folder after audio organization succeeds.
8. Do not remove or mutate previously organized destination folders; any cleanup of older incorrect Blood/Chrono folders requires a separate explicit cleanup spec.

## Counts

| Category | Count |
|---|---:|
| Executable workflows | 2 |
| Tracks planned | 49 |
| Blocked workflows | 0 |
| Workflows with likely album art | 1 |
| Likely artwork files | 1 |
