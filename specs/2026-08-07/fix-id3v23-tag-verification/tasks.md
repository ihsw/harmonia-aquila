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

- [x] Do **not** run whole-codebase `npm run lint` as a pre-flight baseline; reserve it for final
      verification after all TypeScript modifications are complete.
- [x] Run `npm test` and record the pass/fail counts as the baseline.
      **Baseline: 67 test files passed, 408 tests passed, 0 failed.**
- [x] Run `wc -l src/lib/albums/organize-files-execution.ts __tests__/test-helpers.ts
      __tests__/lib/albums/organize-files-metadata.test.ts` and record the numbers (expected 163,
      73, 187) for the NFR-5 check in Phase 6. **Observed exactly 163 / 73 / 187.**
- [x] Confirm the destination used for any manual run does **not** already exist, so the
      out-of-scope `Destination album directories already exist:` guard cannot mask results.
      **Phase 5 uses fresh `etc/scratchpad/verify-dest-*` paths; confirmed absent.**

### 1.2 Re-verify the empirical claims

The requirements §1 table was measured on this checkout; re-confirm before relying on it.

- [x] Copy one OC ReMix MP3 to `etc/scratchpad/`, call
      `writeAudioTagFix(copy, { albumArtists: ['A','B'], artists: ['X','Y'], producers: ['P1','P2'] })`
      from `build/dist/`, re-read with `music-metadata`, and confirm: `common.albumartists` is
      `["A/B"]`; `common.artists` is `["X","Y"]`; `common.producer` is `undefined`;
      `native['ID3v2.3']` contains `{ id: 'IPLS', value: { producer: ['P1','P2'] } }`.
      **All four confirmed on `7th_Guest_AmIEviL_OC_ReMix.mp3`. Native frames observed:
      `TPE1 "X"`, `TPE1 "Y"` (two frames), `TPE2 "A/B"` (one joined frame),
      `IPLS {"producer":["P1","P2"]}`. `common.albumartist` is also the joined `"A/B"`.**
- [x] Record the observed `format.tagTypes` value (expected `['ID3v2.3','ID3v1']`) — FR-2 keys on
      `includes('ID3v2.3')`, not on equality. **Observed `["ID3v2.3","ID3v1"]`; `includes` is
      required, equality would not match.**
- [x] Delete the scratch copy.

> Note: this requires a built `build/dist/`. Run `npm run build` first if it is stale.

### 1.3 Confirm no assertion depends on the old message

- [x] `grep -rn "Metadata was not persisted" src/ __tests__/ docs/ collections/` — expected to
      match only `src/lib/albums/organize-files-execution.ts:128`. If any test matches, FR-6 must
      preserve it or the test must be updated in the same commit.
      **Single match at `organize-files-execution.ts:128` as predicted; no test or doc asserts it.**

## Phase 2 — Pure refactor (no behaviour change)

> Every task in this phase must leave `npm test` at the Phase 1.1 baseline. A colour change here
> is a mistake in the move, not a discovery.

### 2.1 Create `src/lib/albums/audio-tag-verification.ts`

- [x] Move `metadataValues` (line 97), `matchesNumericTagFix` (line 101) and `verifyTagFix`
      (line 109) **verbatim** from `organize-files-execution.ts` into the new module, exporting
      only `verifyTagFix` for now (FR-1, FR-1b).
- [x] Keep the `Object.keys(fix).length === 0` early return ahead of `parseFile` (FR-1c).
- [x] Run `npm run lint -- src/lib/albums/audio-tag-verification.ts`. Fix issues. Re-run until
      clean. **Clean first run.**

### 2.2 Rewire the caller

- [x] Delete the three moved functions and the `parseFile` import from
      `src/lib/albums/organize-files-execution.ts`; import `verifyTagFix` from
      `./audio-tag-verification.js`. **The `AudioTagFix` type import also went — it was only used
      by the moved functions; the file now imports just `writeAudioTagFix` from `./audio-tags.js`.**
