# Design: Organize Source Albums

> Scope reminder: this spec touches only generated audit artifacts, `etc/2-fixed-tag-files`, and `etc/3-organized-files`. `etc/1-source-files` is read-only, and no source code or dependency changes are in scope.

## 1. Overview

Use a staged, command-driven organization workflow. The current CLI only accepts flat directories containing supported audio files and no sidecars. Therefore the design has two lanes for audio: direct processing for CLI-accepted audio-only folders, and audio-only staging for folders that contain direct audio plus sidecars. Album cover images are handled as a companion copy step after `organize-files` succeeds.

The re-analysis of `etc/1-source-files` found a broad discography-style collection rather than a single album folder. The workflow must operate in batches, preserve JSON audit output, select one best source per duplicate album, and gate every copy into `etc/3-organized-files` behind `organize-files` dry-run output.

## 2. File layout

### Modified files during execution

```text
etc/2-fixed-tag-files/**       audio-only staging and optional fix-tags output
etc/3-organized-files/**       final organized audio and album artwork output
```

### Files explicitly NOT modified

- `etc/1-source-files/**` because original sources must be preserved.
- `etc/_1-source-files/**` because this pass targets only `etc/1-source-files`.
- `src/**`, `package.json`, and `package-lock.json` because this is data organization, not a code change.

## 3. Re-analysis inventory

| Metric | Count |
| --- | ---: |
| Top-level source roots | 55 |
| Supported `.flac`/`.mp3` files | 8,141 |
| Unsupported audio files | 2 |
| Image files (`.jpg`, `.jpeg`, `.png`, `.bmp`, `.tif`) | 1,618 |
| Direct audio-only directories discovered | 221 |
| Direct audio-only files | 2,090 |
| Successful `summarize-source-dir` folders | 210 |
| Successfully summarized tracks | 1,983 |
| Failed direct candidate summaries | 11 |
| Direct audio-plus-sidecar directories | 587 |
| Audio files inside audio-plus-sidecar directories | 6,051 |

Unsupported audio extensions observed: `.ape` and `.ogg`.

## 4. Successful summary roots

| Root | Folders | Tracks | FLAC folders | MP3 folders | Missing metadata folders |
| --- | ---: | ---: | ---: | ---: | ---: |
| `Angels & Airwaves` | 2 | 22 | 0 | 2 | 0 |
| `BT Complete Discography (US Versions)` | 10 | 95 | 0 | 10 | 8 |
| `Billy Talent Studio Discography (2003-2022) [MP3 320kbps]` | 6 | 73 | 0 | 6 | 0 |
| `Bran Van 3000 - Garden -FLAC` | 1 | 15 | 1 | 0 | 0 |
| `Cascada - Discography 2004-2011 Dez16v ( TLS Release )` | 15 | 156 | 0 | 15 | 7 |
| `Daft Punk - Discography [FLAC Songs] [PMEDIA] ⭐️` | 2 | 31 | 2 | 0 | 0 |
| `Dark Tranquility - Discography` | 2 | 26 | 0 | 2 | 2 |
| `Iced.Earth.-.The.Whole.Discography.(1991-2008).(22CDs).[EAC-FLAC-APE].by.Calimeero` | 12 | 108 | 12 | 0 | 12 |
| `Linkin Park - Discography [FLAC Songs] [PMEDIA] ⭐️` | 6 | 80 | 6 | 0 | 0 |
| `My Dying Bride` | 10 | 80 | 0 | 10 | 0 |
| `Opeth - Discography-(1995 - 2011)-FLAC-VINYL-2012-JKoop` | 9 | 70 | 9 | 0 | 9 |
| `Richard D. James as Aphex Twin (Albums 1992 - 2019) [FLAC]` | 6 | 80 | 6 | 0 | 0 |
| `Sigur Ros discography (FLAC)` | 2 | 12 | 2 | 0 | 1 |
| `System Of A Down - Discography [FLAC Songs] [PMEDIA] ⭐️` | 2 | 17 | 2 | 0 | 0 |
| `THE BIRTHDAY MASSACRE - DISCOGRAPHY (2000-14) [CHANNEL NEO]` | 11 | 110 | 0 | 11 | 11 |
| `The Prodigy` | 2 | 30 | 0 | 2 | 2 |
| `The Velvet Underground - Discography [FLAC Songs] [PMEDIA] ⭐️` | 43 | 501 | 43 | 0 | 0 |
| `Utada Hikaru - Discography [FLAC Songs] [PMEDIA] ⭐️` | 2 | 18 | 2 | 0 | 0 |
| `XJapan` | 66 | 455 | 0 | 66 | 66 |
| `dp` | 1 | 4 | 0 | 1 | 1 |

