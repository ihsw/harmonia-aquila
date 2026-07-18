# Tasks: Generate Bruno Summarize Collection

> ## Hard constraints (re-read before starting)
>
> - **DO NOT START** any task below until the user explicitly directs you to.
>   This file is delivered as a plan, not as a work order.
> - **No `npx`** in any form. Forbidden in **all** invocations
>   (no `--no-install`, no one-off Vitest/tsc runs, etc.). Any command line
>   containing the substring `npx` is a violation and must be rewritten before
>   execution. Use `npm run <script>` or existing binaries under
>   `./node_modules/.bin/` exclusively.
> - **No edits outside `collections/harmonia-aquila-web/**`** for this spec unless
>   a blocker is found and the user explicitly approves expanding scope. Do not
>   edit `extern/bruno-starter-guide/**` or live fixture contents.
> - After **every** source code file modification (for example, a `.ts` edit),
>   run `npm run lint -- <modified-file>` and fix any reported issues before
>   moving on (NFR-1). This MUST lint only the file just modified. Do this per
>   source-code edit, not per-task.
> - Run whole-codebase `npm run lint` only as a last-call verification after all
>   TypeScript modifications are complete. This spec should not modify
>   TypeScript by default.
> - Mark the matching `- [x]` checkbox **immediately** when each task is
>   finished, so progress is resumable.

## Phase 1 — Pre-flight

### 1.1 Confirm references and baseline inputs

- [ ] Inspect `extern/bruno-starter-guide/opencollection.yml`, one request YAML, and `environments/local.yml`.
- [ ] Run `./node_modules/.bin/bru run --help` and confirm supported `--env`, `--env-var`, and `--bail` options.
- [ ] Confirm `etc/1-source-files/` and `etc/2-destination-files/` exist and do not modify their contents.
- [ ] Do **not** run whole-codebase `npm run lint` as a pre-flight baseline; reserve it for final verification only if TypeScript changes are approved and made.

## Phase 2 — Create Bruno collection

### 2.1 Create collection metadata

- [ ] Create `collections/harmonia-aquila-web/opencollection.yml` using the starter-guide OpenCollection metadata shape.
- [ ] Keep the collection name specific to Harmonia Aquila Web.
- [ ] Do not copy images, solutions, or starter-guide challenge files.

### 2.2 Create local environment

- [ ] Create `collections/harmonia-aquila-web/environments/local.yml`.
- [ ] Add `baseUrl` with default `http://127.0.0.1:3000`.
- [ ] Add `summarizeDirName` with default `.` and `ignoreNonAudioFiles` with default `'true'`.

### 2.3 Create summarize request

- [ ] Create `collections/harmonia-aquila-web/manage-albums/summarize-source-dir.yml`.
- [ ] Configure `GET {{baseUrl}}/manage-albums/summarize-source-dir?dirName={{summarizeDirName}}&ignoreNonAudioFiles={{ignoreNonAudioFiles}}`.
- [ ] Add a status `200` assertion.
- [ ] Add a runtime test that the response body is a JSON array.

## Phase 3 — Live verification

### 3.1 Build and start web server

- [ ] Run `npm run build` — exit 0.
- [ ] Start `npm run web:serve -- --source-dir etc/1-source-files --dest-dir etc/2-destination-files --host 127.0.0.1 --port 3000` and capture the specific PID.
- [ ] Wait for `curl --fail "http://127.0.0.1:3000/manage-albums/summarize-source-dir?dirName=.&ignoreNonAudioFiles=true"` to exit 0.

### 3.2 Run Bruno collection

- [ ] Run `./node_modules/.bin/bru run collections/harmonia-aquila-web/manage-albums/summarize-source-dir.yml --env local --bail` — exit 0.
- [ ] If collection auto-detection fails, run from `collections/harmonia-aquila-web/` using the relative request path and record the reason in a task note.
- [ ] If port `3000` is occupied, restart on another local port and pass `--env-var baseUrl=http://127.0.0.1:<port>`.

### 3.3 Stop server and check fixture safety

- [ ] Stop the captured `web serve` PID using `kill <PID>`.
- [ ] Confirm no files changed under `etc/1-source-files/**` or `etc/2-destination-files/**`.

## Phase 4 — Final verification

### 4.1 Scope and status checks

- [ ] `git --no-pager diff --stat -- extern src __tests__ package.json package-lock.json` shows no unintended files.
- [ ] `git --no-pager diff --stat -- collections/harmonia-aquila-web` lists only the new Bruno collection files.
- [ ] If TypeScript files were approved and modified, run final whole-codebase `npm run lint`, `npm run build`, and `npm test`.

## Phase 5 — Documentation

### 5.1 Update directly related docs only

- [ ] If an existing Bruno/API usage document exists, add the collection path and `bru run` command.
- [ ] If no usage document exists, do not create broad new docs unless the user requests them; the collection files and this spec are sufficient.
