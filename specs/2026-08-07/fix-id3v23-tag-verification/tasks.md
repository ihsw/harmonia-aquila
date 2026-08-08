# Tasks: Container-aware tag verification in `organize-files`

> ## Hard constraints (re-read before starting)
>
> - **DO NOT START** any task below until the user explicitly directs you to. This file is
>   delivered as a plan, not as a work order.
> - **No `npx`** in any form. Forbidden in **all** invocations (no `--no-install`, no one-off
>   vitest/tsc runs). Any command line containing the substring `npx` is a violation and must be
>   rewritten before execution. Use `./node_modules/.bin/<tool>` or `npm run <script>` exclusively.
> - **No edits outside** `src/lib/albums/audio-tag-verification.ts`,
>   `src/lib/albums/organize-files-execution.ts`, `__tests__/test-helpers.ts`,
>   `__tests__/lib/albums/audio-tag-verification.test.ts`,
>   `__tests__/lib/albums/organize-files-metadata.test.ts` (or the task 4.3 sibling suite),
>   `docs/album-organization.md`, `docs/testing.md` (NFR-7). If a real bug surfaces elsewhere,
>   STOP and surface it; do not patch silently.
> - **`src/lib/albums/audio-tags.ts` is out of scope.** The write path is correct for ID3v2.3.
> - **The leftover-album-directory defect is out of scope.** `assertNoExistingAlbum` and
>   `publishOrganizationCopy`'s `mkdir` stay exactly as they are (requirements §3).
> - After **every** source code file modification (for example, a `.ts` edit), run
>   `npm run lint -- <modified-file>` and fix any reported issues before moving on (NFR-1). This
>   MUST lint only the file just modified. Do this per source-code edit, not per-task.
> - Run whole-codebase `npm run lint` only as a last-call verification after all TypeScript
>   modifications are complete. Do **not** use it as a pre-flight baseline.
> - Mark the matching `- [x]` checkbox **immediately** when each task is finished, so progress is
>   resumable.

## Phase 1 — Pre-flight

### 1.1 Baseline

- [ ] Do **not** run whole-codebase `npm run lint` as a pre-flight baseline; reserve it for final
      verification after all TypeScript modifications are complete.
- [ ] Run `npm test` and record the pass/fail counts as the baseline.
- [ ] Run `wc -l src/lib/albums/organize-files-execution.ts __tests__/test-helpers.ts
      __tests__/lib/albums/organize-files-metadata.test.ts` and record the numbers (expected 163,
      73, 187) for the NFR-5 check in Phase 6.
- [ ] Confirm the destination used for any manual run does **not** already exist, so the
      out-of-scope `Destination album directories already exist:` guard cannot mask results.

### 1.2 Re-verify the empirical claims

The requirements §1 table was measured on this checkout; re-confirm before relying on it.

- [ ] Copy one OC ReMix MP3 to `etc/scratchpad/`, call
      `writeAudioTagFix(copy, { albumArtists: ['A','B'], artists: ['X','Y'], producers: ['P1','P2'] })`
      from `build/dist/`, re-read with `music-metadata`, and confirm: `common.albumartists` is
      `["A/B"]`; `common.artists` is `["X","Y"]`; `common.producer` is `undefined`;
      `native['ID3v2.3']` contains `{ id: 'IPLS', value: { producer: ['P1','P2'] } }`.
- [ ] Record the observed `format.tagTypes` value (expected `['ID3v2.3','ID3v1']`) — FR-2 keys on
      `includes('ID3v2.3')`, not on equality.
- [ ] Delete the scratch copy.

> Note: this requires a built `build/dist/`. Run `npm run build` first if it is stale.

### 1.3 Confirm no assertion depends on the old message

- [ ] `grep -rn "Metadata was not persisted" src/ __tests__/ docs/ collections/` — expected to
      match only `src/lib/albums/organize-files-execution.ts:128`. If any test matches, FR-6 must
      preserve it or the test must be updated in the same commit.

## Phase 2 — Pure refactor (no behaviour change)

> Every task in this phase must leave `npm test` at the Phase 1.1 baseline. A colour change here
> is a mistake in the move, not a discovery.

### 2.1 Create `src/lib/albums/audio-tag-verification.ts`

