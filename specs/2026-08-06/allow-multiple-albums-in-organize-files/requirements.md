# Requirements: `allowMultipleAlbums` for `manage-albums organize-files`

## 1. Background

`manage-albums organize-files` organizes exactly one album per run. Two guards in
`src/lib/albums/organization-plan.ts` enforce it, both called from `planOrganizationCopies`
(`src/lib/albums/organization-planner.ts:112-113`) after every copy has been planned but
before any destination is inspected or written:

| Guard | Fires when | Message |
| --- | --- | --- |
| `assertSingleAlbumDirectory` (line 19) | selected files resolve to >1 sanitized album directory | `Multiple albums found: A, B` |
| `assertSingleArtistPerAlbumDirectory` (line 31) | one album directory maps to >1 artist directory | `Multiple artists resolve to the same album directory: Album (A, B)` |

`docs/album-organization.md:23-29` states the rule as absolute: "there is no bypass, split, or
automatic selection." The error contract is asserted on all four surfaces — CLI
(`__tests__/commands/manage-albums/organize-files-errors.test.ts:66`), REST
(`__tests__/web/manage-albums-organization-errors.test.ts:31`), GraphQL
(`__tests__/web/graphql/album.resolver.test.ts:170`), MCP
(`__tests__/web/mcp.manage-albums-operations.test.ts:214`) — and by the six-request Bruno group
`collections/harmonia-aquila-web/multiple-album-conflicts/`.

The guards catch metadata mistakes, but they also block a legitimate case: a flat source
directory that genuinely holds several albums, which the planner could organize into one
`Artist/Album` tree per album in a single reviewed dry run. This spec adds an opt-in flag for
that case.

**Two facts about the current code shape drive the whole design.**

*First, the album guard is not the first obstacle.* `planOrganizationCopies` runs
`throwForDiscSetIssues` (`organization-planner.ts:40`) over **every** selected file as one disc
set, before either guard. `validateCompleteness` (`src/lib/albums/disc-metadata.ts:63-71`)
treats any repeated track number as an incomplete multi-disc set and emits `missing disc
number`, which `throwForDiscSetIssues` formats as `Duplicate track numbers were detected:`. Two
albums that each start at track 1 — the normal case — fail there, with a disc error, before the
album guard is reached. Scoping disc validation per album is therefore a requirement of this
spec, not an optimization (FR-4).

*Second, the artist guard rejects distinct albums, not just fragmented ones.* It keys on the
album directory alone, so "Greatest Hits" by Artist A and "Greatest Hits" by Artist B collide —
even though they resolve to the different, non-overlapping destinations `A/Greatest Hits/…` and
`B/Greatest Hits/…`. This is not hypothetical here: the only large multi-content source in the
repository, `etc/albums/1-source-files/OC ReMix Collection - 1 to 4000 [v20201028]/`, tags every
file `album: "ocremix.org"` with a different `artist` and a unique global track number (verified
by parsing eight files with `music-metadata`). It fails the **artist** guard, never the album
guard. A flag that gated only `assertSingleAlbumDirectory` would do nothing for it (FR-3).

## 2. Goal

`organize-files` accepts an `allowMultipleAlbums` boolean on every execution surface — CLI
`--allow-multiple-albums`, REST body field, GraphQL input field, MCP tool argument. Setting it
means: **one run may produce more than one `Artist/Album` destination directory.** Disc metadata
and multi-disc filename prefixes are then evaluated per destination album rather than across the
whole selection, and adjacent album art — which has no unambiguous album to belong to — is
reported as excluded rather than guessed at. When the flag is absent, every observable
behaviour, including error messages and the order in which competing errors are raised, is
identical to today.

## 3. Scope

### In scope

