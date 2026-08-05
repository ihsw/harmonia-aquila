# Requirements: Embed Disc Number in Track Filenames

## 1. Background

`organize-files` currently produces two different destination shapes for
multi-disc audio, chosen by an internal `DiscLayout` switch
(`organization-planner.ts`) that callers cannot see or control:

- Single `sourceDir` with a multi-disc set (`--disc-strategy infer` or
  explicit disc tags): `Artist/Album/Disc DD/TT - Title.ext`
  (`disc-directories` layout).
- `--source-dirs` concatenation (`--disc-strategy concatenate`, added by the
  2026-08-03 spec `add-concatenate-disc-strategy`): always
  `Artist/Album/TT - Title.ext` (`flat` layout) — disc identity is written to
  tags but is **absent from the path entirely**. This is documented today in
  `docs/album-organization.md` ("Concatenation still plans one flat
  `Artist/Album/TT - Title` layout with no `Disc DD` directories") and in
  `docs/organize-files-set-metadata.md`'s worked Days of Purgatory example,
  which explicitly relies on **titles differing** to avoid a destination
  collision between disc 1 track 1 and disc 2 track 1.

Because concatenate mode's local track numbers restart at `1` per source
directory (by design — `concatenate-album-sources.ts`), and disc identity
never reaches the filename, two source directories with the same local track
number and an accidentally-identical (post-sanitize) title collide today and
`organize-files` rejects the whole run with "Multiple files resolve to the
same destination." `disc-metadata.ts`'s `validateTrackIdentity` already
guarantees `(discNumber, trackNumber)` pairs are unique across an album once
disc metadata is valid — that guarantee just isn't reflected in the
destination filename.

## 2. Goal

Replace both existing multi-disc destination shapes with one: encode disc
number directly into the track filename, adjacent to the track number,
instead of nesting a `Disc DD/` directory. `Artist/Album/Disc 01/01 -
Title.ext` and today's disc-blind concatenate output both become
`Artist/Album/101 - Title.ext` (disc `1`, track `01`). Single-disc albums are
unaffected (`Artist/Album/01 - Title.ext`, no disc segment). This removes the
`DiscLayout` distinction entirely — single-source and concatenate destination
building becomes one code path — and, as a direct consequence, makes the
concatenate same-local-track-number collision in the Background section
structurally impossible: the numeric prefix is unique wherever disc metadata
is already valid, regardless of title.

## 3. Scope

### In scope

- A new disc+track filename prefix format: disc number zero-padded to the
  digit width of `discTotal` (minimum 1 digit), immediately followed by the
  existing 2-digit zero-padded track number — e.g. `101` (disc 1/2, track 1),
  `201` (disc 2/2, track 1), `0301` (disc 3/22, track 1), `2205` (disc 22/22,
  track 5). Confirmed padding rule (do not deviate): pad disc digits to
  `max(1, discTotal.toString().length)`.
- Removing the `Disc DD/` subdirectory nesting from `getAlbumDestination`
  (`src/lib/albums/organization-plan.ts`) for every caller.
- Removing the `DiscLayout` type and `discLayout` parameter from
  `planOrganizationCopies` (`src/lib/albums/organization-planner.ts`), since
  single-source and concatenate destinations are now built identically.
  Updating both call sites in `src/lib/albums/organize-files.ts`.
  Corresponding `discLayout` values (`'disc-directories'`/`'flat'`) are also
  removed.
- Updating `src/lib/albums/validate.ts`'s independent `getAlbumDestination`
  call to pass `discTotal` and adopt the same prefix.
- Single-disc behavior (`multiDisc === false`): unchanged, `TT - Title.ext`.
- Updating every existing test that currently asserts a `Disc DD/` path or a
  disc-blind concatenate destination.
- Rewriting the concatenate "exact flat destination collision" tests
  (`organize-files-concatenate.test.ts`, `organize-files-concatenate-execution.test.ts`)
  whose fixtures (same local track number, same title, across two source
  directories) no longer collide once disc number is embedded — this is an
  intentional behavior change, not a regression, and must be asserted as a
  success case producing two distinct destinations.
- Documentation updates: `docs/album-organization.md` (Multi-disc metadata
  section) and `docs/organize-files-set-metadata.md` (the Days of Purgatory
  worked example, whose "distinct destination filenames because their titles
  differ" claim becomes obsolete — disc identity alone now guarantees
  distinctness).
- Focused new unit tests for the padding/prefix function directly (no
  existing dedicated test file covers `organization-plan.ts`).

### Out of scope

- Any change to how `discNumber`/`discTotal` values themselves are computed,
  inferred, or validated (`disc-metadata.ts`, `metadata-fix-planner.ts`,
  `concatenate-album-sources.ts`'s disc-context derivation). This spec only
  changes how already-resolved disc/track numbers are rendered into a
  filename.
- Any change to tag-writing behavior (`audio-tags.ts`, ID3 `TPOS`/FLAC
  `DISCNUMBER`/`DISCTOTAL`).
- Album art destination paths — art already resolves to the album root
  (`album-art-planner.ts`), never a disc subdirectory, and is unaffected.
- A configuration flag to opt back into `Disc DD/` directories. The user has
  directed a hard cutover; no backward-compatibility switch is introduced.
- Migrating or renaming any already-organized files under `etc/albums/**` or
  elsewhere on disk.
- Changing dependency versions or `package.json`/lockfiles.

## 4. Functional Requirements

- **FR-1** `getAlbumDestination` (`organization-plan.ts`) MUST build the
  track filename as `{discTrackPrefix} - {title}{ext}` when `multiDisc` is
  true, and as `{TT} - {title}{ext}` (existing `formatTrackNumber` behavior,
  unchanged) when `multiDisc` is false. It MUST NOT nest a `Disc DD`
  directory segment under any circumstance.
- **FR-2** The disc+track prefix MUST be computed as `discNumber` zero-padded
  to `max(1, discTotal.toString().length)` digits, immediately followed by
  `formatTrackNumber(trackNumber)` (existing 2-digit zero-pad) with no
  separator between them.
- **FR-3** `DiscDestinationContext` MUST gain a `discTotal: number | null`
  field. `getAlbumDestination` MUST only apply the disc+track prefix when
  `multiDisc` is true AND both `discNumber` and `discTotal` are non-null;
  every existing caller (`organization-planner.ts`, `validate.ts`) MUST be
  updated to supply `discTotal`.
- **FR-4** `planOrganizationCopies` MUST drop its `discLayout` parameter and
  the exported `DiscLayout` type. Both callers in `organize-files.ts`
  (`organizeSingleAlbum` via the default, `organizeConcatenatedAlbum` via the
  explicit `'flat'` argument) MUST be updated to call the parameterless form.
  Destination building for single-source and concatenate modes MUST use one
  shared code path with no mode-specific branching.
- **FR-5** `validate.ts`'s `getAlbumDestination` call MUST pass the row's
  resolved `discTotal` alongside `discNumber` and `multiDisc`, so
  `manage-albums validate` reports the same destination shape
  `organize-files` would produce.
- **FR-6** Concatenate-mode destinations MUST reflect true disc identity
  (source-directory position, per the existing, unchanged
  `ConcatenateDiscContext`/`applyConcatenateDiscMetadata`), eliminating the
  same-local-track-number collision described in Background: two source
  directories both contributing a local track `1` MUST resolve to distinct
  destinations (e.g. `101 - ...` and `201 - ...`) regardless of title,
  whenever disc metadata is already valid.
- **FR-7** Single-disc destinations (no disc metadata, or `discTotal <= 1`
  and `discNumber` unset/`1`) MUST remain byte-for-byte identical to current
  output: `Artist/Album/TT - Title.ext`.
- **FR-8** Every test asserting a `Disc DD/` segment or a disc-blind
  concatenate destination MUST be updated to the new prefixed filename;
  tests whose fixtures relied on the now-impossible same-prefix collision in
  concatenate mode MUST be rewritten to assert the (now correct) distinct
  destinations instead of an error.

## 5. Non-Functional Requirements

- **NFR-1 — Lint after every source code file modification.** After every
  modification of a source code file, `npm run lint -- <modified-file>` MUST
  be run so only that file is linted, and issues MUST be fixed before
  continuing; whole-codebase `npm run lint` MUST be reserved for the final
  verification phase after all TypeScript modifications are complete.
- **NFR-2 — Build.** `npm run build` MUST exit 0 after implementation.
- **NFR-3 — Tests.** `npm test` MUST exit 0 after implementation.
- **NFR-4 — No `npx`.** `npx` is forbidden in all forms; commands MUST use
  repository scripts or `./node_modules/.bin/<tool>`.
- **NFR-5 — File size.** New or modified source files SHOULD remain at or
  below 200 lines. `src/lib/albums/organize-files.ts` is already 204 lines
  before this spec (a pre-existing overage from prior work); this spec's net
  change to that file MUST NOT increase its line count. `organization-plan.ts`
  (128 lines) and `organization-planner.ts` (118 lines) MUST stay at or below
  200 lines after their changes.
- **NFR-6 — Type safety.** Implementation MUST use strict TypeScript without
  `any` or TypeScript suppression comments.
- **NFR-7 — No dependencies.** `package.json` and lockfiles MUST remain
  unchanged.
- **NFR-8 — Determinism.** The same resolved disc/track numbers MUST always
  produce the same prefix; no locale- or environment-dependent formatting.
- **NFR-9 — Source safety.** Dry runs MUST perform no writes; this spec does
  not change write ordering or atomicity guarantees, only the destination
  string computed before any write.

## 6. Acceptance Criteria

1. A single `sourceDir` with `--disc-strategy infer` producing a 2-disc, 2
   tracks-per-disc set organizes to `Artist/Album/101 - One.flac`,
   `Artist/Album/102 - Two.flac`, `Artist/Album/201 - Three.flac`,
   `Artist/Album/202 - Four.flac` — no `Disc DD/` segment anywhere.
2. `--source-dirs` concatenation of two directories, each contributing a
   local track `1` with an identical (post-sanitize) title, now succeeds
   (previously rejected) and produces two distinct destinations,
   `Artist/Album/101 - Same.flac` and `Artist/Album/201 - Same.flac`.
3. A 22-directory concatenation (or an equivalent `discTotal: 22` single-source
   fixture) produces 2-digit disc prefixes: disc 3 track 1 →
   `Artist/Album/0301 - ....ext`; disc 22 track 5 →
   `Artist/Album/2205 - ....ext`.
4. Single-disc output (no repeated tracks, no disc metadata) is unchanged:
   `Artist/Album/01 - Title.ext`.
5. `manage-albums validate` reports the same prefixed destination shape as
   `organize-files` for the same source metadata.
6. `DiscLayout`/`discLayout` no longer exist anywhere in `src/` or `__tests__/`
   (`grep -rn "DiscLayout|discLayout" src __tests__` returns nothing).
7. Per-edit lint, final `npm run lint`, `npm run build`, and `npm test` exit
   0, and `package.json`/lockfile diffs are empty.