- [ ] Move `metadataValues` (line 97), `matchesNumericTagFix` (line 101) and `verifyTagFix`
      (line 109) **verbatim** from `organize-files-execution.ts` into the new module, exporting
      only `verifyTagFix` for now (FR-1, FR-1b).
- [ ] Keep the `Object.keys(fix).length === 0` early return ahead of `parseFile` (FR-1c).
- [ ] Run `npm run lint -- src/lib/albums/audio-tag-verification.ts`. Fix issues. Re-run until
      clean.

### 2.2 Rewire the caller

- [ ] Delete the three moved functions and the `parseFile` import from
      `src/lib/albums/organize-files-execution.ts`; import `verifyTagFix` from
      `./audio-tag-verification.js`.
- [ ] Confirm the call stays inside the `try`, between `writeAudioTagFix` and `rename` (NFR-9).
- [ ] Run `npm run lint -- src/lib/albums/organize-files-execution.ts`. Fix issues. Re-run until
      clean.
- [ ] Run `npm run build` and `npm test` — both exit 0, test counts unchanged from 1.1.

### 2.3 Extend `makeAudioMetadata`

- [ ] Add the optional third `native` parameter defaulting to `{}` (FR-8, `design-testing.md` §1). Do not
      change the `common` or `format` parameters.
- [ ] Confirm every existing two-argument call site still compiles (`npm run build`).
- [ ] Run `npm run lint -- __tests__/test-helpers.ts`. Fix issues. Re-run until clean.

## Phase 3 — Failing tests first

### 3.1 Write the new suite against the unchanged logic

- [ ] Create `__tests__/lib/albums/audio-tag-verification.test.ts` covering the full
      `design-testing.md` §3 matrix (FR-9).
- [ ] Import the pure entry point by the name it will have (`findUnpersistedTagFields`); it does
      not exist yet, so the suite will not compile — that is expected and is resolved in 4.1.
- [ ] Run `npm run lint -- __tests__/lib/albums/audio-tag-verification.test.ts`. Fix issues.

> Note: record here which cases fail once 4.1 lands the export but before 4.2 lands the fix.
> Expected failures: joined `albumArtists` on ID3v2.3, joined `artists` on ID3v2.3, producers via
> `IPLS`, producers via `TIPL`, and the FR-6 message shape. Anything else failing means the
> Phase 2 move was not verbatim.

## Phase 4 — The fix

### 4.1 Split the pure core out of `verifyTagFix`

- [ ] In `audio-tag-verification.ts`, extract the comparison into an exported
      `findUnpersistedTagFields(metadata: IAudioMetadata, fix: AudioTagFix): string[]` returning
      failed field names, and reduce `verifyTagFix` to `parseFile` + throw (FR-1a, FR-1b).
- [ ] Order the checks `album, albumArtists, artists, discNumber, discTotal, producers, title,
      trackNumber` so FR-6's message order is stable.
- [ ] Run `npm run lint -- src/lib/albums/audio-tag-verification.ts`. Fix issues.
- [ ] Run `npm test` — the Phase 3.1 suite now compiles; confirm exactly the expected cases fail.

### 4.2 Container-aware comparison

- [ ] Add `joinsTextLists` reading `metadata.format.tagTypes?.includes('ID3v2.3')` (FR-2).
- [ ] Add `matchesTextList` per `design.md` §3 and apply it to `albumArtists` **and** `artists`
      (FR-3, FR-3a, FR-3b). Keep the exact-equality branch first.
- [ ] Add `involvedPeopleProducers` scanning `metadata.native` for `IPLS`/`TIPL` with the FR-4b
      runtime narrowing — no `any`, no assertion to a concrete domain shape (NFR-6). If the lint
      config rejects `as Record<string, unknown>`, use the `Object.entries(...)` form from
      `design.md` §3.
- [ ] Wire producers as `common.producer ?? involvedPeopleProducers(metadata) ?? []` (FR-4c) and
      keep its comparison exact — do **not** route it through `matchesTextList` (FR-4d).
- [ ] Update the throw to
      `Metadata was not persisted: <fields> (requested <json>)`, preserving the prefix (FR-6).
- [ ] Run `npm run lint -- src/lib/albums/audio-tag-verification.ts`. Fix issues.
- [ ] Run `npm test` — the whole Phase 3.1 suite passes and the Phase 1.1 baseline is otherwise
      unchanged.
