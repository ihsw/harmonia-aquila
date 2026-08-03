# Design: Preserve TPOS When Concatenating Albums

> Scope reminder: this spec touches concatenate metadata planning, flat-layout
> planning, focused adapters/tests, and related docs. It does not add request
> fields, edit media under `etc/albums/**`, change dependencies, or use `npx`.

## 1. Overview

Replace the current global-track/clear-disc transform with an
ordered-directory-as-disc-boundary transform. Each source directory retains its
local track ordering and is assigned canonical disc metadata from its array
position (FR-1–FR-5). Correct TPOS is preserved; missing, partial, or conflicting
values are repaired only on destination copies.

Disc metadata and physical layout become deliberately independent. Effective
metadata is multi-disc, but concatenate mode passes an explicit flat-layout
policy to the organization planner so files remain directly under one album
directory (FR-7). Ordinary singular multi-disc organization continues using
`Disc DD` directories (FR-13).

## 2. File layout

### Expected modified files

| File or area | Change |
| --- | --- |
| `src/lib/albums/concatenate-album-sources.ts` | Replace global-track mapping with canonical disc context per source path |
| `src/lib/albums/organize-files.ts` | Apply canonical disc fixes while retaining local tracks |
| `src/lib/albums/organization-planner.ts` | Accept concatenate-only flat multi-disc layout policy |
| `src/lib/albums/organize-files-types.ts` | Add an internal typed layout option if needed |
| `src/commands/manage-albums/organize-files.ts` | Correct concatenate help text |
| `__tests__/lib/albums/organize-files-concatenate*.test.ts` | Update planning/execution semantics and atomic collisions |
| Focused CLI and web adapter tests under `__tests__/` | Assert unchanged inputs and new output metadata |
| `docs/album-organization.md`, `docs/graphql.md`, `docs/mcp-server.md` | Replace clear/global semantics with local-track/TPOS semantics |

### Files explicitly not modified

- `src/lib/albums/audio-tags.ts`: existing numeric `set` support already writes
  disc number and total for both supported formats unless tests expose a defect.
- Web request schemas and GraphQL schema: no public input or output field is
  added (FR-11).
- `package.json` and lockfiles: no dependency is required (NFR-7).
- `etc/albums/**`: implementation and verification must not reorganize media.
- The completed `add-concatenate-disc-strategy` spec: it remains historical;
  this spec records the superseding delta.

## 3. Canonical concatenate model

Replace `globalTracksBySourcePath` with a mapping that carries the disc boundary:

```ts
interface ConcatenateDiscContext {
  discNumber: number
  discTotal: number
}

interface ConcatenateAlbumSources {
  discsBySourcePath: Map<string, ConcatenateDiscContext>
  sourceEntries: ConcatenateSourceEntry[]
  sources: ParsedAlbumSource[]
}
```

For `sourceDirs = [discA, discB, discC]`, every parsed source from those
directories receives `1/3`, `2/3`, or `3/3`, respectively. Tracks remain sorted
within each directory by their positive unique local track number, and sources
remain ordered by directory position (FR-1–FR-2, NFR-8).

Directory-derived context is canonical. Embedded disc tags are evidence to
compare, not an ordering input. This prevents absent or incorrect TPOS from
changing caller-reviewed disc order (FR-4, FR-9).

## 4. Metadata-fix semantics

Rename `applyConcatenateMetadataFixes` to reflect disc assignment. For each
planned fix:

1. Leave `effective.trackNumber` and `tagFix.trackNumber` unchanged.
2. Set effective disc number/total to the canonical context.
3. Add `{ kind: "set", value }` only for each source disc component that does
   not already equal its canonical value.
4. Add `newDiscNumber` and/or `newDiscTotal` to `tagChanges` only for changed
   components; preserve original values alongside them.
5. Do not emit `newTrackNumber` solely because concatenate mode is active.

The organization row always exposes formatted canonical `discNumber` and
`discTotal`, regardless of whether a tag write was necessary (FR-3–FR-6).
Execution continues through the existing temporary-copy tag writer and
post-write verification, which maps MP3 disc values to TPOS and FLAC values to
their Vorbis fields.

