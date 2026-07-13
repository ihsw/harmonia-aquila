# Tasks: Process Done Audiobooks

> ## Hard constraints (re-read before starting)
>
> - **DO NOT START** until the user explicitly directs you to. This is a plan,
>   not a work order.
> - **No `npx`** in any form. Use `npm run <script>` or
>   `node build/dist/index.js` exclusively.
> - **No edits outside** the listed `done` inputs and new files in
>   `etc/audiobooks/3-renamed-files/` (NFR-3–NFR-4). Never modify a source.
> - After **every** repository file modification, run `npm run lint` and fix
>   reported issues before moving on (NFR-1).
> - Mark the matching `- [x]` checkbox **immediately** when each task is
>   finished, so progress is resumable.

## Phase 1 — Pre-flight

### 1.1 Establish the current state

- [x] Run `npm run build` and `npm run lint`; stop on a new failure.
- [x] Re-run the metadata audit and confirm the §2 action manifests still
      match, including zero `convert-file` candidates.
- [x] Confirm every listed destination is absent before its execution.

## Phase 2 — Copy unique M4Bs

### 2.1 Process the §2.1 manifest

- [x] For every one of the 16 §2.1 sources, run and save the
      `copy-and-rename` dry-run JSON.
- [x] Compare each dry-run destination to the manifest; stop on a mismatch.
- [x] Execute each successful copy without overwrite behavior and save JSON.
- [x] Validate every copied destination and save its JSON result.

## Phase 3 — Merge M4B and MP3 sets

### 3.1 Process the §2.2 manifest

- [x] For every one of the five §2.2 directories, run and save the
      `merge --jobs 4` dry-run JSON.
- [x] Compare each destination to the manifest; stop on a mismatch.
- [x] Execute each approved merge and save JSON; stop processing that set on a
      failure.
- [x] Validate every merged M4B and save its JSON result.

## Phase 4 — Preserve unsuitable inputs

### 4.1 Confirm exclusions

- [x] Do not run an action on any missing-metadata input in §2.4.
- [x] Confirm all 38 missing-metadata files remain in their source paths.

## Phase 5 — Copy already-valid M4Bs

### 5.1 Copy and validate the §2.4 valid sources

- [x] For each already-valid M4B in §2.4, confirm the same-named destination
      is absent, then run the documented `cp --no-clobber --preserve=all`
      command.
- [x] Validate both copied destinations and save their JSON results.

## Phase 6 — Closeout

### 5.1 Confirm and retain evidence

- [x] Confirm 23 new destinations exist and validate successfully.
- [x] Confirm all source files remain in `etc/audiobooks/1-source-files/done/`.
- [x] Retain audit, dry-run, execution, and validation JSON records for review.