- `src/lib/albums/organize-files-types.ts` — the new option on `OrganizeFilesOptions`
- `src/lib/albums/organization-planner.ts` — per-album disc scoping and the conditional guards
- `src/lib/albums/album-art-planner.ts` — album art when more than one album resolves
- `src/lib/albums/organize-files.ts` — the `sourceDirs` conflict rule
- `src/commands/manage-albums/organize-files.ts` — CLI flag and command description
- `src/web/schemas/request-schemas.ts`, `src/web/controllers/manage-albums.controller.ts` — REST
- `src/web/modules/graphql/album.inputs.ts`, `album.resolver.ts`, `schema.gql` — GraphQL
- `src/web/schemas/mcp/manage-albums.ts`,
  `src/web/servers/mcp-tools/manage-albums/organize-files.ts` — MCP, including the tool description
- Tests under `__tests__/` for the lib behaviour and all four surfaces
- `collections/harmonia-aquila-web/multiple-album-allowed/` — four Bruno smoke requests
- `docs/album-organization.md`, `docs/graphql.md`, `docs/mcp-server.md`, `docs/testing.md`

### Out of scope

- **`src/lib/albums/organization-plan.ts`.** Both guards keep their exact signatures, keying,
  and messages. Only their *call sites* in `organization-planner.ts` become conditional —
  `validate.ts` calls the same functions and must not shift.
- **`manage-albums validate`.** It keeps both guards unconditionally
  (`src/lib/albums/validate.ts:192-193`) and gains no flag. See FR-15 — the resulting asymmetry
  is deliberate and MUST be documented, not silently introduced.
- **Concatenation.** `--source-dirs` with `--disc-strategy concatenate` exists to produce one
  flat album from ordered discs; the flag is rejected there rather than reinterpreted (FR-6).
- **Distinguishing a fragmented album from two same-titled albums.** No heuristic — not track
  contiguity, not fuzzy artist matching. See FR-3b: under the flag both outcomes are simply
  reported as separate destinations for the user to review in the dry run.
- Automatic selection of "the main album", or `--limit`-style truncation to one album.
- Changing `assertUniqueOrganizationDestinations`, `prepareOrganizationDestinations`, or
  `executeOrganizationCopies`. Distinct albums produce distinct destination paths, so the
  existing collision, `destinationStrategy`, and staged-copy machinery applies unchanged.
- Making execution transactional across albums. See FR-16d — the existing non-atomic behaviour
  is documented, not changed.
- New `--album-art-strategy` values, or extending that option to single-`--source-dir` mode.
- Repairing the stale Bruno `local` environment (§7).
- `manage-audiobooks` in any form. New dependencies.

## 4. Functional Requirements

- **FR-1** `OrganizeFilesOptions` (`src/lib/albums/organize-files-types.ts`) MUST gain an
  optional `allowMultipleAlbums?: boolean`. Absent and `false` MUST be identical in effect; only
  `true` enables the new behaviour.
- **FR-2** When `allowMultipleAlbums` is `true`, `planOrganizationCopies` MUST NOT call
  `assertSingleAlbumDirectory`, and a run whose selected files resolve to several album
  directories MUST plan one `Artist/Album` destination tree per album.
- **FR-3** When `allowMultipleAlbums` is `true`, `planOrganizationCopies` MUST ALSO NOT call
  `assertSingleArtistPerAlbumDirectory`.
  - **FR-3a** Rationale, which MUST be preserved in the design if the implementation changes:
    both guards encode single-album-per-run, and the artist guard's condition is not a
    destination collision. `artist` is part of the destination path, so two artists sharing an
    album title resolve to two different directories. Keeping it enabled would reject genuinely
    distinct albums that share a title, and would make the flag a no-op for the repository's own
    OC ReMix source (§1).
  - **FR-3b** The accepted cost MUST be documented: with the flag set, one album whose tracks
    disagree on `artist` splits silently across artist directories instead of erroring. The dry
    run is the review step; no heuristic distinguishes that case from two same-titled albums.
  - **FR-3c** With the flag absent, both guards MUST run, in today's order —
    `assertSingleAlbumDirectory` first — with today's messages.
