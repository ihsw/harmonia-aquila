# Requirements: Organize Source Albums

## 1. Background

`harmonia-aquila` provides `summarize-source-dir`, `fix-tags`, and `organize-files` for audio cleanup. The current source tree at `etc/1-source-files` is now populated with a large mixed album collection: 55 top-level source roots, 8,141 supported `.flac`/`.mp3` files, 2 unsupported audio files (`.ape`, `.ogg`), 1,618 image files (`.jpg`, `.jpeg`, `.png`, `.bmp`, `.tif`), and many other sidecars such as logs, playlists, cues, PDFs, videos, and metadata files.

The re-analysis found 221 direct audio-only directories containing 2,090 supported audio files. `summarize-source-dir --format json` succeeded for 210 of those directories and summarized 1,983 tracks. Eleven candidate directories failed because they also contain direct child directories, which `getAudioFiles` treats as invalid entries even when all direct files are audio.

Most of the collection cannot be processed directly by the current CLI because 587 directories contain direct supported audio files plus sidecar files, covering 6,051 supported audio files. These directories need a clean staging step that copies only supported audio files into audio-only staging folders before running `harmonia-aquila` subcommands.

## 2. Goal

Organize all valid `.flac` and `.mp3` album batches from `etc/1-source-files` into `etc/3-organized-files` using `harmonia-aquila` subcommands, while preserving source files, copying album cover artwork for selected albums, excluding non-artwork sidecars from CLI input, preferring higher-quality non-duplicative sources, and staging messy album folders when necessary.

## 3. Scope

### In scope

- Read-only analysis of `etc/1-source-files`.
- Audio-only staging under `etc/2-fixed-tag-files` for folders that contain audio plus sidecars or need tag fixes.
- Final organized output under `etc/3-organized-files`.
- Album cover image copying for selected album batches, limited to `.jpg`, `.jpeg`, `.png`, `.bmp`, `.tif`, and `.tiff` files found with the selected source album.
- `harmonia-aquila summarize-source-dir`, `fix-tags`, and `organize-files`.
- Temporary JSON audit artifacts for summaries, dry-runs, execute results, skipped-folder reports, and a final Markdown album breakdown report.

### Out of scope

- Source code changes to `src/**`.
- Deleting or mutating files under `etc/1-source-files`.
- Organizing non-artwork sidecar content into the audio library.
- Transcoding unsupported audio formats or converting MP3 to FLAC.
- Using legacy `etc/_1-source-files` as input for this pass.

## 4. Functional Requirements

- **FR-1** The workflow MUST treat `etc/1-source-files` as the canonical source root.
- **FR-2** The workflow MUST inventory every top-level source root, supported audio file, unsupported audio file, audio-only directory, audio-plus-sidecar directory, and failed summary directory before organization.
- **FR-3** The workflow MUST run `summarize-source-dir --format json` on every direct audio-only folder that the current CLI accepts.
- **FR-4** The workflow MUST create audio-only staging folders for audio-plus-sidecar directories before running `summarize-source-dir`, `fix-tags`, or `organize-files` on those albums.
- **FR-5** The workflow MUST inventory album cover image candidates and associate them with the selected album batch before copying audio.
- **FR-6** When a selected album batch is copied from source or staging into `etc/3-organized-files`, the workflow MUST also copy its associated album cover image files into the final organized album directory.
- **FR-7** The workflow MUST preserve source files and MUST NOT delete sidecars; non-artwork sidecars MAY be recorded in audit output as excluded content.
- **FR-8** The workflow MUST classify duplicate album batches, including parallel FLAC/MP3 batches, repeated discography copies, and already-organized destinations.
- **FR-9** When duplicate batches represent the same album and track set, the workflow MUST prefer FLAC over MP3 unless the FLAC batch is incomplete, corrupt, or has materially worse metadata.
- **FR-10** The workflow MUST run `organize-files --format json` without `--execute` for every selected source or staging folder before copying.
- **FR-11** The workflow MUST execute `organize-files --execute` only after dry-run JSON is reviewed and destinations are collision-free.
- **FR-12** If metadata prevents clean organization, the workflow MUST use `fix-tags` into a staging folder or mark the album as blocked with the exact missing fields.
- **FR-13** Existing files in `etc/3-organized-files` MUST be treated as conflicts or already-organized output, not silently overwritten.
- **FR-14** Unsupported audio files (`.ape`, `.ogg`) MUST be reported as skipped because current subcommands support only `.flac` and `.mp3`.
- **FR-15** At the end of the workflow, the workflow MUST produce a Markdown report that breaks down organized albums by final path, album artist, album, track count, audio format, bitrate summary, and whether album artwork is present.

## 5. Non-Functional Requirements

- **NFR-1 (lint after every file modification)** After every modification to repository text files, `npm run lint` MUST be run if source files changed; if only spec/docs files changed, record why lint is not applicable.
- **NFR-2 (no `npx`)** `npx` is forbidden in all forms. Use `npm run <script>`, `node build/dist/index.js`, or existing project binaries only.
- **NFR-3 (build before CLI use)** `npm run build` MUST exit 0 before using `node build/dist/index.js`.
- **NFR-4 (source preservation)** Files under `etc/1-source-files` MUST remain read-only for the entire workflow.
- **NFR-5 (auditability)** Summary, staging, dry-run, execute, and skipped-file JSON artifacts SHOULD be retained until final verification is complete.
- **NFR-6 (scope discipline)** Implementation MUST NOT modify `src/**`, `package.json`, or dependency lockfiles.

## 6. Acceptance Criteria

1. Inventory output accounts for 55 top-level roots, 8,141 supported audio files, 2 unsupported audio files, 1,618 image files, 221 direct audio-only directories, and 587 audio-plus-sidecar directories.
2. All CLI-accepted audio-only folders have saved `summarize-source-dir --format json` output.
3. All audio-plus-sidecar folders selected for organization are represented by audio-only staging folders before CLI processing.
4. Every executed copy has prior saved dry-run JSON and matching execute JSON.
5. Every selected album with associated cover images has those images copied into its final organized album directory.
6. `etc/3-organized-files` contains one selected copy per organized track and excludes lower-quality duplicate batches.
7. Final verification summarizes each organized album folder successfully or records a blocked/skipped reason.
8. A final Markdown report exists and includes album path, albumartist, album, track count, format, bitrate summary, artwork-present status, and copied artwork filenames for each organized album.
