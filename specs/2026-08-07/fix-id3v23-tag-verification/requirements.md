# Requirements: Container-aware tag verification in `organize-files`

## 1. Background

`organize-files --execute` publishes each file through `publishOrganizationCopy`
(`src/lib/albums/organize-files-execution.ts:141`): copy to a staged sibling, apply
`writeAudioTagFix`, re-read the staged file with `verifyTagFix` (line 109), then `rename` into
place. `verifyTagFix` re-parses with `music-metadata` and compares the read-back `common` view
against the `AudioTagFix` that was requested; any mismatch throws
`Metadata was not persisted: <json>`.

That comparison assumes the tag container can store, and `music-metadata` can surface, exactly
what was asked for. For **ID3v2.3** — the container on every file in
`etc/albums/1-source-files/OC ReMix Collection - 1 to 4000 [v20201028]/` — that assumption is
false for two of the eight checked fields, so the write succeeds and the verification rejects it.

The failure was reproduced with:

```sh
node . manage-albums organize-files --limit 5 --format json --allow-multiple-albums \
  --ignore-non-audio-files --title-filename-strategy subtitle --album-artists-strategy aggregate \
  --set-artist "OverClocked ReMix" --album-strategy grouping \
  --source-dir "etc/albums/1-source-files/OC ReMix Collection - 1 to 4000 [v20201028]" \
  --dest-dir <scratch> --execute
```

```
Error: Failed to repair and organize "7th_Guest_AmIEviL_OC_ReMix.mp3" with metadata
  {"album":"7th Guest","albumArtists":["AmIEviL","Mazedude","The Fat Man"],"artists":["OverClocked ReMix"]}
[cause]: Error: Metadata was not persisted: {…}
```

**Empirically measured round-trip behaviour** (write with `writeAudioTagFix`, re-read with
`music-metadata@11`, on an ID3v2.3 `.mp3` from the source above):

| `AudioTagFix` field | Frame written by `node-taglib-sharp` | Read back as | `verifyTagFix` verdict |
| --- | --- | --- | --- |
| `albumArtists: ['A','B']` | one `TPE2` = `"A/B"` | `common.albumartists = ["A/B"]` | ❌ false failure |
| `artists: ['X','Y']` | two `TPE1` frames | `common.artists = ["X","Y"]` | ✅ correct |
| `producers: ['P1','P2']` | one `IPLS` = `{producer:["P1","P2"]}` | `common.producer = undefined` | ❌ false failure |
| `album`, `title`, `trackNumber`, `discNumber`, `discTotal` | single-valued frames | exact | ✅ correct |

Two independent defects, both inside `verifyTagFix`:

*First, ID3v2.3 text frames are single-valued.* `node-taglib-sharp` serialises
`tag.albumArtists` (`src/lib/albums/audio-tags.ts:99`) by joining the list with `/`, which is the
only representation ID3v2.3 offers. `verifyTagFix` compares arrays with `JSON.stringify`
(line 117), so `["A/B"] !== ["A","B"]`. This fires only when the list has **two or more** entries,
which is exactly what `--album-artists-strategy aggregate`
(`src/lib/albums/metadata-fix-strategies.ts:7`) produces for any grouping containing more than one
artist. It is why the two single-artist albums in the run above were copied and the three-artist
`7th Guest` grouping was not.

*Second, `music-metadata` does not surface the ID3v2.3 involved-people frame on `common`.* The
frame is written correctly and appears in `native['ID3v2.3']` as `{ id: 'IPLS', value: { producer:
[…] } }`, but `common.producer` stays `undefined`, so the check at line 122 compares `[]` against
the requested list. Any non-empty `producers` fix on an `.mp3` therefore fails —
`--producer-strategy aggregate` and `--producer-strategy copy-from-album-artists` are both
unusable against MP3 sources today. This is latent rather than reported, but it is the same defect
class in the same expression list and is fixed here rather than left as a landmine.

A third aggravating factor is diagnostic, not behavioural: the thrown message reprints the whole
requested fix and never names the field that mismatched, which is why reproducing this required
re-running the command against a scratch destination.

## 2. Goal

