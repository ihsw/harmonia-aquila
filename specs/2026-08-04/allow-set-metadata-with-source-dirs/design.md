# Design: Allow setMetadata With sourceDirs

> Scope reminder: this spec touches only the album-organization core under
> `src/lib/albums/` and `src/commands/manage-albums/helpers/`, its focused
> tests under `__tests__/lib/albums/`, and organize-files documentation. No
> CLI, REST, GraphQL, or MCP schema changes are needed (design §3). No new
> dependencies, no `npx`, no edits to `etc/albums/**`.

## 1. Overview

Reconciliation moves from "single directory, single record map" to "ordered
set of directories, one record map validated across their union." The
existing single-`sourceDir` path (`organizeSingleAlbum`) is untouched; a new
focused module performs the multi-directory validation that concatenate
mode needs, and `concatenate-album-sources.ts` gains a record-aware
fallback for local track-number resolution (FR-1–FR-7).

Disc identity is deliberately left alone: `applyConcatenateDiscMetadata`
already overwrites `discNumber`/`discTotal` from `ConcatenateDiscContext`
(derived purely from `sourceDirs` array position) after `planMetadataFixes`
runs, and `metadata-fix-planner.ts`'s `getDiscChanges` already special-cases
`discStrategy === 'concatenate'` by returning an empty map regardless of
records. This spec adds an explicit upfront rejection when a record carries
`discNumber`/`discTotal` under concatenate, so a caller gets an actionable
error instead of a silently-ignored field (FR-3, FR-8).

## 2. File layout

### Modified files

```
src/lib/albums/organize-files.ts                 (~5 line net change)
src/lib/albums/concatenate-album-sources.ts       (~30 line net change)
src/lib/albums/metadata-fix-types.ts              (+1 export, if new type needed)
__tests__/lib/albums/organize-files-concatenate.test.ts             (new cases)
__tests__/lib/albums/organize-files-concatenate-execution.test.ts   (new cases)
docs/album-organization.md                        (concatenate + setMetadata section)
docs/organize-files-set-metadata.md                (cross-directory constraints)
```

### New files

```
src/lib/albums/concatenate-set-metadata.ts        (new, ≤ 120 lines)
__tests__/lib/albums/concatenate-set-metadata.test.ts   (new)
```

### Files explicitly NOT modified

- `src/commands/manage-albums/organize-files.ts` (CLI): `--set-metadata` and
  `--source-dirs` already exist as independent options; the CLI has no
  conflict check of its own to remove (the rejection lives entirely in
  core), so no CLI changes are needed (FR-9).
- `src/web/schemas/**`, `src/web/controllers/manage-albums.controller.ts`,
  `src/web/modules/graphql/**`, `src/web/servers/mcp-tools/manage-albums/**`:
  every adapter already forwards `setMetadata`/`setMetadataRecords` and
  `sourceDirs`/`albumDirs` independently to the core `organizeAlbumFiles`
  call; none of them duplicate the "not supported with sourceDirs" guard, so
  none require code changes (FR-9). Their existing contract tests remain the
  regression net (design §6).
- `src/lib/albums/metadata-fix-planner.ts`: `getDiscChanges` already ignores
  disc fields under `discStrategy === 'concatenate'` regardless of records;
  no behavior change needed there, only reliance on the new upfront
  rejection in `concatenate-set-metadata.ts` (design §4).
- `src/commands/manage-albums/helpers/set-metadata-records.ts`: the
  single-source `reconcileSetMetadata` function is reused as-is (called with
  the union of filenames); no signature change (design §4).
- `package.json` and lockfiles: no dependency is needed (NFR-7).
- `etc/albums/**`: this specification does not organize media.

## 3. Public contracts

### 3.1 New module: `concatenate-set-metadata.ts`

```ts
import type { SetMetadataRecord } from '../../commands/manage-albums/helpers/set-metadata.js'
import { reconcileSetMetadata } from '../../commands/manage-albums/helpers/set-metadata.js'
import { UserInputError } from '../errors.js'

import type { ConcatenateSourceEntry } from './concatenate-album-sources.js'

export function assertNoDiscFieldsInRecords(records: SetMetadataRecord[]): void {
  const offending = records.filter(record => record.discNumber !== undefined || record.discTotal !== undefined)

  if (offending.length > 0) {
    throw new UserInputError(
      `--set-metadata records must not include discNumber/discTotal with --disc-strategy concatenate ` +
      `(disc identity comes from sourceDirs order): ${offending.map(r => r.filename).join(', ')}`,
    )
  }
}

export function assertUniqueFilenamesAcrossSources(sourceEntries: ConcatenateSourceEntry[]): void {
  const directoriesByFilename = new Map<string, string[]>()

  for (const entry of sourceEntries) {
    for (const file of entry.files) {
      directoriesByFilename.set(file.name, [...(directoriesByFilename.get(file.name) ?? []), entry.sourceDirectory])
    }
  }
  const duplicates = [...directoriesByFilename.entries()].filter(([, dirs]) => dirs.length > 1)

  if (duplicates.length > 0) {
    throw new UserInputError(
      `--set-metadata requires unique filenames across sourceDirs: ${duplicates
        .map(([filename, dirs]) => `"${filename}" (${dirs.join(', ')})`).join('; ')}`,
    )
  }
}

export function reconcileConcatenateSetMetadata(
  records: SetMetadataRecord[],
  sourceEntries: ConcatenateSourceEntry[],
): Map<string, SetMetadataRecord> {
  assertNoDiscFieldsInRecords(records)
  assertUniqueFilenamesAcrossSources(sourceEntries)
  const allFilenames = sourceEntries.flatMap(entry => entry.files.map(file => file.name))

  return reconcileSetMetadata(records, allFilenames)
}
```