- [x] Confirm the call stays inside the `try`, between `writeAudioTagFix` and `rename` (NFR-9).
- [x] Run `npm run lint -- src/lib/albums/organize-files-execution.ts`. Fix issues. Re-run until
      clean. **Clean first run.**
- [x] Run `npm run build` and `npm test` — both exit 0, test counts unchanged from 1.1.
      **Both 0; 67 files / 408 tests, identical to baseline.**

### 2.3 Extend `makeAudioMetadata`

- [x] Add the optional third `native` parameter defaulting to `{}` (FR-8, `design-testing.md` §1). Do not
      change the `common` or `format` parameters.
      **Deviation, unavoidable: `FormatOverrides` had no `tagTypes` field, so the
      `{ tagTypes: ['ID3v2.3'] }` calls in `design-testing.md` §3 were not expressible. Added
      `tagTypes?: IFormat['tagTypes']` to `FormatOverrides`. This is additive and optional; the
      `tagTypes: []` default in `makeAudioMetadata` is unchanged, so no existing call site moves.**
      **Also: `INativeTags` and `TagType` are NOT re-exported from the `music-metadata` entry point
      (`core.d.ts` re-exports only `ITag`, `INativeTagDict`, `ICommonTagsResult`, `IFormat`,
      `IAudioMetadata`, …). Importing them yields an error type, which trips
      `@typescript-eslint/no-unsafe-assignment`. Used indexed access instead —
      `IAudioMetadata['native']` and `IFormat['tagTypes']` — which needs no new import and keeps
      NFR-6 satisfied.**
- [x] Confirm every existing two-argument call site still compiles (`npm run build`). **Exit 0.**
- [x] Run `npm run lint -- __tests__/test-helpers.ts`. Fix issues. Re-run until clean.
      **One error on the first pass (the error-typed `INativeTags` import, above); clean after
      switching to indexed access.**

## Phase 3 — Failing tests first

### 3.1 Write the new suite against the unchanged logic

- [x] Create `__tests__/lib/albums/audio-tag-verification.test.ts` covering the full
      `design-testing.md` §3 matrix (FR-9). **23 cases, 171 lines.**
- [x] Import the pure entry point by the name it will have (`findUnpersistedTagFields`); it does
      not exist yet, so the suite will not compile — that is expected and is resolved in 4.1.
      **Confirmed: 16 `no-unsafe-call` lint errors and 22 of 23 runtime failures, all
      `TypeError: findUnpersistedTagFields is not a function`.**
- [x] Run `npm run lint -- __tests__/lib/albums/audio-tag-verification.test.ts`. Fix issues.
      **Only the expected unresolved-import errors; cleared by 4.1.**

> Note: record here which cases fail once 4.1 lands the export but before 4.2 lands the fix.
> Expected failures: joined `albumArtists` on ID3v2.3, joined `artists` on ID3v2.3, producers via
> `IPLS`, producers via `TIPL`, and the FR-6 message shape. Anything else failing means the
> Phase 2 move was not verbatim.
>
> **Observed after 4.1: 6 failed / 17 passed. All six are FR-3/FR-4 cases — joined `albumArtists`
> on ID3v2.3, joined `artists` (FR-3b), the joined singular `albumartist` fallback, producers via
> `IPLS`, producers via `TIPL`, and the `verifyTagFix` joined read-back. Nothing outside that class
> moved, confirming the Phase 2 move was verbatim. The FR-6 message-shape case passed already,
> because 4.1 is where the new message lands.**

## Phase 4 — The fix

### 4.1 Split the pure core out of `verifyTagFix`

- [x] In `audio-tag-verification.ts`, extract the comparison into an exported
      `findUnpersistedTagFields(metadata: IAudioMetadata, fix: AudioTagFix): string[]` returning
      failed field names, and reduce `verifyTagFix` to `parseFile` + throw (FR-1a, FR-1b).
- [x] Order the checks `album, albumArtists, artists, discNumber, discTotal, producers, title,
      trackNumber` so FR-6's message order is stable.
