# Requirements: Process Renaming Audiobooks

## Goal

Safely process the M4B files in
`etc/audiobooks/1-source-files/renaming/` into
`etc/audiobooks/3-renamed-files/` using only metadata-derived filenames.

## Scope

- Audit the source recursively with `manage-audiobooks crawl`.
- Copy only filename-invalid M4Bs whose `copy-and-rename` dry-run succeeds.
- Validate every copied destination with `manage-audiobooks validate`.
- Preserve all source files.

## Functional Requirements

- **FR-1** A fresh crawl MUST run before any copy. Its results MUST match
  `candidate-summary.json`, or processing MUST stop for review.
- **FR-2** Each ready candidate MUST have a successful `copy-and-rename`
  dry-run with the exact destination recorded in `executable-workflows.md`.
- **FR-3** Only the 18 `invalid-filename` candidates listed in
  `executable-workflows.md` MAY be copied.
- **FR-4** Every copy MUST target `etc/audiobooks/3-renamed-files/`, use
  `--execute`, and retain the source file.
- **FR-5** Each copied M4B MUST then pass `manage-audiobooks validate` at its
  recorded destination.
- **FR-6** `How To Win Friends & Influence People.m4b` MUST NOT be copied:
  its title metadata is absent.

## Safety Requirements

- Do not use overwrite behavior or rename source files in place.
- Stop on a destination conflict, unexpected crawl result, or failed
  validation; retain both source and any already-created destination for
  review.
- Do not infer or invent missing metadata.

## Acceptance Criteria

1. The source crawl reports 19 M4Bs: 18 `invalid-filename` and one
   `invalid-other` with `missing-metadata`.
2. All 18 recorded dry-runs report `would copy` with unique destinations.
3. All 18 executed copies validate successfully.
4. The blocked file remains in the source tree and no source M4B is modified
   or removed.
