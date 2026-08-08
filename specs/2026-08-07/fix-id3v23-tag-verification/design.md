# Design: Container-aware tag verification in `organize-files`

> Scope reminder: this spec touches **only**
> `src/lib/albums/audio-tag-verification.ts` (new),
> `src/lib/albums/organize-files-execution.ts`, `__tests__/test-helpers.ts`, two test suites under
> `__tests__/lib/albums/`, and two files under `docs/`. No edits to `audio-tags.ts`, to any
> planner, to any surface (CLI/REST/GraphQL/MCP), or to `collections/`. No new dependencies, no
> `npx`.

## 1. Overview

The defect is a **verification** defect, not a write defect. `writeAudioTagFix` stores everything
it is asked to store; ID3v2.3 simply cannot represent a multi-value `TPE2` as anything but a
`/`-joined string, and `music-metadata@11` does not lift the ID3v2.3 `IPLS` frame onto
`common.producer`. `verifyTagFix` compares against `common` as though it were a lossless mirror of
the write, so it rejects two categories of successful write (requirements §1 table).

The chosen pattern is **container-aware comparison**: keep comparing against the parsed metadata,
but let each field's comparator know which tag container it is reading from and consult `native`
where `common` is lossy. This is preferred over changing the write path (§8 decision 1) because it
leaves published files byte-identical to what the tool already produces and confines the change to
one function's worth of logic.

Two structural moves come with it. First, the verification is **extracted** into
`src/lib/albums/audio-tag-verification.ts` (FR-1): the comparison grows past what
`organize-files-execution.ts` can absorb under NFR-5's 200-line cap, and extraction is what makes
it directly unit-testable — today `verifyTagFix` is private and every suite that exercises the
execution path mocks `writeAudioTagFix` into a no-op *and* mocks `parseFile`, so the real
comparison has never had a test. Second, the comparison is split into a **pure** core
(`IAudioMetadata` + `AudioTagFix` → failed field names) and a thin async wrapper (FR-1a, FR-1b),
so the FR-9 matrix is exercised without touching the filesystem.

The error message gains the failed field names (FR-6). The current message reprints the requested
fix and nothing else, which is why diagnosing this required a scratch-destination re-run; the pure
core already computes the list, so surfacing it is free.

## 2. File layout

### Modified files

```
src/lib/albums/audio-tag-verification.ts                (new,      ≤ 130 LOC)
src/lib/albums/organize-files-execution.ts              (modified, 163 → ~130 LOC)
__tests__/test-helpers.ts                               (modified, 73 → ~78 LOC)
__tests__/lib/albums/audio-tag-verification.test.ts     (new,      ≤ 200 LOC)
__tests__/lib/albums/organize-files-metadata.test.ts    (modified, 187 → ≤ 200 LOC; see `design-testing.md` §3)
docs/album-organization.md                              (modified, +~18 lines)
docs/testing.md                                         (modified, +~20 lines)
```

### Files explicitly NOT modified

- `src/lib/albums/audio-tags.ts` — the write path is correct for ID3v2.3 (§8 decision 1).
- `src/lib/albums/metadata-fix-strategies.ts` / `metadata-fix-planner.ts` — `aggregate` producing
  a multi-value list is the intended behaviour; only its verification was wrong.
- `src/lib/albums/organization-planner.ts`, `organize-files.ts`, `album-art-planner.ts` — planning
  is untouched.
- `src/commands/`, `src/web/`, `collections/` — no surface change (FR-2 goal statement).
- Everything under `src/lib/audiobooks/` and `src/commands/manage-audiobooks/`.

## 3. Extracted module shape

`src/lib/albums/audio-tag-verification.ts`:

```ts
import { type IAudioMetadata, parseFile } from 'music-metadata'

import type { AudioTagFix } from './audio-tags.js'

/** ID3v2.3 text frames are single-valued; multi-value lists are stored joined with '/'. */
const ID3V2_3_LIST_SEPARATOR = '/'

function metadataValues(values: string[] | undefined, value: string | undefined): string[] {
  return values ?? (value === undefined || value === '' ? [] : [value])
}

function matchesNumericTagFix(value: number | null, kindedValue: AudioTagFix['discNumber']): boolean {
  // carried over verbatim from organize-files-execution.ts:101 (FR-5)
}

function joinsTextLists(metadata: IAudioMetadata): boolean {
  return metadata.format.tagTypes?.includes('ID3v2.3') === true
}

function matchesTextList(actual: string[], expected: string[], joinsLists: boolean): boolean {
  if (JSON.stringify(actual) === JSON.stringify(expected)) {
    return true
  }
  return joinsLists
    && expected.length > 1
    && actual.length === 1
    && actual[0] === expected.join(ID3V2_3_LIST_SEPARATOR)
}

function involvedPeopleProducers(metadata: IAudioMetadata): string[] | undefined {
  for (const tags of Object.values(metadata.native)) {
    for (const tag of tags) {
      if (tag.id !== 'IPLS' && tag.id !== 'TIPL') {
        continue
      }
      const value: unknown = tag.value

      if (typeof value !== 'object' || value === null) {
        continue
      }
      const producers: unknown = (value as Record<string, unknown>).producer

      if (Array.isArray(producers) && producers.every(entry => typeof entry === 'string')) {
        return producers
      }
    }
  }
  return undefined
}

export function findUnpersistedTagFields(metadata: IAudioMetadata, fix: AudioTagFix): string[] {
  const { common } = metadata
  const joinsLists = joinsTextLists(metadata)
  const producers = common.producer ?? involvedPeopleProducers(metadata) ?? []
  const checks: [string, boolean][] = [
    ['album', fix.album === undefined || common.album === fix.album],
    ['albumArtists', fix.albumArtists === undefined
      || matchesTextList(metadataValues(common.albumartists, common.albumartist), fix.albumArtists, joinsLists)],
    ['artists', fix.artists === undefined
      || matchesTextList(metadataValues(common.artists, common.artist), fix.artists, joinsLists)],
    ['discNumber', matchesNumericTagFix(common.disk.no, fix.discNumber)],
    ['discTotal', matchesNumericTagFix(common.disk.of, fix.discTotal)],
    ['producers', fix.producers === undefined
      || JSON.stringify(producers) === JSON.stringify(fix.producers)],
    ['title', fix.title === undefined || common.title === fix.title],
    ['trackNumber', fix.trackNumber === undefined || common.track.no === fix.trackNumber],
  ]

  return checks.flatMap(([field, matched]) => matched ? [] : [field])
}

export async function verifyTagFix(path: string, fix: AudioTagFix): Promise<void> {
  if (Object.keys(fix).length === 0) {
    return
  }
  const failed = findUnpersistedTagFields(await parseFile(path), fix)

  if (failed.length > 0) {
    throw new Error(`Metadata was not persisted: ${failed.join(', ')} (requested ${JSON.stringify(fix)})`)
  }
}
```

Notes tied to requirements:

| Requirement | Where it lands |
| --- | --- |
| FR-1c early return | `verifyTagFix` guard, before `parseFile` |
| FR-2 container detection | `joinsTextLists` |
| FR-3 / FR-3a / FR-3b | `matchesTextList`, applied to both `albumArtists` and `artists` |
| FR-4a / FR-4b / FR-4c | `involvedPeopleProducers` + the `??` chain |
| FR-4d exact producers | `producers` row uses `JSON.stringify`, not `matchesTextList` |
| FR-5 carried over | `album`, `title`, `trackNumber`, `matchesNumericTagFix` rows |
| FR-6 message | `verifyTagFix` throw |

`(value as Record<string, unknown>)` is an assertion to an index signature after a `typeof`
check, not to a concrete domain shape; NFR-6/FR-4b forbid the latter. If the lint config rejects
even that, use `Object.entries(value).find(([key]) => key === 'producer')?.[1]` instead — the task
list allows either.

## 4. Caller change

`src/lib/albums/organize-files-execution.ts`, before:

```ts
import { parseFile } from 'music-metadata'
…
function metadataValues(…) { … }          // line 97
function matchesNumericTagFix(…) { … }    // line 101
async function verifyTagFix(…) { … }      // line 109
```

after:

```ts
// `parseFile` import removed entirely — no other use in the file.
import { verifyTagFix } from './audio-tag-verification.js'
```

`publishOrganizationCopy` is otherwise untouched. The ordering invariant of NFR-9 is preserved by
leaving line 149 exactly where it is:

```ts
await copyFile(plan.sourcePath, stagedPath)
if (plan.tagFix !== undefined && Object.keys(plan.tagFix).length > 0) {
  writeAudioTagFix(stagedPath, plan.tagFix)
  await verifyTagFix(stagedPath, plan.tagFix)   // still before rename
}
await rename(stagedPath, plan.destinationPath)
```

## 5. Migration strategy

