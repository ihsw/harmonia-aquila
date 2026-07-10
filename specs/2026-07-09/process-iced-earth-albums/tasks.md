# Tasks: process Iced Earth albums

- [ ] Build the CLI with `npm run build`.
- [ ] Create a dated processing-run directory under `reports/album-organization-audit/2026-07-09-iced-earth-processing/` with `audio-only/`, `fixed-tags/`, `dry-run/`, `execute/`, and `artwork/` subdirectories.
- [ ] For every executable row in `executable-workflows.md`, copy only its FLAC source files into the matching flat `audio-only/<id>/` directory.
- [ ] For every executable row, run `fix-tags --set-artist "Iced Earth" --set-album "<Final album>" --reset-track --format json` without `--execute`; save and review its output.
- [ ] Execute only reviewed `fix-tags` plans into `fixed-tags/<id>/`; do not use overwrite behavior.
- [ ] For every successfully fixed workflow, dry-run `organize-files --artist-filename-strategy artist --format json` into `etc/3-organized-files`; record collisions as blockers.
- [ ] Execute only collision-free organize plans.
- [ ] For every successfully organized workflow, copy its selected source front artwork to `Iced Earth/<Final album>/cover.jpg` without replacing a nonmatching existing destination file.
- [ ] Record each workflow's source count, fixed count, organize result, destination, and artwork result in the processing-run summary.
- [ ] Record `the-crucible-of-man-ape` as blocked; do not transcode, split, or copy its artwork as part of this spec.
