# Design: `allowMultipleAlbums` for `manage-albums organize-files`

> Scope reminder: this spec touches **only** the four `src/lib/albums` files listed in §2, the
> CLI/REST/GraphQL/MCP wiring for `organize-files`, tests, the Bruno collection, and docs. No
> edits to `organization-plan.ts`, `validate.ts`, `disc-metadata.ts`,
> `organize-files-execution.ts`, `metadata-fix-planner.ts`, or anything under
> `manage-audiobooks`. No new dependencies, no `npx`.
>
> §8 (test updates) and §11 (verification) live in
> [`design-testing.md`](./design-testing.md); section numbers are continuous across both files.

## 1. Overview

The obvious shape of this change — "thread a boolean to one `if`" — is the smallest part of it.
Three things move together.

**(1) Disc validation runs first and is run-scoped.**

```ts
throwForDiscSetIssues(discRecords)          // organization-planner.ts:40 — every selected file
const multiDisc = isMultiDiscSet(discRecords)
```

`validateCompleteness` (`disc-metadata.ts:63-71`) reads any repeated track number as an
incomplete multi-disc set, so two albums that each start at track 1 fail with
`Duplicate track numbers were detected:` before either guard is reached. With the flag on, a disc
set must mean "one destination album", not "one run" (FR-4).

**(2) There are two single-album guards, not one.** `assertSingleArtistPerAlbumDirectory` keys on
the album directory alone, so it rejects "Greatest Hits" by two different artists — which resolve
to `A/Greatest Hits/…` and `B/Greatest Hits/…` and never collide. That is the shape of the only
large multi-content source in the repo: every file in
`etc/albums/1-source-files/OC ReMix Collection - 1 to 4000 [v20201028]/` is tagged
`album: "ocremix.org"` with a distinct artist. Gating only `assertSingleAlbumDirectory` would
leave the flag a no-op there. Both are gated (FR-3); §4.4 covers the cost.

**(3) Album art loses its anchor.** `planAlbumArtCopies` pins art to
`audioPlans[0]?.albumDestinationPath` (`album-art-planner.ts:69`) — safe only because the guard
proves that value is the only one. §5 replaces the arbitrary pick with an explicit exclusion.

The grouping itself is the switch: flag off ⇒ one group holding every selected fix ⇒ identical
disc records, messages and ordering (FR-4d, NFR-8). No `if (allowMultipleAlbums)` wraps
validation logic — only the grouping function's return and the two guard calls.

## 2. File layout

### Modified files

```
src/lib/albums/organize-files-types.ts        (+1 LOC — option on OrganizeFilesOptions; 73 → 74)
src/lib/albums/organization-planner.ts        (+~35 LOC — grouping + conditional guards; 115 → ~150)
src/lib/albums/album-art-planner.ts           (+~14 LOC — multi-album exclusion; 136 → ~150)
src/lib/albums/organize-files.ts              (+3 LOC — sourceDirs conflict; 204 → ~207 ⚠ NFR-5)
src/commands/manage-albums/organize-files.ts  (+1 LOC option, description reworded; 86 → ~87)
src/web/schemas/request-schemas.ts            (+1 LOC — body field; 176 → 177)
src/web/controllers/manage-albums.controller.ts (+1 LOC — optionalEntry; 119 → 120)
src/web/modules/graphql/album.inputs.ts       (+3 LOC — @Field block; 128 → 131)
src/web/modules/graphql/album.resolver.ts     (+1 LOC — optionalEntry; 105 → 106)
src/web/modules/graphql/schema.gql            (+1 LOC — SDL field; 234 → 235)
src/web/schemas/mcp/manage-albums.ts          (+1 LOC — zod field; 56 → 57)
src/web/servers/mcp-tools/manage-albums/organize-files.ts (+2 LOC — optionalEntry, description; 71 → 73)
```

### Files explicitly NOT modified

- `organization-plan.ts` — both guards keep their signatures, keying and messages; only the call
  sites become conditional. `validate.ts` shares them and must not shift.
- `validate.ts` — out of scope (FR-15); the asymmetry is documented, not coded.
- `disc-metadata.ts` / `disc-metadata-error.ts` — the rules are correct; only the *set* they apply
  to changes.
- `organize-files-execution.ts` — distinct albums produce distinct `destinationPath` and
  `albumDestinationPath` values, so the collision, existing-directory and staged-copy machinery
  already handles N albums (§6).
- `metadata-fix-planner.ts` — `resetTrackNumbers` (48-60) already groups by album title; FR-14
  keeps it (§4.5).
- `metadata-fix-options.ts` — the option is not a metadata-fix option and never reaches
  `NormalizedMetadataFixOptions`; its one conflict rule (FR-6) is a source-mode rule.
- `src/command-utils.ts` — `writeRows` is format-generic.

