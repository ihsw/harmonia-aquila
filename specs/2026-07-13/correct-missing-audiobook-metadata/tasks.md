# Tasks: Correct Missing Audiobook Metadata

> ## Hard constraints (re-read before starting)
>
> - **DO NOT START** until the user explicitly directs you to. This is a plan,
>   not a work order.
> - **No `npx`** in any form. Use `npm run <script>` or
>   `node build/dist/index.js` exclusively.
> - **No edits outside** the two listed source M4Bs, their staging copies, and
>   final files in `etc/audiobooks/3-renamed-files/` (NFR-3–NFR-4).
> - After **every** repository file modification, run `npm run lint` and fix
>   reported issues before moving on (NFR-1).
> - Mark the matching `- [x]` checkbox **immediately** when each task is
>   finished, so progress is resumable.

## Phase 1 — Pre-flight

### 1.1 Confirm candidates and destinations

- [x] Run `npm run build` and `npm run lint`; stop on a new failure.
- [x] Confirm both §2.1 source M4Bs still lack required metadata and retain
      exactly one filename author-title split.
- [x] Confirm every staging and final path in §2.1 is absent.

## Phase 2 — Create metadata-corrected staging copies

### 2.1 Set metadata without touching sources

- [x] For each §2.1 row, run and save the `set-metadata` dry-run JSON.
- [x] Confirm the dry run reports the derived author, title, and
      author-defaulted narrator.
- [x] Execute each approved `set-metadata` command and save JSON.
- [x] Inspect each staging copy's album, artist, and writer metadata.

## Phase 3 — Create canonical final copies

### 3.1 Copy and rename corrected staging M4Bs

- [x] For each staging copy, run and save the `copy-and-rename` dry-run JSON.
- [x] Confirm its proposed destination matches §2.1 before execution.
- [x] Execute `copy-and-rename` and save JSON.
- [x] Validate each final M4B and save its JSON result.

## Phase 4 — Closeout

### 4.1 Preserve exclusions and evidence

- [x] Confirm both source M4Bs remain unchanged.
- [x] Confirm every §2.2 excluded input remains untouched.
- [x] Retain all audit, dry-run, execution, and validation JSON records.
