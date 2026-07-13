# Tasks: Process Renaming Audiobooks

> Do not execute a copy until the matching dry-run has succeeded during the
> current processing run.

## Pre-flight

- [x] Run the recorded `crawl` command and compare it with
      `candidate-summary.json`.
- [x] Confirm `etc/audiobooks/3-renamed-files/` is the intended destination.
- [x] Confirm the blocked file still has `missing-metadata`; do not process it.

## Process candidates

- [x] Repeat the dry-run for every row in `executable-workflows.md`.
- [x] Execute each successful `copy-and-rename` operation.
- [x] Validate each copied destination before proceeding to the next row.

## Closeout

- [x] Re-run crawl on the source to confirm no source files changed.
- [x] Review all 18 validated files in `3-renamed-files`.
- [x] Keep the source and blocked file intact until human review is complete.
