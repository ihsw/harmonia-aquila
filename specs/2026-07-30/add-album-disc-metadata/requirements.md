# Requirements: Album Disc Metadata Support

## 1. Background

The album commands currently read and expose track numbers but ignore disc
metadata. For MP3, ID3v2 stores the disc number and optional disc total in the
`TPOS` ("Part of a set") frame, normally as `N` or `N/M`. For FLAC, the
equivalent Xiph fields are `DISCNUMBER` and `DISCTOTAL`. The installed
`music-metadata` package normalizes both formats as `common.disk.no` and
`common.disk.of`; `node-taglib-sharp` writes them through `tag.disc` and
`tag.discCount`.

Because `validate` and `organize-files` currently identify a track only by its
track number, multi-disc albums can produce misleading validation results or
colliding output paths. `fix-tags` cannot currently set or infer disc metadata,
and `summarize-source-dir` does not expose it. These gaps affect the shared
domain functions and every CLI, REST, GraphQL, and MCP adapter that returns
their rows.

This spec extends the existing one-album-per-run rules introduced by
`specs/2026-07-29/reject-multiple-albums-per-run/`; disc numbers subdivide one
album and MUST NOT weaken the existing multiple-album or multiple-artist
guards.

## 2. Goal

All `manage-albums` metadata workflows MUST understand normalized disc number
and disc total values for MP3 and FLAC. Validation MUST diagnose incomplete or
conflicting multi-disc metadata, fix-tags MUST support opt-in deterministic
inference and per-file explicit values, organization MUST create collision-free
disc-aware destinations, and summary/API rows MUST expose the values without
changing legacy single-disc destinations.

## 3. Scope

### In scope

- Shared disc metadata parsing, validation, inference, formatting, and
  destination planning under `src/lib/albums/**`.
- `manage-albums validate`, `fix-tags`, `organize-files`, and
  `summarize-source-dir` CLI behavior and output rows.
- Optional `discNumber` and `discTotal` columns in fix-tags JSON/CSV
  `--set-metadata` files.
- REST, GraphQL, and MCP schemas/adapters/rows for the affected shared
  operations, including an opt-in fix-tags `discStrategy`.
- Focused unit, command, REST, GraphQL, MCP, Bruno, and documentation updates.

### Out of scope

- ID3v1 disc support; ID3v1 has no standard disc-number field.
- Formats other than the already supported MP3 and FLAC album files.
- Inferring discs automatically without an explicit fix-tags option.
- Inferring from title text, directory names, MusicBrainz IDs, durations, or
  online metadata.
- Renumbering tracks while inferring discs; `resetTrack` remains separate.
- Changing the one-album-per-run or one-artist-output invariants.
- Changing source/scratch/destination root selection, execution defaults, or
  audiobook behavior.
- Processing a real music library, modifying `etc/**`, or adding dependencies.

## 4. Functional Requirements

- **FR-1 — Canonical model** Shared album code MUST represent disc metadata as
  `discNumber: number | null` and `discTotal: number | null`, reading
  `music-metadata`'s `common.disk.no` and `common.disk.of`.
- **FR-2 — Format mapping** Tag writes MUST use
  `node-taglib-sharp`'s `tag.disc` and `tag.discCount`, producing ID3v2 `TPOS`
  for MP3 and `DISCNUMBER`/`DISCTOTAL` for FLAC.
- **FR-3 — Numeric validity** A present disc number and disc total MUST be
  positive integers, and a disc number MUST NOT exceed its present disc total;
  invalid values MUST produce a deterministic `UserInputError` or invalid
  validation-row issue and MUST NOT be silently coerced.
- **FR-4 — Summary output** `summarizeAlbumSourceDir` and all its adapters MUST
  add `discNumber` and `discTotal` to every row, using an empty string when the
  normalized value is absent.
- **FR-5 — Validation row output** `validateAlbumSourceDir` and all its
  adapters MUST add formatted `discNumber` and `discTotal` fields to every row.
- **FR-6 — Disc-set consistency** Within the selected files for one album,
  validation MUST:
  - allow a legacy set where every disc value is absent and track numbers are
    unique;
  - require every row to have a disc number when any row has one or when a
    track number repeats;
  - reject duplicate `(discNumber, trackNumber)` pairs;
  - require every present disc total to agree, require all rows to carry that
    total when any row carries it, and reject numbers greater than the total;
  - require the observed positive disc numbers to be contiguous from `1`
    through the highest observed disc number.
- **FR-7 — Validation issues** Row-local disc problems MUST set the row to
  `invalid` with deterministic issues such as `missing disc number`,
  `invalid disc number`, `invalid disc total`, or
  `duplicate disc and track number: D/T`; set-wide total/continuity problems
  MUST be reported deterministically on every implicated row.
- **FR-8 — Destination identity** Validation and organization MUST use the
  tuple `(discNumber, trackNumber)` as track identity whenever the selected
  album is multi-disc.
- **FR-9 — Legacy destinations** If all disc metadata is absent, or all files
  are disc 1 with no total greater than 1, organization MUST preserve the
  existing `Artist/Album/TT - Title.ext` destination exactly.
- **FR-10 — Multi-disc destinations** If the selected set observes a disc
  number greater than 1 or a disc total greater than 1, organization MUST use
  `Artist/Album/Disc DD/TT - Title.ext`, with two-digit minimum padding for
  `DD` and `TT`, and MUST expose that relative path in dry-run/output rows.
