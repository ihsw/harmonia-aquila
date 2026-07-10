# Tasks: process missing OC Remix source albums

- [x] Build the CLI with `npm run build` and ensure `build/dist/index.js` is executable.
- [x] Create a dated processing-run directory with staging folders for audio-only inputs, fixed tags, combined fixed albums, dry-run artifacts, execute artifacts, and artwork copy records.
- [x] Dry-run every `fix-tags` command listed in `candidate-summary.json` executable workflows.
- [x] Execute passing `fix-tags` commands into staging only.
- [x] For Blood on the Asphalt, copy only supported audio files into an audio-only staging input before running `fix-tags --set-album-artist "OverClocked ReMix"`.
- [x] For Xenogears, combine both fixed FLAC disc staging outputs into one flat staging folder before organizing.
- [x] Dry-run every executable `organize-files` workflow against `etc/3-organized-files`.
- [x] Execute only organize workflows whose dry-run still succeeds.
- [x] Copy each executed workflow's selected artwork file into the destination album folder.
- [x] Record processed, newly blocked, skipped trackless files, and artwork copy results in the processing-run summary.
- [x] Leave blocked Chrono and partial multi-disc replacement workflows untouched.