1. Create `audio-tag-verification.ts` by moving the three functions verbatim, exporting
   `verifyTagFix`. No behaviour change yet. Lint, build, test — everything must stay green.
2. Rewrite the caller to import it and drop the `music-metadata` import. Lint, build, test.
3. Extend `makeAudioMetadata` with the `native` parameter. Lint, build, test.
4. Add the new suite against the **unchanged** logic, marking the FR-3/FR-4 cases as the ones
   expected to fail. Confirm they fail for the stated reason — this is the regression proof.
5. Introduce `matchesTextList`, `joinsTextLists`, `involvedPeopleProducers`, and the FR-6 message.
   The previously failing cases turn green; nothing else moves.
6. Add the end-to-end case, then the docs.

Steps 1–3 are pure refactors and must not change a single test outcome. Any test that changes
colour before step 5 is a mistake in the move, not a discovery.

## 6. Risk Table

| Risk | Likelihood | Mitigation |
| ---- | ---------- | ---------- |
| The `/` tolerance masks a genuine write failure | Low | Gated on ID3v2.3 **and** `expected.length > 1` **and** `actual.length === 1` (FR-3a). ID3v2.3 cannot distinguish the ambiguous case either; documented per FR-3c. |
| `native` shape differs from the probed `{ id, value }` in some container | Medium | FR-4b's runtime narrowing falls through to `undefined` → `[]`, which is exactly today's behaviour. Tested by the malformed-`native` case. |
| FLAC producers regress | Low | FR-4c makes the fallback strictly additive — `common.producer` wins when present. Unverified for want of a `.flac` fixture; Phase 1 records the gap. |
| `organize-files-metadata.test.ts` breaches 200 lines | Medium | `design-testing.md` §3 pre-authorises a new sibling suite; task 4.2 measures first. |
| FR-6 breaks an unseen assertion on the old message | Low | Repository-wide grep for `Metadata was not persisted` finds only `organize-files-execution.ts:128` — no test asserts it. Prefix preserved regardless. Re-grep in task 1.3. |
| Coverage dips because new branches outnumber new tests | Medium | NFR-10; the FR-9 matrix covers both sides of every new branch. |

## 7. Verification

After every source code file edit:
1. `npm run lint -- <modified-file>` — lint only the file just modified (NFR-1)

Once at end of spec:
1. `npm run lint` — whole-codebase last-call lint after all TypeScript modifications are complete;
   must exit 0
2. `npm run build` — must exit 0 (NFR-2; the script is `build`, not `build:ts`)
3. `npm test` — must exit 0 (NFR-3)
4. `npm run test:coverage` — must exit 0 and meet every threshold (NFR-10)
5. `wc -l` on each file in §2 — all ≤ 200 (NFR-5)
6. `git --no-pager diff --stat src/lib/albums/audio-tags.ts src/lib/albums/metadata-fix-planner.ts
   src/lib/albums/metadata-fix-strategies.ts src/lib/albums/organization-planner.ts
   src/lib/albums/organize-files.ts src/commands src/web collections` — must be empty (NFR-7)
7. The FR-7 real-file run (tasks §5.1), against a scratch `--dest-dir` that does not already exist

## 8. Open decisions

1. **Rejected: force ID3v2.4 output.** `node-taglib-sharp` exposes
   `Id3v2Settings.forceDefaultVersion = true` / `defaultVersion = 4`, which would store multi-value
   `TPE2` with null separators and round-trip faithfully — a truer fix for the underlying lossiness.
   Rejected because it silently upgrades the tag version of every file the tool publishes, changing
   output for users who never hit this bug, and because `music-metadata`'s `TIPL` → `common.producer`
   mapping was **not** observed working either, so it would not fix FR-4 anyway. Recommend keeping
   it rejected; raise a separate spec if faithful multi-value storage becomes a goal.
2. **Producers (FR-4) could be split into its own spec.** It is a latent defect, not the reported
   one, and it carries the only `native`-reading code here. Recommend keeping it: it lives in the
   same expression list, and shipping the `albumArtists` fix alone would leave
   `--producer-strategy aggregate` guaranteed-broken on every MP3. If the user prefers a narrower
   change, drop FR-4, FR-8, the producer rows of the `design-testing.md` §3 matrix, and Phase 3.
3. **FR-6's message change could be dropped.** It is diagnosability, not correctness. Recommend
   keeping it — the missing field name is what made this bug expensive to locate — but it is the
   cheapest thing to cut if the diff should be minimal.
