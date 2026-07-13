# Tasks: Process Renaming Audiobooks

> Do not execute a copy until the matching dry-run has succeeded during the
> current processing run.

## Pre-flight

- [ ] Run the recorded `crawl` command and compare it with
      `candidate-summary.json`.
- [ ] Confirm `etc/audiobooks/3-renamed-files/` is the intended destination.
- [ ] Confirm the blocked file still has `missing-metadata`; do not process it.

## Process candidates

- [ ] Repeat the dry-run for every row in `executable-workflows.md`.
- [ ] Execute each successful `copy-and-rename` operation.
- [ ] Validate each copied destination before proceeding to the next row.

## Closeout

- [ ] Re-run crawl on the source to confirm no source files changed.
- [ ] Review all 18 validated files in `3-renamed-files`.
- [ ] Keep the source and blocked file intact until human review is complete.
