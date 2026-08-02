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

Do not supply metadata-repair options during this suitable-candidate pass, and do not use overwrite behavior or manual merges for duplicate destination album folders.

`organize-files` accepts one normalized album directory per run. It fails with
`Multiple albums found:` when the selected files resolve to multiple albums,
and it still fails when one normalized album directory resolves for multiple
normalized artist directories. Album conflicts are checked after missing
metadata and exact duplicate destinations, but before artist conflicts,
destination inspection, or copying. Treat either result as a metadata or
source-selection issue: there is no bypass, split, or automatic selection.

Direct regular image files beside the album audio are included in the same
plan when their extensions are `.avif`, `.bmp`, `.gif`, `.jpeg`, `.jpg`,
`.png`, `.tif`, `.tiff`, or `.webp` (case-insensitive). Image rows have
`fileType: "albumArt"` and target the effective `Artist/Album` root, including
for multi-disc albums; audio rows have `fileType: "audio"`. Other sidecars,
directories, and symlinks remain errors unless `--ignore-non-audio-files` is
explicit. Collision strategy and preflight cover the combined audio-and-art
plan before execution writes anything.

Run `manage-albums validate` before organization. Validation applies the same
one-album-per-run and album-to-artist collision rules, so successful validation
cannot hide a layout conflict that `organize-files` would reject. Rows without
a computable destination and exact duplicate file destinations remain reported
as invalid validation rows instead of contributing album identities.

## Multi-disc metadata

MP3 files store disc number/total in ID3v2 `TPOS` (`N` or `N/M`); FLAC uses
`DISCNUMBER` and `DISCTOTAL`. Summary and validation rows expose normalized
`discNumber` and `discTotal` values. Disc metadata may be wholly absent when
selected track numbers are unique. Repeated track numbers require complete,
contiguous effective disc numbers; without them, validation and organization
fail with `missing disc number`. Duplicate `(discNumber, trackNumber)` pairs,
partial metadata, orphan totals, and inconsistent totals are invalid.
When repeated tracks activate this restriction, `organize-files` groups the
duplicate track numbers and filenames in its error. Use `--set-metadata` with a
whole-album JSON/CSV file when numbering is incorrect, or use explicit
`--disc-strategy infer` only when the repeats are genuine disc boundaries.

Single-disc albums retain `Artist/Album/TT - Title.ext`. A set with a disc
number or total greater than 1 is organized as
`Artist/Album/Disc DD/TT - Title.ext`. To repair a filename-ordered source set,
add `--disc-strategy infer` to the `organize-files` dry run. Inference is never
automatic: without the flag, repeated tracks remain invalid. Inference starts
a new disc whenever the next track number repeats or decreases; review every
`newDiscNumber`/`newDiscTotal` before adding `--execute`.

## Reconciled suitable-candidate processing spec

- Spec: `specs/2026-07-09/process-reconciled-suitable-source-albums/`
- Source report: `reports/album-organization-audit/2026-07-09-source-dir-summaries/album-organization-audit-2026-07-09.md`
- Executable candidates: 513
- Duplicate-destination blocked candidates: 47

Use each candidate's listed dry-run mode. Candidates promoted from sidecar folders require `--ignore-non-audio-files`; strict candidates should not use that flag unless their candidate row says so.

## New source-album processing spec

- Spec: `specs/2026-07-09/process-new-source-albums/`
- Source audit: `reports/album-organization-audit/2026-07-09-new-source-files-audit/new-source-files-audit.md`
- Reanalysis: `reports/album-organization-audit/2026-07-09-new-source-files-audit/reanalyze-overclock-remix-parent-20260709-165454/`
- Executable candidates: 7
- Blocked candidates: 34

This spec covers the current OC ReMix-style source folders in `etc/1-source-files`. Run every listed dry-run with `--ignore-non-audio-files --artist-filename-strategy albumartist`, and execute only candidates that resolve under `OverClocked ReMix/`. Its historical manual album-art copy step is obsolete: recognized adjacent images now appear in and execute with the combined organization plan. MP3/mp3s alternates are blocked when a FLAC/flacs source resolves to the same destination; same-quality FLAC disc folders that collapse into the same `OverClocked ReMix/<Album>` destination are blocked until multi-disc merge handling is designed; Blood on the Asphalt, Chrono Symphonic, and Super Metroid entries remain blocked until metadata is repaired.

## Missing OC Remix source-album processing spec

- Spec: `specs/2026-07-09/process-missing-ocremix-source-albums/`
- Source analysis: `reports/album-organization-audit/2026-07-09-new-source-files-audit/missing-albums-spec-analysis-20260709-191046/`
- Executable workflows: 3
- Blocked workflows: 11

This historical spec used staged tag repairs before organization. The current command accepts `--set-album-artist "OverClocked ReMix"` and `--set-album "Xenogears - Humans + Gears"` directly on `organize-files`, so repaired metadata and final paths appear in one dry run.

## Chrono/Blood tagged-album processing spec

- Spec: `specs/2026-07-09/process-chrono-blood-tagged-albums/`
- Source analysis: `reports/album-organization-audit/2026-07-09-new-source-files-audit/chrono-blood-spec-analysis-20260709-193925/`
- Executable workflows: 2
- Blocked workflows: 0

This historical spec combined Chrono Symphonic FLAC CD1/CD2 into audio-only staging before tag repair and organization. The current workflow supplies the same album-artist, album strategy, and track-reset options directly to `organize-files` for a single reviewed plan.
