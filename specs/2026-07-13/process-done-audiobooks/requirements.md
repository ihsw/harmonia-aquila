# Requirements: Process Done Audiobooks

## 1. Background

`etc/audiobooks/1-source-files/done/` contains 234 readable audio files. Its
metadata audit identifies 16 uniquely named M4B files suitable for
`copy-and-rename`, five complete M4B or MP3 sets suitable for `merge`, no
standalone files currently suitable for `convert-file`, and 40 unsuitable
inputs.

The destination is `etc/audiobooks/3-renamed-files/`. This is a media
processing workflow: source files remain intact, and every accepted M4B must
have a filename that exactly matches its embedded performer and title.

## 2. Goal

Create and validate metadata-named M4B copies for every uniquely actionable
candidate in the `done` source tree, while preserving and explicitly
excluding ambiguous or metadata-incomplete candidates.

## 3. Scope

### In scope

- The actionable M4B and MP3 inputs listed in `design.md`.
- New M4B destinations in `etc/audiobooks/3-renamed-files/`.
- Saved dry-run, execution, and validation JSON artifacts.

### Out of scope

- Changing embedded metadata in any source or destination.
- Guessing missing performer or title metadata.
- Selecting or merging the 22 White Trash M4B parts.
- Processing inputs outside `etc/audiobooks/1-source-files/done/`.
- Overwriting existing destination files or modifying source files.
- TypeScript, dependency, or CLI behavior changes.

## 4. Functional Requirements

- **FR-1** The 16 unique M4B candidates in `design.md` §2.1 MUST be
  dry-run, copied with `copy-and-rename --execute`, and validated individually.
- **FR-2** The five M4B or MP3 sets in `design.md` §2.2 MUST each be dry-run and
  merged with `manage-audiobooks merge --execute --jobs 4`.
- **FR-3** Every created destination MUST pass
  `manage-audiobooks validate --format json`.
- **FR-4** No `convert-file` action MUST run during this workflow because the
  audit found no complete single-file non-M4B candidate.
- **FR-5** The two already-valid M4Bs in `design.md` §2.4 MUST be copied with
  no-clobber behavior into `etc/audiobooks/3-renamed-files/` and validated.
- **FR-6** The 38 missing-metadata inputs in `design.md` §2.4 MUST remain
  unprocessed.
- **FR-7** The workflow MUST stop on a dry-run mismatch, destination conflict,
  merge failure, or validation failure.

## 5. Non-Functional Requirements

- **NFR-1 — Lint after every file modification** After every repository file
  modification, `npm run lint` MUST run and all reported issues MUST be fixed
  before continuing.
- **NFR-2 — No `npx`** `npx` is forbidden in all forms. Commands MUST use
  `npm run <script>` or `node build/dist/index.js`.
- **NFR-3 — Source preservation** Source paths MUST be treated as read-only;
  no source file MAY be renamed, moved, or overwritten.
- **NFR-4 — Destination safety** An existing destination MUST be treated as a
  conflict; no overwrite flag MAY be used.
- **NFR-5 — Auditability** Save JSON output for every dry run, execution, and
  validation until human review is complete.

## 6. Acceptance Criteria

1. All 16 copy-and-rename candidates, five merged outputs, and two direct
   copies exist under
   `etc/audiobooks/3-renamed-files/` and validate successfully.
2. Every created filename exactly matches its M4B performer and title metadata.
3. All source files remain in `etc/audiobooks/1-source-files/done/`.
4. No unsuitable candidate is copied, converted, merged, or overwritten.
