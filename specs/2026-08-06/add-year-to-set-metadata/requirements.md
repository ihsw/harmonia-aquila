# Requirements: Add `year` support to `setMetadata`

## 1. Background

`manage-albums organize-files` accepts per-track metadata overrides through
`setMetadata`. The record contract is defined once per execution surface:

- **CLI** — `--set-metadata <path>` reads JSON/CSV and normalizes through
  `src/commands/manage-albums/helpers/set-metadata-records.ts`
  (`SetMetadataRecord`, `buildRecord`).
- **REST + MCP** — both reuse the single Zod schema
  `albumSetMetadataRecordSchema` in `src/web/schemas/album-set-metadata.ts`.
- **GraphQL** — has its own decorated input class
  `AlbumSetMetadataRecordInput` in `src/web/modules/graphql/album.inputs.ts`,
  mirrored in `src/web/modules/graphql/schema.gql`.

The writable field set today is `album`, `artist`, `title`, `trackNumber`,
`discNumber`, `discTotal` (plus `filename` and `sourceIndex` as identity keys).
**`year` is not among them.** Because none of the four surfaces declares
`additionalProperties: false`, a caller who supplies `year` has it silently
accepted and silently discarded — no error, no warning, and no tag write. This
was confirmed empirically on 2026-08-06 against a dry-run `organize_files`
call: the extra key passed validation and produced no `year` entry in
`tagChanges`.

The read path already understands the field —
`src/lib/albums/summarize-source-dir.ts` reports `metadata.common.year` — and
the write path can support it: the organize pipeline writes tags through
`node-taglib-sharp` in `src/lib/albums/audio-tags.ts`, whose `Tag` exposes a
settable `year: number` accessor. Only the intermediate plumbing is missing:
`SetMetadataRecord`, `AudioTagFix`, `ParsedAlbumSource`, and the planner.

The concrete motivating case: reissue and deluxe pressings carry the reissue
year in their tags rather than the original release year (`London 0 Hull 4
(2009 Deluxe Edition)` tagged 2009 for a 1986 album; `Palookaville (2005
Limited Edition)` tagged 2005 for a 2004 album). There is currently no way to
correct this through any execution surface.

This spec follows the 2026-08-05 spec `allow-duplicate-filenames-across-source-dirs`,
which added `sourceIndex` across the same four surfaces; its file list is the
reference model for the surface area touched here.

## 2. Goal

`setMetadata` records accept an optional `year` field on every execution
surface — CLI (JSON and CSV manifests), REST, GraphQL, and MCP — validated
consistently, threaded through the planner, written to the destination file's
tag, and reported in the `tagChanges` output row as a `year` → `newYear`
before/after pair. Records that omit `year` MUST behave exactly as they do
today, leaving the source year untouched.

## 3. Scope

### In scope

- `src/commands/manage-albums/helpers/set-metadata-records.ts` — record type and normalization
- `src/commands/manage-albums/organize-files.ts` — `--set-metadata` option help text
- `src/web/schemas/album-set-metadata.ts` — Zod record schema (serves REST **and** MCP)
- `src/web/modules/graphql/album.inputs.ts` — `AlbumSetMetadataRecordInput`
- `src/web/modules/graphql/album.rows.ts` — `AlbumMetadataChangesRow`
- `src/web/modules/graphql/schema.gql` — input and row SDL
- `src/lib/albums/audio-tags.ts` — `AudioTagFix` and `writeAudioTagFix`
- `src/lib/albums/metadata-fix-types.ts` — row, source, and effective-metadata types
- `src/lib/albums/metadata-fix-sources.ts` — read source `year`
- `src/lib/albums/metadata-fix-planner.ts` — thread `year` into tag fix and row
- `src/lib/albums/concatenate-album-sources.ts` — preserve `year` on synthesized sources
- Tests under `__tests__/` covering all four surfaces
- `docs/organize-files-set-metadata.md`, `docs/album-organization.md`,
  `docs/graphql.md`, `docs/mcp-server.md`

### Out of scope

- **Clearing** a year (there is no `year: null` / clear semantic; see FR-3).
  `discNumber`/`discTotal` support clearing via `NumericTagFix`; `year` does not.
- Any `year` handling in `manage-audiobooks` (`src/commands/manage-audiobooks/`,
  `src/web/schemas/mcp/manage-audiobooks.ts`, audiobook resolvers/controllers).
- Bulk setters — no `--set-year` / `setYear` album-wide option is added. `year`
  is per-record only.
- `manage-albums validate` — no new year validation rule.
- Deriving a year from directory names, or any inference when `year` is absent.
- Changing `summarize-source-dir` output.
- Destination path or filename templating — `year` MUST NOT affect any
  destination path.
- New dependencies.

## 4. Functional Requirements

- **FR-1** `SetMetadataRecord` MUST gain an optional `year?: number` field. All
  four execution surfaces MUST accept it and MUST reject it when malformed.
- **FR-2** `year` MUST be validated as an integer in the inclusive range
  `1000`–`9999`. Values outside that range, non-integers, and non-numeric
  strings MUST be rejected with a `UserInputError`-class message naming the
  offending record, consistent with the existing `positiveInteger` failures in
  `set-metadata-records.ts`.
- **FR-2a** The CLI JSON/CSV path MUST accept a numeric **string** year
  (e.g. `"1986"`), matching the existing coercion behaviour of
  `positiveInteger`. REST, GraphQL, and MCP MUST accept only a JSON number
  (GraphQL types it as `Int`).
