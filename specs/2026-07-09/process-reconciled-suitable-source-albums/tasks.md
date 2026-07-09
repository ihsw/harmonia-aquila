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

- [ ] Run `npm run build` and require exit 0.
- [ ] Confirm `candidate-summary.json` reports 513 executable and 47 duplicate-destination blocked candidates.
- [ ] Create `reports/album-organization-audit/2026-07-09-source-dir-summaries/processing-runs/<run-id>/` with dry-run, execute, blocked, and summary subfolders.
- [ ] Confirm all duplicate-destination candidates are excluded from the execute queue.

## Phase 2 - Execute destination-unique candidates

- [ ] For every candidate in `candidates-executable.md`, run an immediate dry-run using its listed dry-run mode.
- [ ] Save every dry-run artifact under `processing-runs/<run-id>/dry-runs/`.
- [ ] Execute only candidates whose immediate dry-run succeeds.
- [ ] Save every execute artifact under `processing-runs/<run-id>/execute/`.
- [ ] Save blocked artifacts for candidates that fail dry-run or execute.

## Phase 3 - Record duplicate-destination blocks

- [ ] Write blocked artifacts for all 47 candidates in `candidates-blocked-duplicates.md`.
- [ ] Confirm no duplicate-destination candidate has execute output.

## Phase 4 - Final reporting

- [ ] Write `processing-summary.json` with queued, processed, failed, and blocked counts.
- [ ] Write `processing-summary.md` with links to per-candidate artifacts.
- [ ] Update the dated audit report with a link to the processing summary.
- [ ] Update `source-dir-summaries-json/index.json` with the processing run summary path.

## Phase 5 - Verification

- [ ] Confirm every executable candidate has execute-success JSON or blocked JSON.
- [ ] Confirm every duplicate-destination candidate has blocked JSON and no execute JSON.
- [ ] Confirm `git --no-pager diff --stat src package.json package-lock.json` is empty.
- [ ] Record final `find etc/3-organized-files -mindepth 2 -type d | wc -l` in the processing summary.
