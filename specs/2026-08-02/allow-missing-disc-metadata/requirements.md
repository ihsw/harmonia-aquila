# Requirements: Optional Disc Metadata with Explicit Inference

## 1. Background

The 2026-07-30 spec `add-album-disc-metadata` allows disc metadata to be absent
for a flat album whose selected track numbers are unique. It deliberately
treats repeated track numbers as evidence of a multi-disc set: without disc
numbers, `validateDiscSet` reports `missing disc number` before organization
can plan ambiguous flat destinations.

Disc metadata must remain optional for ordinary flat albums, but repeated
track numbers must not silently bypass disc identity. The supported escape is
the existing explicit `discStrategy: "infer"` / `--disc-strategy infer`
workflow, which projects disc numbers and totals from filename-ordered track
boundaries before shared validation and destination planning. This spec locks
that distinction across organization and validation rather than relaxing the
repeated-track safeguard.

This spec builds on `migrate-fix-tags-into-organize-files` and
`copy-album-art-with-organize-files`: effective repaired metadata is validated
before the combined audio-and-art plan, and recognized album art continues to
target the effective album root.

## 2. Goal

`manage-albums organize-files` MUST accept missing disc number/total metadata
when selected track numbers are unique and MUST use the existing flat
`Artist/Album/TT - Title.ext` layout. Repeated track numbers without disc
metadata MUST remain a validation error unless `discStrategy: "infer"` is
explicitly selected and successfully produces complete effective disc
metadata. Explicit and inferred disc sets MUST retain strict validation and
`Disc DD` destinations.

## 3. Scope

### In scope

- Shared disc-set completeness policy under `src/lib/albums/**`.
- Organization and validation behavior for wholly absent versus partially
  present disc metadata.
- Focused domain, CLI, REST, GraphQL, and MCP regression tests where needed.
- Generated GraphQL schema only if regeneration changes it.
- Active album organization, GraphQL, MCP, testing, collection, and
  `.agents/skills/album-organization` guidance where the old requirement is
  stated.
- This spec and its execution notes.

### Out of scope

- Removing support for explicit disc numbers, disc totals, `discStrategy`, or
  per-track disc values in `setMetadata`.
- Automatically inferring disc metadata or disc folders without
  `discStrategy: "infer"`.
- Renumbering tracks, changing titles, or resolving duplicate destinations.
- Changing organization row shapes, image extensions, album-art placement,
  collision strategies, root routing, execute defaults, or MCP tool schemas.
- Audiobook behavior, package dependencies, historical specs, or real media
  organization.

## 4. Functional Requirements

- **FR-1 — Optional for unique tracks** When every selected audio row has
  `discNumber = null` and `discTotal = null` and all present track numbers are
  unique, shared disc validation MUST NOT report `missing disc number`.
- **FR-2 — Repeated-track safeguard** When a selected track number repeats and
  effective disc numbers remain absent, validation and organization MUST
  report deterministic `missing disc number` issues and MUST NOT plan or write
  destinations.
- **FR-3 — Explicit inference exception** `discStrategy: "infer"` (CLI:
  `--disc-strategy infer`) MUST run before disc-set validation; when inference
  succeeds, its complete effective disc numbers/totals MUST resolve the
  missing-disc condition before validation and produce the existing multi-disc
  plan. Omitted/default `no change` MUST NOT infer or suppress the error.
- **FR-4 — Flat destination** A set satisfying FR-1 MUST be treated as
  non-multi-disc and MUST use `Artist/Album/TT - Title.ext`; output rows MUST
  retain empty formatted `discNumber` and `discTotal` values.
- **FR-5 — Explicit evidence remains strict** If any selected row has a disc
  number or disc total, every selected row MUST have a valid positive disc
  number, and existing completeness, total, continuity, and
  `(discNumber, trackNumber)` validation MUST remain in force.
- **FR-6 — Orphan totals** A present disc total without a disc number MUST
  produce the existing deterministic `missing disc number` issue and MUST NOT
  create a mixed flat/`Disc DD` plan.