- **FR-11 — Organization preflight** `organizeAlbumFiles` MUST apply FR-3 and
  FR-6 before destination filesystem inspection or writes; invalid disc sets
  MUST fail with no copied files.
- **FR-12 — Organization rows** Organization output rows and all API schemas
  MUST add formatted `discNumber` and `discTotal` values.
- **FR-13 — Opt-in inference** Fix-tags MUST accept `discStrategy` with values
  `no change` (default) and `infer`; the CLI spelling MUST be
  `--disc-strategy <strategy>`, and REST, GraphQL, and MCP MUST expose
  `discStrategy`.
- **FR-14 — Inference ordering** For `discStrategy = infer`, files MUST be
  sorted by filename using the same deterministic ordering as album discovery,
  and the effective track-number sequence MUST be split into maximal strictly
  increasing runs: the first run is disc 1 and a repeated or decreased track
  number begins the next disc. Thus two filename-ordered files with the same
  track number receive disc 1 and disc 2.
- **FR-15 — Inference safety** Inference MUST require a track number on every
  selected file, MUST infer at least two runs, MUST assign a common disc total
  equal to the number of runs, and MUST reject existing mixed or contradictory
  disc metadata instead of overwriting it; already complete metadata matching
  the inferred result MAY remain unchanged.
- **FR-16 — Inference output** Fix-tags dry-run/JSON/plaintext rows MUST expose
  existing and proposed `discNumber`, `discTotal`, `newDiscNumber`, and
  `newDiscTotal` fields whenever inference or explicit per-file disc metadata
  is requested.
- **FR-17 — Explicit per-file values** Fix-tags `--set-metadata` JSON and CSV
  records MAY contain `discNumber` and `discTotal`; both fields are optional
  for backward compatibility, present values MUST be positive integers, and a
  present `discTotal` requires a present `discNumber`.
- **FR-18 — Fix-tags conflicts** `discStrategy = infer` MUST conflict with
  `--set-metadata` records containing disc fields and with `resetTrack`;
  conflict errors MUST name the conflicting options and occur before copying.
- **FR-19 — Write verification** Execute mode MUST copy first, write both disc
  fields on the destination when planned, save/dispose the tag file, re-read
  the destination metadata, and fail if the requested normalized disc values
  were not persisted.
- **FR-20 — Adapter parity** CLI, REST, GraphQL, and MCP MUST delegate to the
  shared implementation; schemas and generated GraphQL SDL MUST expose the
  additive fields/options while retaining existing roots, defaults, error
  translation, tool names, and annotations.
- **FR-21 — Limits** Existing `limit` handling MUST occur before validation or
  inference, and all consistency decisions MUST apply only to selected files.
- **FR-22 — Documentation** Album organization, fix-tags set-metadata,
  GraphQL, and MCP documentation MUST explain `TPOS`, FLAC equivalents,
  inference ordering, dry-run review, the multi-disc path shape, and the
  preserved legacy path shape.

## 5. Non-Functional Requirements

- **NFR-1 — Lint after every source code file modification** After every
  source code file modification, `npm run lint -- <modified-file>` MUST run so
  only that file is linted, and reported issues MUST be fixed before the next
  edit. Whole-codebase `npm run lint` MUST be reserved for final verification
  after all TypeScript modifications are complete.
- **NFR-2 — No `npx`** `npx` is forbidden in all forms. Commands MUST use
  `npm run <script>` or `./node_modules/.bin/<tool>` exclusively.
- **NFR-3 — Build and tests** `npm run build` and `npm test` MUST exit 0.
- **NFR-4 — Type safety** Changes MUST preserve strict TypeScript with no
  `any`, TypeScript suppression directives, or unsafe casts.
- **NFR-5 — File size** No produced source or test file MAY exceed 200 lines;
  oversized touched files MUST be split into focused modules.
- **NFR-6 — Determinism** Inference, issue ordering, conflict messages, and
  destinations MUST be stable across runs and independent of metadata parse
  concurrency.
- **NFR-7 — No new dependencies** The implementation MUST use the installed
  `music-metadata` and `node-taglib-sharp` packages.
- **NFR-8 — Backward compatibility** Existing single-disc inputs, output
  fields, paths, option defaults, and set-metadata files MUST retain their
  behavior except for additive disc fields.
- **NFR-9 — Scope discipline** The final diff MUST preserve `etc/**`,
  audiobook code, root configuration, and package manifests unless the user
  explicitly approves expansion.

## 6. Acceptance Criteria

1. MP3 and FLAC tag-writer tests prove disc 2 of 3 is persisted through the
   normalized reader API.
2. Summary and validation rows expose absent, single-disc, and multi-disc
   values on CLI, REST, GraphQL, and MCP surfaces.
3. A valid two-disc fixture with tracks `1,2,1,2` validates and plans
   `Disc 01`/`Disc 02` paths without duplicate destinations; the same fixture
   without disc metadata is invalid.
4. Fix-tags inference assigns `1,1,2,2` and total `2` to that filename-ordered
   sequence, while a repeated single track receives discs 1 and 2.
5. Missing tracks, a non-increasing ambiguous/mixed existing disc set,
   inconsistent totals, gaps, and duplicate disc/track pairs fail
   deterministically before writes.
6. Optional set-metadata disc fields round-trip through JSON and CSV and old
   files without them remain valid.
7. Relevant focused tests, `npm run lint`, `npm run build`, and `npm test`
   exit 0, and scope verification shows no unrelated changes.
