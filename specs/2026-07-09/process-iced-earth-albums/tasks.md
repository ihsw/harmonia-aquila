# Tasks: process Iced Earth albums

> **run-02 status (supersedes failed run-01):** 20 executable workflows completed
> (187 FLACs fixed, organized under `etc/3-organized-files/Iced Earth/`, and 20
> `cover.jpg` files copied) vs 2 source-level blockers still blocked
> (`the-dark-saga` corrupted FLAC header; `the-crucible-of-man-ape` unsupported
> `.ape` image). All 21 manifests validated (197 records). See
> `reports/album-organization-audit/2026-07-09-iced-earth-processing/run-02/processing-summary.md`.

- [x] Build the CLI with `npm run build`.
- [x] Create a dated processing-run directory under `reports/album-organization-audit/2026-07-09-iced-earth-processing/` with `audio-only/`, `fixed-tags/`, `metadata/`, `dry-run/`, `execute/`, and `artwork/` subdirectories.
- [x] For every executable row in `executable-workflows.md`, copy only its FLAC source files into the matching flat `audio-only/<id>/` directory.
- [x] For every executable row, copy its committed manifest `specs/2026-07-09/process-iced-earth-albums/metadata/<id>.csv` into the run's `metadata/<id>.csv` for auditability.
- [x] For every executable row, run `fix-tags --set-metadata metadata/<id>.csv --format json` without `--execute`; save and review its `newArtists`/`newAlbum`/`newTrackNumber`/`newTitle` output. Do not pass `--set-artist`, `--set-album`, or `--reset-track` (they conflict with `--set-metadata`).
- [x] Execute only reviewed `fix-tags` plans into `fixed-tags/<id>/`; do not use overwrite behavior.
- [x] For every successfully fixed workflow, dry-run `organize-files --artist-filename-strategy artist --format json` into `etc/3-organized-files`; record collisions as blockers.
- [x] Execute only collision-free organize plans.
- [x] For every successfully organized workflow, copy its selected source front artwork to `Iced Earth/<Final album>/cover.jpg` without replacing a nonmatching existing destination file.
- [x] Record each workflow's source count, fixed count, organize result, destination, referenced manifest, and artwork result in the processing-run summary.
- [x] Record `the-dark-saga` as blocked: its source `02 - i died for you.flac` has a corrupted FLAC header, so `fix-tags` cannot read the directory. Keep `metadata/the-dark-saga.csv` validated independently; apply it via `--set-metadata` only after the source is repaired. Do not repair the audio in this spec.
- [x] Record `the-crucible-of-man-ape` as blocked; do not transcode, split, or copy its artwork as part of this spec.
- [x] Validate all 21 manifests before running: header `filename,artist,album,trackNumber,title`, 197 total records, positive integer track numbers matching the filename ordinal, exact filename coverage of each source directory, `artist=Iced Earth`, `album` matching the workflow, and nonempty titles.
