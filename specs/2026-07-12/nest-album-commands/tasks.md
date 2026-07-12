# Tasks: Nest Album Commands

> ## Hard constraints (re-read before starting)
>
> - **DO NOT START** implementation until the user explicitly directs it.
> - **No `npx`** in any form. Use `npm run <script>` or existing project
>   binaries only.
> - Modify **only** `src/index.ts` (NFR-4). If any other file needs a change,
>   stop and surface the scope conflict.
> - After **every** file modification, run `npm run lint` and fix all issues
>   before continuing (NFR-1).
> - Mark the matching `- [x]` checkbox **immediately** when each task is
>   finished, so progress is resumable.

## Phase 1 — Pre-flight

### 1.1 Confirm baseline

- [x] Run `npm run lint` and record any pre-existing failure.
- [x] Run `npm run build` and record any pre-existing failure.
- [x] Confirm that `npm test` remains a placeholder failure; do not modify it
      (NFR-6).

## Phase 2 — Nest command registrations

### 2.1 Create the parent command

- [x] In `src/index.ts`, create `manageAlbumsCommand` from `program.command('manage-albums')`
      with an album-management description as specified in `design.md` §3.

### 2.2 Move the existing registrations

- [x] Pass `manageAlbumsCommand`, rather than `program`, to
      `registerSummarizeSourceDirCommand`, `registerFixTagsCommand`, and
      `registerOrganizeFilesCommand`.
- [x] Do not change imports, root program identity, registration order, or
      any file under `src/commands/**`.
- [x] Run `npm run lint` immediately after editing `src/index.ts`; fix and
      rerun until it exits 0.

## Phase 3 — Verification

### 3.1 Build and inspect help

- [x] Run `npm run build` — must exit 0.
- [x] Run `node build/dist/index.js manage-albums --help` — must list
      `summarize-source-dir`, `fix-tags`, and `organize-files`.
- [x] Run `node build/dist/index.js manage-albums summarize-source-dir --help`,
      `node build/dist/index.js manage-albums fix-tags --help`, and
      `node build/dist/index.js manage-albums organize-files --help` — each
      must show its existing options.

### 3.2 Confirm the intentional migration

- [x] Run `node build/dist/index.js summarize-source-dir` — it must
      exit non-zero because the root-level command is no longer registered.
- [x] Confirm the root name and description are unchanged with
      `node build/dist/index.js --help`.

### 3.3 Verify scope

- [x] Run `git --no-pager diff --stat src/commands package.json package-lock.json`;
      output must be empty.
- [x] Run `git --no-pager diff --stat src/index.ts`; output must contain only
      the expected registration change.
