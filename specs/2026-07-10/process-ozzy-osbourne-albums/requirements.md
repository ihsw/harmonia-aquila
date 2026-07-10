# Requirements: process Ozzy Osbourne albums

Generated: 2026-07-10

## Scope

Create a safe, staged plan to process the 25 album candidate folders in
`etc/1-source-files/Ozzy Osbourne - Discography [FLAC Songs] [PMEDIA] ⭐️` into
`etc/3-organized-files/Ozzy Osbourne`. The source package contains 258 FLAC
tracks, artwork, NFO files, nested multi-disc folders, duplicate editions, and
two quality variants of `Ordinary Man`.

### In scope

- Auditing every candidate with JSON metadata summaries.
- Flattening audio-only staging inputs without modifying the source package.
- Resolving album, artist, album-artist, track number, and title metadata.
- Dry-running and then executing collision-free tag and organization plans.
- Copying each selected front cover after successful audio organization.
- Recording selected, blocked, duplicate, and executed candidates in dated
  audit artifacts.

### Out of scope

- Modifying, deleting, renaming, or transcoding files under `etc/1-source-files`.
- Merging duplicate editions into a new release or choosing between editions
  without an explicit quality and track-list review.
- Repairing corrupt audio, inventing missing recordings, or processing
  unsupported formats.
- Replacing files already present under `etc/3-organized-files`.

## Functional requirements

1. The source package MUST remain read-only. All copies, tag writes, and
   organization output MUST use staging or destination paths outside the source.
2. Each candidate MUST be audited before processing. The audit MUST record its
   source path, audio count, extension set, nested-directory state, metadata
   consistency, likely album name, and artwork candidates.
3. Each `fix-tags` and `organize-files` input MUST be a flat directory containing
   only supported `.flac` or `.mp3` files. Sidecars and nested disc folders MUST
   be excluded from audio staging.
4. Multi-disc releases MUST be processed as separate disc workflows unless a
   reviewed manifest and unique destination naming preserve disc boundaries.
   `LIVE & LOUD` and `The Essential Ozzy Osbourne` MUST receive explicit
   multi-disc handling rather than being passed recursively to the CLI. The
   incomplete `LIVE & LOUD` source MUST remain blocked, and Essential discs
   MUST use distinct destination album names unless they are deliberately
   combined with a complete track-number manifest.
5. The final artist directory MUST be `Ozzy Osbourne`. The selected filename
   strategy MUST be `albumartist` when its value is consistently `Ozzy
   Osbourne`; otherwise tags MUST be repaired in staging before organization.
6. Every workflow MUST dry-run `fix-tags` before execution whenever tags or
   titles require repair. A metadata manifest MUST provide complete
   `filename,artist,album,trackNumber,title` coverage when source titles or
   track numbers are missing or unreliable.
7. Every workflow MUST dry-run `organize-files` immediately before execution.
   The planned result MUST be collision-free and human-readable as
   `Ozzy Osbourne/<Album>/NN - Title.ext`.
8. Existing destination folders or predicted filenames MUST block execution.
   The workflow MUST NOT use overwrite behavior or silently merge releases.
9. The selected front artwork MUST be copied only after its audio workflow
   succeeds, and MUST NOT replace an existing destination artwork file.
10. The processing report MUST identify every candidate as executed, blocked,
    deferred, or duplicate, including the reason and source path.

## Non-functional requirements

- NFR-1 — Lint after every file modification. `npm run lint` MUST be run after
  every file modification made during execution, and reported issues MUST be
  fixed before the change is complete.
- NFR-2 — No `npx`. All commands MUST use repository scripts or
  `./build/dist/index.js`; `npx` MUST NOT appear in any workflow.
- NFR-3 — Reversible processing. The source tree MUST be preserved and all
  staging and audit outputs MUST be dated and reviewable.
- NFR-4 — No new dependencies. The workflow MUST use the existing CLI and
  repository tooling.
- NFR-5 — Validation. `npm run build` MUST exit 0 before processing, and
  every executed workflow MUST have successful JSON dry-run output recorded.
- NFR-6 — Scope discipline. No files outside the declared dated audit,
  staging, destination, and spec paths MAY be modified.
- NFR-7 — Failure visibility. Invalid metadata, unsupported files, read errors,
  duplicate destinations, and missing artwork MUST be recorded as blockers;
  they MUST NOT be silently skipped.

## Success criteria

- Every source audio file is either organized once, explicitly blocked, or
  explicitly deferred with a reason.
- No source file is changed.
- Each organized album has normalized metadata, collision-free filenames, and
  selected artwork where available.
- A rerun of the recorded dry-run commands produces predictable plans without
  overwrite behavior.