- **FR-7 — Destination uniqueness** Exact duplicate destinations MUST retain
  the existing deterministic preflight error before any write; this remains a
  separate guard after disc validation and MUST NOT replace FR-2.
- **FR-8 — Multi-disc parity** Complete explicit disc metadata and metadata
  produced by `discStrategy: "infer"` MUST preserve current `Disc DD`
  destinations, formatted row fields, metadata repairs, and write verification.
- **FR-9 — Selection semantics** `limit` and
  `ignoreAudioFilesWithoutTracks` MUST continue to select audio rows before
  inference/validation; repeated-track decisions MUST apply only to selected
  rows.
- **FR-10 — Combined plan parity** Album-art discovery, ordering, album-root
  placement, collision handling, and execution MUST remain unchanged for flat
  and explicit multi-disc albums.
- **FR-11 — Surface parity and source safety** CLI, REST, GraphQL, and MCP MUST expose the shared
  result and error behavior without new inputs or output fields; dry run MUST
  remain the default, execution MUST remain explicit, and failed
  inference/validation MUST NOT modify source or destination content.
- **FR-12 — Documentation** Active guidance MUST explain that disc metadata is
  optional for unique-track flat albums; repeated tracks require complete
  explicit metadata or successful opt-in inference; inference is never the
  default; and destination collision checks remain in force afterward.
- **FR-13 — Actionable organization error** When repeated track numbers
  activate missing-disc validation, `organize-files` MUST group the duplicate
  track numbers and filenames, retain the `missing disc number` reason, explain
  the whole-album `setMetadata` JSON/CSV-file repair and explicit
  `discStrategy: "infer"` alternatives, confirm no files were written, and
  preserve that message through CLI, REST, GraphQL, and MCP errors.

## 5. Non-Functional Requirements

- **NFR-1 — Lint after every source code file modification** After every
  source-code file modification, `npm run lint -- <modified-file>` MUST run and
  every reported issue MUST be fixed before moving on. This applies per edit,
  not per task. Whole-codebase `npm run lint` MUST be reserved for final
  verification after all TypeScript modifications are complete.
- **NFR-2 — No `npx`** `npx` is forbidden in all forms. Commands MUST use
  `npm run <script>` or `./node_modules/.bin/<tool>` exclusively.
- **NFR-3 — Build and tests** `npm run build` and `npm test` MUST exit 0.
- **NFR-4 — Type safety** Changes MUST preserve strict TypeScript without
  `any`, TypeScript suppression directives, or unsafe casts.
- **NFR-5 — File size** Every produced or touched source/test file MUST remain
  at or below 200 lines; focused modules/tests MUST be split when necessary.
- **NFR-6 — Determinism** Issue ordering, row ordering, destinations, and
  collision messages MUST remain deterministic.
- **NFR-7 — No dependencies** `package.json` and `package-lock.json` MUST NOT
  change.
- **NFR-8 — Scope discipline** The implementation MUST NOT change `etc/**`,
  audiobook code, root configuration, or historical specs.
- **NFR-9 — Backward compatibility** Existing unique-track flat albums and
  complete explicit/inferred multi-disc albums MUST retain their current
  paths, output fields, actions, and transport behavior.

## 6. Acceptance Criteria

1. Pure validation accepts unique tracks `1, 2, 3` when every disc field is
   null and rejects all-null `1, 2, 1, 2` with `missing disc number`.
2. Organization with repeated track numbers and omitted/default
   `discStrategy` fails before destination inspection or writes.
3. The same filename-ordered repeated sequence with `discStrategy: "infer"`
   produces complete effective disc metadata and `Disc 01`/`Disc 02` rows.
4. A partial set, an orphan disc total, invalid numbers, inconsistent totals,
   gaps, and duplicate disc/track tuples retain deterministic failures.
5. Unique-track all-absent albums retain flat destinations; exact duplicate
   destination preflight remains unchanged after valid disc checks.
6. Validation, CLI, REST, GraphQL, and MCP regression tests demonstrate the
   same unique/repeated/inferred behavior without contract changes.
7. Focused tests, final `npm run lint`, `npm run build`, and `npm test` pass;
   scope and media-tree audits are clean.