This composes the two new checks with the existing, unmodified
`reconcileSetMetadata` for coverage validation (FR-3–FR-5), keeping the
duplicate-filename and disc-field rules in one focused, independently
testable module (NFR-5).

### 3.2 `concatenate-album-sources.ts` deltas

`assertConcatenateOptions` drops `--set-metadata` from its conflict list
(FR-2). `readConcatenateAlbumSources` gains an optional `records` parameter
and returns the reconciled map alongside its existing fields:

```ts
export interface ConcatenateAlbumSources {
  discsBySourcePath: Map<string, ConcatenateDiscContext>
  recordsByFilename: Map<string, SetMetadataRecord> | undefined
  sourceEntries: ConcatenateSourceEntry[]
  sources: ParsedAlbumSource[]
}

export async function readConcatenateAlbumSources(
  options: OrganizeFilesOptions,
  normalized: NormalizedMetadataFixOptions,
  records: SetMetadataRecord[] | undefined,
): Promise<ConcatenateAlbumSources> {
  // ... existing sourceEntries / assertUniqueSourceDirs unchanged ...
  const recordsByFilename = records === undefined
    ? undefined
    : reconcileConcatenateSetMetadata(records, sourceEntries)

  // parsedByEntry / normalizeSourceTracks now receive recordsByFilename
  // ...
}
```

`getLocalTrackNumber` and `normalizeSourceTracks` gain a
`record: SetMetadataRecord | undefined` parameter and fall back to
`record?.trackNumber` before throwing (FR-6):

```ts
function getLocalTrackNumber(source: ParsedAlbumSource, record: SetMetadataRecord | undefined): number {
  const trackNumber = source.trackNumber ?? record?.trackNumber ?? null

  if (trackNumber === null || !Number.isInteger(trackNumber) || trackNumber < 1) {
    throw new UserInputError(`${source.sourcePath} must have a positive integer track number for concatenation`)
  }
  return trackNumber
}
```

### 3.3 `organize-files.ts` deltas

`organizeAlbumFiles`'s concatenate branch drops the blanket rejection and
forwards the already-parsed `records` array straight through:

```ts
// before
if (records !== undefined) {
  throw new UserInputError('--set-metadata is not supported with sourceDirs')
}
return organizeConcatenatedAlbum(options, options.execute === true)

// after
return organizeConcatenatedAlbum(options, options.execute === true, records)
```

`organizeConcatenatedAlbum` passes `records` into
`readConcatenateAlbumSources` and threads the returned `recordsByFilename`
into `planMetadataFixes`, replacing the current hardcoded `undefined`
(FR-1, FR-7):

```ts
async function organizeConcatenatedAlbum(
  options: OrganizeFilesOptions,
  execute: boolean,
  records: SetMetadataRecord[] | undefined,
): Promise<OrganizeFilesJsonOutput> {
  const normalized = normalizeMetadataFixOptions(options)
  const albumArtStrategy = parseAlbumArtStrategy(options.albumArtStrategy)
  const concatenated = await readConcatenateAlbumSources(options, normalized, records)
  const fixes = applyConcatenateDiscMetadata(
    planMetadataFixes(concatenated.sources, concatenated.recordsByFilename, normalized),
    concatenated.discsBySourcePath,
  )
  // ... unchanged from here ...
}
```

Net effect on `organize-files.ts`: the three-line rejection block is
removed and two call sites gain one argument each — a small net reduction,
keeping the file at or below its current 207 lines (NFR-5).

## 4. Validation ordering

All validation MUST complete before any destination write, matching the
existing concatenate preflight contract:

1. Parse `--set-metadata` into `records` (existing `readSetMetadata`,
   unchanged).
2. `assertSourceOptions` / mode resolution (existing, unchanged).
3. Inside `readConcatenateAlbumSources`: `assertConcatenateOptions` (option
   cardinality/conflicts, FR-2) → read `sourceEntries` → `assertUniqueSourceDirs`
   (existing) → **new:** `reconcileConcatenateSetMetadata` (disc-field
   rejection, then cross-directory uniqueness, then coverage reconciliation;
   FR-3–FR-5) → parse album sources per entry → `normalizeSourceTracks` with
   record-aware `getLocalTrackNumber` fallback (FR-6).
