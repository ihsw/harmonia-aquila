# Design: Add `year` support to `setMetadata`

> Scope reminder: this spec touches **only** `src/commands/manage-albums/`,
> `src/lib/albums/`, `src/web/schemas/`, `src/web/modules/graphql/`,
> `__tests__/`, and `docs/`. No edits to any audiobook path (NFR-7), no new
> dependencies, no `npx`.

## 1. Overview

This is an **additive optional-field** change following the exact shape of the
2026-08-05 `sourceIndex` addition. The field enters through four independent
validation surfaces, converges on the single `SetMetadataRecord` interface, and
flows out through the planner to the tag writer and the JSON row.

The dominant constraint is that `year` is **inert everywhere except two
endpoints**: it is validated at the edge and written at the tag layer, and the
intermediate layers only carry it. It participates in no identity resolution
(unlike `filename`/`sourceIndex`), no grouping (unlike `album`), no ordering
(unlike `trackNumber`), and no destination path construction (NFR-8). This is
what makes FR-8 (concatenate compatibility) trivially safe: `year` cannot
conflict with disc identity because nothing downstream reads it for structure.

Two asymmetries in the existing code are deliberately preserved:

1. **CLI coerces numeric strings; the web surfaces do not** (FR-2a). CSV
   manifests have no type information, so `positiveInteger` in
   `set-metadata-records.ts` already accepts `"12"` for `trackNumber`. The new
   year validator reuses that tolerance. Zod and GraphQL `Int` stay strict.
2. **`year` is set-only, `discNumber` is set-or-clear** (FR-3). `discNumber`
   uses `NumericTagFix = {kind:'clear'} | {kind:'set',value}` because disc
   inference must be able to blank a tag. Year has no inference path, so it is
   a plain `number | undefined` and needs no discriminated union.

## 2. File layout

### Modified files

```
src/commands/manage-albums/helpers/set-metadata-records.ts   (+~15 LOC — type + validator)
src/commands/manage-albums/organize-files.ts                 (+0/-0 LOC — help text only)
src/web/schemas/album-set-metadata.ts                        (+1 LOC — Zod field; serves REST + MCP)
src/web/modules/graphql/album.inputs.ts                      (+3 LOC — input field)
src/web/modules/graphql/album.rows.ts                        (+6 LOC — row fields)
src/web/modules/graphql/schema.gql                           (+3 LOC — SDL)
src/lib/albums/audio-tags.ts                                 (+5 LOC — AudioTagFix + write)
src/lib/albums/metadata-fix-types.ts                         (+4 LOC — three interfaces)
src/lib/albums/metadata-fix-sources.ts                       (+1 LOC — read year)
src/lib/albums/metadata-fix-planner.ts                       (+~8 LOC — thread through)
src/lib/albums/concatenate-album-sources.ts                  (verify only; see §4.3)
```

### Files explicitly NOT modified

- `src/commands/manage-albums/helpers/set-metadata-file-parsers.ts` — the CSV
  parser emits `Record<string, unknown>` keyed by header column and only
  enforces *required* columns. `year` is optional, so a `year` column flows
  through untouched. See §4.1.
- `src/web/schemas/mcp/manage-albums.ts` — imports
  `albumSetMetadataRecordsSchema`; the field arrives for free (NFR-9).
- `src/web/schemas/request-schemas.ts` — same import, same reason.
- `src/web/servers/mcp-tools/manage-albums/organize-files.ts` — passes
  `input.setMetadata` through as `setMetadataRecords` opaquely.
- `src/web/controllers/manage-albums.controller.ts` — same pass-through.
- `src/lib/albums/concatenate-set-metadata.ts` — `assertNoDiscFieldsInRecords`
  filters on `discNumber`/`discTotal` only and MUST NOT learn about `year` (FR-8).
- `src/lib/albums/summarize-source-dir.ts` — already reports year; read-only.
- `src/lib/albums/validate.ts` — no new validation rule (out of scope).
- `src/lib/albums/organization-planner.ts` / `organize-files.ts` — consume
  `fix.effective` only for track-number filtering and disc comparison.

## 3. Validator template

`set-metadata-records.ts` gains one validator beside `positiveInteger`, reusing
its string-coercion tolerance (FR-2, FR-2a):

```ts
const MIN_YEAR = 1000
const MAX_YEAR = 9999

function yearValue(rawValue: unknown, context: string): number {
  const candidate = typeof rawValue === 'string' && /^\d+$/.test(rawValue.trim())
    ? Number(rawValue.trim())
    : rawValue
  if (typeof candidate === 'number' && Number.isInteger(candidate)
    && candidate >= MIN_YEAR && candidate <= MAX_YEAR) {
    return candidate
  }
  throw createSetMetadataError(
    `Metadata record ${context} has an invalid year ${JSON.stringify(rawValue)} `
    + `(expected an integer between ${MIN_YEAR} and ${MAX_YEAR})`,
  )
}
```

Wired into `buildRecord` alongside the existing optional fields:

