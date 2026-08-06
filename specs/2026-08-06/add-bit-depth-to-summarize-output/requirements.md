# Requirements: Add bit depth to `summarize-source-dir` output

## 1. Background

`manage-albums summarize-source-dir` reports per-file audio characteristics through
`SummarizeSourceDirJsonOutputRow` in `src/lib/albums/summarize-source-dir.ts`. It already
carries `bitrate` (`"850 kbps"`), `sampleRate` (`"48 kHz"`) and `duration` (`"4:11"`), each
produced by a formatter in `src/lib/albums/audio-files.ts`.

**It does not report bit depth.** `music-metadata` exposes it as
`format.bitsPerSample?: number` (`node_modules/music-metadata/lib/type.d.ts:435`) and the
parse already happens — the value is simply never read.

The gap has practical consequences. On 2026-08-06 a Rammstein collection arrived in a
directory named `... [Hi-Res 24-48 FLAC] ...`; all 104 files reported 48 kHz at 696–897
kbps, which sits *below* ordinary 16-bit/44.1 kHz rates. Whether the release is genuinely
24-bit could not be determined from `summarize-source-dir`, so the provenance question was
recorded as unverifiable rather than answered. Sample rate alone cannot distinguish a true
hi-res master from an upsampled or mislabelled one.

Note this spec adds a **new** field. `bitrate` was checked first and is already present in
every execution mode — the lib row type, the GraphQL `AlbumSummaryRow`
(`src/web/modules/graphql/schema.gql:91`), and the CLI/REST/MCP payloads. No bitrate work
is in scope.

This follows the 2026-08-06 spec `add-year-to-set-metadata`, which added a field across the
same four execution surfaces. The surface area here is materially smaller — see §3.

## 2. Goal

`summarize-source-dir` reports a `bitDepth` field on every row, on every execution surface
(CLI plaintext and JSON, REST, GraphQL, MCP), formatted as `"24-bit"` and empty when the
container does not carry the value. Every existing field keeps its current name, type,
format and position.

## 3. Scope

### In scope

- `src/lib/albums/audio-files.ts` — new `formatAudioBitDepth` formatter
- `src/lib/albums/summarize-source-dir.ts` — row type and row construction
- `src/web/modules/graphql/album.rows.ts` — `AlbumSummaryRow`
- `src/web/modules/graphql/schema.gql` — `AlbumSummaryRow` SDL
- Tests under `__tests__/` covering the formatter, the lib row, and the web surfaces
- `docs/` pages that document the summarize row shape

### Out of scope

- **Any change to `bitrate`** — it already exists on all surfaces (§1). Not renamed, not
  reformatted, not supplemented with a numeric variant.
- `manage-albums validate` and `manage-albums organize-files` — neither reports audio
  characteristics, and neither gains bit depth.
- `manage-audiobooks` in any form.
- Filtering, sorting or thresholding on bit depth. This spec only *reports* the value; it
  adds no `--min-bit-depth` flag and no warning for suspicious combinations.
- Inferring or reconstructing bit depth for lossy formats (see FR-4).
- Any change to `AudioTagFix`, `setMetadata`, or any write path. Bit depth is read-only.
- New dependencies.

## 4. Functional Requirements

- **FR-1** `SummarizeSourceDirJsonOutputRow` MUST gain a required `bitDepth: string` field.
- **FR-2** `src/lib/albums/audio-files.ts` MUST export `formatAudioBitDepth(bitsPerSample:
  number | undefined): string`, returning `` `${bitsPerSample}-bit` `` for a defined value
  and `''` for `undefined`. This mirrors the existing `formatAudioBitrate` and
  `formatAudioSampleRate` contract exactly, including the empty-string sentinel.
- **FR-3** `summarizeAlbumSourceDir` MUST populate `bitDepth` from
  `metadata.format.bitsPerSample`.
- **FR-4** **Lossy formats MUST yield `''`, not an error and not a substituted value.**
  `bitsPerSample` is a PCM concept; `music-metadata` leaves it `undefined` for MP3. An MP3
  row MUST report `bitDepth: ''` while still reporting its `bitrate` and `sampleRate`
  normally. No file may fail to summarize because bit depth is absent.