- **FR-4** When `allowMultipleAlbums` is `true`, `throwForDiscSetIssues` and `isMultiDiscSet`
  MUST be evaluated **per destination album directory**, identified by
  `join(sanitize(artistFilename), sanitize(album))` — the same identity as
  `PlannedOrganizationCopy.albumDestinationPath`, not the album title alone.
  - **FR-4a** Two albums that each contain a track 1 MUST organize successfully. Today they fail
    with `Duplicate track numbers were detected:` (§1).
  - **FR-4b** A repeated track number *within* one destination album MUST still fail, with the
    existing message and remediation text.
  - **FR-4c** Multi-disc filename prefixes MUST be decided per destination album: a two-disc
    album in the selection yields `DTT - Title.ext` for its own tracks while a single-disc album
    in the same run keeps `TT - Title.ext`.
  - **FR-4d** With the flag absent, the grouping MUST collapse to exactly one group, making the
    disc records, the error text, and the error ordering identical to today (NFR-8).
- **FR-5** When the plan resolves to more than one album destination, every adjacent album-art
  file MUST be emitted as an **excluded** row — `action` `would exclude` (dry run) or `excluded`
  (`--execute`), `fileType: "albumArt"`, `destination: ""` — and MUST NOT be copied. It MUST NOT
  be routed to an arbitrary album, duplicated into every album, or raised as an error. When
  exactly one album destination resolves, album-art planning MUST be unchanged.
- **FR-6** `allowMultipleAlbums` combined with `sourceDirs` MUST be rejected before any file is
  read, with `UserInputError('--allow-multiple-albums requires sourceDir')`, matching the
  existing `--album-art-strategy requires sourceDirs` phrasing in
  `src/lib/albums/organize-files.ts:178`.
- **FR-7** The CLI MUST accept `--allow-multiple-albums` as a boolean flag on `manage-albums
  organize-files`, and the command's `.description(...)` MUST stop asserting the unconditional
  one-album rule.
- **FR-8** The REST surface MUST accept `allowMultipleAlbums` as an optional body boolean on
  `POST /manage-albums/organize-files`, validated by `organizeFilesBodySchema` and forwarded by
  `ManageAlbumsController.organizeFiles`. A non-boolean value MUST fail with the existing
  `boolean values must be true or false` contract.
- **FR-9** The GraphQL surface MUST expose `allowMultipleAlbums: Boolean` on
  `AlbumOrganizeFilesInput`, in both the decorated class and `schema.gql`, forwarded by
  `AlbumResolver.albumOrganizeFiles`.
- **FR-10** The MCP surface MUST expose `allowMultipleAlbums` as an optional boolean on
  `manageAlbumsOrganizeFilesInputSchema`, forwarded by the `manage_albums_organize_files`
  handler, and the tool's `description` MUST mention the capability — it is the only text an MCP
  client reads before choosing arguments.
- **FR-11** Field placement MUST follow each surface's existing convention, which is **not
  uniform**: REST, GraphQL, and MCP option lists are alphabetical, so `allowMultipleAlbums` goes
  first, before `albumArtStrategy`; the CLI's 22 `.option(...)` calls are ordered by topic, so
  the flag goes with the other plan-shaping booleans — after
  `--ignore-audio-files-without-tracks`, before `--execute`. All four MUST forward it through the
  same `optionalEntry` pattern every sibling option uses.
- **FR-12** `--limit` MUST keep its current meaning: it truncates the alphabetically ordered file
  list *before* albums are resolved (`organize-files.ts:186-191`). With the flag set this MAY
  yield a partially selected album. This MUST be documented (FR-16) rather than rejected —
  the dry run shows exactly which tracks were selected.
- **FR-13** `--set-metadata` / inline `setMetadata` records MUST remain the supported way to
  assign distinct albums to files whose tags do not carry them. Each record's `album` field
  applies per track, `reconcileSetMetadata` still requires exactly one record per selected file,
  and `sourceIndex` remains concatenate-only (unreachable here by FR-6).
- **FR-14** `--reset-track` MUST keep its current per-album-**title** numbering
  (`metadata-fix-planner.ts:48-60`). Where the flag produces two destinations from one album
  title (the FR-3b split), numbering therefore continues across both. This MUST be documented as
  a known difference from the planner's per-destination grouping, not changed.
- **FR-15** `manage-albums validate` MUST keep failing with `Multiple albums found:` and
  `Multiple artists resolve to the same album directory:` for sources that
  `organize-files --allow-multiple-albums` now accepts. Documentation MUST state this asymmetry
  explicitly so the validate-then-organize workflow in `docs/album-organization.md:40` is not
  read as broken.