```ts
const year = 'year' in rawRecord && rawRecord.year !== ''
  ? yearValue(rawRecord.year, context)
  : undefined
// …and in the returned object literal, alphabetically after `trackNumber`:
...(year === undefined ? {} : { year }),
```

The `rawRecord.year !== ''` guard mirrors the existing `sourceIndex` handling so
an empty CSV cell is treated as absent rather than invalid.

### Per-surface validation mapping

| Surface | File | Delta |
| ------- | ---- | ----- |
| CLI (JSON/CSV) | `set-metadata-records.ts` | `yearValue` + `buildRecord` wiring |
| REST | `album-set-metadata.ts` | `year: z.number().int().min(1000).max(9999).optional()` |
| MCP | *(none — shares the Zod schema)* | inherited (NFR-9) |
| GraphQL | `album.inputs.ts` + `schema.gql` | `@Field(() => Int, { nullable: true }) public year?: number` |

GraphQL's `Int` guarantees integrality but not range; range enforcement for
that surface happens when the record reaches `normalizeSetMetadataRecords`, or
— if the resolver bypasses it — MUST be added as a resolver-level check. Task
4.2 verifies which path applies before assuming.

## 4. Sub-system detail

### 4.1 CSV manifests need no parser change

`parseCsvRecords(fileContents, filePath, requiredFields)` validates only that
every *required* column is present and rejects duplicate columns. Unknown
columns become string-valued keys on the emitted record. Since `year` is
optional and `yearValue` accepts numeric strings, a `year` column works with
zero parser edits. The `REQUIRED_FIELDS` constant in both
`set-metadata.ts` and `set-metadata-records.ts` MUST stay unchanged.

### 4.2 Planner threading

`planSource` gains one destructure and three spread entries. `record?.year` is
the only input; there is no options-level fallback because no bulk year setter
exists (out of scope).

```ts
const year = record?.year
// tagFix:
...(year === undefined ? {} : { year }),
// row — emit the before/after pair together, per FR-6:
...(year === undefined ? {} : { newYear: year, year: source.year }),
```

`projectMetadata` gains `year: tagFix.year ?? source.year` (FR-7).

> **NFR-5 watch:** `metadata-fix-planner.ts` is already 203 lines, over the
> 200-line limit. These additions push it to ~211. Extract `getAlbumArtists`,
> `getArtists`, and `getProducers` (lines 185–203) into a new
> `metadata-fix-strategies.ts` to bring both files under the limit. This
> extraction is in scope precisely because NFR-5 forces it.

### 4.3 Concatenate path

`concatenate-album-sources.ts` calls `parseAlbumSources` (which will populate
`year` per FR-5) and then synthesizes renumbered sources around line 86–88.
**Verify** whether that function spreads the source object (`{...source, …}`)
or constructs a fresh literal field-by-field. If it spreads, `year` propagates
with no edit; if it enumerates fields, add `year: source.year`. Task 3.4
resolves this by inspection — do not assume.

`assertNoDiscFieldsInRecords` in `concatenate-set-metadata.ts` MUST NOT be
extended to `year` (FR-8).

### 4.4 Tag write

```ts
if (tagFix.year !== undefined) {
  audioFile.tag.year = tagFix.year
}
```

Placed after the `trackNumber` block in `writeAudioTagFix`, before
`audioFile.save()`. `node-taglib-sharp`'s `Tag` declares
`get year(): number` / `set year(value: number)` (`dist/tag.d.ts:517,529`), so
no cast is required.

## 5. Component-by-component mapping

| File | Current shape | New shape |
| ---- | ------------- | --------- |
| `set-metadata-records.ts` | `SetMetadataRecord` w/ 7 fields | `+ year?: number` |
| `album-set-metadata.ts` | Zod object, 7 keys | `+ year` (optional, ranged) |
| `album.inputs.ts` | `AlbumSetMetadataRecordInput`, 7 fields | `+ year?: number` |
| `album.rows.ts` | `AlbumMetadataChangesRow` | `+ year?: number`, `+ newYear?: number` |
| `schema.gql` | `input AlbumSetMetadataRecordInput` | `+ year: Int` |
| `schema.gql` | `type AlbumMetadataChangesRow` | `+ year: Int`, `+ newYear: Int` |
| `audio-tags.ts` | `AudioTagFix`, 8 fields | `+ year?: number` |
| `metadata-fix-types.ts` | `MetadataFixJsonOutputRow` | `+ year?`, `+ newYear?` |
| `metadata-fix-types.ts` | `ParsedAlbumSource` | `+ year: number \| null` |
| `metadata-fix-types.ts` | `EffectiveAlbumMetadata` | `+ year: number \| null` |
| `metadata-fix-sources.ts` | 16-field literal | `+ year: metadata.common.year ?? null` |

## 6. Test updates

### 6.1 What stays the same

- Every existing fixture that omits `year` — assertions MUST NOT be rewritten to
  accommodate new keys, because no new keys appear (FR-11, NFR-8). If an
  existing assertion breaks, the implementation is wrong, not the test.
- Identity resolution tests (`filename` / `sourceIndex` duplicates).
- All destination-path assertions across every suite.