## 3. Surface wiring

Four surfaces, one shape — but **placement differs** (FR-11): REST, GraphQL and MCP option lists
are alphabetical, so the field goes first; the CLI's 22 `.option(...)` calls are grouped by topic,
so the flag goes after `--ignore-audio-files-without-tracks` and before `--execute`.

| Surface | File (current size) | Edit |
| --- | --- | --- |
| CLI | `commands/manage-albums/organize-files.ts` (22 options) | `.option('--allow-multiple-albums', …)` + reworded `.description()` |
| REST | `request-schemas.ts` (19 fields) + `manage-albums.controller.ts` (19 spreads) | `optionalBodyBoolean()` + `optionalEntry` |
| GraphQL | `album.inputs.ts` / `schema.gql` (19 fields) + `album.resolver.ts` (19 spreads) | `@Field(() => Boolean, { nullable: true })`, `allowMultipleAlbums: Boolean`, `optionalEntry` |
| MCP | `schemas/mcp/manage-albums.ts` (20 keys) + `mcp-tools/…/organize-files.ts` | `z.boolean().optional()`, `optionalEntry`, **and the tool `description`** (FR-10) |

The CLI needs no per-option plumbing: `CliOrganizeOptions` is
`Omit<OrganizeFilesOptions, keyof OrganizeFilesSourceOptions> & {…}`, so adding the option to
`OrganizeFilesOptions` types it automatically and `normalizeSourceOptions` forwards it in
`...rest`. Two prose strings must change: the CLI description ("…; fail for multiple albums or
artists") and the MCP tool description, which is the only text an MCP client reads before
choosing arguments.

## 4. Per-album scoping (FR-3, FR-4)

### 4.1 The grouping key is the destination album path

```ts
// artist portion via the existing getArtistFilename(artistStrategy, artist, albumArtist,
// source.labels, producers) — pure, total, already used by the planner below
function albumDestinationKey(fix: PlannedMetadataFix, artistStrategy: ArtistFilenameStrategy): string {
  return join(sanitizePathSegment(artistFilenameFor(fix, artistStrategy)), sanitizePathSegment(fix.effective.album))
}

function groupFixesByAlbum(
  fixes: PlannedMetadataFix[],
  artistStrategy: ArtistFilenameStrategy,
  allowMultipleAlbums: boolean,
): PlannedMetadataFix[][] {
  if (!allowMultipleAlbums) {
    return [fixes]
  }
  const groups = new Map<string, PlannedMetadataFix[]>()

  for (const fix of fixes) {
    const key = albumDestinationKey(fix, artistStrategy)

    groups.set(key, [...(groups.get(key) ?? []), fix])
  }
  return [...groups.values()]
}
```

`artist/album`, **not** album alone. Album-alone keying would be wrong twice over now that FR-3
gates the artist guard: two same-titled albums by different artists would share one disc set, so
their independent track numbers would collide and the run would fail with a *disc* error for an
identity problem. Keying on the destination path is the granularity the output already uses — one
group per `Artist/Album` directory.

`getArtistFilename` and `sanitizePathSegment` are pure and total, so grouping cannot throw. A file
missing its album tag forms its own group and still hits the existing per-fix missing-metadata
error later, preserving the disc-before-missing-metadata ordering of NFR-8.

### 4.2 Applying it

```ts
// before — organization-planner.ts:33-41
const discRecords = selectedFixes.map(({ effective, source }) => ({ … }))

throwForDiscSetIssues(discRecords)
const multiDisc = isMultiDiscSet(discRecords)

// after
const multiDiscByFix = new Map<PlannedMetadataFix, boolean>()

for (const group of groupFixesByAlbum(selectedFixes, artistStrategy, options.allowMultipleAlbums === true)) {
  const discRecords = group.map(({ effective, source }) => ({
    discNumber: effective.discNumber,
    discTotal: effective.discTotal,
    filename: source.filename,
    trackNumber: effective.trackNumber,
  }))

  throwForDiscSetIssues(discRecords)
  const multiDisc = isMultiDiscSet(discRecords)

  for (const fix of group) {
    multiDiscByFix.set(fix, multiDisc)
  }
}
```

Inside the existing `selectedFixes.map(...)`, `multiDisc` becomes
`multiDiscByFix.get(fix) ?? false`. `artistStrategy` is already parsed at the top of the function.

- **Row order** is unchanged: the map is built by group, but the plan is still produced by mapping
  over `selectedFixes` in its original order.
- **Key safety**: keyed by `PlannedMetadataFix` object identity, not `source.sourcePath`. Object
  identity is unique by construction; `sourcePath` uniqueness is an inference about concatenate
  mode this file should not depend on.
- **Flag-off parity**: one group ⇒ today's records, today's single call, one `isMultiDiscSet`
  result applied to every fix (FR-4d).
- **Determinism**: group iteration follows `Map` insertion order — first appearance in
  `selectedFixes` — so when two albums both have disc problems the reported one is stable.

### 4.3 The guards

```ts
if (options.allowMultipleAlbums !== true) {
  assertSingleAlbumDirectory(albumDirectories)
  assertSingleArtistPerAlbumDirectory(albumDirectories)
}
```

Both, together, in today's order (FR-3, FR-3c). Neither function changes.

### 4.4 What gating the artist guard costs

`assertSingleArtistPerAlbumDirectory` catches one real hazard: an album whose tracks disagree on
`artist`, fragmenting across artist directories instead of landing in one. With the flag set that
hazard is no longer detectable — nothing in the tags separates it from two distinct albums sharing
a title, and the OC ReMix source is literally the second case. FR-3b accepts the cost rather than
guessing: no heuristic (not track contiguity, not fuzzy artist matching); the dry run is the
review step, with every destination visible per row; and `manage-albums validate` keeps both
guards (FR-15), so the strict check stays available on demand — it is simply no longer implied by
a successful organize run.

This is the spec's largest deliberate trade-off. It is in the risk table (§10), is open decision 1
(§12), and must be documented (FR-16f) rather than discovered from behaviour.

### 4.5 What already works per album

`resetTrackNumbers` (`metadata-fix-planner.ts:43-62`) keys `sourcesByAlbum` on
`effectiveAlbum(source, options)` and restarts at 1 per album title, so `--reset-track` across
several albums needs no change here. One nuance to document (FR-14): its key is the album
**title**, while §4.1 groups by `artist/album`. For the FR-3b split — one title, two artists —
numbering therefore continues across both destinations (`01` in one folder, `02` in the other).
Previously unreachable because the artist guard rejected that input; now reachable, visible in the
dry run, and left unchanged.

## 5. Album art for multi-album plans (FR-5)

```ts
const albumDestinationPaths = [...new Set(audioPlans.map(plan => plan.albumDestinationPath))]
const albumDestinationPath = albumDestinationPaths[0]

if (albumDestinationPath === undefined) {
  return []
}
if (albumDestinationPaths.length > 1) {
  return artSources.flatMap(source => source.albumArtFiles.map((file): AlbumArtPlanItem => ({
    row: {
      action: execute ? 'excluded' : 'would exclude',
      destination: '',
      fileType: 'albumArt',
      filename: file.name,
    },
    type: 'excluded',
  })))
}
```

No `sourceDirectory` spread in this branch: `includeSourceDirectory` is `artSources.length > 1`,
true only in concatenate mode, which FR-6 rejects. The branch is single-source-dir by
construction, so the key is always absent — matching every other single-`--source-dir` art row.

Exclusion rather than an error or a copy into every album, because it reuses machinery that
already exists — the `{ row, type: 'excluded' }` variant of `AlbumArtPlanItem` and the
`excluded` / `would exclude` actions added for `--album-art-strategy neither`, which
`rowsFromArtPlan` already emits — and because `destination: ''` for "no computable destination"
has precedent at `validate.ts:136`. It stays visible (dry run is the default) and does not strand
the user: an error would have no escape hatch, since `--ignore-non-audio-files` does **not** drop
album art (`audio-files.ts:58` collects art whenever `acceptAlbumArt` is set, independent of that
option).

No signature change — the branch derives from `audioPlans`, which the function already receives,
so the flag never reaches the art planner. With the flag off the guards make
`albumDestinationPaths.length === 1` and the branch is unreachable: parity is structural, not
asserted (NFR-8).

## 6. Execution across several albums (FR-16d)

Nothing in `organize-files-execution.ts` changes, but two existing behaviours become more
consequential and must be documented rather than silently inherited:

- **`assertNoExistingAlbum`** fails if *any* destination album directory already exists under the
  default `destinationStrategy: 'error'`. With N albums, one pre-existing directory blocks the
  whole run.
- **`executeOrganizationCopies`** is a sequential loop with per-file staging (copy to `.tmp`, tag,
  rename). Individual files are atomic; **the run is not**. A failure partway through leaves
  earlier albums written, and the retry then trips `assertNoExistingAlbum`. The documented remedy
  is re-running with `--destination-strategy ignore` after reviewing the dry run.

The risk exists today for one album; a multi-album run widens the blast radius, which is why it is
called out rather than left to be discovered.

## 7. Driving distinct albums with `setMetadata` (FR-13)

Tags often do not carry the albums the user wants — the OC ReMix source is one album title for
thousands of tracks. `--set-metadata` (CLI file) and inline `setMetadata` records (REST, GraphQL,
MCP) already assign `album` per track, which makes them the natural partner for this flag and the
basis of the FR-17 fixture:

```jsonc
{
  "allowMultipleAlbums": true,
  "setMetadata": [
    { "filename": "track-a.mp3", "artist": "Artist A", "album": "Album A", "trackNumber": 1, "title": "Title A" },
    { "filename": "track-b.mp3", "artist": "Artist B", "album": "Album B", "trackNumber": 1, "title": "Title B" }
  ]
}
```

Those two records are what turn the fixture into the FR-4a case: two albums, both track 1.
Constraints still apply unchanged — `reconcileSetMetadata` requires exactly one record per selected
file, `sourceIndex` is concatenate-only and unreachable under FR-6, and
`validateSetMetadataConflicts` still rejects `setMetadata` alongside `--set-album`, `--set-artist`,
`--album-strategy`, `--reset-track`, or `--swap-artist-albumartist`.

## 8. Test updates

See [`design-testing.md`](./design-testing.md) §8.

## 9. Migration strategy

1. **`organize-files-types.ts`** — the option alone; nothing reads it, the tree type-checks.
2. **`organization-planner.ts`** — grouping, `multiDiscByFix`, conditional guards. The only
   behavioural edit. Run the full existing organize suites here, before any surface work, to prove
   the flag-off path is untouched.
3. **`album-art-planner.ts`** — the multi-album branch.
4. **`organize-files.ts`** — the `sourceDirs` rejection. Record the resulting line count.
5. **Surfaces**, CLI → REST → GraphQL → MCP, each one or two lines.
6. **Tests**, then the **Bruno collection**, then **docs**.

## 10. Risk Table

| Risk | Likelihood | Mitigation |
| --- | --- | --- |
| Only the album guard is gated, leaving the flag a no-op for the repo's own OC ReMix source | **High** if §1(2) is skimmed | FR-3 gates both; acceptance criterion 3 uses the one-album/two-artist shape |
| Ships without per-album disc scoping; first real use fails with `Duplicate track numbers were detected:` | **High** if §4 is skimmed | FR-4a names the failure; the FR-17 fixture sets both tracks to 1 so the gap cannot pass review |
| Grouping keyed on album title, so same-titled albums share a disc set | Medium | §4.1 states the key and why; FR-4 names the identity |
| A fragmented single album silently splits across artist folders | **Medium — accepted** | FR-3b; dry-run review; `validate` keeps both guards; documented (FR-16f); open decision 1 |
| Grouping changes error ordering on the default path | Medium | Flag off returns a single group (FR-4d); `multiple-album-guard.test.ts` frozen as witness |
| A two-disc album forces `DTT` prefixes onto a single-disc neighbour | Medium | `isMultiDiscSet` computed per group, stored per fix (FR-4c) |
| Album art silently lands in whichever album sorted first | Medium | §5 replaces the index-0 pick with exclusion; test asserts `destination: ''` |
| Mid-run failure leaves some albums written and blocks the retry | Medium | §6, FR-16d, with `--destination-strategy ignore` as the remedy |
| Tasks depend on fixtures that no longer exist | **Medium — already happened** | `requirements.md` §7; task 1.2 re-verifies before use |
| New branches drop coverage below the 70% branch threshold | Medium | NFR-10; tests cover both settings of the flag |
| `organize-files.ts` grows further past its existing 200-line breach | Medium | NFR-5 caps growth at 5 lines; §12 decision 3 keeps the refactor out |
| Flag set with `--source-dirs` produces cross-album disc numbering | Low | Rejected up front (FR-6) |

## 11. Verification

See [`design-testing.md`](./design-testing.md) §11.

## 12. Open decisions

1. **Gating the artist guard (§4.4).** Recommended: gate both guards together, as specified. The
   alternative — keeping `assertSingleArtistPerAlbumDirectory` enabled — preserves the
   fragmented-album check but rejects distinct albums sharing a title and makes the flag useless
   for this repository's own OC ReMix source. That alternative is coherent if the fragmentation
   check matters more than multi-artist sources, but then FR-3, acceptance criterion 3, the FR-17
   fourth request and parts of Phase 4 all change. **Confirm before implementation starts**
   (`tasks.md` task 1.4).
2. **Album art with several albums: exclude (recommended) vs error vs copy into every album.**
   Recommended: exclude, per §5. *Error* matches the house habit of refusing to guess but strands
   the user; *copy into every album* is defensible for a shared box-set cover but writes files
   nobody asked for.
3. **`organize-files.ts` is already 204 lines.** Recommended: record the pre-existing breach and
   add ~3 lines rather than extracting the source-mode guards into a new module inside a feature
   spec. The alternative brings the file under 200 but mixes a refactor into a feature diff.
4. **Scope: `organize-files` only (recommended) vs `validate` too.** Recommended: `organize-files`
   only, as requested, leaving `validate` stricter (FR-15) and documented. Extending it would mean
   a second flag on a read-only command and is a separate decision.