4. `planMetadataFixes` with the reconciled map (FR-7).
5. `applyConcatenateDiscMetadata` (existing, unchanged — FR-8).
6. `planOrganizationCopies` / album-art planning / destination preparation
   (existing, unchanged).
7. Execute copies only after every prior step succeeds (existing atomicity
   guarantee, unchanged).

Ordering `reconcileConcatenateSetMetadata` before per-entry metadata parsing
means a bad record set (wrong disc fields, cross-directory duplicate
filename, missing/extra coverage) fails fast without reading any audio tags,
consistent with how `assertUniqueSourceDirs` already fails before parsing.

## 5. Test updates

| Coverage | Required cases |
| --- | --- |
| `concatenate-set-metadata.ts` (new, unit) | disc-field rejection (single and multiple offending records); cross-directory duplicate filename rejection with correct directory names; coverage reconciliation delegates to `reconcileSetMetadata` (missing/extra records) |
| `concatenate-album-sources.ts` (extended) | `getLocalTrackNumber` falls back to record `trackNumber` when tag absent; still throws when both tag and record are absent/invalid; `assertConcatenateOptions` no longer rejects `--set-metadata`; `--limit`/`--reset-track`/`--ignore-audio-files-without-tracks` still rejected |
| `organize-files-concatenate.test.ts` (extended) | end-to-end dry-run plan for a two-directory, zero-tag fixture (mirrors the Days of Purgatory shape) with full `setMetadata`; disc identity still derived from directory order even though records omit disc fields |
| `organize-files-concatenate-execution.test.ts` (extended) | execute-mode write with `setMetadata`; atomic failure (no writes) when disc fields are supplied, when filenames collide across directories, or when coverage is incomplete |
| CLI/REST/GraphQL/MCP existing suites | add one passing "concatenate + setMetadata" contract case per adapter; assert no schema/type changes were needed; existing conflict-option tests remain green unchanged |

Use temporary fixtures; do not use real album collections in tests.

## 6. Adapter regression note

Every adapter (CLI `--set-metadata`, REST/GraphQL `setMetadata`, MCP
`setMetadata`/`setMetadataRecords`) already forwards records to
`organizeAlbumFiles` unconditionally — none of them special-case
`sourceDirs`/`albumDirs`. This is confirmed by inspection: the only
occurrences of a "not supported with sourceDirs" style guard are the two
core-library checks this spec removes
(`organize-files.ts`'s blanket rejection and
`concatenate-album-sources.ts`'s `assertConcatenateOptions` conflict list).
Adapter test additions are therefore contract-level ("this request now
succeeds / still fails for the right reason"), not schema-level.

## 7. Migration strategy

1. Add `concatenate-set-metadata.ts` with its three functions and focused
   unit tests (disc-field rejection, cross-directory uniqueness, coverage
   delegation).
2. Extend `concatenate-album-sources.ts`: drop the `--set-metadata` conflict,
   add the `records` parameter, wire `reconcileConcatenateSetMetadata`, add
   the record fallback to `getLocalTrackNumber`/`normalizeSourceTracks`.
3. Extend `organize-files.ts`: drop the blanket rejection, thread `records`
   into `organizeConcatenatedAlbum` and its `planMetadataFixes` call.
4. Extend the two existing concatenate test files with the new happy-path
   and atomicity cases.
5. Add one adapter-level contract test per surface (CLI, REST, GraphQL, MCP)
   proving the combination now succeeds.
6. Update documentation and perform final verification.

## 8. Risk Table

| Risk | Likelihood | Mitigation |
| --- | --- | --- |
| Silent disc-field acceptance (record's discNumber quietly ignored instead of erroring) | Medium | Explicit `assertNoDiscFieldsInRecords` runs before any parsing; unit-tested directly. |
| Cross-directory filename collision silently picks one record | High | `assertUniqueFilenamesAcrossSources` runs before reconciliation and lists every contributing directory. |
| `organize-files.ts` exceeds its existing 207-line footprint | Low | New logic lives in `concatenate-set-metadata.ts`; core file only gains argument threading. |
| Regression in existing concatenate-without-setMetadata or single-source setMetadata paths | Medium | Both existing test suites re-run unchanged as part of Phase-6 verification; `records === undefined` short-circuits all new logic. |
| Adapter contract drift (an adapter secretly duplicated the old guard) | Low | Adapter contract tests added per surface will fail loudly if any adapter still rejects the combination. |

## 9. Verification

After every source code file edit:

1. `npm run lint -- <modified-file>` — lint only that file and fix issues.

Once, after all TypeScript modifications:

1. `npm run lint`
2. `npm run build`
3. `npm test`
4. `git --no-pager diff -- package.json package-lock.json`

All commands must exit successfully, and the manifest diff must be empty.

## 10. Open decisions

1. **Disc-field rejection message wording.** The draft in §3.1 lists every
   offending filename in one error. An alternative is one `UserInputError`
   per offending record (louder, but breaks the "atomic, single actionable
   error" pattern used elsewhere in this file, e.g.
   `assertUniqueSourceDirs`). Recommendation: keep the single aggregated
   error, matching existing precedent.