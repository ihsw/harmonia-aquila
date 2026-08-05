# Design: Embed Disc Number in Track Filenames

> Scope reminder: this spec touches only the album-organization core under
> `src/lib/albums/`, its focused tests under `__tests__/lib/albums/` and
> `__tests__/commands/manage-albums/`, and organize-files documentation. No
> CLI, REST, GraphQL, or MCP schema changes are needed — every adapter passes
> options straight through to `organizeAlbumFiles`/`validateAlbums`, neither
> of which changes its public signature. No new dependencies, no `npx`.

## 1. Overview

Two independent call sites currently build destination paths through
`getAlbumDestination` (`organization-plan.ts`): `organization-planner.ts`
(used by both `organizeSingleAlbum` and `organizeConcatenatedAlbum` via
`planOrganizationCopies`) and `validate.ts` (used by `validateAlbums`). Both
pass a `DiscDestinationContext` with `discNumber`/`multiDisc`; only
`organization-planner.ts` currently varies `multiDisc` based on an internal
`DiscLayout` flag (`'disc-directories'` nests a `Disc DD/` folder,
`'flat'` — always used by concatenate — suppresses disc info from the path
entirely, which is the root cause of the collision documented in
`requirements.md` §1).

This spec collapses that distinction: `getAlbumDestination` gains one new
rendering rule (a disc+track numeric prefix instead of a nested directory),
`DiscLayout` is deleted outright, and both callers pass `discTotal` so the
prefix can be width-padded correctly. Nothing about how `discNumber` or
`discTotal` are *derived* changes — `disc-metadata.ts`, `metadata-fix-planner.ts`,
and `concatenate-album-sources.ts` are untouched.

## 2. File layout

### Modified files

```
src/lib/albums/organization-plan.ts                              (+~14 lines)
src/lib/albums/organization-planner.ts                            (~-8 lines)
src/lib/albums/organize-files.ts                                  (~-1 line)
src/lib/albums/validate.ts                                        (~+1 line)
__tests__/lib/albums/organize-files-metadata-disc.test.ts         (updated strings)
__tests__/lib/albums/organize-files-disc-policy.test.ts           (updated strings)
__tests__/lib/albums/organize-files-album-art.test.ts             (updated string)
__tests__/lib/albums/validate-disc.test.ts                        (updated strings)
__tests__/lib/albums/organize-files-concatenate.test.ts           (updated strings + rewritten collision test)
__tests__/lib/albums/organize-files-concatenate-execution.test.ts (updated strings + rewritten collision test)
__tests__/commands/manage-albums/organize-files.test.ts           (updated strings)
__tests__/commands/manage-albums/organize-files-disc.test.ts      (updated strings)
docs/album-organization.md                                        (Multi-disc metadata section)
docs/organize-files-set-metadata.md                                (Days of Purgatory worked example)
```

### New files

```
__tests__/lib/albums/organization-plan.test.ts   (new, focused unit tests for the padding/prefix rule)
```

### Files explicitly NOT modified

- `src/lib/albums/disc-metadata.ts`, `disc-metadata-error.ts`,
  `metadata-fix-planner.ts`, `concatenate-album-sources.ts`: disc/track
  *derivation* and validation are unchanged; this spec only changes
  rendering of already-resolved numbers.
- `src/lib/albums/album-art-planner.ts`: album art destinations are built
  from `audioPlans[0].albumDestinationPath` (the album directory, not the
  track filename) and were already disc-agnostic; no change needed.
- `src/commands/manage-albums/organize-files.ts` (CLI), `src/web/**`
  (controllers, GraphQL resolvers, MCP tools): none read or expose
  `DiscLayout`; all forward options to the unchanged core function
  signatures. Their existing contract tests are the regression net.
- `package.json` and lockfiles.

## 3. Public contracts

### 3.1 `organization-plan.ts` deltas

