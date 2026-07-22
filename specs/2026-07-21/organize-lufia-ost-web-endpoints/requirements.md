# Requirements: Organize Lufia OST via Web Endpoints

## 1. Background

The repository now has album web endpoints for summarizing, validating, and
organizing source album directories under a configured `web serve --source-dir`.
The current helper scripts in `bin/summarize-album-source-files-web.sh` and
`bin/validate-album-source-files-web.sh` demonstrate the desired local workflow:
start `web serve`, call one `/manage-albums` endpoint with `curl`, pretty-print
the JSON response, print the server log, and stop the server that was started.

This spec plans a cautious web-endpoint workflow for organizing the requested
Lufia OST source into `etc/albums/3-organized-files`. At spec time, the checked
tree contains `etc/albums/1-source-files/lufia2 ost`; it does not show
`etc/albums/1-source-files/lufia ost`. Implementation MUST verify the exact
requested source before executing any organizing request.

The work is operational and script-focused. It MUST use the `/manage-albums`
web server endpoints via `curl`; it MUST NOT bypass the web layer by calling the
CLI `manage-albums organize-files` command directly for the actual processing.

## 2. Goal

Create curl-based shell scripts and an execution procedure that validate,
dry-run, and then organize the intended Lufia OST source directory from
`etc/albums/1-source-files/<confirmed-lufia-dir>` into
`etc/albums/3-organized-files` through `web serve` `/manage-albums` endpoints,
while preserving source files and recording enough JSON output to audit the run.

## 3. Scope

### In scope

- Shell scripts under `bin/` that start `web serve`, call `/manage-albums`
  endpoints with `curl`, pretty-print JSON responses, and stop the server.
- Optional run artifacts under
  `reports/album-organization-runs/2026-07-21-lufia-ost-web/`.
- The destination tree `etc/albums/3-organized-files/**` for newly organized
  Lufia OST files only.
- The task checklist in this spec.

### Out of scope

- Editing source TypeScript, tests, package metadata, or web endpoint behavior.
- Modifying or deleting anything under `etc/albums/1-source-files/**`.
- Running `fix-tags`, writing metadata, or manually changing source album
  metadata.
- Using Bruno, direct CLI organize commands, or non-web code paths for the
  actual album organization.
- Overwriting or merging into existing destination album directories without
  explicit user approval.

## 4. Functional Requirements

- **FR-1** Implementation MUST confirm whether the intended source directory is
  exactly `etc/albums/1-source-files/lufia ost`; if it is absent, the workflow
  MUST stop before execution and ask for approval to use any alternate such as
  `lufia2 ost`.
- **FR-2** The script workflow MUST start `node . web serve` with
  `--source-dir etc/albums/1-source-files` and
  `--dest-dir etc/albums/3-organized-files`, defaulting to host
  `127.0.0.1` and port `3000`.
- **FR-3** The workflow MUST call `/manage-albums/validate` with `curl` for the
  confirmed source dir and MUST require all returned rows to have
  `status === "valid"` and empty `issues` before any organize dry-run or
  execute request.
- **FR-4** The workflow MUST call `/manage-albums/summarize-source-dir` with
  `curl` and save or print pretty JSON so the source contents are auditable
  before execution.
- **FR-5** The workflow MUST call `/manage-albums/organize-files` with `curl`
  once without `execute` for a dry-run and MUST inspect the JSON response before
  execution.
- **FR-6** The workflow MUST call `/manage-albums/organize-files` with `curl`
  and `"execute": true` only after validation and dry-run have succeeded.
- **FR-7** The organize requests MUST include `ignoreNonAudioFiles: true` and
  MUST use the default organization strategies unless validation/dry-run proves
  a strategy override is required and the user approves it.
- **FR-8** Shell scripts MUST use URL-encoded query parameters for GET requests
  and JSON request bodies for POST requests, with responses pretty-printed via
  the local Node runtime or another already-installed project tool.
- **FR-9** The server process started by any script MUST be stopped on success,
  failure, interrupt, or timeout; scripts MUST print captured server logs before
  removing temporary log files.
- **FR-10** Execution MUST leave `etc/albums/1-source-files/**` unchanged and
  MUST create only the expected organized Lufia destination files under
  `etc/albums/3-organized-files/**`.

## 5. Non-Functional Requirements

- **NFR-1 — Lint after every source code file modification** After every
  modification of a source code file (for example, a `.ts` file),
  `npm run lint -- <modified-file>` MUST be run so only the modified file is
  linted, and any reported issues MUST be fixed before moving on. This applies
  per source-code edit, not per-task. Whole-codebase `npm run lint` MUST be
  reserved for final verification after all TypeScript modifications are
  complete.
- **NFR-2 (No `npx`)** `npx` is forbidden in all forms. Any command line
  containing the substring `npx` is a violation. Use
  `./node_modules/.bin/<tool>` or `npm run <script>` exclusively.
- **NFR-3 (no new dependencies)** The workflow MUST NOT add dependencies.
- **NFR-4 (source preservation)** No files under `etc/albums/1-source-files/**`
  MAY be modified, renamed, deleted, or moved.
- **NFR-5 (web endpoint discipline)** Actual processing MUST use
  `/manage-albums` web endpoints via `curl`, not direct domain imports,
  direct CLI organize commands, or Bruno requests.
- **NFR-6 (safe writes)** Any destination collision or existing album directory
  error MUST block execution until the user explicitly approves a new plan.
- **NFR-7 (script safety)** Scripts MUST use `set -euo pipefail`, quote path
  variables, use traps for cleanup, and avoid name-based process killing.
- **NFR-8 (scope discipline)** Final diffs MUST be limited to the planned
  scripts, optional run artifacts, this spec checklist, and newly organized
  Lufia destination files.

## 6. Acceptance Criteria

1. The exact Lufia source directory is confirmed before any organize execute
   request is sent.
2. New curl-based scripts under `bin/` can validate, summarize, dry-run, and
   execute organization through `web serve` `/manage-albums` endpoints.
3. Validation and dry-run JSON show no blocking issues before execution.
4. Organized files appear only under `etc/albums/3-organized-files/**` and the
   source directory remains unchanged.
5. Any created scripts pass `bash -n` and a live curl smoke check.
