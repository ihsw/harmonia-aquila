# Tasks: process new source albums

- [ ] Build the CLI with `npm run build` and ensure `build/dist/index.js` is executable.
- [ ] For each executable candidate in `candidate-summary.json`, rerun the listed dry-run command.
- [ ] Execute candidates whose rerun dry-run still succeeds.
- [ ] Copy each executed candidate's `albumArt.likelyAlbumArtFiles` into the resolved destination album folder.
- [ ] Record processed, artwork-copied, and blocked candidates in a dated processing-run artifact folder under the source audit report.
- [ ] Leave blocked lower-quality alternates, metadata failures, and any newly existing destinations untouched.