## 5. Flat multi-disc destination policy

Current destination planning derives `Disc DD` layout from effective disc
metadata. Add an internal, typed layout policy rather than falsifying metadata:

```ts
type DiscLayout = 'disc-directories' | 'flat'
```

Singular organization defaults to `disc-directories`. Concatenate orchestration
passes `flat`, causing `getAlbumDestination` to omit the disc directory while
retaining canonical disc metadata in rows and tag fixes. Keep this policy
internal; it is not a new CLI or API option (FR-7, FR-11, FR-13).

The existing combined destination preflight remains authoritative. If two
tracks resolve to the same flat path, fail before execution; do not append disc
numbers or use destination overwrite semantics to hide the ambiguity (FR-8).

## 6. Public behavior delta

| Observable | Before | After |
| --- | --- | --- |
| Track numbering | Global `1..N` | Local number preserved per source directory |
| Disc metadata | Cleared | Canonical `directory position / directory count` |
| MP3 TPOS | Removed/absent | Preserved when correct; written/repaired as `N/M` |
| FLAC disc fields | Removed/absent | Preserved when correct; written/repaired |
| Destination layout | Flat | Flat (unchanged) |
| Request schemas | Existing `albumDirs` + `concatenate` | Unchanged |
| Album-art behavior | Explicit first/last/neither on collision | Unchanged |

Because this is an intentional semantic correction, clients that depended on
global track numbering must opt into another workflow before upgrading. Docs
and CLI help must call out the behavior change (FR-11–FR-12).

## 7. Test updates

| Coverage | Required cases |
| --- | --- |
| Source planning | ordered directories map to `1/M..M/M`; local tracks remain sorted and unchanged |
| Metadata planning | absent, correct, partial, wrong-number, and wrong-total TPOS |
| Dry-run rows | canonical disc fields; no unnecessary disc changes; no concatenate track change |
| Flat layout | no `Disc DD`; repeated local numbers with distinct titles succeed |
| Collision safety | identical local track/title/extension destinations fail before writes |
| Execution | MP3 and FLAC destination tags reparse to canonical discs/local tracks; sources unchanged |
| Public adapters | unchanged request mapping; CLI/GraphQL/MCP outputs expose new values |
| Regression | singular `infer` and `no change`, artwork strategy, atomicity, and result ordering |

Prefer temporary synthetic fixtures. Do not use the organized Lenny Kravitz
destination as a test fixture.

## 8. Migration strategy

1. Lock the revised semantics in failing core and execution tests.
2. Replace global-track mapping with directory-derived disc context.
3. Apply conditional disc set fixes and add the internal flat-layout policy.
4. Update focused adapter expectations and regression coverage.
5. Update user-facing documentation and run final verification.

## 9. Risk Table

| Risk | Likelihood | Mitigation |
| --- | --- | --- |
| Correct TPOS is rewritten unnecessarily | Medium | Compare each component before emitting a tag fix |
| Multi-disc metadata reintroduces `Disc DD` paths | High | Test the explicit internal flat-layout policy at planner and integration levels |
| Repeated local numbers collide in a flat directory | Medium | Retain atomic exact-destination rejection and add focused coverage |
| Adapter clients rely on global numbering | Medium | Document the breaking semantic correction and keep schemas unchanged |
| Source tags influence reviewed disc order | Medium | Derive canonical disc values only from ordered directory position |
| Partial write on a late collision | High | Preserve combined-plan preflight before temporary-copy execution |

## 10. Verification

After every source code file edit:

1. `npm run lint -- <modified-file>` — lint only the file just modified and fix
   every issue (NFR-1).

Once after all TypeScript modifications:

1. `npm run lint`
2. `npm run build`
3. `npm test`
4. `git --no-pager diff -- package.json package-lock.json`
5. `git --no-pager diff -- etc/albums`

All commands must exit successfully; both protected-path diffs must be empty.