- **FR-5** The GraphQL surface MUST expose `bitDepth: String!` on `AlbumSummaryRow`, in
  both the decorated class and `schema.gql`.
- **FR-6** The CLI, REST and MCP surfaces MUST expose `bitDepth` **without code changes** —
  they are generic pass-throughs (`writeRows` → `console.table`/`JSON.stringify`; the REST
  controller returns the lib output directly; the MCP tool wraps it in `jsonToolContent`).
  This MUST be **verified by test**, not assumed.
- **FR-7** `bitDepth` MUST be positioned alphabetically in the row construction literal —
  after `artist`, before `bitrate` — matching the existing ordering convention.
- **FR-8** Every existing summarize field MUST be unchanged in name, type, format and
  value. A row for a file with no bit depth MUST differ from today's output by exactly one
  added key.
- **FR-9** Documentation MUST record the new field and, explicitly, that it is empty for
  MP3 and other lossy sources.

## 5. Non-Functional Requirements

- **NFR-1 (lint after every source code file modification)** After every modification of a
  source code file (for example, a `.ts` file) under `src/` or `__tests__/`,
  `npm run lint -- <modified-file>` MUST be run and any reported issues fixed before moving
  on. This applies per source-code edit, not per-task. Whole-codebase `npm run lint` MUST be
  reserved for final verification after all TypeScript modifications are complete.
  <!-- Note: the `lint` script is `eslint ./src ./__tests__`, so this form appends the path
       and lints the whole codebase plus that file. The substance — modified file linted,
       issues fixed — still holds. See the 2026-08-06 add-year spec's execution notes. -->
- **NFR-2 (typecheck)** `npm run build` MUST exit 0 after the spec is complete. The
  typecheck script is `build`, **not** `build:ts`.
- **NFR-3 (tests)** `npm test` MUST exit 0 after the spec is complete.
- **NFR-4 (no `npx`)** `npx` is forbidden in **all** forms. Use `./node_modules/.bin/<tool>`
  or `npm run <script>` exclusively.
- **NFR-5 (file size)** No file produced or modified by this spec MAY exceed 200 lines.
  ⚠ `src/web/modules/graphql/album.rows.ts` is **currently 194 lines**; adding one
  `@Field` block takes it to ~197. It MUST NOT exceed 200, and the next field added to that
  file after this spec will breach the limit — flag it, do not silently absorb it.
- **NFR-6 (type safety)** Strict TypeScript; no `any`, no `// @ts-…` escapes. `bitDepth`
  MUST be typed `string`, never `string | number`.
- **NFR-7 (scope discipline)** `git --no-pager diff --stat src/commands/manage-audiobooks
  src/lib/audiobooks src/web/servers/mcp-tools/manage-audiobooks src/lib/albums/validate.ts
  src/lib/albums/organize-files.ts` MUST be empty after the spec.
- **NFR-8 (behavioral parity)** For any file whose container reports no bit depth, every
  other field in its summarize row MUST be byte-identical to the pre-change output.

## 6. Acceptance Criteria

1. Summarizing a FLAC directory reports `"bitDepth": "24-bit"` (or `"16-bit"`) on every row,
   alongside the existing `bitrate` and `sampleRate`.
2. Summarizing an MP3 directory reports `"bitDepth": ""` on every row, with `bitrate` and
   `sampleRate` unaffected, and no error (FR-4).
3. The same directory summarized through CLI `--format json`, REST, GraphQL and MCP yields
   the same `bitDepth` value on all four (FR-6).
4. `formatAudioBitDepth(undefined) === ''` and `formatAudioBitDepth(24) === '24-bit'`.
5. `npm run lint`, `npm run build` and `npm test` all exit 0.
6. `git --no-pager diff --stat` lists only the files in `design.md` §2; the NFR-7 paths are
   absent.
7. `src/web/modules/graphql/album.rows.ts` is ≤ 200 lines (NFR-5).
