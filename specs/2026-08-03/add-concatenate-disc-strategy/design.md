# Design: Add Concatenate Disc Strategy

> Scope reminder: this spec touches album organization core, its CLI/web/MCP
> adapters, focused tests, and organize-files docs. It does not reorganize
> media, change dependencies, or use `npx`.

## 1. Overview

Use an explicit ordered-multi-source pattern. Singular calls continue through
the current path, while adapters normalize the new directory collection to a
core `sourceDirs` variant. `concatenate` is deliberately opt-in and validates
all sources as one transaction before execution (FR-1–FR-14).

The combined planner retains each file's source identity, sorts each source by
embedded track number, assigns a global sequence, and emits a dedicated clear
intent for disc tags. It does not recurse or interpret folder names. Existing
album and artist guards run after metadata repair so `setAlbum` can convert
disc-specific titles into one reviewed album identity (FR-4–FR-9).

Album art is grouped by resolved destination after sanitization. Collision
selection is a separate planning step before ordinary destination existence
handling. Excluded candidates are report-only rows, making all three choices
visible in both dry-run and execute output without presenting them to the copy
executor (FR-15–FR-22).

## 2. File layout

### Expected modified or new areas

| Area | Responsibility |
| --- | --- |
| `src/lib/albums/organize-files*.ts` | Source union, orchestration, result actions, atomic execution |
| `src/lib/albums/concatenate-album-sources.ts` (new) | Ordered source validation and global track mapping |
| `src/lib/albums/metadata-fix-*.ts` | `concatenate` parsing/conflicts and clear-tag fixes |
| `src/lib/albums/audio-tags.ts` | Explicit disc-number/disc-total clearing |
| `src/lib/albums/organization-*.ts` | Flat concatenated destinations and source identity |
| `src/lib/albums/album-art-planner.ts` | Collision grouping, selection, exclusion reports |
| `src/commands/manage-albums/organize-files.ts` | CLI source and album-art options |
| `src/web/schemas/**`, `src/web/controllers/**` | REST/MCP request validation and mapping |
| `src/web/modules/graphql/**` | GraphQL input/output/schema mapping |
| `src/web/servers/mcp-tools/manage-albums/**` | Ordered MCP path resolution |
| `__tests__/**/organize-files*.test.ts` and album web/MCP tests | Contract, planning, execution, regression coverage |
| `docs/album-organization.md`, `docs/graphql.md`, `docs/mcp-server.md` | User-facing examples and constraints |

### Files explicitly not modified

- `package.json` and lockfiles: no dependency is needed (NFR-7).
- `etc/albums/**`: this specification does not organize media.
- Unrelated audiobook and web features.
- The completed Lenny Kravitz operational spec, which remains historical
  evidence of the limitation this feature addresses.

## 3. Public contracts

### 3.1 Core source union

```ts
type OrganizeFilesSourceOptions =
  | { sourceDir: string; sourceDirs?: never }
  | { sourceDir?: never; sourceDirs: readonly string[] }

type AlbumArtStrategy = 'first' | 'last' | 'neither'
type DiscStrategy = 'concatenate' | 'infer' | 'no change'
```

Runtime validation remains mandatory because web inputs arrive untyped. A
multi-source call requires `concatenate`; concatenate requires two or more
unique resolved directories. Singular input with `concatenate` fails rather
than silently acting like `no change` (FR-1–FR-3).

### 3.2 Adapter mapping

| Surface | Singular compatibility | New ordered input | Art option |
| --- | --- | --- | --- |
| CLI | `--source-dir <dir>` | `--source-dirs <dirs...>` | `--album-art-strategy <strategy>` |
| Core | `sourceDir` | `sourceDirs` | `albumArtStrategy` |
| MCP | `albumDir` | `albumDirs: string[]` | `albumArtStrategy` |
| REST | configured root | `albumDirs: string[]` | `albumArtStrategy` |
| GraphQL | configured root | `albumDirs: [String!]` | `albumArtStrategy` |

CLI source options are mutually exclusive. MCP paths keep the required trailing
slash and use the same source/scratch resolver selected by `useScratchDir`.
REST and GraphQL resolve each relative entry beneath the configured source root;
their existing `useScratchDir` destination semantics do not change (FR-10–FR-12).

## 4. Concatenation pipeline

1. Parse strategy and reject incompatible options before filesystem work.
2. Resolve, canonicalize, and deduplicate every source directory.
3. Read each directory directly with album-art enabled; reject nested or
   otherwise invalid entries according to existing ignore rules.
4. Parse all audio metadata while retaining `{ sourceIndex, sourceDirectory,
   filename }` as identity.
5. Within each source, require positive unique track numbers and sort by track.
6. Apply allowed metadata fixes, assign global track numbers `1..N`, and emit
   explicit clear fixes for disc number and disc total.
7. Run existing single-album and artist-directory guards over all effective
   tracks, then plan flat audio destinations.