```ts
export interface DiscDestinationContext {
  discNumber: number | null
  discTotal: number | null
  multiDisc: boolean
}

export function formatDiscTrackPrefix(discNumber: number, discTotal: number, trackNumber: number): string {
  const discWidth = Math.max(1, discTotal.toString().length)
  return `${discNumber.toString().padStart(discWidth, '0')}${formatTrackNumber(trackNumber)}`
}

export function getAlbumDestination(
  artistFilename: string,
  album: string,
  trackNumber: number,
  titleFilename: string,
  sourceFilename: string,
  discContext: DiscDestinationContext = { discNumber: null, discTotal: null, multiDisc: false },
): string {
  const albumDirectory = join(
    sanitizePathSegment(artistFilename),
    sanitizePathSegment(album),
  )
  const numberPrefix = discContext.multiDisc && discContext.discNumber !== null && discContext.discTotal !== null
    ? formatDiscTrackPrefix(discContext.discNumber, discContext.discTotal, trackNumber)
    : formatTrackNumber(trackNumber)
  const trackFilename = `${numberPrefix} - ${sanitizePathSegment(titleFilename)}${extname(sourceFilename)}`

  return join(albumDirectory, trackFilename)
}
```

`formatDiscTrackPrefix` is exported (matching the existing
`formatTrackNumber`/`formatDiscNumber` pattern) so the padding-width rule
gets direct, fixture-free unit coverage (design §5) instead of only being
reachable through full `organizeAlbumFiles` runs. The `join(albumDirectory,
'Disc ...', trackFilename)` branch is deleted; there is exactly one `join`
call left, matching the single-disc shape today.

### 3.2 `organization-planner.ts` deltas

```ts
// removed: export type DiscLayout = 'disc-directories' | 'flat'

export function planOrganizationCopies(
  fixes: PlannedMetadataFix[],
  options: OrganizeFilesOptions,
  destinationDirectory: string,
): PlannedOrganizationCopy[] {
  // ...unchanged up to multiDisc computation...
  const multiDisc = isMultiDiscSet(discRecords)
  const planned = selectedFixes.map((fix): PlannedOrganizationCopy => {
    // ...
    const destination = getAlbumDestination(
      artistFilename,
      effective.album,
      effective.trackNumber,
      titleFilename,
      source.filename,
      { discNumber: effective.discNumber, discTotal: effective.discTotal, multiDisc },
    )
    // ...unchanged...
  })
  // ...unchanged...
}
```

The `discLayout === 'disc-directories' &&` gate is removed along with the
parameter — `multiDisc` alone now decides whether the prefix applies, for
every caller.

### 3.3 `organize-files.ts` deltas

Both call sites drop the now-nonexistent fourth argument:

```ts
// organizeSingleAlbum — unchanged call shape, already had no fourth argument
const audioPlans = planOrganizationCopies(fixes, options, destinationDirectory)

// organizeConcatenatedAlbum — drops the explicit 'flat' argument
const audioPlans = planOrganizationCopies(fixes, options, destinationDirectory)
```

### 3.4 `validate.ts` deltas

```ts
const multiDisc = isMultiDiscSet(discRecords)

for (const parsed of parsedRows) {
  if (parsed.row.status === 'valid' && parsed.trackNumber !== null) {
    parsed.row.destination = getAlbumDestination(
      parsed.row.artistFilename,
      parsed.row.album,
      parsed.trackNumber,
      parsed.row.titleFilename,
      parsed.row.filename,
      { discNumber: parsed.discNumber, discTotal: parsed.discTotal, multiDisc },
    )
  }
}
```

`parsed.discTotal` already exists on `ParsedValidationRow` (populated from
`metadata.common.disk.of` alongside `parsed.discNumber`); this is a pure
argument-threading change.

## 4. Behavior change: concatenate collision fixture

`organize-files-concatenate.test.ts`'s `'rejects an exact flat destination
collision'` (two source directories, each with local track `1` and title
`'Same'`, no embedded disc tags) and
`organize-files-concatenate-execution.test.ts`'s
`'atomically rejects duplicate flat audio destinations before any write'`
share this fixture. Today it collides because `flat` layout suppresses disc
info from the path. After this change:

- `applyConcatenateDiscMetadata` still assigns disc `1/2` and `2/2` from
  directory order (unchanged, design §1).