- [x] Run `npm run lint -- src/lib/albums/audio-tag-verification.ts`. Fix issues.
      **Two deviations from `design.md` §3 forced by the lint config: (a) `[string, boolean][]` is
      rejected by `@typescript-eslint/array-type` for non-simple types — used
      `Array<[string, boolean]>`; (b) `@stylistic/indent-binary-ops` rejected the wrapped `||`
      continuations inside the tuples, so the read-back lists are hoisted into
      `albumArtists`/`artists`/`producers` consts above the array. The hoist keeps every check on
      one line and is what makes 4.2 a small diff.**
- [x] Run `npm test` — the Phase 3.1 suite now compiles; confirm exactly the expected cases fail.
      **6 failed / 17 passed, all in the FR-3/FR-4 class (see the Phase 3.1 note).**

### 4.2 Container-aware comparison

- [x] Add `joinsTextLists` reading `metadata.format.tagTypes?.includes('ID3v2.3')` (FR-2).
      **Deviation: `IFormat.tagTypes` is declared non-optional (`readonly tagTypes: TagType[]`), so
      the `?.` and the `=== true` the design specified are both rejected —
      `@typescript-eslint/no-unnecessary-condition` and `no-unnecessary-boolean-literal-compare`.
      Written as `metadata.format.tagTypes.includes('ID3v2.3')`.**
- [x] Add `matchesTextList` per `design.md` §3 and apply it to `albumArtists` **and** `artists`
      (FR-3, FR-3a, FR-3b). Keep the exact-equality branch first.
- [x] Add `involvedPeopleProducers` scanning `metadata.native` for `IPLS`/`TIPL` with the FR-4b
      runtime narrowing — no `any`, no assertion to a concrete domain shape (NFR-6). If the lint
      config rejects `as Record<string, unknown>`, use the `Object.entries(...)` form from
      `design.md` §3.
      **Both fallbacks in the design turned out to be unusable: `Object.entries(value)` returns
      `[string, any][]`, so the extracted value is `any` and trips `no-unsafe-assignment`. Used
      `in`-operator narrowing instead — `!('producer' in value)` guards, then `value.producer`
      types as `unknown` with no assertion at all. Strictly better than either drafted option.**
- [x] Wire producers as `common.producer ?? involvedPeopleProducers(metadata) ?? []` (FR-4c) and
      keep its comparison exact — do **not** route it through `matchesTextList` (FR-4d).
- [x] Update the throw to
      `Metadata was not persisted: <fields> (requested <json>)`, preserving the prefix (FR-6).
      **Landed in 4.1 with the pure-core split.**
- [x] Run `npm run lint -- src/lib/albums/audio-tag-verification.ts`. Fix issues. **Clean.**
- [x] Run `npm test` — the whole Phase 3.1 suite passes and the Phase 1.1 baseline is otherwise
      unchanged. **68 files / 431 tests, all passing: baseline 67/408 plus the 23 new cases.**
- [x] Run `wc -l src/lib/albums/audio-tag-verification.ts` — must be ≤ 200 (NFR-5). **99.**

### 4.3 End-to-end regression case

- [x] Run `wc -l __tests__/lib/albums/organize-files-metadata.test.ts` (187 at baseline). If the
      new case fits under 200, add it there; otherwise create
      `__tests__/lib/albums/organize-files-tag-verification.test.ts` (`design-testing.md` §3). Measure,
      do not guess. **Measured 187. The two cases need ~50 lines including the shared
      `sourceTrack`/`readBack` builders, which would reach ~237 — well past the cap. Created the
      sibling suite; `organize-files-metadata.test.ts` is untouched at 187.**
- [x] Add a case where `parseFile`'s second resolution returns
      `makeAudioMetadata({ albumartists: ['A/B'], … }, { tagTypes: ['ID3v2.3'] })` and assert
      `organizeAlbumFiles({ execute: true, … })` publishes instead of throwing (FR-9).
      **Two tracks in one grouping, `albumArtistsStrategy: 'aggregate'`, read back as
      `['Artist A/Artist B']` on ID3v2.3 → both rows `copied`. Added a negative twin asserting a
      genuinely-unpersisted list still rejects, so the tolerance cannot silently widen.**
      **Note: the suite also needs `artistFilenameStrategy: 'albumartist'`. Without it the two
      tracks resolve to different artist directories under one album directory and
      `organization-plan.ts:46` throws `Multiple artists resolve to the same album directory`
      before execution is ever reached.**
