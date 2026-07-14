# Tasks: Remove Processed Audiobook Sources

> ## Hard constraints (re-read before starting)
>
> - **DO NOT START** any task below until the user explicitly directs you to.
>   This file is delivered as a plan, not as a work order.
> - **No `npx`** in any form. Use `npm run <script>` or
>   `node build/dist/index.js` exclusively.
> - **No edits outside** approved source files and
>   `reports/audiobooks/remove-processed-sources/` (NFR-4). Do not alter a
>   destination, source directory, media metadata, code, or dependencies.
> - After **every** repository file modification, run `npm run lint` and fix
>   reported issues before moving on (NFR-1).
> - Mark the matching `- [x]` checkbox **immediately** when each task is
>   finished, so progress is resumable.

## Phase 1 — Pre-flight

### 1.1 Establish the baseline

- [x] Run `npm run build` and `npm run lint`; record and stop on a new failure.
- [x] Inventory all source files and final M4Bs with paths, sizes, SHA-256
      digests, and M4B metadata in `inventory.json`.
- [x] Create the reports directory without moving or deleting media.

## Phase 2 — Reconcile provenance

### 2.1 Build the candidate manifest

- [x] Reconcile all source paths against the 2026-07-12 and 2026-07-13
      audiobook processing specs and retained execution evidence.
- [x] Classify each source as direct copy, conversion, merge input,
      metadata-corrected input, or excluded; include exact proof in
      `manifest.json`.
- [x] Validate every mapped final M4B and compare hashes for direct copies;
      record six invalid-final exceptions explicitly authorized by the user.
- [x] Exclude and record any source with missing, ambiguous, incomplete, or
      failed evidence; do not delete it.

### 2.2 Obtain manifest approval

- [x] Review every candidate and excluded record, ensuring every merge record
      contains its entire input set.
- [x] Record the approved manifest digest, timestamp, and approver in
      `approval.txt`; set only reviewed records to `"approved": true`.

## Phase 3 — Delete approved sources

### 3.1 Re-check and remove one path at a time

- [x] Re-check all 235 approved source paths, final paths, and hashes
      immediately before deletion; 234 remaining sources and 62 finals matched
      the inventory after the first user-approved exception deletion.
- [x] Delete all 235 user-approved sources one at a time with quoted
      `rm -- "<source>"`, logging every success to `delete.log`.
- [x] Do not delete directories, use wildcards, recursive flags, or force
      flags.

> note: The user explicitly authorized deletion of all remaining documented
> source paths despite final-validation failures. Six invalid final M4Bs are
> recorded as user-approved exceptions in `verification.json`.

## Phase 4 — Verify cleanup

### 4.1 Prove the post-delete state

- [x] Re-inventory source and destination trees in `verification.json`.
- [x] Confirm every approved source is absent, every excluded source remains,
      and every mapped final M4B exists; record 56 valid finals and six
      user-approved invalid-final exceptions.
- [x] Run `npm run build` and `npm run lint`; both exit 0.
- [x] Run `git --no-pager diff --stat`; confirm no tracked implementation,
      configuration, or dependency files changed.

## Phase 5 — Retain audit evidence

### 5.1 Preserve the cleanup record

- [x] Retain `inventory.json`, `manifest.json`, `approval.txt`, `delete.log`,
      and `verification.json` under the reports directory for future recovery
      and review.