The 119 folders with missing core metadata must be expected to fail `organize-files` unless staged through tag correction or intentionally skipped.

## 5. Processing lanes

### Lane A: direct audio-only folders

Use this lane when a folder contains only `.flac`/`.mp3` direct files and `summarize-source-dir` succeeds. Save the summary, duplicate-classify the folder, run `organize-files` dry-run, then execute only selected folders.

### Lane B: audio-plus-sidecar folders

Use this lane for the 587 folders with direct supported audio plus sidecars. Create a clean staging folder under `etc/2-fixed-tag-files/audio-only/<slug>/` containing only hardlinked or copied supported audio files from the source folder. Run all `harmonia-aquila` commands against that staging folder, not the original sidecar-contaminated source folder.

### Lane C: blocked folders

Use this lane for unsupported `.ape`/`.ogg`, failed candidate folders with nested children, missing metadata folders that cannot be fixed safely, and existing destination collisions. Write a skipped/blocked report with the path and reason.

## 6. Album artwork copying

Album artwork is in scope when its source album is selected for organization. Candidate cover images are files with extensions `.jpg`, `.jpeg`, `.png`, `.bmp`, `.tif`, or `.tiff` that are either direct children of the selected source album folder or direct children of conventional artwork subdirectories such as `Artwork`, `Art`, `Covers`, `Cover`, or `Scans`.

After `organize-files --execute` succeeds, copy the selected album's artwork candidates into the final organized album directory reported by the dry-run/execute output. Preserve original image filenames. If multiple images exist, copy all candidates rather than guessing a single cover. If the destination already contains an image with the same filename but different content, block and record a conflict instead of overwriting.

For staged audio folders, keep a source-to-stage manifest so artwork is copied from the original source album folder, not from the audio-only staging directory.

## 7. Final Markdown report

After final verification, generate a Markdown report in the audit workspace, for example `album-organization-report.md`. The report should be derived from final organized album summaries plus copied-artwork audit data, not from assumptions about the original source tree.

The report must include a table with these columns:

| Column | Meaning |
| --- | --- |
| Final album path | Directory under `etc/3-organized-files`. |
| Album artist | Unique `albumartist` value or `(mixed)` if multiple values remain. |
| Album | Unique `album` value or `(mixed)` if multiple values remain. |
| Tracks | Count from final `summarize-source-dir` output. |
| Format | `FLAC`, `MP3`, or `mixed`, based on final file extensions. |
| Bitrate | Min/median/max or a concise range from final summary bitrate values. |
| Artwork present | `yes` when copied artwork exists in the final album directory, otherwise `no`. |
| Artwork files | Copied image filenames or `(none)`. |

Include a short totals section above the table with organized album count, organized track count, FLAC album count, MP3 album count, mixed-format album count, albums with artwork, albums without artwork, and blocked/skipped batch count.

## 8. Command plan

Build once:

```sh
npm run build
```

Summarize:

```sh
node build/dist/index.js summarize-source-dir --dir-name "$AUDIO_ONLY_DIR" --format json
```

Dry-run organization:

```sh
node build/dist/index.js organize-files \
  --source-dir "$SELECTED_AUDIO_ONLY_DIR" \
  --dest-dir "etc/3-organized-files" \
  --artist-filename-strategy albumartist \
  --title-filename-strategy title \
  --format json
```

Execute after review:

```sh
node build/dist/index.js organize-files \
  --source-dir "$SELECTED_AUDIO_ONLY_DIR" \
  --dest-dir "etc/3-organized-files" \
  --artist-filename-strategy albumartist \
  --title-filename-strategy title \
  --format json \
  --execute
```

Use `fix-tags` only when metadata can be corrected systematically:

```sh
node build/dist/index.js fix-tags \
  --source-dir "$SELECTED_AUDIO_ONLY_DIR" \
  --dest-dir "$TAG_FIX_STAGE_DIR" \
  --format json
```

## 9. Risk Table

| Risk | Likelihood | Mitigation |
| --- | --- | --- |
| Most audio files are in sidecar-contaminated folders | High | Stage audio-only copies before CLI processing. |
| Missing metadata causes organize failures | High | Use summary metadata reports to route folders to fix-tags or blocked status. |
| Discographies contain duplicate albums across roots | Medium | Group by albumartist, album, track count, track titles, and format before execution. |
| Existing organized output conflicts with new output | Medium | Verify existing output and skip or explicitly replace only after review. |
| Cover image filename conflicts occur in destination | Medium | Preserve names and block on differing existing files rather than overwriting. |
| Unsupported audio gets silently ignored | Low | Record `.ape` and `.ogg` in skipped output. |