- **FR-16** Documentation MUST record: (a) the flag on all four surfaces; (b) that disc
  validation and disc prefixes are scoped per destination album; (c) that album art is excluded
  from multi-album plans, and that `--ignore-non-audio-files` does not drop art; (d) that
  `executeOrganizationCopies` is sequential and non-transactional, so a mid-run failure can leave
  some albums written and a retry under the default `destinationStrategy` will then fail on the
  existing directories; (e) the `sourceDirs` rejection; (f) FR-3b, FR-12, FR-14 and FR-15.
  Documentation MUST also correct the ordering claim at `docs/album-organization.md:23-29`, which
  already misstates `organize-files` — album conflicts are checked *before* duplicate-destination
  inspection there, not after (that ordering holds only for `validate`).
- **FR-17** The Bruno collection MUST gain a `multiple-album-allowed` group of four dry-run
  requests built on a fixture that exists: two files copied from
  `etc/albums/1-source-files/OC ReMix Collection - 1 to 4000 [v20201028]/`. Three requests (REST,
  GraphQL, MCP) MUST send inline `setMetadata` assigning two distinct albums with both tracks
  numbered 1, proving FR-4a on every surface; a fourth MUST send no `setMetadata`, proving FR-3
  against the source's real tags (one album, two artists). No request may set `execute`.

## 5. Non-Functional Requirements

- **NFR-1 (lint after every source code file modification)** After every modification of a source
  code file (for example, a `.ts` file) under `src/` or `__tests__/`,
  `npm run lint -- <modified-file>` MUST be run and any reported issues fixed before moving on.
  This applies per source-code edit, not per-task. Whole-codebase `npm run lint` MUST be reserved
  for final verification after all TypeScript modifications are complete.
  <!-- Note: the `lint` script is `eslint ./src ./__tests__`, so this form appends the path and
       lints the whole codebase plus that file. The substance — modified file linted, issues
       fixed — still holds. -->
- **NFR-2 (typecheck)** `npm run build` MUST exit 0. The typecheck script is `build`, **not**
  `build:ts`.
- **NFR-3 (tests)** `npm test` MUST exit 0.
- **NFR-4 (no `npx`)** `npx` is forbidden in **all** forms. Use `./node_modules/.bin/<tool>` or
  `npm run <script>` exclusively.
- **NFR-5 (file size)** No file produced or modified by this spec MAY exceed 200 lines, with one
  recorded exception: ⚠ `src/lib/albums/organize-files.ts` is **already 204 lines** before this
  spec. Its growth MUST be ≤ 5 lines and the pre-existing breach MUST be recorded, not silently
  absorbed and not fixed by an unrelated refactor (`design.md` §12 decision 3).
  `organization-planner.ts` (115) and `album-art-planner.ts` (136) MUST stay under 200.
  ⚠ `__tests__/web/mcp.manage-albums-operations.test.ts` is **already 241 lines**; the MCP case
  MUST go in a new sibling suite rather than growing it further.
- **NFR-6 (type safety)** Strict TypeScript; no `any`, no `// @ts-…` escapes. The option MUST be
  typed `boolean | undefined` and tested with `=== true`, matching every sibling boolean option
  in `OrganizeFilesOptions`.
- **NFR-7 (scope discipline)** `git --no-pager diff --stat src/commands/manage-audiobooks
  src/lib/audiobooks src/web/servers/mcp-tools/manage-audiobooks src/lib/albums/validate.ts
  src/lib/albums/organization-plan.ts src/lib/albums/disc-metadata.ts
  src/lib/albums/organize-files-execution.ts src/lib/albums/metadata-fix-planner.ts` MUST be empty
  after the spec.
- **NFR-8 (behavioral parity, default off)** For every input that does not set
  `allowMultipleAlbums`, output rows, error messages, and the *order* in which competing errors
  are raised MUST be identical to the pre-change behaviour: disc-set issues before
  missing-metadata errors, before the album guard, before the artist guard, before destination
  inspection or any write.