### 6.2 What changes

```ts
// __tests__/lib/albums/organize-files-set-metadata-input.test.ts — new case
it('writes year when supplied', async () => {
  const records = [{ album: 'A', artist: 'B', filename: '01 - x.flac',
    title: 'X', trackNumber: 1, year: 1986 }]
  // expect row.year === <source year>, row.newYear === 1986
  // expect tagFix.year === 1986
})

// rejection cases (FR-2)
it.each([0, 999, 10_000, 1986.5, 'nineteen'])('rejects year %s', …)
```

### 6.3 Coverage parity table

| Suite | Disposition |
| ----- | ----------- |
| `__tests__/commands/manage-albums/helpers/set-metadata.test.ts` | extend — JSON + CSV year parsing, string coercion, range rejection |
| `__tests__/lib/albums/organize-files-set-metadata-input.test.ts` | extend — planner row `year`/`newYear` pair, tag fix |
| `__tests__/lib/albums/organize-files-metadata.test.ts` | extend — year reaches `writeAudioTagFix` on execute |
| `__tests__/lib/albums/concatenate-set-metadata.test.ts` | extend — year accepted under concatenate (FR-8) |
| `__tests__/web/manage-albums-controller.test.ts` | extend — REST accepts year, rejects out-of-range |
| `__tests__/web/graphql/album.resolver.test.ts` | extend — `year` in, `newYear` out |
| `__tests__/web/mcp.manage-albums-operations.test.ts` | extend — MCP inherits the Zod field |
| `__tests__/lib/albums/organize-files-metadata-disc.test.ts` | unchanged — disc semantics untouched |

## 7. Migration strategy

Ordered to keep the tree type-checkable at each step:

1. **Types first** — `metadata-fix-types.ts`, `audio-tags.ts`,
   `set-metadata-records.ts`. Adding optional fields breaks nothing.
2. **`ParsedAlbumSource.year` is required (`number | null`), not optional** —
   so step 1 breaks `metadata-fix-sources.ts` until step 3. Do steps 1–3 as one
   unit before running the type-checker, or temporarily make it optional and
   tighten at the end.
3. **Producers** — `metadata-fix-sources.ts` reads it; `metadata-fix-planner.ts`
   threads it (plus the NFR-5 extraction from §4.2).
4. **Consumer** — `audio-tags.ts` write block.
5. **Edges, in any order** — Zod schema (REST + MCP), GraphQL input/row/SDL,
   CLI help text.
6. **Tests**, then **docs**.

## 8. Risk Table

| Risk | Likelihood | Mitigation |
| ---- | ---------- | ---------- |
| `metadata-fix-planner.ts` exceeds 200 lines (NFR-5) | **High** — already 203 | Extract strategy helpers to `metadata-fix-strategies.ts` (§4.2); this is planned, not contingent |
| `ParsedAlbumSource.year` as a required field breaks unrelated fixtures constructing sources by hand | Medium | Grep `__tests__` for object literals typed `ParsedAlbumSource` before step 2; add `year: null` to each |
| GraphQL range validation bypasses `normalizeSetMetadataRecords` | Medium | Task 4.2 traces the resolver path explicitly rather than assuming |
| `concatenate-album-sources.ts` drops `year` when synthesizing sources | Medium | §4.3 requires inspection, not assumption; covered by a concatenate test |
| Zod `.min()/.max()` on an optional number silently permits `undefined` | Low | Intended — `year` is optional (FR-3) |
| Someone extends `assertNoDiscFieldsInRecords` to year by analogy | Low | FR-8 states the prohibition; §2 lists the file as NOT modified |
| Writing `tag.year` on FLAC vs MP3 diverges | Low | `node-taglib-sharp` normalizes across containers; covered by execute-path tests on both extensions |

## 9. Verification

After every source code file edit:

1. `npm run lint -- <modified-file>` — lint only the file just modified (NFR-1)

Once at end of spec:

1. `npm run lint` — whole-codebase last-call lint after all TypeScript
   modifications are complete; must exit 0
2. `npm run build` — must exit 0 (NFR-2; note: the script is `build`, **not**
   `build:ts`)
3. `npm test` — must exit 0 (NFR-3)
4. `git --no-pager diff --stat src/commands/manage-audiobooks src/lib/audiobooks
   src/web/servers/mcp-tools/manage-audiobooks` — must be empty (NFR-7)

## 10. Open decisions

1. **Year range bounds.** Recommended: reject outside `1000`–`9999` (FR-2).
   Rationale: `tag.year` is a bare `number`, and a value like `5` would be
   written silently and corrupt the tag. Alternative: accept any positive
   integer, matching `positiveInteger`'s existing looseness. The stricter bound
   is recommended because year is the only field here with a meaningful
   real-world domain.
2. **Whether `newYear` should be emitted when the supplied year equals the
   source year.** Recommended: emit it unconditionally whenever `year` is
   present in the record, matching how `newTitle` is emitted even for a no-op
   retitle. Alternative: suppress no-op pairs. Emitting unconditionally keeps
   the planner branchless and the output predictable.
