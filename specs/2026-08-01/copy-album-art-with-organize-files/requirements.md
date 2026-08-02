# Requirements: Copy Album Art with Organize Files

## 1. Background

`manage-albums organize-files` currently accepts only flat `.flac` and `.mp3`
sources. Adjacent image files are rejected unless `ignoreNonAudioFiles` is
enabled, in which case they are omitted entirely. Real album intake folders
commonly contain `cover.png`, `folder.jpg`, scans, or other raster images that
belong with the organized album.

The 2026-08-01 spec `migrate-fix-tags-into-organize-files` established one
combined metadata-repair and organization plan, staged destination publication,
and exact-file collision strategies. Album-art copying must join that plan
without weakening its source-preservation or preflight guarantees.

## 2. Goal

Make `manage-albums organize-files` automatically discover direct-sibling
raster image files, show their final album-root destinations in dry-run output,
and copy them with the organized audio during execution. The behavior MUST be
consistent through CLI, REST, GraphQL, and MCP surfaces.

## 3. Scope

### In scope

- Album organization discovery, planning, output types, collision handling,
  and execution under `src/lib/albums/**`.
- CLI output/help for `manage-albums organize-files`.
- Existing REST, GraphQL, and MCP organize-files result contracts.
- Focused album organization tests, generated GraphQL schema, album Bruno
  requests, active documentation, and the album-organization skill.

### Out of scope

- Recursive discovery or copying images from nested directories.
- Extracting embedded artwork from audio, image decoding, validation,
  transcoding, resizing, renaming, ranking, or deduplication.
- Copying cue sheets, playlists, text documents, archives, or other sidecars.
- Adding an option to disable album-art discovery.
- Changing summarize, validate, list, audiobook, or historical-spec behavior.
- Deleting source files, destination albums, or superseded artwork.

## 4. Functional Requirements

- **FR-1 (image discovery)** `organizeAlbumFiles` MUST recognize direct regular
  files with case-insensitive `.avif`, `.bmp`, `.gif`, `.jpeg`, `.jpg`, `.png`,
  `.tif`, `.tiff`, or `.webp` extensions as album art.
- **FR-2 (strict sidecar behavior)** Recognized album-art files MUST NOT require
  `ignoreNonAudioFiles`; all other non-audio entries MUST retain the existing
  strict error behavior unless `ignoreNonAudioFiles` is true.
- **FR-3 (album destination)** Each recognized image MUST preserve its basename
  and resolve directly under the single effective `Artist/Album` directory,
  never under a `Disc NN` directory.
- **FR-4 (effective metadata)** Album-art destinations MUST use the same
  effective artist and album values produced after metadata repair for the
  selected audio tracks.
- **FR-5 (dry-run contract)** Dry run MUST return one explicit row per selected
  audio file and per discovered album-art file; every row MUST include
  `fileType: "audio" | "albumArt"`, `action`, `filename`, and `destination`.
- **FR-6 (typed rows)** Audio rows MUST retain their current metadata and
  `tagChanges` fields. Album-art rows MUST omit audio-only fields in JSON and
  expose them as nullable fields in GraphQL rather than fabricating metadata.
- **FR-7 (deterministic order)** Audio rows MUST retain their current order and
  album-art rows MUST follow them in case-insensitive basename order so dry-run
  and execution results compare deterministically.
- **FR-8 (selection semantics)** `limit` MUST continue to select only audio
  files. Album art MUST be included whenever at least one audio row remains
  after selection and filtering, and MUST be omitted when no audio row remains.
- **FR-9 (preflight collisions)** Audio and album-art destinations MUST be
  checked together for duplicate paths, existing album directories, and exact
  existing files before execution writes its first destination.
- **FR-10 (collision strategies)** `destinationStrategy` MUST apply to exact
  album-art files with the same `error`, `ignore`, and `overwrite` actions used
  for audio, without deleting or replacing unrelated album contents.
- **FR-11 (safe execution)** Execution MUST copy image bytes through a unique
  temporary sibling and atomic publication path, MUST NOT invoke audio metadata
  writers for images, and MUST clean temporary files on success and failure.
- **FR-12 (source preservation)** Dry run MUST write nothing, and execution MUST
  leave every source audio, image, and unrelated sidecar byte-for-byte unchanged.
- **FR-13 (transport parity)** CLI JSON/plaintext, REST, GraphQL, and MCP MUST
  expose the same image plan and actions without adding new input fields.
- **FR-14 (documentation)** Active album documentation, collections, and the
  album-organization skill MUST describe automatic album-art copying and must
  no longer instruct users to ignore recognized images.

## 5. Non-Functional Requirements

- **NFR-1 (lint after every source code file modification)** After every
  modification of a source code file, `npm run lint -- <modified-file>` MUST be
  run so only the modified file is targeted, and all findings MUST be fixed
  before moving on. Whole-codebase `npm run lint` MUST be reserved for final
  verification after all TypeScript modifications are complete.
- **NFR-2 (build)** `npm run build` MUST exit 0.
- **NFR-3 (tests)** `npm test` MUST exit 0 and final counts MUST be compared
  with the pre-flight baseline.
- **NFR-4 (no `npx`)** `npx` is forbidden in all forms. Use
  `./node_modules/.bin/<tool>` or `npm run <script>` exclusively.
- **NFR-5 (file size)** Every source or test file created or modified by this
  spec MUST contain at most 200 lines.
- **NFR-6 (type safety)** Implementation MUST preserve strict TypeScript and
  MUST NOT add `any` or TypeScript suppression directives.
- **NFR-7 (no dependencies)** `package.json` and `package-lock.json` MUST remain
  unchanged; extension-based discovery requires no image library.
- **NFR-8 (scope discipline)** Changes MUST remain within album organization
  source/tests, generated GraphQL schema, relevant album collections/docs,
  `.agents/skills/album-organization/SKILL.md`, and this spec.
- **NFR-9 (failure integrity)** Planning MUST finish before execution begins;
  sequential partial-publication behavior MAY remain, but the current file's
  temporary sibling MUST never remain after a failure.

## 6. Acceptance Criteria

1. A flat album containing audio plus recognized image extensions dry-runs
   successfully without `ignoreNonAudioFiles` and reports explicit image rows.
2. Execution publishes byte-identical images at `Artist/Album/<basename>` and
   leaves all source files unchanged.
3. Unsupported sidecars, multi-disc placement, zero-audio selection, collision
   strategies, cleanup failures, and every public transport are covered.
4. `npm run lint`, `npm run build`, and `npm test` exit 0; all touched
   source/test files are at most 200 lines and package files are unchanged.

