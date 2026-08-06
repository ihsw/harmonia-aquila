# Tasks: Add bit depth to `summarize-source-dir` output

> ## Hard constraints (re-read before starting)
>
> - **DO NOT START** any task below until the user explicitly directs you to. This file is
>   delivered as a plan, not as a work order.
> - **No `npx`** in any form. Forbidden in **all** invocations (no `--no-install`, no
>   one-off vitest/tsc runs). Any command line containing the substring `npx` is a violation
>   and must be rewritten before execution. Use `./node_modules/.bin/<tool>` or
>   `npm run <script>` exclusively.
> - **No edits outside the §2 file list** (NFR-7). Specifically forbidden:
>   `src/commands/manage-audiobooks/`, `src/lib/audiobooks/`,
>   `src/web/servers/mcp-tools/manage-audiobooks/`, `src/lib/albums/validate.ts`,
>   `src/lib/albums/organize-files.ts`. If a real bug surfaces there, STOP and surface it.
> - **Do not touch `bitrate`.** It already exists on all four surfaces. Not renamed, not
>   reformatted, not supplemented.
> - After **every** source code file modification (for example, a `.ts` edit), run
>   `npm run lint -- <modified-file>` and fix any reported issues before moving on (NFR-1).
>   Per source-code edit, not per-task.
> - Run whole-codebase `npm run lint` only as a last-call verification after all TypeScript
>   modifications are complete — **including not using it as a pre-flight baseline**.
> - The typecheck script is `npm run build`, **not** `npm run build:ts`.
> - Mark the matching `- [x]` checkbox **immediately** when each task is finished, so
>   progress is resumable.

## Phase 1 — Pre-flight

### 1.1 Confirm clean baseline

- [ ] Do **not** run whole-codebase `npm run lint` as a pre-flight baseline; reserve it for
      final verification after all TypeScript modifications are complete.
- [ ] Run `npm test` and capture the pass/fail counts as the baseline.
- [ ] Run `git status` and confirm a clean tree before starting.

### 1.2 Locate the formatter test suite

- [ ] Find where `formatAudioBitrate` / `formatAudioSampleRate` / `formatAudioDuration` are
      currently tested (`grep -rn "formatAudioBitrate" __tests__`).
      `__tests__/lib/albums/audio-files-album-art.test.ts` covers album art, **not** the
      formatters, so they may live elsewhere or may be untested. Record the finding:

      > Finding: <path, or "no existing formatter suite — create one">

### 1.3 Audit summarize row fixtures

- [ ] Grep `__tests__` for `toEqual` assertions on whole summarize rows
      (`grep -rn "bitrate" __tests__`). Every such fixture gains one key (`design.md` §6.1).
      List them here so Phase 5 does not miss one:

      > Fixtures to update: <paths>

## Phase 2 — Formatter

### 2.1 Add `formatAudioBitDepth`

- [ ] Add `formatAudioBitDepth(bitsPerSample: number | undefined): string` to
      `src/lib/albums/audio-files.ts` per `design.md` §3 — returns `` `${n}-bit` ``, or `''`
      when `undefined` (FR-2).
- [ ] Place it beside `formatAudioSampleRate` to keep the three characteristic formatters
      together.
- [ ] Do **not** use `Intl.NumberFormat` — bit depth is a small integer needing no
      separators or scaling (`design.md` §3).
- [ ] Run `npm run lint -- src/lib/albums/audio-files.ts`. Fix issues. Re-run until clean.

## Phase 3 — Library row

### 3.1 Extend the row type and construction

- [ ] Add `bitDepth: string` to `SummarizeSourceDirJsonOutputRow` in
      `src/lib/albums/summarize-source-dir.ts` (FR-1).
- [ ] Add `bitDepth: formatAudioBitDepth(metadata.format.bitsPerSample),` to the row
      construction literal, positioned **after `artist` and before `bitrate`** (FR-3, FR-7).
- [ ] Import `formatAudioBitDepth` alongside the existing formatter imports.
- [ ] Run `npm run lint -- src/lib/albums/summarize-source-dir.ts`. Fix issues. Re-run
      until clean.
- [ ] Run `npm run build` — exit 0. The tree should type-check here; unlike the add-year
      spec there is no intermediate broken state.

## Phase 4 — GraphQL surface

### 4.1 `AlbumSummaryRow` class

- [ ] Add to `src/web/modules/graphql/album.rows.ts`, alphabetically after `artist` and
      before `bitrate` (FR-5):
      ```ts
      @Field(() => String)
      public bitDepth!: string
      ```
- [ ] **Run `wc -l src/web/modules/graphql/album.rows.ts` and confirm ≤ 200** (NFR-5). The
      file is 194 lines before this edit. If it exceeds 200, extract `AlbumSummaryRow` into
      its own module — do **not** trim unrelated fields to fit.
- [ ] Record the resulting line count here: > `album.rows.ts` after edit: <n> lines
- [ ] Run `npm run lint -- src/web/modules/graphql/album.rows.ts`. Fix issues. Re-run until
      clean.