- **NFR-9 (no writes on failure)** With the flag set, a run that fails any surviving guard MUST
  still write nothing and MUST NOT inspect destinations — the invariant asserted by
  `__tests__/lib/albums/multiple-album-guard.test.ts:63-72`.
- **NFR-10 (coverage)** `npm run test:coverage` MUST still meet the thresholds in
  `vitest.config.ts` — 85% statements, 85% lines, 90% functions, 70% branches. This change is
  mostly new branches, so the new tests MUST cover both settings of the flag, not only the
  enabled path.

## 6. Acceptance Criteria

1. A flat source directory holding two albums organizes in one run with
   `--allow-multiple-albums`, producing one `Artist/Album` tree per album, and fails without it
   with the unchanged `Multiple albums found:` message.
2. It organizes successfully even when both albums contain a track 1 (FR-4a); a duplicate track
   number *inside* one destination album still fails with the unchanged duplicate-track error
   (FR-4b).
3. A source with one album title and two artists (the OC ReMix shape) organizes into two
   `Artist/Album` trees with the flag, and still fails with
   `Multiple artists resolve to the same album directory:` without it (FR-3, FR-3c).
4. An album-art file beside a two-album selection appears as
   `{ fileType: "albumArt", action: "would exclude", destination: "" }` and is absent from the
   destination after `--execute` (FR-5).
5. `allowMultipleAlbums` with `albumDirs`/`--source-dirs` fails with
   `--allow-multiple-albums requires sourceDir` (FR-6).
6. The same source produces the same plan through CLI `--format json`, REST, GraphQL, and MCP
   (FR-7 – FR-11).
7. `manage-albums validate` still fails on that directory (FR-15).
8. Every existing multiple-album conflict test and Bruno request passes unchanged (NFR-8),
   including all six under `collections/harmonia-aquila-web/multiple-album-conflicts/`.
9. The new `multiple-album-allowed` Bruno group passes against a server started on the §7
   fixture (FR-17).
10. `npm run lint`, `npm run build`, `npm test`, and `npm run test:coverage` all exit 0, the last
    meeting every threshold (NFR-10).
11. `git --no-pager diff --stat` lists only the files in `design.md` §2; the NFR-7 paths are
    absent.
12. `wc -l` on every modified file is ≤ 200 except `src/lib/albums/organize-files.ts`, whose line
    count is recorded and is ≤ 209 (NFR-5).

## 7. Fixture note (read before writing FR-17 or the docs)

The two files named in the existing `docs/testing.md:79-80` recipe —
`etc/albums/1-source-files/Across The Universe Soundtrack/1-01 Girl.mp3` and
`.../Requiem For A Dream - OST/01.Summer - Summer Overture.mp3` — **no longer exist**.
`etc/albums/1-source-files/` now contains only `OC ReMix Collection - 1 to 4000 [v20201028]/` and
`test/`. `etc/albums/2-fixed-tag-files/` and `.../Disasterpeace/Hyper Light Drifter/` are also
gone, so several `collections/harmonia-aquila-web/environments/local.yml` variables are stale.

That staleness is pre-existing and out of scope to repair (§3), but this spec MUST NOT add to it.
The FR-17 fixture and the `docs/testing.md` recipe MUST use files verified present:

```sh
SRC="etc/albums/1-source-files/OC ReMix Collection - 1 to 4000 [v20201028]"
cp "$SRC/7th_Guest_AmIEviL_OC_ReMix.mp3"   "$ROOT/source/track-a.mp3"   # artist AmIEviL,     track 127
cp "$SRC/7th_Guest_Fat_Dance_OC_ReMix.mp3" "$ROOT/source/track-b.mp3"   # artist The Fat Man, track 741
```

Both carry `album: "ocremix.org"` and no disc tags (verified with `music-metadata`), which is why
they serve two purposes: bare, they are the one-album/two-artist case (FR-3); with inline
`setMetadata` overriding `album` and setting both `trackNumber` to 1, they are the
two-album/repeated-track case (FR-4a). Any task that depends on a fixture MUST re-verify it
exists before relying on it.