`verifyTagFix` verifies what the container can actually hold. A metadata write that succeeded as
faithfully as the target tag format permits is accepted; a write that genuinely did not land is
still rejected, and the resulting error names the offending fields. The reproduction command above
completes and organizes all five files. No CLI flag, request field, GraphQL field, MCP argument,
JSON output row, or planning behaviour changes.

## 3. Scope

### In scope

- `src/lib/albums/audio-tag-verification.ts` — **new**; the extracted, container-aware
  verification
- `src/lib/albums/organize-files-execution.ts` — drops the verification internals, imports the new
  module
- `__tests__/test-helpers.ts` — `makeAudioMetadata` gains a `native` override
- `__tests__/lib/albums/audio-tag-verification.test.ts` — **new**; unit tests for the comparison
- `__tests__/lib/albums/organize-files-metadata.test.ts` — regression cases through
  `organizeAlbumFiles`
- `docs/album-organization.md`, `docs/testing.md` — the container caveats and a real-file recipe

### Out of scope

- **Root cause 2 of the original report — leftover album directories.**
  `publishOrganizationCopy` creates album directories before the write that can fail
  (`organize-files-execution.ts:142`) and does not remove them, so `assertNoExistingAlbum`
  (line 64) blocks every retry under the default `destinationStrategy: 'error'` with
  `Destination album directories already exist:`. That is a separate defect with a separate fix
  (emptiness check and/or `rmdir` on failure) and MUST NOT be addressed here. It is the reason the
  user's second run reported a misleading error; fixing verification removes the *cause* of the
  poisoned state but not the poisoning behaviour.
- **`src/lib/albums/audio-tags.ts`.** The write path is correct — `TPE2` joining and `IPLS` are
  what ID3v2.3 specifies. Forcing ID3v2.4 output (`Id3v2Settings.forceDefaultVersion`) would make
  multi-value lists round-trip natively but rewrites the tag version of every published file; see
  `design.md` §8 decision 1, rejected.
- **`fix.year` verification.** `writeAudioTagFix` writes `year` (`audio-tags.ts:126`) and
  `verifyTagFix` never checks it. That gap predates this spec and is recorded (FR-8), not closed —
  adding a check risks introducing a *new* false failure of exactly the kind being removed.
- **`common.producer` on FLAC/Xiph.** No `.flac` fixture exists in the repository, so the Xiph
  producer round-trip is unverified. FR-4c requires the fallback to be additive so FLAC behaviour
  cannot regress, and Phase 1 requires the gap to be recorded rather than guessed at.
- Planning, destination-collision, `destinationStrategy`, album-art, and disc logic. Every
  surface: CLI options, REST schemas, GraphQL inputs, MCP schemas, `schema.gql`.
- The Bruno collection. This spec adds no request field, so there is nothing new to smoke.
- `manage-albums validate`, `manage-albums set-metadata`, `manage-audiobooks`, new dependencies.

## 4. Functional Requirements

- **FR-1** The verification logic MUST move out of `src/lib/albums/organize-files-execution.ts`
  into a new `src/lib/albums/audio-tag-verification.ts`. `metadataValues` (line 97),
  `matchesNumericTagFix` (line 101) and `verifyTagFix` (line 109) move; `assertUniqueOrganization\
Destinations`, `prepareOrganizationDestinations`, `temporaryPath`, `executeOrganizationCopies` and
  `publishOrganizationCopy` stay. The call site at line 149 MUST keep its position inside the
  `try` block, between `writeAudioTagFix` and `rename`.
  - **FR-1a** The module MUST export a **pure** function that takes an already-parsed
    `IAudioMetadata` plus an `AudioTagFix` and returns the names of the fields that did not
    persist, so the comparison is unit-testable without file I/O or a `music-metadata` mock.
  - **FR-1b** The module MUST also export the async `verifyTagFix(path, fix)` wrapper that calls
    `parseFile` and throws. `organize-files-execution.ts` MUST import only the wrapper.
  - **FR-1c** The early return for an empty fix (`Object.keys(fix).length === 0`) MUST be
    preserved, so `parseFile` is not called for album-art copies or no-op fixes.
- **FR-2** The comparison MUST consult `IAudioMetadata.format.tagTypes` and treat `'ID3v2.3'` as a
  container whose text frames are single-valued.
