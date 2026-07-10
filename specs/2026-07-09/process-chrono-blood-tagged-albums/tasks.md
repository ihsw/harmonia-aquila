# Tasks: process Chrono Symphonic and Blood on the Asphalt

- [ ] Build the CLI with `npm run build` and ensure `build/dist/index.js` is executable.
- [ ] Create a dated processing-run directory with audio-only staging, fixed-tag staging, dry-run artifacts, execute artifacts, and artwork copy records.
- [ ] Copy Chrono FLAC CD1 and CD2 audio files into one combined audio-only staging folder.
- [ ] Dry-run and execute Chrono `fix-tags --set-album-artist "OverClocked ReMix" --set-album "Chrono Symphonic" --reset-track` into fixed staging.
- [ ] Copy Blood audio files into an audio-only staging folder.
- [ ] Dry-run and execute Blood `fix-tags --set-album-artist "OverClocked ReMix" --album-strategy originalalbum` into fixed staging.
- [ ] Dry-run both `organize-files --ignore-non-audio-files --artist-filename-strategy albumartist` workflows against `etc/3-organized-files`.
- [ ] Execute only organize workflows whose dry-runs still succeed.
- [ ] Copy selected artwork into destination album folders.
- [ ] Record processed, blocked, track counts, and artwork copy results in a processing-run summary.
