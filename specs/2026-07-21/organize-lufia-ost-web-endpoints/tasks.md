# Tasks: Organize Lufia OST via Web Endpoints

> ## Hard constraints (re-read before starting)
>
> - **DO NOT START** any task below until the user explicitly directs you to.
>   This file is delivered as a plan, not as a work order.
> - **No `npx`** in any form. Forbidden in all invocations
>   (no `--no-install`, no one-off test runs, etc.). Any command line containing
>   the substring `npx` is a violation and must be rewritten before execution.
>   Use `./node_modules/.bin/<tool>` or `npm run <script>` exclusively.
> - **No edits outside** `bin/`, optional
>   `reports/album-organization-runs/2026-07-21-lufia-ost-web/`, this spec
>   checklist, and newly organized files under `etc/albums/3-organized-files/**`
>   unless a blocker is found and the user explicitly approves expanding scope.
> - After **every** source code file modification (for example, a `.ts` edit),
>   run `npm run lint -- <modified-file>` and fix any reported issues before
>   moving on (NFR-1). This MUST lint only the file just modified. Do this per
>   source-code edit, not per-task.
> - Run whole-codebase `npm run lint` only as a last-call verification after all
>   TypeScript modifications are complete, including not using whole-codebase
>   lint as a pre-flight baseline.
> - Mark the matching `- [x]` checkbox **immediately** when each task is
>   finished, so progress is resumable.

## Phase 1 — Pre-flight

### 1.1 Confirm source directory

- [ ] Check whether `etc/albums/1-source-files/lufia ost` exists.
- [ ] If absent, inspect available Lufia-like folders and ask the user whether
      `etc/albums/1-source-files/lufia2 ost` is the intended source; do not
      execute organization until approved.
- [ ] Record the confirmed source directory in a blockquoted note under this
      phase.

### 1.2 Confirm destination safety

- [ ] Inspect `etc/albums/3-organized-files` for existing Lufia destination
      folders that could collide.
- [ ] Run `git --no-pager status --short` and note unrelated changes without
      reverting them.
- [ ] Do **not** run whole-codebase `npm run lint` as a pre-flight baseline;
      reserve it for final verification if TypeScript source files are edited.

## Phase 2 — Curl scripts

### 2.1 Create generic organize script

- [ ] Create `bin/organize-album-source-files-web.sh` following `design.md`
      §3.1.
- [ ] Ensure it starts `web serve`, calls `/manage-albums/validate`,
      `/manage-albums/summarize-source-dir`, and `/manage-albums/organize-files`
      through `curl`, pretty-prints JSON, captures server logs, and stops the
      server on every exit path.
- [ ] Mark it executable and run `bash -n bin/organize-album-source-files-web.sh`.

### 2.2 Create Lufia wrapper

- [ ] Create `bin/organize-lufia-ost-web.sh` using the confirmed source
      directory from Phase 1.
- [ ] Mark it executable and run `bash -n bin/organize-lufia-ost-web.sh`.
- [ ] If the wrapper uses `lufia2 ost` instead of the requested `lufia ost`,
      record the user approval in a blockquoted task note.

## Phase 3 — Dry-run via web endpoints

### 3.1 Run validation and dry-run

- [ ] Run `./bin/organize-album-source-files-web.sh "<confirmed-lufia-dir>"`
      without `--execute`.
- [ ] Confirm validation rows are all `valid` with empty `issues`.
- [ ] Confirm dry-run rows plan only Lufia destination files under
      `etc/albums/3-organized-files`.

### 3.2 Save audit outputs

- [ ] Create `reports/album-organization-runs/2026-07-21-lufia-ost-web/` if
      capturing artifacts is useful for review.
- [ ] Save or copy validation, summarize, and dry-run JSON output into that
      report folder.
- [ ] Do not proceed if any output is missing, unparsable, or shows unexpected
      destination paths.

## Phase 4 — Execute organization

### 4.1 Execute after accepted dry-run

- [ ] Run `./bin/organize-album-source-files-web.sh "<confirmed-lufia-dir>" --execute`
      only after Phase 3 passes.
- [ ] Confirm the execute response rows report copied files and expected
      destination paths.
- [ ] Save execute JSON output to the run artifact folder if artifacts are being
      captured.

### 4.2 Post-run filesystem checks

- [ ] Count source audio files and organized destination audio files; counts
      must match unless documented.
- [ ] Run `git --no-pager diff --stat -- etc/albums/1-source-files`; output
      must be empty.
- [ ] Inspect `etc/albums/3-organized-files` for only the expected new Lufia
      folders/files.

## Phase 5 — Verification

### 5.1 Script and scope verification

- [ ] `bash -n bin/organize-album-source-files-web.sh` — exit 0.
- [ ] `bash -n bin/organize-lufia-ost-web.sh` — exit 0.
- [ ] Verify no web server remains listening on the configured port after each
      script exits.
- [ ] `git --no-pager diff --stat -- bin reports specs/2026-07-21/organize-lufia-ost-web-endpoints etc/albums/3-organized-files` —
      lists only expected files.

### 5.2 Optional final project checks

- [ ] If TypeScript source files were unexpectedly edited, run
      `npm run lint`, `npm run build`, and `npm test`; all must exit 0.
- [ ] If no TypeScript source files were edited, record that project lint/build
      tests were not required for this operational script/data workflow.
