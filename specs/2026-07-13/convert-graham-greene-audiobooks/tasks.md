# Tasks: Convert Graham Greene Audiobooks

> ## Hard constraints (re-read before starting)
>
> - **DO NOT START** any task below until the user explicitly directs you to.
>   This file is delivered as a plan, not as a work order.
> - **No `npx`** in any form. Use `npm run <script>` or
>   `node build/dist/index.js` exclusively.
> - **No edits outside** the 19 listed source MP3s and new destinations in
>   `etc/audiobooks/3-renamed-files/` (NFR-5). Never modify or delete a source.
> - After **every** repository file modification, run `npm run lint` and fix
>   issues before moving on (NFR-1).
> - Mark the matching `- [x]` checkbox **immediately** when each task is
>   finished, so progress is resumable.

## Phase 1 — Pre-flight

### 1.1 Confirm the executable baseline

- [ ] Run `npm run build` and `npm run lint`; stop on any new failure.
- [ ] Confirm the 19 source MP3s in `design.md` §2 exist.
- [ ] Confirm none of the 19 expected destination filenames already exists in
      `etc/audiobooks/3-renamed-files/`.

## Phase 2 — Convert each manifest row

### 2.1 Process one audiobook at a time

- [ ] For each row in `design.md` §2, set `SOURCE` to the exact source path and
      run the dry-run command from `design.md` §3. Save the JSON output.
- [ ] Compare the dry-run `destination`, `performer`, and `title` to the
      manifest; stop if any value differs.
- [ ] Rerun that same command with `--execute`; save the JSON output before
      proceeding to the next row.
- [ ] Run the corresponding `validate` command from `design.md` §3 and save
      its JSON result. Stop if `valid` is not `true`.

> Note: the source filename `Graham Greene - The Confidential Agent .mp3`
> intentionally contains a trailing space before `.mp3`; its expected
> destination does not.

## Phase 3 — Closeout

### 3.1 Confirm outcomes and preserve evidence

- [ ] Confirm all 19 expected M4B destinations from `design.md` §2 exist.
- [ ] Confirm all 19 source MP3s remain in place.
- [ ] Retain the dry-run, execution, and validation JSON outputs for human
      review (NFR-4).