### 4.2 SDL

- [ ] Add `bitDepth: String!` to `type AlbumSummaryRow` in
      `src/web/modules/graphql/schema.gql`, between `artist` and `bitrate` to match the
      block's alphabetical ordering (FR-5).

### 4.3 Confirm the other three surfaces need no edit

- [ ] Confirm by inspection that `src/commands/manage-albums/summarize-source-dir.ts`,
      `src/web/controllers/manage-albums.controller.ts` and
      `src/web/servers/mcp-tools/manage-albums/summarize-source-dir.ts` are unchanged and
      require no change (`design.md` §1 table).
- [ ] Do **not** edit `src/command-utils.ts` — `writeRows` is shared by every command.

## Phase 5 — Tests

### 5.1 Formatter

- [ ] Using the finding from task 1.2, add cases: `undefined → ''`, `16 → '16-bit'`,
      `24 → '24-bit'`, `32 → '32-bit'` (acceptance criterion 4).
- [ ] Run `npm run lint -- <test file>`.

### 5.2 Library row

- [ ] Extend `__tests__/lib/albums/summarize-source-dir.test.ts`: a lossless row reports
      `bitDepth` populated; a lossy row reports `''` while `bitrate` and `sampleRate` remain
      populated (FR-4, acceptance criteria 1–2).
- [ ] Add a **mixed-directory** case — FLAC and MP3 summarized in one call, showing
      populated and empty `bitDepth` side by side (`design.md` §4.2).
- [ ] Inject via `makeAudioMetadata({}, { bitsPerSample: 24, sampleRate: 48_000 })` — the
      helper spreads `format`, so no helper change is needed. Verify this before assuming.
- [ ] Update every fixture listed in task 1.3 by **adding the `bitDepth` key**, not by
      loosening `toEqual` to `toMatchObject` (`design.md` §6.1).
- [ ] Run `npm run lint -- <each modified test file>`.

### 5.3 Surface pass-through (FR-6 — verify, do not assume)

- [ ] Extend `__tests__/web/summarize-source-dir.test.ts` — REST carries `bitDepth`.
- [ ] Extend `__tests__/web/graphql/album.resolver.test.ts` — GraphQL surfaces `bitDepth`.
- [ ] Extend `__tests__/web/mcp.manage-albums-operations.test.ts` — MCP carries `bitDepth`.
- [ ] If a CLI summarize suite asserts row shape, extend it too; `writeRows` itself needs no
      test change.
- [ ] Assert all surfaces report the **same** `bitDepth` for the same input (acceptance
      criterion 3).
- [ ] Run `npm run lint -- <each modified test file>`.

## Phase 6 — Verification

### 6.1 Full lint + typecheck + test

- [ ] `npm run lint` — whole-codebase last-call lint; exit 0.
- [ ] `npm run build` — exit 0 (NFR-2).
- [ ] `npm test` — exit 0; baseline from task 1.1 plus the new cases (NFR-3).

### 6.2 Scope verification

- [ ] `git --no-pager diff --stat src/commands/manage-audiobooks src/lib/audiobooks
      src/web/servers/mcp-tools/manage-audiobooks src/lib/albums/validate.ts
      src/lib/albums/organize-files.ts` — output MUST be empty (NFR-7).
- [ ] `git --no-pager diff --stat` — MUST list only the 4 source files from `design.md` §2,
      plus the Phase 5 test files and Phase 7 docs.
- [ ] Confirm `bitrate` appears in the diff **only** as unchanged context, never as a
      modification.

### 6.3 File-size check

- [ ] `wc -l` on all modified files — none over 200 (NFR-5), with particular attention to
      `src/web/modules/graphql/album.rows.ts`.

### 6.4 Behaviour smoke check (manual)

- [ ] Build, then run `manage-albums summarize-source-dir --dir-name <a FLAC album>
      --format json` and confirm `bitDepth` is populated alongside `bitrate` and
      `sampleRate`.
- [ ] Repeat against an MP3 album and confirm `bitDepth` is `""` with the other fields
      intact.
- [ ] Optionally re-check the Rammstein source that motivated this spec — it will finally
      answer whether the `[Hi-Res 24-48 FLAC]` directory name is accurate. Note the result;
      it is the first real use of the field.

## Phase 7 — Documentation

### 7.1 Row shape

- [ ] Update whichever `docs/` page documents the summarize row shape (check
      `docs/album-organization.md`, `docs/graphql.md`, `docs/mcp-server.md`) to list
      `bitDepth` (FR-9).

### 7.2 Record the lossy caveat

- [ ] State explicitly that `bitDepth` is **empty for MP3 and other lossy sources**, because
      bits-per-sample is a PCM concept — an empty value is correct output, not a defect
      (FR-4, `design.md` §4.2).

### 7.3 Record what the field does not prove

- [ ] Note that `bitDepth` reports **how the file is encoded, not the depth of the master**:
      a 16-bit source padded to 24 bits reports `24-bit`. Useful evidence when checking a
      hi-res claim, not proof of one (`design.md` §4.3).