8. Group and select album art, append exclusion reports, validate actionable
   destination uniqueness/existence, and prepare every destination.
9. Only after the full preflight succeeds, execute actionable audio/art copies.

`limit`, `resetTrack`, `ignoreAudioFilesWithoutTracks`, and `setMetadata` fail
up front because each makes the first-version ordering or completeness contract
ambiguous. Other existing album/artist repair options remain available. No
source file is edited; metadata changes apply to destination copies (FR-6–FR-9,
FR-14, NFR-9).

## 5. Disc tag and destination model

Represent clearing as intent rather than overloading `undefined`, which already
means "leave unchanged":

```ts
type NumericTagFix =
  | { kind: 'clear' }
  | { kind: 'set'; value: number }

interface AudioTagFix {
  discNumber?: NumericTagFix
  discTotal?: NumericTagFix
  // existing fields remain
}
```

The metadata reader/writer and post-copy verification must agree that `clear`
produces absent/zero-equivalent disc metadata and an empty disc value in result
rows. Existing `infer` produces `set` fixes. Concatenate passes a non-multi-disc
destination context, so `getAlbumDestination` emits
`Artist/Album/NN - Title.ext` directly (FR-6–FR-7).

## 6. Album-art collision model

For every direct recognized art file, compute the final album path plus its
sanitized basename. Group equal destination paths after all album identity
validation. Directory array position is the only precedence signal.

| Strategy | Actionable member | Other members |
| --- | --- | --- |
| `first` | lowest `sourceIndex` | excluded |
| `last` | highest `sourceIndex` | excluded |
| `neither` | none | excluded |

If a collision group exists without a strategy, return one `UserInputError`
listing sorted destinations and all contributing source-directory identifiers.
No destination preparation has occurred at this point. If no group collides,
all art remains actionable and an optional supplied strategy has no effect.

Excluded candidates produce `would exclude` or `excluded` output rows with
`sourceDirectory`, filename, and intended destination, but are not
`PlannedOrganizationCopy` objects. Selected candidates then pass through the
existing `error|ignore|overwrite` destination policy. Thus an input collision
cannot be mistaken for a pre-existing destination collision (FR-16–FR-21).

## 7. Output and ordering

Add optional `sourceDirectory` to REST/JSON rows and a nullable field to the
GraphQL row. Populate it only for concatenate requests to preserve exact
singular JSON output. Order audio by source index then local track; order art by
sanitized basename then source index. Exclusion rows sit beside their collision
group in that deterministic art order (FR-13, FR-19, NFR-8).

Extend `OrganizationAction` with `excluded` and `would exclude`. Dry-run parity
normalizes every `would X` action to `X`; excluded rows never trigger writes in
either mode (FR-19, FR-22).

## 8. Test updates

| Coverage | Required cases |
| --- | --- |
| Option parsing | new enums; singular/multi mutual exclusion; minimum/duplicate dirs; incompatible options |
| Concatenation planning | repeated local numbers; array order; unified album; flat destinations; cleared discs |
| Source identity | duplicate basenames across directories remain distinct |
| Album art | no collision; missing strategy error; first/last/neither; non-colliding art retained |
| Atomicity | later source, art, metadata, and destination failures write nothing |
| Execution | copies/tags match plan; exclusions do not copy; sources unchanged |
| CLI | old `--source-dir`; new `--source-dirs`; option help and errors |
| REST/GraphQL/MCP | schema mapping, containment, ordered resolution, errors, output field/actions |
| Regression | `infer`, `no change`, singular art, and destination strategies unchanged |

Use temporary fixtures; do not use the real Lenny Kravitz collection in tests.

## 9. Migration strategy

1. Add core types, option parsing, and focused validation tests.
2. Add source-qualified concatenation planning and clear-tag execution tests.
3. Add album-art selection/reporting and atomicity tests.
4. Wire CLI, REST, GraphQL, and MCP adapters with contract tests.
5. Update documentation and perform final verification.

## 10. Risk Table

| Risk | Likelihood | Mitigation |
| --- | --- | --- |
| Partial writes from a later-source failure | High | Build and prepare the combined plan before execution. |
| Wrong disc order | Medium | Treat caller array order as authoritative and document it. |
| Duplicate basenames overwrite plan identity | High | Key sources by directory index plus filename. |
| Disc tags survive flattening | Medium | Model clear explicitly and verify copied tags. |
| Art strategy hides destination conflicts | Medium | Select source art first, then run unchanged destination policy. |
| Existing clients break | Medium | Keep singular fields and omit new output fields in singular mode. |
| Path escape through an array entry | High | Resolve every entry independently with existing containment checks. |

## 11. Verification

After every source code file edit:

1. `npm run lint -- <modified-file>` — lint only that file and fix issues.

Once, after all TypeScript modifications:

1. `npm run lint`
2. `npm run build`
3. `npm test`
4. `git --no-pager diff -- package.json package-lock.json`

All commands must exit successfully, and the manifest diff must be empty.