- [ ] Run `wc -l src/lib/albums/audio-tag-verification.ts` — must be ≤ 200 (NFR-5).

### 4.3 End-to-end regression case

- [ ] Run `wc -l __tests__/lib/albums/organize-files-metadata.test.ts` (187 at baseline). If the
      new case fits under 200, add it there; otherwise create
      `__tests__/lib/albums/organize-files-tag-verification.test.ts` (`design-testing.md` §3). Measure,
      do not guess.
- [ ] Add a case where `parseFile`'s second resolution returns
      `makeAudioMetadata({ albumartists: ['A/B'], … }, { tagTypes: ['ID3v2.3'] })` and assert
      `organizeAlbumFiles({ execute: true, … })` publishes instead of throwing (FR-9).
- [ ] Run `npm run lint -- <the file you edited or created>`. Fix issues.

## Phase 5 — Real-file verification

### 5.1 Prove FR-7

- [ ] `npm run build`.
- [ ] Run the requirements §1 command with `--dest-dir` pointing at a **fresh** path under
      `etc/scratchpad/` that does not yet exist.
- [ ] Confirm it exits 0 and organizes five files into three `OverClocked ReMix/<Album>/`
      directories.
- [ ] Re-read one published `7th Guest` track and confirm `native['ID3v2.3']` contains
      `TPE2 = "AmIEviL/Mazedude/The Fat Man"` (FR-7, acceptance criterion 2).
- [ ] Re-run the same command with `--producer-strategy aggregate` added, into another fresh
      destination, and confirm it no longer throws `Metadata was not persisted` (acceptance
      criterion 3).
- [ ] Remove the scratch destinations.

> Note: record the actual command lines and outcomes here. Do **not** point `--dest-dir` at
> `etc/albums/3-organized-files` — it currently holds partial output from the failed run that
> motivated this spec (an empty `OverClocked ReMix/7th Guest/` plus two published tracks), and
> cleaning it up is out of scope.

## Phase 6 — Verification

### 6.1 Full lint + typecheck + test

- [ ] `npm run lint` — whole-codebase last-call lint after all TypeScript modifications are
      complete; exit 0.
- [ ] `npm run build` — exit 0 (NFR-2).
- [ ] `npm test` — exit 0; baseline pass count from 1.1 plus the new cases (NFR-3).
- [ ] `npm run test:coverage` — exit 0 and meets 85% statements, 85% lines, 90% functions, 70%
      branches (NFR-10). If branches dip, add the missing negative case rather than lowering the
      threshold.

### 6.2 Size and scope

- [ ] `wc -l` on every file in `design.md` §2 — all ≤ 200 (NFR-5). Confirm
      `organize-files-execution.ts` shrank from 163.
- [ ] `git --no-pager diff --stat src/lib/albums/audio-tags.ts
      src/lib/albums/metadata-fix-planner.ts src/lib/albums/metadata-fix-strategies.ts
      src/lib/albums/organization-planner.ts src/lib/albums/organize-files.ts src/commands src/web
      collections` — output MUST be empty (NFR-7).
- [ ] `git --no-pager diff --stat` — MUST list only the files in `design.md` §2.
- [ ] `git status --short etc/scratchpad` — no probe or scratch artefacts left behind.

## Phase 7 — Documentation

### 7.1 `docs/album-organization.md`

- [ ] Document that ID3v2.3 text frames are single-valued, that a multi-value album-artist list is
      stored in `TPE2` joined with `/`, and that verification accepts that form (FR-10, FR-3).
- [ ] Record the FR-3c ambiguity: an album artist literally named `A/B` is indistinguishable from
      the list `['A','B']` after an ID3v2.3 round trip.
- [ ] Note that MP3 producers are stored in the involved-people frame (`IPLS` on ID3v2.3, `TIPL`
      on ID3v2.4) and that verification reads it directly because `common.producer` is not
      populated for that container.
- [ ] Record the FR-8 gap: `year` is written but not verified.
- [ ] Do **not** claim the leftover-album-directory behaviour changed.

### 7.2 `docs/testing.md`

- [ ] Add the FR-7 manual recipe: the §1 command, a fresh scratch `--dest-dir`, and the expected
      three-album outcome.
- [ ] Use only files verified to exist under
      `etc/albums/1-source-files/OC ReMix Collection - 1 to 4000 [v20201028]/`; re-check before
      relying on any filename.
