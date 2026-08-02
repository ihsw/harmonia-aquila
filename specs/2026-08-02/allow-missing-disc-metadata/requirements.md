# Requirements: Allow Missing Disc Metadata

## 1. Background

The 2026-07-30 spec `add-album-disc-metadata` made repeated track numbers
evidence of a multi-disc album. `validateDiscSet` therefore reports
`missing disc number` for every selected track when any track number repeats,
even when every source file omits both disc number and disc total. Because
`manage-albums organize-files` runs this validation before destination
planning, an otherwise organizable flat album cannot reach dry-run output.

Disc metadata remains useful when it is present or deliberately inferred, but
its complete absence should mean “organize as a flat album,” not “reject the
album.” Existing destination collision checks can safely decide whether
repeated track numbers actually create ambiguous output paths. This spec
updates the shared policy so validation and organization remain consistent.

This spec builds on `migrate-fix-tags-into-organize-files` and
`copy-album-art-with-organize-files`: effective repaired metadata is validated
before the combined audio-and-art plan, and recognized album art continues to
target the effective album root.

## 2. Goal

`manage-albums organize-files` MUST accept an album when all selected audio
files omit disc number and disc total, including albums with repeated track
numbers. Such albums MUST use the existing flat `Artist/Album/TT - Title.ext`
layout. Explicit or inferred disc metadata MUST retain the current completeness,
validity, tuple, and `Disc DD` behavior, and ordinary duplicate-destination
preflight MUST remain authoritative.

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

- **FR-1 — Absence is valid** When every selected audio row has
  `discNumber = null` and `discTotal = null`, shared disc validation MUST NOT
  report `missing disc number`, regardless of repeated track numbers.
- **FR-2 — Flat destination** A set satisfying FR-1 MUST be treated as
  non-multi-disc and MUST use `Artist/Album/TT - Title.ext`; its output rows
  MUST retain empty formatted `discNumber` and `discTotal` values.
- **FR-3 — Explicit evidence remains strict** If any selected row has a disc
  number or disc total, every selected row MUST have a valid positive disc
  number, and existing completeness, total, continuity, and
  `(discNumber, trackNumber)` validation MUST remain in force.
- **FR-4 — Orphan totals** A present disc total without a disc number MUST
  produce the existing deterministic `missing disc number` issue and MUST NOT
  create a mixed flat/`Disc DD` plan.
- **FR-5 — Destination uniqueness** Repeated track numbers without disc
  metadata MAY organize only when their complete planned destination paths are
  unique; exact duplicate destinations MUST retain the existing deterministic
  preflight error before any write.
- **FR-6 — Multi-disc parity** Complete explicit disc metadata and metadata
  produced by `discStrategy: "infer"` MUST preserve current `Disc DD`
  destinations, formatted row fields, metadata repairs, and write verification.
- **FR-7 — Selection semantics** `limit` and
  `ignoreAudioFilesWithoutTracks` MUST continue to select audio rows before
  disc-set validation; FR-1–FR-6 MUST apply only to the selected rows.
- **FR-8 — Combined plan parity** Album-art discovery, ordering, album-root
  placement, collision handling, and execution MUST remain unchanged for flat
  and explicit multi-disc albums.
- **FR-9 — Surface parity** CLI, REST, GraphQL, and MCP MUST expose the shared
  result and error behavior without new inputs or output fields; dry run MUST
  remain the default and execution MUST remain explicit.
- **FR-10 — Validation parity** `manage-albums validate` MUST use the same
  absence policy as organization, so an all-absent repeated-track set is not
  marked invalid solely for missing disc metadata while partial disc evidence
  remains invalid.
- **FR-11 — Source safety** Dry run and failed preflight MUST NOT modify source
  audio, source images, destination content, or ignored sidecars.
- **FR-12 — Documentation** Active guidance MUST explain that disc metadata is
  optional only when wholly absent, repeated track numbers remain subject to
  destination uniqueness, and explicit/inferred multi-disc metadata remains
  strict.

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

1. Pure validation accepts tracks `1, 2, 1, 2` when every disc field is null.
2. Organization dry-run returns flat audio rows for repeated track numbers
   with distinct titles and empty disc fields, without writes.
3. Two all-absent rows that resolve to the same complete destination still
   fail duplicate-destination preflight before writes.
4. A partial set, an orphan disc total, invalid numbers, inconsistent totals,
   gaps, and duplicate disc/track tuples retain deterministic failures.
5. A complete two-disc set and `discStrategy: "infer"` retain `Disc 01` and
   `Disc 02` plans and execution behavior.
6. Validation, CLI, REST, GraphQL, and MCP regression tests demonstrate the
   same all-absent/partial behavior without contract changes.
7. Focused tests, final `npm run lint`, `npm run build`, and `npm test` pass;
   scope and media-tree audits are clean.
