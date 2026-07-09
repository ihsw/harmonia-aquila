# Requirements: Process Suitable Source Albums

## 1. Background

The audit report in `reports/album-organization-audit/2026-07-09-source-dir-summaries/` refined `etc/1-source-files` into 65 suitable source album candidates after successful `summarize-source-dir` and `organize-files` dry-runs against `etc/3-organized-files`.

`organize-files` now fails when the resolved destination album folder already exists. This means a batch pass must treat duplicate resolved `Artist/Album` folders as blocked before any `--execute` copy, even when each source folder passed an individual dry-run.

One duplicate destination group exists in the suitable set: `Cascada/Cascada - Original Me (Includes Greatest Hits)` maps from both CD1 and CD2. Those two source folders are out of the executable batch until a separate multi-disc or naming decision is made.

## 2. Goal

Process the 63 immediately executable suitable candidates from `etc/1-source-files` into `etc/3-organized-files` with `harmonia-aquila organize-files --execute`, preserving source files and retaining JSON audit artifacts for every dry-run, execution, and blocked candidate.

## 3. Scope

### In scope

- The 63 executable candidates listed in `design.md` §4.1 and `tasks.md` §3.1.
- The two duplicate-destination candidates listed in `design.md` §4.2 and `tasks.md` §3.2 as blocked.
- Existing report artifacts under `reports/album-organization-audit/2026-07-09-source-dir-summaries/`.
- New execution artifacts under the same dated report folder.
- Final organized audio files under `etc/3-organized-files`.

### Out of scope

- Any source folder not listed in `tasks.md` §3.1 or §3.2.
- Running `fix-tags` or repairing metadata.
- Editing, deleting, or moving anything under `etc/1-source-files`.
- Forcing duplicate albums into an existing destination folder.
- Source code changes under `src/**`.
- Dependency changes.

## 4. Functional Requirements

- **FR-1** The workflow MUST execute only the 63 executable candidates listed in `tasks.md` §3.1.
- **FR-2** Before each execution, the workflow MUST rerun `organize-files` without `--execute` against `etc/3-organized-files` and save the JSON output.
- **FR-3** The workflow MUST run `organize-files --execute` only after the immediate dry-run exits 0.
- **FR-4** The workflow MUST save the execute JSON output for every successfully copied candidate.
- **FR-5** If a candidate fails its immediate dry-run or execute command, it MUST be marked blocked with the command, exit code, and stderr saved; it MUST NOT be repaired in this spec.
- **FR-6** The two `Cascada/Cascada - Original Me (Includes Greatest Hits)` candidates MUST remain blocked because they resolve to the same destination album folder.
- **FR-7** The workflow MUST NOT process any candidate whose resolved destination album folder already exists at the start of that candidate's dry-run.
- **FR-8** The final report update MUST include processed, blocked, and skipped counts plus links to dry-run and execute artifacts.

## 5. Non-Functional Requirements

- **NFR-1 (no `npx`)** `npx` is forbidden in all forms; use `npm run <script>` or `./build/dist/index.js`.
- **NFR-2 (build before CLI use)** `npm run build` MUST exit 0 before using `./build/dist/index.js`.
- **NFR-3 (source preservation)** Files under `etc/1-source-files` MUST remain read-only.
- **NFR-4 (auditability)** Dry-run, execute, blocked, and final report artifacts MUST be retained under the dated report folder.
- **NFR-5 (scope discipline)** Implementation MUST NOT modify `src/**`, `package.json`, or `package-lock.json`.
- **NFR-6 (resumability)** Each completed candidate MUST be marked in `tasks.md` immediately after it is processed or blocked.

## 6. Acceptance Criteria

1. `tasks.md` lists exactly 63 executable candidates and 2 duplicate-destination blocked candidates.
2. Every executed candidate has a saved immediate dry-run JSON artifact and execute JSON artifact.
3. The duplicate `Cascada/Cascada - Original Me (Includes Greatest Hits)` candidates are documented as blocked, not executed.
4. The dated report folder contains a final processing summary linking all new artifacts.
5. `git --no-pager diff --stat src package.json package-lock.json` is empty.
