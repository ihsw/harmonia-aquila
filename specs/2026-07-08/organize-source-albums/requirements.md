# Requirements: Organize Source Albums

## 1. Background

`etc/1-source-files` contains a broad mixed album collection with 55 top-level source roots, 8,141 supported `.flac`/`.mp3` files, 2 unsupported audio files (`.ape`, `.ogg`), and 1,618 image files. The current `harmonia-aquila` CLI only processes flat directories containing supported audio files, so sidecar-heavy source folders must be staged before CLI use.

This spec has been narrowed to **only albums with correct metadata**. Correct metadata means `summarize-source-dir --format json` succeeds and every track has the core fields required for organization (`album`, `albumartist`, `artist`, and `title`); `organize-files --format json` must also pass without `--execute` using `--artist-filename-strategy albumartist` and `--title-filename-strategy title`.

Validation found 796 summarized source/staging folders, 545 folders with complete core summary metadata, 91 folders that passed `organize-files` dry-run, and 87 in-scope album batches after destination deduplication. All albums not listed in `design.md` §4 and `tasks.md` §3.1 are out of scope for this spec.

## 2. Goal

Organize exactly the 87 validated in-scope album batches into `etc/3-organized-files`, copy associated album artwork when present, and produce a final Markdown breakdown report. Do not attempt to repair, tag-fix, or organize any album outside the explicit in-scope list.

## 3. Scope

### In scope

- The 87 album batches listed in `design.md` §4 and `tasks.md` §3.1.
- `harmonia-aquila summarize-source-dir` JSON outputs used to establish metadata correctness.
- `harmonia-aquila organize-files --format json` dry-run outputs used to establish processability.
- Audio-only staging under `etc/2-fixed-tag-files` only for listed albums whose original source folder contains sidecars.
- Final audio and selected cover images under `etc/3-organized-files`.
- A final audit Markdown report with album, format, bitrate, and artwork status.

### Out of scope

- Any album batch not listed in `tasks.md` §3.1.
- Any folder with missing `album`, `albumartist`, `artist`, or `title` in `summarize-source-dir` output.
- Any folder that fails `organize-files --format json` without `--execute`.
- Metadata repair or `fix-tags` work for this pass.
- Source code changes to `src/**`.
- Deleting or mutating files under `etc/1-source-files`.
- Organizing non-artwork sidecars, unsupported audio, or legacy `etc/_1-source-files`.

## 4. Functional Requirements

- **FR-1** The workflow MUST process only the 87 album batches listed in `tasks.md` §3.1.
- **FR-2** Every in-scope album MUST have a saved `summarize-source-dir --format json` output proving complete `album`, `albumartist`, `artist`, and `title` metadata.
- **FR-3** Every in-scope album MUST have a saved successful `organize-files --format json` dry-run output before `--execute` is used.
- **FR-4** Albums not listed in `tasks.md` §3.1 MUST be treated as out of scope even if they might be fixable later.
- **FR-5** The workflow MUST NOT run `fix-tags` as part of this scoped pass.
- **FR-6** For staged albums, the workflow MUST process the listed staging directory while preserving the original source directory as read-only.
- **FR-7** If a listed album no longer passes `organize-files` dry-run at execution time, it MUST be marked blocked rather than repaired in-place.
- **FR-8** Album artwork associated with a listed source album MUST be copied into the final organized album directory after audio organization succeeds.
- **FR-9** Existing destination files and cover image filename conflicts MUST block execution for that album unless the conflict is identical and documented.
- **FR-10** The final Markdown report MUST include each processed album's final path, albumartist, album, track count, format, bitrate summary, artwork-present status, and copied artwork filenames.

## 5. Non-Functional Requirements

- **NFR-1 (lint after every file modification)** After every repository text-file modification, run `npm run lint` if source files changed; for spec-only edits, record that lint is not applicable.
- **NFR-2 (no `npx`)** `npx` is forbidden in all forms. Use `npm run <script>`, `node build/dist/index.js`, or existing project binaries only.
- **NFR-3 (build before CLI use)** `npm run build` MUST exit 0 before using `node build/dist/index.js`.
- **NFR-4 (source preservation)** Files under `etc/1-source-files` MUST remain read-only.
- **NFR-5 (auditability)** Summary, dry-run, execute, artwork-copy, blocked, and final report artifacts SHOULD be retained until verification is complete.
- **NFR-6 (scope discipline)** Implementation MUST NOT modify `src/**`, `package.json`, or dependency lockfiles.

## 6. Acceptance Criteria

1. The tasks file lists exactly 87 in-scope album batches.
2. Every listed album has saved successful `summarize-source-dir --format json` and `organize-files --format json` dry-run artifacts.
3. No unlisted album batch is executed, copied, repaired, or tag-fixed.
4. Each executed listed album has matching execute JSON and copied artwork audit output when artwork exists.
5. The final Markdown report includes all executed listed albums with format, bitrate, and artwork status.
6. `git --no-pager diff --stat src package.json package-lock.json` is empty.
