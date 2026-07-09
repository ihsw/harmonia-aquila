# Tasks: Process Reconciled Suitable Source Albums

> ## Hard constraints (re-read before starting)
>
> - **DO NOT START** processing until the user explicitly directs you to.
> - **No `npx`** in any form. Use `npm run <script>` or `./build/dist/index.js`.
> - **Only candidates in `candidates-executable.md` are executable.** Candidates in `candidates-blocked-duplicates.md` are blocked by design.
> - Preserve `etc/1-source-files/**` as read-only input.
> - Do not run `fix-tags` in this spec.
> - Do not edit `src/**`, `package.json`, or `package-lock.json` while executing this spec.
> - Mark the matching checklist item immediately when each phase is complete.

## Phase 1 - Pre-flight

- [x] Run `npm run build` and require exit 0.
- [x] Confirm `candidate-summary.json` reports 513 executable and 47 duplicate-destination blocked candidates.
- [x] Confirm `candidate-summary.json` includes `albumArtSummary` and per-candidate `albumArt.likelyAlbumArtFiles` arrays.
- [x] Create `reports/album-organization-audit/2026-07-09-source-dir-summaries/processing-runs/<run-id>/` with dry-run, execute, blocked, and summary subfolders.
- [x] Confirm all duplicate-destination candidates are excluded from the execute queue.

## Phase 2 - Execute destination-unique candidates

- [x] For every candidate in `candidates-executable.md`, run an immediate dry-run using its listed dry-run mode.
- [x] Save every dry-run artifact under `processing-runs/<run-id>/dry-runs/`.
- [x] Execute only candidates whose immediate dry-run succeeds.
- [x] Save every execute artifact under `processing-runs/<run-id>/execute/`.
- [x] Copy every file listed in each successful candidate's `albumArt.likelyAlbumArtFiles` array into that candidate's destination album folder.
- [x] Save every artwork-copy artifact under `processing-runs/<run-id>/artwork/`.
- [x] Save blocked artifacts for candidates that fail dry-run or execute.
- [x] Save blocked artifacts for candidates whose artwork destination filenames already exist.

## Phase 3 - Record duplicate-destination blocks

- [x] Write blocked artifacts for all 47 candidates in `candidates-blocked-duplicates.md`.
- [x] Confirm no duplicate-destination candidate has execute output.

## Phase 4 - Final reporting

- [x] Write `processing-summary.json` with queued, processed, failed, blocked, and artwork-copy counts.
- [x] Write `processing-summary.md` with links to per-candidate artifacts.
- [x] Update the dated audit report with a link to the processing summary.
- [x] Update `source-dir-summaries-json/index.json` with the processing run summary path.

## Phase 5 - Verification

- [x] Confirm every executable candidate has execute-success JSON or blocked JSON.
- [x] Confirm every executed candidate with likely album art has artwork-copy success JSON or blocked JSON.
- [x] Confirm every duplicate-destination candidate has blocked JSON and no execute JSON.
- [x] Confirm `git --no-pager diff --stat src package.json package-lock.json` is empty.
- [x] Record final `find etc/3-organized-files -mindepth 2 -type d | wc -l` in the processing summary.
