# Tasks: process new source albums

- [ ] Build the CLI with `npm run build` and ensure `build/dist/index.js` is executable.
- [ ] Review `candidate-summary.json` and confirm every executable candidate resolves under `OverClocked ReMix/` with `artistFilenameStrategy: "albumartist"`.
- [ ] For each executable candidate in `candidate-summary.json`, rerun the listed dry-run command against `etc/3-organized-files`.
- [ ] Execute candidates whose rerun dry-run still succeeds.
- [ ] Copy each executed candidate's `albumArt.likelyAlbumArtFiles` into the resolved destination album folder.
- [ ] Record processed, artwork-copied, and blocked candidates in a dated processing-run artifact folder under the source audit report.
- [ ] Leave MP3/mp3s alternates, metadata-repair blockers, dry-run failures, and any newly existing destinations untouched.
