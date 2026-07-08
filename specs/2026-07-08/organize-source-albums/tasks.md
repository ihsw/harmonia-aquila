# Tasks: Organize Source Albums

> ## Hard constraints (re-read before starting)
>
> - **DO NOT START** any task below until the user explicitly directs you to.
> - **No `npx`** in any form. Use `npm run <script>` or `node build/dist/index.js`.
> - **Do not edit source code** for this data-organization spec.
> - Treat `etc/1-source-files/**` as read-only input.
> - Run required checks after repository text-file modifications.
> - Mark the matching `- [x]` checkbox immediately when each task is finished.

## Phase 1 — Pre-flight

### 1.1 Build CLI

- [ ] Run `npm run build` and require exit 0.
- [ ] Stop if the build fails.

### 1.2 Create audit workspace

- [ ] Create a non-source audit directory for summary JSON, dry-run JSON, execute JSON, and skipped reports.
- [ ] Record the inventory counts from `design.md` §3 before processing.

## Phase 2 — Discovery

### 2.1 Classify folders

- [ ] Inventory `etc/1-source-files` into audio-only, audio-plus-sidecar, no-direct-audio, and unsupported-audio classes.
- [ ] Confirm the inventory accounts for 8,141 supported audio files.
- [ ] Record the 2 unsupported audio files as skipped.
- [ ] Inventory cover image candidates (`.jpg`, `.jpeg`, `.png`, `.bmp`, `.tif`, `.tiff`) and associate them with source album folders.

### 2.2 Summarize audio-only folders

- [ ] Run `summarize-source-dir --format json` on every CLI-accepted audio-only folder.
- [ ] Save each successful summary JSON.
- [ ] Save failed summary paths and errors for blocked review.

### 2.3 Stage sidecar folders

- [ ] For every selected audio-plus-sidecar folder, create an audio-only staging folder under `etc/2-fixed-tag-files/audio-only/`.
- [ ] Copy or hardlink only `.flac` and `.mp3` files into staging.
- [ ] Record a source-to-stage manifest so cover images can be copied from the original source album folder after organization.
- [ ] Run `summarize-source-dir --format json` against each staging folder and save the result.

## Phase 3 — Selection and cleanup planning

### 3.1 Review metadata quality

- [ ] Identify folders missing album, albumartist, artist, title, or track number metadata.
- [ ] Route fixable folders to `fix-tags` staging.
- [ ] Mark unfixable folders blocked with exact missing fields.

### 3.2 Deduplicate batches

- [ ] Group candidate batches by albumartist, album, track count, track numbers, and track titles.
- [ ] Prefer FLAC over MP3 for duplicate album track sets.
- [ ] Exclude lower-quality duplicate batches from execute steps.

### 3.3 Check existing organized output

- [ ] Compare selected batches against `etc/3-organized-files`.
- [ ] Treat existing destinations as already-organized or conflict cases; do not overwrite silently.
- [ ] Check planned cover image destination paths and block on same-name different-content conflicts.

## Phase 4 — Organize

### 4.1 Dry-run selected batches

- [ ] Run `organize-files --format json` without `--execute` for every selected source or staging folder.
- [ ] Save each dry-run JSON output.
- [ ] Stop and resolve any duplicate destination, missing metadata, or existing destination error.

### 4.2 Optional tag-fix staging

- [ ] Run `fix-tags --format json` without `--execute` for fixable metadata batches.
- [ ] Execute `fix-tags` only after reviewing the dry-run output.
- [ ] Re-run `organize-files` dry-run against the tag-fixed staging folder.

### 4.3 Execute organization

- [ ] Run `organize-files --execute --format json` for every reviewed selected batch.
- [ ] Save each execute JSON output.
- [ ] Copy associated cover images into each final organized album directory after audio copy succeeds.
- [ ] Preserve original cover image filenames and record copied image paths in the audit output.
- [ ] Record every skipped or blocked batch with its reason.

## Phase 5 — Verification

### 5.1 Verify organized albums

- [ ] Run `summarize-source-dir --format json` against each final organized album folder.
- [ ] Confirm expected track counts and track-number sequences.
- [ ] Confirm selected albums with source cover images have copied cover images in the final organized album directory.
- [ ] Confirm lower-quality duplicates were not copied when higher-quality batches were selected.

### 5.2 Generate final Markdown report

- [ ] Create `album-organization-report.md` in the audit workspace after final verification.
- [ ] Include a totals section with organized album count, organized track count, format counts, artwork-present count, artwork-missing count, and blocked/skipped batch count.
- [ ] Include a Markdown table with final album path, albumartist, album, track count, format, bitrate summary, artwork-present status, and artwork filenames.
- [ ] Derive bitrate and format from final `summarize-source-dir --format json` outputs, not from source folder names.

### 5.3 Scope verification

- [ ] Run `git --no-pager diff --stat src package.json package-lock.json` and require no output.
- [ ] Run `find etc/3-organized-files -type f | sort` and inspect final organized paths.
