# Tasks: Merge Sequential Audiobook Folders

> ## Hard constraints (re-read before starting)
>
> - **DO NOT START** any task below until the user explicitly directs you to.
>   This file is a plan, not a work order.
> - **No `npx`** in any form. Use `npm run <script>` or
>   `node build/dist/index.js` exclusively.
> - **No edits outside** `etc/audiobooks/2-aggregated-files/`,
>   `etc/audiobooks/3-renamed-files/`, and
>   `reports/audiobooks/merge-sequential-folders/` (NFR-6). Source media and
>   metadata are read-only.
> - After **every** repository file modification, run `npm run lint` and fix
>   reported issues before moving on (NFR-1).
> - Mark the matching `- [x]` checkbox **immediately** when each task is
>   finished, so progress is resumable.

## Phase 1 — Pre-flight

### 1.1 Audit sequential candidates

- [x] Run `npm run build` and `npm run lint`; stop on a new failure.
- [x] Inventory sequential `.mp3` and `.m4b` folders and save ordered source
      paths plus artist/album/title metadata in `inventory.json`.
- [x] Confirm the 35 `The Wealth and Poverty of Nations A/` parts still lack
      required metadata; record the explicit metadata-bypass decision without
      changing a source.

## Phase 2 — Establish eligibility

### 2.1 Gate each source folder

- [x] Confirm the Wealth and Poverty candidate has 35 audio parts but lacks a
      shared performer and album/title identity, requiring its approved bypass.
- [x] Exclude every missing, inconsistent, or multi-group candidate unless it
      has explicit approval for `--bypass-metadata`; do not invent metadata.

## Phase 3 — Merge eligible groups

### 3.1 Dry-run then execute

- [x] For each eligible folder, run the `merge --jobs 16 --format json` dry
      run; add `--bypass-metadata` only for explicitly approved source folders.
- [x] Confirm the staged destination is absent and the dry-run source count matches
      the inventory before adding `--execute`.
- [x] Execute the approved merge with `--jobs 16`, saving its JSON result;
      stop on any failure.

## Phase 4 — Set consolidated metadata

### 4.1 Copy the staged Wealth and Poverty M4B

- [x] Dry-run `set-metadata` from the staged M4B to the exact final path with
      title `The Wealth and Poverty of Nations: Why Some Are So Rich and Some
      So Poor`, author `David S Landes`, and narrator `Walter Dixon`.
- [x] Confirm the final path is absent, then rerun the exact command with
      `--execute` and save `metadata.json`.

## Phase 5 — Validate and preserve sources

### 5.1 Confirm final output

- [x] Validate every created M4B and save `validation.json`.
- [x] Confirm all source files and directories remain present and unchanged.
- [x] Run `npm run build` and `npm run lint`; both exit 0.
- [x] Confirm `git --no-pager diff --stat -- src package.json package-lock.json`
      is empty.

## Phase 6 — Retain processing evidence

### 6.1 Preserve records

- [x] Retain inventory, dry-run, execution, metadata, and validation JSON records under
      `reports/audiobooks/merge-sequential-folders/`.
