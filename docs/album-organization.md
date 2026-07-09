# Album organization processing

Album organization work is driven by dated specs and audit reports rather than ad hoc copy commands.

## Current suitable-candidate processing spec

- Spec: `specs/2026-07-09/process-suitable-source-albums/`
- Audit report: `reports/album-organization-audit/2026-07-09-source-dir-summaries/album-organization-audit-2026-07-09.md`
- Candidate source: `reports/album-organization-audit/2026-07-09-source-dir-summaries/source-dir-summaries-json/index.json`

The current spec covers 65 refined suitable candidates: 63 are executable immediately, and 2 are blocked because both resolve to `Cascada/Cascada - Original Me (Includes Greatest Hits)`. Processing must rerun `organize-files` dry-run immediately before `--execute` for each candidate and must preserve `etc/1-source-files` as read-only input.

## Safe command pattern

```sh
npm run build
./build/dist/index.js organize-files --source-dir "$SOURCE_DIR" --dest-dir etc/3-organized-files --format json
./build/dist/index.js organize-files --source-dir "$SOURCE_DIR" --dest-dir etc/3-organized-files --format json --execute
```

Do not run `fix-tags` during this suitable-candidate pass, and do not use overwrite behavior or manual merges for duplicate destination album folders.

## Reconciled suitable-candidate processing spec

- Spec: `specs/2026-07-09/process-reconciled-suitable-source-albums/`
- Source report: `reports/album-organization-audit/2026-07-09-source-dir-summaries/album-organization-audit-2026-07-09.md`
- Executable candidates: 513
- Duplicate-destination blocked candidates: 47

Use each candidate's listed dry-run mode. Candidates promoted from sidecar folders require `--ignore-non-audio-files`; strict candidates should not use that flag unless their candidate row says so.

## New source-album processing spec

- Spec: `specs/2026-07-09/process-new-source-albums/`
- Source audit: `reports/album-organization-audit/2026-07-09-new-source-files-audit/new-source-files-audit.md`
- Executable candidates: 18
- Blocked candidates: 23

This spec covers the current OC ReMix-style source folders in `etc/1-source-files`. Run every listed dry-run with `--ignore-non-audio-files`, execute only the selected candidates, and copy each candidate's `albumArt.likelyAlbumArtFiles` into the resolved destination album folder after the audio copy succeeds. MP3/mp3s alternates are blocked when a FLAC/flacs source resolves to the same destination, and Chrono Symphonic / Super Metroid entries remain blocked until missing track-number metadata is repaired.
