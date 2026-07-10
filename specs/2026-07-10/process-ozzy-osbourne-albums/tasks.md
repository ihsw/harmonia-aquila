# Tasks: process Ozzy Osbourne albums

> **Hard constraints (re-read before starting):** Do not start these tasks until
> the user explicitly authorizes execution. Do not modify the source package.
> Stay within the declared scope. Do not use `npx`. Run `npm run lint` after
> every file modification and fix issues before continuing. Mark each task
> `- [x]` immediately when it is finished, not at the end.

## Pre-flight

- [ ] Confirm explicit execution authorization before starting.
- [ ] Run `npm run build` and confirm `build/dist/index.js` is available.
- [ ] Create the dated run directories under
      `reports/album-organization-audit/2026-07-10-ozzy-osbourne-processing/`.
- [ ] Confirm `etc/3-organized-files/Ozzy Osbourne` and the source package state
      before processing; do not overwrite existing files.

## Inventory and candidate selection

- [ ] Record all 25 top-level candidates, 26 flat workflows, and 258 source
      FLAC files in
      `candidate-summary.json`.
- [ ] Stage each candidate's supported audio files into a flat
      `audio-only/<workflow-id>/` directory and exclude artwork, NFO files, and
      nested directory entries.
- [ ] Run and save a JSON `summarize-source-dir` result for every workflow.
- [ ] Identify multi-disc workflows, duplicate editions, incomplete metadata,
      unsupported files, and destination collisions.
- [ ] Select one source for each resolved album destination and record every
      blocked or deferred alternative.

## Metadata normalization

- [ ] For each selected workflow, decide whether source metadata is sufficient
      for the final `Ozzy Osbourne/<Album>/NN - Title.ext` layout.
- [ ] Create and validate a complete CSV manifest for every workflow requiring
      title, track-number, album, artist, or album-artist repair.
- [ ] Dry-run `fix-tags` for each manifest, review the JSON plan, and save it
      under the run's `dry-run/` directory.
- [ ] Execute only reviewed tag plans into `fixed-tags/`, never into the source
      package, and record the result immediately.

## Organization and artwork

- [ ] Dry-run `organize-files` for every selected workflow against
      `etc/3-organized-files` using the resolved `albumartist` strategy.
- [ ] Resolve or block every destination collision; do not use overwrite or
      silent merge behavior.
- [ ] Execute only collision-free organization plans and record counts and
      destination paths immediately.
- [ ] Copy selected front artwork after successful audio execution, without
      replacing an existing destination image.

## Verification and reporting

- [ ] Re-run the relevant JSON summaries and confirm each source track is
      organized once, blocked, or deferred with a recorded reason.
- [ ] Confirm organized folders use `Ozzy Osbourne/<Album>` and filenames have
      positive track numbers and nonempty titles.
- [ ] Run `npm run lint` after every file modification and fix all reported
      issues.
- [ ] Run the exact verification commands from `design.md`, including
      `npm run build`, and record their results.
- [ ] Complete the dated processing summary with source counts, selected and
      blocked workflows, metadata manifests, dry-run results, execute results,
      artwork results, and source-tree preservation confirmation.
