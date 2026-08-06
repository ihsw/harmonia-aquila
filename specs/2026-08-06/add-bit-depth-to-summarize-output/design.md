# Design: Add bit depth to `summarize-source-dir` output

> Scope reminder: this spec touches **only** `src/lib/albums/audio-files.ts`,
> `src/lib/albums/summarize-source-dir.ts`, `src/web/modules/graphql/album.rows.ts`,
> `src/web/modules/graphql/schema.gql`, plus tests and docs. No audiobook paths, no
> `validate.ts`, no `organize-files.ts`, no new dependencies, no `npx`.

## 1. Overview

This is a **read-only additive field** on one output row. It is materially smaller than the
2026-08-06 `add-year-to-set-metadata` spec because bit depth has no write path: there is no
`AudioTagFix` entry, no `setMetadata` field, no planner threading, and no validation rule.
The value is parsed, formatted, and emitted.

The decisive structural fact — established by inspection, not assumption — is that
**three of the four execution surfaces require no code at all**:

| Surface | Mechanism | Needs edit? |
| --- | --- | --- |
| CLI | `writeRows` → `console.table(rows)` / `JSON.stringify(rows)` — derives columns from object keys | **No** |
| REST | `manage-albums.controller.ts:55` returns `summarizeAlbumSourceDir(...)` directly | **No** |
| MCP | `summarize-source-dir.ts:21` returns `jsonToolContent(rows)` | **No** |
| GraphQL | `AlbumSummaryRow` declares every field explicitly via `@Field` + SDL | **Yes** |

GraphQL is the only surface with a hand-maintained field list, so it is the only one that
can silently drop a new field. FR-6 therefore requires the other three be *tested*, not
trusted.

The second decisive fact is semantic: **bit depth does not exist for lossy audio.**
`music-metadata` leaves `format.bitsPerSample` undefined for MP3. Since this repo's
summarize path accepts both `.flac` and `.mp3`, a large fraction of real rows will legitimately
carry `bitDepth: ''`. That is correct output, not a defect, and FR-4 and §4.2 exist to stop
a future reader from "fixing" it.

## 2. File layout

### Modified files

```
src/lib/albums/audio-files.ts               (+12 LOC — formatAudioBitDepth; 128 → ~140)
src/lib/albums/summarize-source-dir.ts      (+2 LOC — row type + construction; 74 → 76)
src/web/modules/graphql/album.rows.ts       (+3 LOC — @Field block; 194 → ~197 ⚠ NFR-5)
src/web/modules/graphql/schema.gql          (+1 LOC — SDL field)
```

### Files explicitly NOT modified

- `src/commands/manage-albums/summarize-source-dir.ts` — hands rows to `writeRows`
  unmodified; declares no columns.
- `src/command-utils.ts` — `writeRows` is format-generic (`console.table` /
  `JSON.stringify`). Changing it would affect every command.
- `src/web/controllers/manage-albums.controller.ts` — returns the lib output verbatim.
- `src/web/servers/mcp-tools/manage-albums/summarize-source-dir.ts` — `jsonToolContent(rows)`.
- `src/web/schemas/mcp/manage-albums.ts` / `src/web/schemas/request-schemas.ts` — these
  validate summarize **input** (`dirName`, `limit`, `ignoreNonAudioFiles`). The output shape
  is not schema-constrained on either surface.
- `src/lib/albums/metadata-fix-sources.ts` — parses the same files for the organize path but
  builds `ParsedAlbumSource`, which is about tags, not audio characteristics. Out of scope.

## 3. Formatter

`formatAudioBitDepth` joins `formatAudioBitrate` and `formatAudioSampleRate` in
`audio-files.ts` and follows their shape exactly — including the `''` sentinel for
`undefined`, which is what makes FR-4 fall out for free.

```ts
export function formatAudioBitDepth(bitsPerSample: number | undefined): string {
  if (bitsPerSample === undefined) {
    return ''
  }

  return `${bitsPerSample.toString()}-bit`
}
```

Deliberately simpler than its siblings: no `Intl.NumberFormat`, no unit division. Bit depth
is a small integer (8/16/24/32) and needs neither thousands separators nor scaling.

### Row wiring

```ts
// src/lib/albums/summarize-source-dir.ts — interface
bitDepth: string

// row construction — alphabetically after `artist`, before `bitrate` (FR-7)
bitDepth: formatAudioBitDepth(metadata.format.bitsPerSample),
```

## 4. Sub-system detail

### 4.1 GraphQL is the only declared surface

```ts
// src/web/modules/graphql/album.rows.ts — inside AlbumSummaryRow,
// alphabetically after `artist`, before `bitrate`
@Field(() => String)
public bitDepth!: string
```

```graphql
# schema.gql — type AlbumSummaryRow
  artist: String!
  bitDepth: String!     # NEW
  bitrate: String!
```

`String!` (non-null) matches every sibling field. The empty string carries "not applicable";
nullability is not used to express it, consistent with `bitrate`/`sampleRate` already
returning `''` rather than null when undefined.

### 4.2 Empty is correct for MP3 — do not "fix" it

`format.bitsPerSample` is populated for PCM-based containers (FLAC, WAV, ALAC) and left
undefined for MP3. Since `getAudioFiles` accepts both extensions, mixed directories will
show a populated `bitDepth` on FLAC rows and `''` on MP3 rows **in the same output**.

This will look like a bug to anyone reading a mixed directory. It is not. The spec must not:

- substitute a nominal depth (MP3 decodes to 16-bit but is not *stored* that way);
- omit the key on lossy rows — the field is required, so shape stays uniform (FR-1);
- error or skip the file (FR-4).

### 4.3 What this does and does not prove

