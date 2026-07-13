# Requirements: Convert Graham Greene Audiobooks

## 1. Background

The 19 MP3 audiobook files in
`etc/audiobooks/1-source-files/renaming/Graham Greene/` have embedded
`artist=Graham Greene` and unique album titles. They need M4B copies in
`etc/audiobooks/3-renamed-files/` whose filenames exactly match the metadata
written by `manage-audiobooks convert-file`.

This is a data-processing workflow, not a source-code change. The
`convert-file` command uses Docker-backed `m4b-tool merge`, preserves the MP3
source, refuses destination overwrites, and validates the output M4B.

## 2. Goal

Produce one validated, metadata-named M4B for each of the 19 Graham Greene MP3
sources in `etc/audiobooks/3-renamed-files/`, without modifying or deleting a
source file or overwriting an existing destination.

## 3. Scope

### In scope

- The 19 source MP3s under
  `etc/audiobooks/1-source-files/renaming/Graham Greene/`.
- New M4B destinations in `etc/audiobooks/3-renamed-files/`.
- The recorded `convert-file` dry runs, executions, and validations.

### Out of scope

- Editing source audio metadata or renaming source MP3s.
- Processing any non-Graham-Greene audiobook source.
- Overwriting existing M4B destinations.
- Changes to TypeScript source, dependencies, or CLI behavior.

## 4. Functional Requirements

- **FR-1** The workflow MUST pass all 19 listed source MP3s as repeated
  `--file-name` options to one `manage-audiobooks convert-file` invocation
  with `--jobs 4` and `--concurrency 4`.
- **FR-2** The batch MUST first complete a successful dry run whose 19
  `would convert` rows match the manifest in `design.md`.
- **FR-3** The successful dry-run command MUST be rerun with `--execute` to
  create its M4Bs in `etc/audiobooks/3-renamed-files/`.
- **FR-4** Each created M4B MUST pass `manage-audiobooks validate` immediately
  after conversion.
- **FR-5** A failed dry run MUST prevent execution. If the parallel execution
  reports any failed conversion, the workflow MUST stop before validation and
  retain all created destinations for review.
- **FR-6** The source MP3s MUST remain present and unmodified.

## 5. Non-Functional Requirements

- **NFR-1 — Lint after every file modification** After every repository file
  modification, `npm run lint` MUST run and any reported issue MUST be fixed
  before the change is considered complete.
- **NFR-2 — No `npx`** `npx` is forbidden in all forms. Commands MUST use
  `npm run <script>` or `node build/dist/index.js`.
- **NFR-3 — Safe destinations** The destination directory MUST contain no
  target filename before its corresponding execution begins.
- **NFR-4 — Auditability** Dry-run, execution, and validation JSON output MUST
  be retained in the processing record until human review is complete.
- **NFR-5 — Scope discipline** Only the source and destination paths in §3 MAY
  be changed by the processing workflow.

## 6. Acceptance Criteria

1. All 19 manifest rows have a saved dry-run result with `action` equal to
   `would convert`.
2. All 19 expected M4B files exist in `etc/audiobooks/3-renamed-files/`.
3. Every created destination returns `"valid": true` from
   `manage-audiobooks validate --format json`.
4. All 19 source MP3s remain in
   `etc/audiobooks/1-source-files/renaming/Graham Greene/`.
5. No pre-existing file in `etc/audiobooks/3-renamed-files/` is overwritten.