- [x] Run `npm run lint -- <the file you edited or created>`. Fix issues.
      **Two `restrict-template-expressions` errors on `` `Title ${trackNumber}` ``; wrapped in
      `String(...)`. Clean after.**

## Phase 5 — Real-file verification

### 5.1 Prove FR-7

- [x] `npm run build`.
- [x] Run the requirements §1 command with `--dest-dir` pointing at a **fresh** path under
      `etc/scratchpad/` that does not yet exist. **`etc/scratchpad/verify-dest-1`, confirmed absent
      beforehand.**
- [x] Confirm it exits 0 and organizes five files into three `OverClocked ReMix/<Album>/`
      directories. **Exit 0, all five rows `"action": "copied"`, into `7th Guest` (3 tracks),
      `3D Pinball- Space Cadet` (1) and `3-D Ultra Pinball- Creep Night` (1).**
- [x] Re-read one published `7th Guest` track and confirm `native['ID3v2.3']` contains
      `TPE2 = "AmIEviL/Mazedude/The Fat Man"` (FR-7, acceptance criterion 2).
      **`127 - AmIEviL.mp3`: `native ID3v2.3 TPE2 "AmIEviL/Mazedude/The Fat Man"`,
      `common.albumartists ["AmIEviL/Mazedude/The Fat Man"]`, `tagTypes ["ID3v2.3","ID3v1"]`.**
- [x] Re-run the same command with `--producer-strategy aggregate` added, into another fresh
      destination, and confirm it no longer throws `Metadata was not persisted` (acceptance
      criterion 3).
      **`etc/scratchpad/verify-dest-2`: exit 0, five `copied`. But this run does NOT exercise FR-4
      — the OC ReMix sources carry no producer tags, so the aggregate is empty (`"newProducers":
      []`) and `producers` never enters the tag fix. The criterion as written is not a real test.**
      **Ran a third case to actually prove FR-4: same command with
      `--producer-strategy copy-from-album-artists` into `etc/scratchpad/verify-dest-3`. Exit 0,
      five `copied`, and the published `127 - AmIEviL.mp3` carries
      `native ID3v2.3 IPLS {"producer":["OverClocked ReMix"]}` while `common.producer` is still
      `undefined`. That is precisely the shape the old comparison rejected (`[]` vs
      `["OverClocked ReMix"]`), so this run would have thrown before the fix and does not now.**
- [x] Remove the scratch destinations. **All three removed, along with both probe scripts;
      `git status --short etc/scratchpad` is empty.**

> Note: record the actual command lines and outcomes here. Do **not** point `--dest-dir` at
> `etc/albums/3-organized-files` — it currently holds partial output from the failed run that
> motivated this spec (an empty `OverClocked ReMix/7th Guest/` plus two published tracks), and
> cleaning it up is out of scope.
>
> **Honoured — every run used a fresh `etc/scratchpad/verify-dest-N`. `etc/albums/3-organized-files`
> was not touched and still holds the pre-existing partial output.**

## Phase 6 — Verification

### 6.1 Full lint + typecheck + test

- [x] `npm run lint` — whole-codebase last-call lint after all TypeScript modifications are
      complete; exit 0. **Exit 0; only the pre-existing eslint-plugin-react version warning.**
- [x] `npm run build` — exit 0 (NFR-2).
- [x] `npm test` — exit 0; baseline pass count from 1.1 plus the new cases (NFR-3).
      **69 files / 433 tests, all passing (baseline 67/408 + 23 unit + 2 end-to-end).**
