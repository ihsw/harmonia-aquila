# Tasks: Correct Audiobook Metadata

> ## Hard constraints (re-read before starting)
>
> - **DO NOT START** any task below until the user explicitly directs you to.
>   This file is delivered as a plan, not a work order.
> - **No `npx`** in any form. Use `npm run <script>` or
>   `node build/dist/index.js` exclusively.
> - **No edits outside** the command files in `design.md` §3 and generated
>   manifest paths (NFR-6). Never modify or delete a source.
> - After **every** source code file modification, run `npm run lint` and fix
>   reported issues before moving on (NFR-1).
> - Mark the matching `- [x]` checkbox **immediately** when each task is
>   finished, so progress is resumable.

## Phase 1 — Pre-flight

### 1.1 Confirm baseline and destinations

- [x] Run `npm run build` and `npm run lint`; stop on a new failure.
- [x] Record checksums for both manifest sources and confirm both final and the
      one intermediate destination are absent.
- [x] Confirm Docker and the existing `m4b-tool` conversion path are available.

## Phase 2 — Implement explicit conversion metadata

### 2.1 Extend `convert-file`

- [x] Add all-or-nothing `--author`, `--title`, and `--narrator` options per
      `design.md` §3, retaining the no-override behavior.
- [x] Reject partial overrides before filesystem writes or Docker invocation.
- [x] Run `npm run lint` and fix all reported issues immediately.

### 2.2 Preserve conversion metadata

- [x] Pass effective author and title through the existing conversion result and
      filename logic; update the m4b-tool adapter only if required.
- [x] Run `npm run lint` and fix all reported issues immediately.
- [x] Run `npm run build`.

### 2.3 Preserve exact M4B metadata casing

- [x] Replace the title-casing `m4b-tool meta` write with the existing
      `node-taglib-sharp` M4B writer and retain post-write verification.
- [x] Run `npm run lint` and `npm run build`; confirm the requested casing
      survives the M4B metadata readback.

## Phase 3 — Produce final M4Bs

### 3.1 Correct the existing M4B

- [x] Dry run the first manifest row's `set-metadata` command and save JSON.
- [x] Confirm author, title, narrator, and destination match `design.md` §2;
      rerun with `--execute`.
- [x] Validate the final M4B and save JSON; stop unless `valid` is `true`.

### 3.2 Convert and correct the M4A

- [x] Dry run the §4 `convert-file` command and save JSON; confirm its
      intermediate destination and effective metadata.
- [x] Rerun with `--execute` only after the dry run matches the manifest.
- [x] Dry run then execute `set-metadata` from the intermediate M4B to the
      second final destination, supplying Aaron Williamson as narrator.
- [x] Validate the final M4B and save JSON; stop unless `valid` is `true`.

## Phase 4 — Closeout

### 4.1 Verify preservation and evidence

- [x] Compare source checksums to the Phase 1 values.
- [x] Retain all dry-run, execution, and validation JSON artifacts for review.
- [x] Run `npm run build` and `npm run lint`.
- [x] Confirm `git --no-pager diff --stat -- src/commands/manage-audiobooks`
      lists only the implementation files in `design.md` §3.
