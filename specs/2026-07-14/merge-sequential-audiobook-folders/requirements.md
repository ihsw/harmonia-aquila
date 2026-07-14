# Requirements: Merge Sequential Audiobook Folders

## 1. Background

`etc/audiobooks/1-source-files/done/The Wealth and Poverty of Nations A/`
contains 35 sequentially named MP3 files (`1.mp3` through `35.mp3`). The
2026-07-13 `process-done-audiobooks` audit found that every part lacks the
artist and album/title metadata required by `manage-audiobooks merge`.

The merge command groups only MP3 or M4B files in one parent directory that
share embedded artist and album-first title metadata by default. Its explicit
`--bypass-metadata` mode instead merges every source file into one M4B named
after the source folder, leaving consolidated metadata for a later
`set-metadata` step.

## 2. Goal

Merge each eligible sequential audio folder in
`etc/audiobooks/1-source-files/` into a staged M4B, then create one validated,
metadata-named final M4B in `etc/audiobooks/3-renamed-files/`, using
`manage-audiobooks merge --jobs 16` only after a successful dry run proves a
complete, unambiguous group.

## 3. Scope

### In scope

- Recursive discovery of folders containing at least two sequential `.mp3` or
  `.m4b` files under `etc/audiobooks/1-source-files/`.
- The current 35-part `done/The Wealth and Poverty of Nations A/` candidate.
- Staged merged M4Bs under `etc/audiobooks/2-aggregated-files/merged-sequential/`.
- M4B outputs under `etc/audiobooks/3-renamed-files/`.
- Saved audit, dry-run, execution, and validation JSON under
  `reports/audiobooks/merge-sequential-folders/`.

### Out of scope

- Guessing or writing missing source metadata.
- Processing standalone files, non-sequential groups, or non-audio sidecars.
- Overwriting an existing final M4B.
- Deleting, moving, or renaming source files or directories.
- TypeScript, CLI, dependency, or configuration changes.

## 4. Functional Requirements

- **FR-1** The workflow MUST inventory every candidate folder and identify
  sequential audio filenames using numeric sort order, recording every source
  path and extension.
- **FR-2** A candidate MUST contain at least two `.mp3` or `.m4b` files and
  every source file MUST have the same nonempty embedded artist and album or
  title metadata before it is eligible for a normal merge.
- **FR-3** The current `The Wealth and Poverty of Nations A/` folder MUST
  merge with `--bypass-metadata --jobs 16`, producing the staged filename
  `The Wealth and Poverty of Nations A.m4b`; no source metadata may be changed.
- **FR-4** Every eligible folder MUST first run
  `manage-audiobooks merge --jobs 16 --format json` without `--execute`; a
  bypass merge MUST also include `--bypass-metadata`. Its single `would merge`
  result MUST name the expected destination and source file count.
- **FR-5** A matching dry run MAY be repeated with `--execute --jobs 16` only
  when the staged destination is absent and the complete input set matches the
  audit.
- **FR-6** After a successful merge of `The Wealth and Poverty of Nations A/`,
  `manage-audiobooks set-metadata` MUST dry-run and then copy the staged M4B
  to `etc/audiobooks/3-renamed-files/David S Landes - The Wealth and Poverty
  of Nations: Why Some Are So Rich and Some So Poor.m4b` with title `The
  Wealth and Poverty of Nations: Why Some Are So Rich and Some So Poor`,
  author `David S Landes`, and narrator `Walter Dixon`.
- **FR-7** Every created final M4B MUST pass
  `manage-audiobooks validate --format json`, and its filename MUST exactly
  match embedded performer and title metadata.
- **FR-8** The workflow MUST stop on a destination collision, a dry-run
  mismatch, a merge or metadata-write failure, or validation failure; sources
  MUST remain intact.

## 5. Non-Functional Requirements

- **NFR-1 — Lint after every file modification** After every repository file
  modification, `npm run lint` MUST run and all reported issues MUST be fixed
  before continuing.
- **NFR-2 — No `npx`** `npx` is forbidden in all forms. Commands MUST use
  `npm run <script>` or `node build/dist/index.js`.
- **NFR-3 — Source preservation** Source files and directories MUST be
  read-only throughout this workflow.
- **NFR-4 — Destination safety** Existing destination paths MUST be treated as
  conflicts; no overwrite behavior MAY be used.
- **NFR-5 — Auditability** Preserve the inventory and every dry-run, execution,
  and validation JSON result under the reports directory until review is done.
- **NFR-6 — Scope discipline** Only the allowed source, destination, and
  reports paths in §3 MAY change; no tracked implementation, configuration, or
  dependency file MAY change.

## 6. Acceptance Criteria

1. The audit records the 35 sequential MP3s in `The Wealth and Poverty of
   Nations A/` and whether each has the required metadata.
2. The current missing-metadata candidate dry-runs and executes only with the
   explicit `--bypass-metadata` flag.
3. Every eligible execution uses `--jobs 16`, creates an absent staging M4B,
   and produces a successful final validation result.
4. The final Wealth and Poverty M4B has the supplied title, author, and
   narrator metadata.
5. All source files remain present and unchanged after the workflow.