- [x] `npm run test:coverage` — exit 0 and meets 85% statements, 85% lines, 90% functions, 70%
      branches (NFR-10). If branches dip, add the missing negative case rather than lowering the
      threshold. **Exit 0. Overall 93.42 stmts / 83.73 branch / 97.69 funcs / 92.87 lines.
      `audio-tag-verification.ts` is at 100/100/100/100 — note the `text` reporter omits its row
      entirely because it is fully covered; read `reports/coverage/coverage-summary.json` to see
      it. `organize-files-execution.ts` 96.55/88.88/93.75/96.22.**

### 6.2 Size and scope

- [x] `wc -l` on every file in `design.md` §2 — all ≤ 200 (NFR-5). Confirm
      `organize-files-execution.ts` shrank from 163.
      **`audio-tag-verification.ts` 99 · `organize-files-execution.ts` 128 (was 163) ·
      `test-helpers.ts` 75 (was 73) · `audio-tag-verification.test.ts` 171 ·
      `organize-files-metadata.test.ts` 187 (untouched) ·
      `organize-files-tag-verification.test.ts` 77. All ≤ 200.**
- [x] `git --no-pager diff --stat src/lib/albums/audio-tags.ts
      src/lib/albums/metadata-fix-planner.ts src/lib/albums/metadata-fix-strategies.ts
      src/lib/albums/organization-planner.ts src/lib/albums/organize-files.ts src/commands src/web
      collections` — output MUST be empty (NFR-7). **Empty.**
- [x] `git --no-pager diff --stat` — MUST list only the files in `design.md` §2.
      **Modified: `test-helpers.ts`, `organize-files-execution.ts`, and this `tasks.md`.
      Untracked: the two new test suites and `audio-tag-verification.ts`. Nothing else.**
- [x] `git status --short etc/scratchpad` — no probe or scratch artefacts left behind. **Empty.**

## Phase 7 — Documentation

### 7.1 `docs/album-organization.md`

- [x] Document that ID3v2.3 text frames are single-valued, that a multi-value album-artist list is
      stored in `TPE2` joined with `/`, and that verification accepts that form (FR-10, FR-3).
      **New `## Tag container limits` section, placed after `## Multi-disc metadata`.**
- [x] Record the FR-3c ambiguity: an album artist literally named `A/B` is indistinguishable from
      the list `['A','B']` after an ID3v2.3 round trip.
- [x] Note that MP3 producers are stored in the involved-people frame (`IPLS` on ID3v2.3, `TIPL`
      on ID3v2.4) and that verification reads it directly because `common.producer` is not
      populated for that container.
- [x] Record the FR-8 gap: `year` is written but not verified.
- [x] Do **not** claim the leftover-album-directory behaviour changed. **The section states the
      opposite explicitly — that a failed run still leaves its album directory behind and blocks
      the retry — so the docs do not imply this spec fixed it.**

> **NFR-5 conflict, resolved in favour of FR-10.** NFR-5 caps every file this spec modifies at 200
> lines, but `docs/album-organization.md` (226) and `docs/testing.md` (210) already exceeded it
> before any edit here, and `design.md` §2 nonetheless schedules both for modification. The cap is
> a code-hygiene rule — its "Current counts" list enumerates only source and test files — and
> satisfying it would mean deleting unrelated existing documentation. Wrote the FR-10 content;
> the docs are now 264 and 251. Every source and test file remains ≤ 200.

### 7.2 `docs/testing.md`

- [x] Add the FR-7 manual recipe: the §1 command, a fresh scratch `--dest-dir`, and the expected
      three-album outcome. **New `## Manual ID3v2.3 Tag Verification Check` section, placed before
      `## Hermetic Rules` and explicitly marked as the one check that touches real media, so it
      does not read as a contradiction of the "No real media files" rule. Includes the
      `copy-from-album-artists` variant and the warning that `aggregate` does not reach the
      producer path. Also registered both new suites in the `## Test Layout` listing.**
- [x] Use only files verified to exist under
      `etc/albums/1-source-files/OC ReMix Collection - 1 to 4000 [v20201028]/`; re-check before
      relying on any filename. **The recipe names no individual source filename — only the album
      directories the run produces, which were observed in Phase 5. Re-listed the source directory
      afterwards to confirm the five `--limit 5` selections still exist.**