The motivating use case is checking a "24-bit" provenance claim. Worth stating the limit
plainly in the docs: `bitsPerSample` reports **how the file is encoded**, not the depth of
the master it came from. A 16-bit source padded to 24 bits reports `24-bit`. This field
turns an unanswerable question into a partially answerable one — it is evidence, not proof.
Do not add heuristics that claim otherwise (out of scope, §3).

## 5. Component-by-component mapping

| File | Current | New |
| --- | --- | --- |
| `audio-files.ts` | `formatAudioDuration`, `formatAudioBitrate`, `formatAudioSampleRate` | `+ formatAudioBitDepth` |
| `summarize-source-dir.ts` | 16-field row interface | `+ bitDepth: string` |
| `summarize-source-dir.ts` | 16-key construction literal | `+ bitDepth: formatAudioBitDepth(...)` |
| `album.rows.ts` | `AlbumSummaryRow`, 16 `@Field`s | `+ bitDepth` |
| `schema.gql` | `type AlbumSummaryRow`, 16 fields | `+ bitDepth: String!` |

## 6. Test updates

### 6.1 What stays the same

- Every existing assertion on `bitrate`, `sampleRate` and `duration` — untouched (FR-8).
- Existing summarize fixtures that assert a whole row with `toEqual` **will** break by one
  key. That is the intended signal; add `bitDepth` to the expectation rather than loosening
  the assertion to `toMatchObject`.

### 6.2 What changes

```ts
// __tests__/lib/albums/audio-files*.test.ts (or a new formatter suite)
it.each([
  [undefined, ''],
  [16, '16-bit'],
  [24, '24-bit'],
])('formats bit depth %s as %s', (input, expected) => {
  expect(formatAudioBitDepth(input)).toBe(expected)
})

// __tests__/lib/albums/summarize-source-dir.test.ts
// makeAudioMetadata spreads `format`, so bit depth is injectable:
//   makeAudioMetadata({}, { bitsPerSample: 24, sampleRate: 48_000 })
it('reports bit depth for lossless and empty for lossy', async () => { … })
```

### 6.3 Coverage parity table

| Suite | Disposition |
| --- | --- |
| formatter tests for `audio-files.ts` | extend — locate the existing suite first; `audio-files-album-art.test.ts` covers art, not formatters, so the formatter tests may live elsewhere or not exist yet |
| `__tests__/lib/albums/summarize-source-dir.test.ts` | extend — FLAC row populated, MP3 row `''`, mixed directory in one call |
| `__tests__/web/summarize-source-dir.test.ts` | extend — REST pass-through carries the field (FR-6) |
| `__tests__/web/graphql/album.resolver.test.ts` | extend — GraphQL surfaces `bitDepth` |
| `__tests__/web/mcp.manage-albums-operations.test.ts` | extend — MCP pass-through carries the field (FR-6) |
| CLI summarize suite | extend if one asserts row shape; `writeRows` itself needs no test change |

## 7. Migration strategy

1. **Formatter first** — `audio-files.ts`. Self-contained, no dependents yet.
2. **Row type + construction** — `summarize-source-dir.ts`. Adding a required field to the
   interface and populating it in the same edit keeps the tree type-checking throughout;
   unlike the add-year spec there is no intermediate broken state.
3. **GraphQL** — `album.rows.ts` then `schema.gql`. Check the line count after the class
   edit (NFR-5).
4. **Tests**, then **docs**.

## 8. Risk Table

| Risk | Likelihood | Mitigation |
| --- | --- | --- |
| `album.rows.ts` breaches 200 lines | **Medium** — 194 today, ~197 after | Measure after the edit (task 4.1). If it exceeds, extract `AlbumSummaryRow` into its own module rather than trimming unrelated fields |
| Empty `bitDepth` on MP3 read as a bug and "fixed" later | **Medium** | FR-4 states it, §4.2 explains it, docs record it (FR-9), and a test asserts it |
| Existing `toEqual` row fixtures break | Medium | Expected; §6.1 says add the key, do not loosen the matcher |
| A surface silently drops the field | Low — 3 of 4 are generic pass-throughs | FR-6 requires a test per surface rather than reasoning from the code shape |
| `bitsPerSample` absent for some FLAC files | Low | Formatter returns `''`; no special-casing needed |
| Someone reads `24-bit` as proof of a hi-res master | Medium | §4.3; docs must state it reports encoding, not provenance |

## 9. Verification

After every source code file edit:

1. `npm run lint -- <modified-file>` (NFR-1)

Once at end of spec:

1. `npm run lint` — whole-codebase, exit 0
2. `npm run build` — exit 0 (NFR-2; the script is `build`, not `build:ts`)
3. `npm test` — exit 0 (NFR-3)
4. `git --no-pager diff --stat src/commands/manage-audiobooks src/lib/audiobooks
   src/web/servers/mcp-tools/manage-audiobooks src/lib/albums/validate.ts
   src/lib/albums/organize-files.ts` — empty (NFR-7)
5. `wc -l src/web/modules/graphql/album.rows.ts` — ≤ 200 (NFR-5)

## 10. Open decisions

1. **Format: `"24-bit"` string vs numeric `24`.** Recommended: the string, as chosen when
   this spec was commissioned. It matches `bitrate` (`"850 kbps"`) and `sampleRate`
   (`"48 kHz"`), which are also display-formatted strings, and `''` gives a clean
   not-applicable sentinel that `0` or `null` would not. The alternative — a raw number —
   would be easier to sort and compare programmatically but would make `bitDepth` the only
   numeric characteristic in the row and force a null/0 decision for MP3.
2. **Field name: `bitDepth` vs `bitsPerSample`.** Recommended: `bitDepth`, as chosen.
   `bitsPerSample` is `music-metadata`'s internal name; `bitDepth` is the term used on
   release listings and in the directory names this field exists to check.