- **FR-3** `year` MUST be set-only. Omitting `year` from a record MUST leave the
  source file's year tag unmodified. There MUST NOT be a way to clear a year
  through `setMetadata`.
- **FR-4** `AudioTagFix` MUST gain `year?: number`, and `writeAudioTagFix` MUST
  assign `audioFile.tag.year` when it is defined, following the same
  `!== undefined` guard pattern as the existing fields.
- **FR-5** `ParsedAlbumSource` MUST gain `year: number | null`, populated in
  `parseAlbumSources` from `metadata.common.year ?? null`, so the pre-change
  value is available for reporting.
- **FR-6** `MetadataFixJsonOutputRow` MUST gain `year?: number | null` and
  `newYear?: number`. The planner MUST emit **both** keys when and only when a
  record supplies `year`, mirroring the existing `discNumber`/`newDiscNumber`
  pairing.
- **FR-7** `EffectiveAlbumMetadata` MUST gain `year: number | null`, projected in
  `projectMetadata` as `tagFix.year ?? source.year`.
- **FR-8** `year` MUST be supported when `discStrategy` is `concatenate`.
  Unlike `discNumber`/`discTotal` — which `assertNoDiscFieldsInRecords`
  rejects under concatenate — `year` carries no disc identity and MUST NOT be
  rejected on that path. `concatenate-album-sources.ts` MUST preserve `year` on
  any `ParsedAlbumSource` it synthesizes.
- **FR-9** The GraphQL surface MUST expose `year: Int` on
  `AlbumSetMetadataRecordInput` and `year: Int` / `newYear: Int` on
  `AlbumMetadataChangesRow`, in both the decorated classes and `schema.gql`.
- **FR-10** The CLI `--set-metadata` option description MUST be updated to name
  the year field alongside the existing "optional disc fields" wording.
- **FR-11** Records omitting `year` MUST produce byte-identical planner output
  to the current implementation — no `year` or `newYear` keys in the row, no
  `year` in the tag fix.
- **FR-12** Documentation MUST be updated so the record contract in
  `docs/organize-files-set-metadata.md` lists `year`, and the REST, GraphQL,
  and MCP examples in `docs/album-organization.md`, `docs/graphql.md`, and
  `docs/mcp-server.md` reflect the new field.

## 5. Non-Functional Requirements

- **NFR-1 (lint after every source code file modification)** After every
  modification of a source code file (for example, a `.ts` file) under `src/` or
  `__tests__/`, `npm run lint -- <modified-file>` MUST be run so only the
  modified file is linted, and any reported issues MUST be fixed before moving
  on. This applies per source-code edit, not per-task. Whole-codebase
  `npm run lint` MUST be reserved for final verification after all TypeScript
  modifications are complete.
- **NFR-2 (typecheck)** `npm run build` MUST exit 0 after the spec is complete.
- **NFR-3 (tests)** `npm test` MUST exit 0 after the spec is complete.
- **NFR-4 (no `npx`)** `npx` is forbidden in **all** forms (no `--no-install`,
  no one-off vitest/tsc invocations). Any command line containing the substring
  `npx` is a violation. Use `./node_modules/.bin/<tool>` or `npm run <script>`
  exclusively.
- **NFR-5 (file size)** No file produced or modified by this spec MAY exceed
  200 lines. `set-metadata-records.ts` is currently 159 lines and
  `metadata-fix-planner.ts` is 203 lines — the planner is **already over** and
  MUST NOT grow; extract a helper if the year threading pushes it further.
- **NFR-6 (type safety)** Strict TypeScript; no `any`, no `// @ts-…` escapes.
  `year` MUST NOT be typed as `number | string` in `SetMetadataRecord` — string
  coercion happens during normalization only.
- **NFR-7 (scope discipline)** `git --no-pager diff --stat src/commands/manage-audiobooks
  src/lib/audiobooks src/web/servers/mcp-tools/manage-audiobooks` MUST be empty
  after the spec.
- **NFR-8 (behavioral parity)** For every existing test fixture that omits
  `year`, the planner row, tag fix, and destination path MUST be unchanged.
  Destination paths MUST be unchanged in **all** cases, including when `year`
  is supplied (FR-3, out-of-scope templating).
- **NFR-9 (single source of truth)** The REST and MCP surfaces MUST continue to
  share `albumSetMetadataRecordSchema`. This spec MUST NOT introduce a second
  Zod record schema for MCP.

## 6. Acceptance Criteria

1. A CLI JSON manifest containing `"year": 1986` on one record writes that year
   to the destination file and reports `year` / `newYear` in the `--format json`
   row; a CSV manifest with a `year` column behaves identically.
2. The same record posted to REST `setMetadata`, sent as a GraphQL
   `AlbumSetMetadataRecordInput`, and passed to
   `manage_albums_organize_files.arguments.setMetadata` all produce the same
   `tagChanges` payload.
3. `year: 0`, `year: 999`, `year: 10000`, `year: 1986.5`, and `year: "nineteen"`
   are each rejected with a message naming the record.
4. A record set omitting `year` produces output identical to the pre-change
   implementation (NFR-8).
5. `year` is accepted alongside `discStrategy: concatenate` and is **not**
   rejected by `assertNoDiscFieldsInRecords` (FR-8).
6. `npm run lint`, `npm run build`, and `npm test` all exit 0.
7. `git --no-pager diff --stat` lists only the files enumerated in
   `design.md` §2, and the audiobook paths in NFR-7 are absent.
