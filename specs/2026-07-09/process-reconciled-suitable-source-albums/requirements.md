# Requirements: Process Reconciled Suitable Source Albums

## 1. Background

The 2026-07-09 album audit was updated after adding `organize-files --ignore-non-audio-files` and reconciling suitable candidates against existing `etc/3-organized-files` album folders. The current report now lists 560 suitable candidates and 152 already-organized source folders.

This spec targets only the current suitable set from `reports/album-organization-audit/2026-07-09-source-dir-summaries/source-dir-summaries-json/index.json`. Within that set, 513 candidates resolve to unique destination album folders and 47 candidates are individually processable but collide with another candidate's `Artist/Album` destination.

## 2. Goal

Process the 513 destination-unique suitable candidates from `etc/1-source-files` into `etc/3-organized-files`, while leaving the 47 duplicate-destination candidates blocked for a separate duplicate-resolution pass.

## 3. Scope

### In scope

- The 513 candidates listed in `candidates-executable.md`.
- The 47 duplicate-destination candidates listed in `candidates-blocked-duplicates.md` as blocked.
- Existing report artifacts under `reports/album-organization-audit/2026-07-09-source-dir-summaries/`.
- New processing artifacts under that same dated report folder.
- New organized audio files under `etc/3-organized-files`.

### Out of scope

- Any source folder not listed in this spec's candidate files.
- Running `fix-tags` or repairing metadata.
- Editing, deleting, or moving files under `etc/1-source-files`.
- Merging duplicate source folders into one destination album folder.
- Source code or dependency changes.

## 4. Functional Requirements

- **FR-1** The workflow MUST execute only candidates listed in `candidates-executable.md`.
- **FR-2** Candidates listed in `candidates-blocked-duplicates.md` MUST NOT be executed in this spec.
- **FR-3** Before each execute, the workflow MUST rerun `organize-files` dry-run using the dry-run mode listed for that candidate: strict or `--ignore-non-audio-files`.
- **FR-4** The workflow MUST run `organize-files --execute` only after the immediate dry-run exits 0.
- **FR-5** If a candidate fails dry-run or execute, it MUST be marked blocked with command, exit code, stdout, and stderr saved.
- **FR-6** Each successful candidate MUST have dry-run and execute JSON artifacts saved under the processing run folder.
- **FR-7** The final report MUST link the processing run summary and update processed/blocked counts.

## 5. Non-Functional Requirements

- **NFR-1 (no `npx`)** `npx` is forbidden in all forms; use `npm run <script>` or `./build/dist/index.js`.
- **NFR-2 (build before CLI use)** `npm run build` MUST exit 0 before CLI processing.
- **NFR-3 (source preservation)** `etc/1-source-files/**` MUST remain read-only input.
- **NFR-4 (auditability)** Dry-run, execute, blocked, and summary artifacts MUST be retained.
- **NFR-5 (scope discipline)** No changes to `src/**`, `package.json`, or `package-lock.json` are part of this processing spec.

## 6. Acceptance Criteria

1. `candidate-summary.json` reports 560 suitable candidates, 513 executable candidates, and 47 duplicate-destination blocked candidates.
2. Every executable candidate has either execute-success JSON or blocked JSON in the processing run folder.
3. No duplicate-destination candidate has execute JSON.
4. The dated audit report links to the processing run summary.
5. `git --no-pager diff --stat src package.json package-lock.json` is empty after execution.
