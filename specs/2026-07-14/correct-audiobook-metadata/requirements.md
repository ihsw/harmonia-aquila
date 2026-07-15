# Requirements: Correct Audiobook Metadata

## 1. Background

Two known audiobook sources under `etc/audiobooks/1-source-files/` have
deliberately established identity metadata but cannot yet both produce valid
library entries. `How To Win Friends & Influence People.m4b` needs corrected
M4B metadata. `Angry White Men.m4a` also lacks the metadata that
`manage-audiobooks convert-file` currently requires before it can create an
M4B.

The 2026-07-13 `correct-missing-audiobook-metadata` spec established the safe
M4B-copy workflow. This spec extends the conversion workflow with explicitly
supplied metadata, then creates only the two requested final M4Bs in
`etc/audiobooks/3-renamed-files/`.

## 2. Goal

Produce two validated M4Bs whose filenames exactly match embedded author and
title metadata, preserve both sources unchanged, and store each requested
narrator as writer metadata.

## 3. Scope

### In scope

- `src/commands/manage-audiobooks/convert-file.ts`.
- `src/commands/manage-audiobooks/set-metadata.ts`.
- `src/commands/manage-audiobooks/helpers/m4b-tool.ts`, only if needed to pass
  established conversion metadata to `m4b-tool`.
- The two source files and new M4B staging/final files described in
  `design.md` §2.
- Saved dry-run, execution, and validation JSON records.

### Out of scope

- Modifying, renaming, or deleting either source file.
- Processing any source other than the two manifest rows.
- Changing the metadata behavior of ordinary `convert-file` invocations that
  omit the new explicit metadata options.
- Overwriting an existing staging or final destination.
- Adding dependencies or changing unrelated commands.

## 4. Functional Requirements

- **FR-1** `convert-file` MUST accept a complete explicit metadata override
  consisting of author, title, and narrator for a source whose embedded artist
  or album metadata is missing.
- **FR-2** `convert-file` MUST reject partial explicit metadata overrides and
  MUST preserve its existing embedded-metadata behavior when no override is
  supplied.
- **FR-3** The conversion dry run and execution result MUST report the
  effective performer and title used for its metadata-derived M4B filename.
- **FR-4** The workflow MUST create an intermediate M4B from
  `done/Angry White Men.m4a` with `author=Michael Kimmel` and
  `title=Angry White Men`, then create the final M4B with
  `narrator=Aaron Williamson`.
- **FR-5** The workflow MUST create the final M4B from
  `renaming/How To Win Friends & Influence People.m4b` with
  `author=Dale Carnegie`, `title=How to Win Friends and Influence People`, and
  `narrator=Andrew MacMillan`.
- **FR-6** The final destinations MUST be exactly the two filenames in
  `design.md` §2 and each MUST pass `manage-audiobooks validate`.
- **FR-7** Every destructive-capable operation MUST complete a matching dry run
  before execution and MUST stop on a metadata mismatch or destination
  collision.
- **FR-8** `set-metadata` MUST preserve explicitly supplied metadata
  capitalization in M4B album, artist, and writer tags.

## 5. Non-Functional Requirements

- **NFR-1 — Lint after every source code file modification** After every source
  code file modification, `npm run lint` MUST run and all reported issues MUST
  be fixed before continuing.
- **NFR-2 — No `npx`** `npx` is forbidden in all forms. Commands MUST use
  `npm run <script>` or `node build/dist/index.js`.
- **NFR-3 — Source preservation** Both source files MUST remain present and
  byte-for-byte unchanged.
- **NFR-4 — Destination safety** No command MAY overwrite an existing
  intermediate or final file.
- **NFR-5 — Auditability** Retain dry-run, execution, and validation JSON
  output until human review is complete.
- **NFR-6 — Scope discipline** Only the files listed in §3 and generated
  paths in `design.md` §2 MAY change.
- **NFR-7 — Build** `npm run build` MUST exit 0 after the command change.

## 6. Acceptance Criteria

1. A conversion with all explicit metadata values produces the expected
   metadata-derived filename; a partial override fails before conversion.
2. `Dale Carnegie - How to Win Friends and Influence People.m4b` validates
   with performer Dale Carnegie and the stated title.
3. `Michael Kimmel - Angry White Men.m4b` validates with performer Michael
   Kimmel and title Angry White Men.
4. The final M4Bs retain the requested writer metadata for Andrew MacMillan
   and Aaron Williamson, respectively.
5. Both source files remain unchanged and no existing destination is replaced.
