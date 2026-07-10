# Tasks: process Chrono Symphonic and Blood on the Asphalt

- [x] Build the CLI with `npm run build` and ensure `build/dist/index.js` is executable.
- [x] Create a dated processing-run directory with audio-only staging, fixed-tag staging, dry-run artifacts, execute artifacts, and artwork copy records.
- [x] Copy Chrono FLAC CD1 and CD2 audio files into one combined audio-only staging folder.
- [x] Dry-run and execute Chrono `fix-tags --set-album-artist "OverClocked ReMix" --set-album "Chrono Symphonic" --reset-track` into fixed staging.
- [x] Copy Blood audio files into an audio-only staging folder.
- [x] Dry-run and execute Blood `fix-tags --set-album-artist "OverClocked ReMix" --album-strategy originalalbum` into fixed staging.
- [x] Dry-run both `organize-files --ignore-non-audio-files --artist-filename-strategy albumartist` workflows against `etc/3-organized-files`.
- [x] Execute only organize workflows whose dry-runs still succeed.
- [x] Copy selected artwork into destination album folders.
- [x] Record processed, blocked, track counts, and artwork copy results in a processing-run summary.
