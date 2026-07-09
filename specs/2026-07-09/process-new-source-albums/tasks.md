# Tasks: process new source albums

- [x] Build the CLI with `npm run build` and ensure `build/dist/index.js` is executable.
- [x] Review `candidate-summary.json` and confirm every executable candidate resolves under `OverClocked ReMix/` with `artistFilenameStrategy: "albumartist"`.
- [x] For each executable candidate in `candidate-summary.json`, rerun the listed dry-run command against `etc/3-organized-files`.
- [x] Execute candidates whose rerun dry-run still succeeds.
- [x] Copy each executed candidate's `albumArt.likelyAlbumArtFiles` into the resolved destination album folder.
- [x] Record processed, artwork-copied, and blocked candidates in a dated processing-run artifact folder under the source audit report.
- [x] Leave MP3/mp3s alternates, metadata-repair blockers, dry-run failures, and any newly existing destinations untouched.