- **FR-3** For `albumArtists` **and** `artists`, a read-back value MUST be accepted when either:
  - it equals the requested list exactly (today's rule, which MUST keep working); or
  - the container is ID3v2.3, the requested list has **two or more** entries, the read-back list
    has **exactly one** entry, and that entry equals the requested list joined with `/`.
  - **FR-3a** A requested list of length 0 or 1 MUST still require exact equality. The tolerant
    branch MUST NOT be reachable for single-valued fixes.
  - **FR-3b** The rule MUST apply to `artists` as well as `albumArtists` even though `TPE1` is
    currently written as repeated frames and round-trips exactly (§1 table). The fallback is inert
    for `artists` today; applying it uniformly keeps the two fields from diverging if
    `node-taglib-sharp` changes its `performers` serialisation.
  - **FR-3c** The accepted ambiguity MUST be documented: a genuine single album artist literally
    named `A/B` is indistinguishable from the list `['A','B']` after an ID3v2.3 round trip, so the
    former will satisfy a fix requesting the latter. ID3v2.3 cannot distinguish them either.
- **FR-4** The `producers` check MUST fall back to the involved-people frame when
  `common.producer` is absent.
  - **FR-4a** The fallback MUST scan `IAudioMetadata.native` for a tag whose `id` is `'IPLS'`
    (ID3v2.3) or `'TIPL'` (ID3v2.4) and read its `producer` entry.
  - **FR-4b** `native` values are untyped; the fallback MUST narrow through `unknown` with runtime
    checks (object, non-null, `Array.isArray`, every entry `typeof === 'string'`) and MUST NOT use
    `any` or a type assertion to a concrete shape (NFR-6).
  - **FR-4c** Resolution order MUST be `common.producer` → involved-people frame → `[]`, so any
    container that already populates `common.producer` keeps today's behaviour exactly and FLAC
    cannot regress.
  - **FR-4d** The joined-list tolerance from FR-3 MUST NOT be applied to `producers`: the
    involved-people frame is a genuine multi-value list, so exact equality is achievable and
    MUST be required.
- **FR-5** The checks for `album`, `title`, `trackNumber`, `discNumber` and `discTotal` MUST be
  carried over unchanged, including `matchesNumericTagFix`'s treatment of `{ kind: 'clear' }` as
  satisfied by `null` **or** `0`.
- **FR-6** The thrown error MUST name the fields that failed:
  `Metadata was not persisted: <field>, <field> (requested <json>)`, where `<field>` values are the
  `AudioTagFix` key names in the order listed in FR-5/FR-3/FR-4 and `<json>` is today's
  `JSON.stringify(fix)`. The message MUST remain prefixed `Metadata was not persisted: ` so any
  existing `toThrow` substring match still matches. It is still an `Error`, not a
  `UserInputError`, and `publishOrganizationCopy`'s wrapping at line 153 is unchanged.
- **FR-7** The reproduction command in §1 MUST complete against a clean destination, organizing
  all five selected files into three `OverClocked ReMix/<Album>/` trees, and the published
  `7th Guest` tracks MUST carry `TPE2 = "AmIEviL/Mazedude/The Fat Man"`.
- **FR-8** `makeAudioMetadata` (`__tests__/test-helpers.ts:50`) MUST gain an optional third
  parameter overriding `native`, defaulting to today's `{}`, so the FR-4 fallback is testable.
  The existing two-parameter call sites MUST keep compiling unchanged.
- **FR-9** Tests MUST cover, at minimum: exact-match acceptance; ID3v2.3 joined `albumArtists`
  acceptance; a genuine `albumArtists` mismatch still rejected; the joined form **rejected** when
  `tagTypes` does not include `ID3v2.3`; FR-3a single-entry exactness; `producers` accepted via the
  `IPLS` fallback; `producers` accepted via `common.producer` when present; a genuine `producers`
  mismatch still rejected; a malformed `native` value falling through safely to `[]`; the FR-6
  message naming exactly the failed fields; and at least one end-to-end case through
  `organizeAlbumFiles` proving a multi-artist aggregate publishes.
- **FR-10** Documentation MUST record: the ID3v2.3 single-valued-text-frame constraint and the `/`
  join for `TPE2`; that verification tolerates it (FR-3) and the FR-3c ambiguity; that MP3
  producers live in `IPLS`/`TIPL`; the FR-8 `year` gap; and the FR-7 manual recipe in
  `docs/testing.md`. It MUST NOT claim the out-of-scope leftover-directory defect is fixed.

## 5. Non-Functional Requirements

- **NFR-1 (lint after every source code file modification)** After every modification of a source
  code file (for example, a `.ts` file) under `src/` or `__tests__/`,
  `npm run lint -- <modified-file>` MUST be run and any reported issues fixed before moving on.
  This applies per source-code edit, not per-task. Whole-codebase `npm run lint` MUST be reserved
  for final verification after all TypeScript modifications are complete.
  <!-- Note: the `lint` script is `eslint ./src ./__tests__`, so this form appends the path and
       lints the whole codebase plus that file. The substance — modified file linted, issues
       fixed — still holds. -->
- **NFR-2 (typecheck)** `npm run build` MUST exit 0. The typecheck script is `build`, **not**
  `build:ts`.
- **NFR-3 (tests)** `npm test` MUST exit 0.
- **NFR-4 (no `npx`)** `npx` is forbidden in **all** forms. Use `./node_modules/.bin/<tool>` or
  `npm run <script>` exclusively.
- **NFR-5 (file size)** No file produced or modified by this spec MAY exceed 200 lines.
  Current counts: `organize-files-execution.ts` 163 (MUST shrink to ≈130),
  `__tests__/test-helpers.ts` 73, `__tests__/lib/albums/organize-files-metadata.test.ts` 187
  (⚠ only ~13 lines of headroom — if the FR-9 end-to-end cases do not fit, they MUST go in a new
  sibling suite rather than breaching 200). The new
  `src/lib/albums/audio-tag-verification.ts` MUST stay under 200.
- **NFR-6 (type safety)** Strict TypeScript; no `any`, no `// @ts-…` escapes, no assertion of
  `native` values to a concrete interface (FR-4b).
- **NFR-7 (scope discipline)** `git --no-pager diff --stat src/lib/albums/audio-tags.ts
  src/lib/albums/metadata-fix-planner.ts src/lib/albums/metadata-fix-strategies.ts
  src/lib/albums/organization-planner.ts src/lib/albums/organize-files.ts src/commands src/web
  collections` MUST be empty after the spec.
- **NFR-8 (behavioural parity)** For every tag fix that verifies successfully today, the outcome
  MUST be unchanged. For every fix that genuinely does not persist, an error MUST still be thrown,
  still wrapped by `publishOrganizationCopy` into
  `Failed to repair and organize "<filename>" with metadata <json>`, and the staged temporary file
  MUST still be removed by the `finally` at line 160. JSON output rows are untouched.
- **NFR-9 (no partial publication)** A verification failure MUST still happen **before** `rename`,
  so a file that fails verification is never published.
- **NFR-10 (coverage)** `npm run test:coverage` MUST still meet `vitest.config.ts` thresholds —
  85% statements, 85% lines, 90% functions, 70% branches. This change is almost entirely new
  branches, so tests MUST cover the rejecting paths, not only the newly accepting ones.

## 6. Acceptance Criteria

1. The §1 reproduction command completes against a clean `--dest-dir`, organizing five files into
   three album directories (FR-7).
2. Re-reading a published `7th Guest` track shows `TPE2 = "AmIEviL/Mazedude/The Fat Man"` in
   `native['ID3v2.3']` (FR-7).
3. `--producer-strategy aggregate` against two MP3s from the OC ReMix source publishes instead of
   throwing `Metadata was not persisted` (FR-4).
4. A fix whose value genuinely did not land still throws, and the message names the failed field
   (FR-6).
5. `src/lib/albums/organize-files-execution.ts` no longer imports `music-metadata` and no longer
   defines `verifyTagFix`, `metadataValues` or `matchesNumericTagFix` (FR-1).
6. `npm run lint`, `npm run build`, `npm test` and `npm run test:coverage` all exit 0, the last
   meeting every threshold (NFR-10).
7. `wc -l` on every file created or modified is ≤ 200 (NFR-5).
8. `git --no-pager diff --stat` lists only the files in `design.md` §2; the NFR-7 paths are absent.