- `getAlbumDestination` now renders `101 - Same.flac` and `201 - Same.flac`
  — genuinely distinct.

Per requirements FR-6/FR-8 and AC-2, both tests MUST be rewritten as success
cases (dry-run: two distinct `'would copy'` rows; execute: two files
actually written, one per source directory) rather than deleted, so the
no-longer-possible collision is explicitly proven fixed, not silently
dropped. General destination-collision coverage remains intact through
unrelated paths that are untouched by this spec: `assertUniqueOrganizationDestinations`
unit coverage in `organize-files-disc-policy.test.ts` (line ~94, a synthetic
`PlannedOrganizationCopy[]` fixture, not derived from `getAlbumDestination`),
album-art collision tests (art destinations don't include the track prefix
at all), and the pre-existing-directory conflict test (`'atomically rejects
on destination conflict, writing nothing'`, an unrelated "album dir already
exists on disk" check). No replacement "genuine destination collision"
fixture is needed for concatenate mode specifically: once
`validateTrackIdentity` (`disc-metadata.ts`, unchanged) guarantees
`(discNumber, trackNumber)` pairs are unique, the new prefix is provably
unique too, for both single-source and concatenate destinations.

## 5. Test updates

| File | Change |
| --- | --- |
| `organization-plan.test.ts` (new) | Direct unit tests of `formatDiscTrackPrefix`: 2-disc (width 1: `101`, `201`), 9-disc (width 1: `101`...`901`), 10-disc (width 2: `0101`...`1005`), 22-disc (width 2: `0301`, `2205`); `getAlbumDestination` with `multiDisc: false` unaffected by a non-null `discNumber`/`discTotal` (defensive — should not happen via real callers, but confirms the gate); `getAlbumDestination` with `multiDisc: true` and a null `discNumber` or `discTotal` falls back to the plain `TT - Title` prefix (defensive gate, FR-3). |
| `organize-files-metadata-disc.test.ts` | `'infers discs before deriving collision-free destinations'`: `Disc 01/01 - One.flac` → `101 - One.flac`; `Disc 01/02 - Two.flac` → `102 - Two.flac`; `Disc 02/01 - Three.flac` → `201 - Three.flac`; `Disc 02/02 - Four.flac` → `202 - Four.flac`. |
| `organize-files-disc-policy.test.ts` | `'rejects repeated tracks by default and infers only when requested'`: `Disc 01/01 - First.flac` → `101 - First.flac`; `Disc 02/01 - Second.flac` → `201 - Second.flac`. Other cases in this file are single-disc and already assert the unchanged plain form. |
| `organize-files-album-art.test.ts` | `Artist/New/Disc 01/01 - Song.flac` → `Artist/New/101 - Song.flac`. |
| `validate-disc.test.ts` | `Disc 01/01 - First.flac` → `101 - First.flac`; `Disc 02/01 - Second.flac` → `201 - Second.flac`. |
| `organize-files-disc.test.ts` (commands) | Same two-row rename as above. |
| `organize-files-concatenate.test.ts` | `'01 - First.flac'`/`'02 - Second.flac'`/`'01 - Third.flac'` (disc 1/2, 1/2, 2/2) → `'101 - First.flac'`/`'102 - Second.flac'`/`'201 - Third.flac'`. `'organizes a fully tagless two-disc source using setMetadata...'`: `'01 - A.flac'`/`'02 - B.flac'`/`'01 - C.flac'` → `'101 - A.flac'`/`'102 - B.flac'`/`'201 - C.flac'`. `'rejects an exact flat destination collision'` rewritten per design §4. |
| `organize-files-concatenate-execution.test.ts` | `'preserves correct disc metadata and local tracks...'`: destinations become `'101 - One.flac'`/`'201 - Two.flac'`; the `!r.destination.includes('Disc')` assertion (line 55) remains true and can stay, but add an explicit prefix assertion so the rename is actually verified, not just the absence of the old marker. `'executes a fully tagless two-disc source...'`: `'01 - One.flac'`/`'01 - Two.flac'` → `'101 - One.flac'`/`'201 - Two.flac'`. `'atomically rejects duplicate flat audio destinations before any write'` rewritten per design §4. |
| `organize-files.test.ts` (commands) | `'accepts ordered sourceDirs and albumArtStrategy for concatenate'`: `'Artist/Album/01 - First.flac'`/`'01 - Second.flac'` → `'101 - First.flac'`/`'201 - Second.flac'`. `'accepts --set-metadata together with --source-dirs for concatenate'`: same rename for `One`/`Two`. |

Use temporary fixtures; do not touch real album collections in tests.

## 6. Migration strategy

1. Extend `organization-plan.ts`: add `discTotal` to `DiscDestinationContext`,
   add `formatDiscTrackPrefix`, rewrite `getAlbumDestination`'s prefix/branch
   logic (design §3.1). Add `organization-plan.test.ts` immediately after,
   covering the padding matrix before touching any downstream caller.
2. Extend `organization-planner.ts`: remove `DiscLayout`/`discLayout`, thread
   `discTotal` into the `getAlbumDestination` call, drop the layout gate on
   `multiDisc` (design §3.2).
3. Update `organize-files.ts`'s two `planOrganizationCopies` call sites
   (design §3.3).
4. Update `validate.ts`'s `getAlbumDestination` call (design §3.4).
5. Update every listed test file's expected strings (design §5), rewriting
   the two collision fixtures last, since they need new assertions rather
   than a search-and-replace.
6. Update `docs/album-organization.md` (Multi-disc metadata section: replace
   the `Disc DD/` description and worked example with the prefix rule; drop
   the "no Disc DD directories" concatenate callout since it's now true
   everywhere, not just concatenate) and
   `docs/organize-files-set-metadata.md` (replace the "distinct destination
   filenames because their titles differ" sentence — disc identity alone now
   guarantees distinctness).
7. Final verification (design §8).

## 7. Risk Table

| Risk | Likelihood | Mitigation |
| --- | --- | --- |
| A test asserting a `Disc DD/` string is missed, causing a silent false pass elsewhere (e.g. a snapshot or a loosely-matching `toContain`) | Medium | AC-6 requires a final `grep -rn "Disc [0-9]" __tests__ src docs` (in addition to the `DiscLayout`/`discLayout` grep already in AC-6) sweep with zero remaining hits outside intentionally-renamed prose, run in Phase 8. |
| Padding-width rule disagrees with a real fixture (e.g. a 10-disc album straddling the width-1/width-2 boundary) | Medium | `organization-plan.test.ts` explicitly covers the 9→10 and 22-disc boundaries (design §5) before any downstream test is touched. |
| `validate.ts` and `organize-files.ts` destinations silently diverge (one updated, one not) | Low | AC-5 requires an explicit cross-check: the same fixture run through both `organizeAlbumFiles` (dry run) and `validateAlbums` produces an identical `destination` string. |
| Rewritten collision tests accidentally weaken coverage (e.g. dropping the "still atomic, still zero writes on a real failure" guarantee) | Low | Design §4 keeps the pre-existing-directory conflict test and `assertUniqueOrganizationDestinations` unit coverage untouched; only the two now-impossible fixtures are rewritten, from "rejects" to "succeeds with distinct destinations," not deleted. |

## 8. Verification

After every source code file edit:

1. `npm run lint -- <modified-file>` — lint only that file and fix issues.

Once, after all TypeScript modifications:

1. `npm run lint`
2. `npm run build`
3. `npm test`
4. `grep -rn "DiscLayout\|discLayout" src __tests__` — must return nothing.
5. `grep -rn "Disc [0-9][0-9]/" src __tests__ docs` — must return nothing
   outside of prose explicitly describing the removed legacy behavior (if
   any such prose is intentionally kept for history, call it out explicitly
   in the PR/commit description).
6. `git --no-pager diff -- package.json package-lock.json` — must be empty.

## 9. Open decisions

None. The padding-width rule (pad disc digits to `discTotal`'s digit width,
minimum 1) was confirmed with the user before this spec was written; the
hard cutover (no `Disc DD/` compatibility flag) was explicitly requested.