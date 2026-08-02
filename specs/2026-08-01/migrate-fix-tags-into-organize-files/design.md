# Design: Migrate Fix Tags into Organize Files

> Scope reminder: this spec touches album organization under `src/**`, its
> tests, generated GraphQL schema, relevant album collections/docs, and this
> spec. No audiobook behavior, new dependencies, source-file mutation, or
> `npx`.

## 1. Overview

Replace the caller-managed scratch pipeline with a composed plan-and-publish
pipeline. `organizeAlbumFiles` remains the domain entry point, but it first
uses the migrated tag planner to calculate an effective metadata record for
each source. The organization planner consumes those records rather than
re-reading unchanged source tags (FR-1–FR-4, FR-10).

Dry run returns one row per source with current organization fields plus a
typed `tagChanges` object. Execution uses a temporary sibling in the final
directory: copy source, write and verify tags, then rename to the final name.
Thus metadata is fixed before the file becomes visible at its organized path,
and no separate scratch operation is needed (FR-5–FR-9, NFR-8, NFR-9).

This is an intentional breaking surface migration. Standalone fix-tags
registrations, schemas, endpoints, tests, and collection entries are removed;
their behavioral test cases move to organize-files (FR-13–FR-16).

## 2. File layout

### Modified or added files

```text
src/lib/albums/organize-files.ts                 thin orchestration
src/lib/albums/organize-files-types.ts           merged public/internal types
src/lib/albums/organization-planner.ts           effective metadata to paths
src/lib/albums/organize-files-execution.ts       staged repair and publish
src/lib/albums/metadata-fix-*.ts                 migrated option/plan helpers
src/commands/manage-albums/{index,organize-files}.ts
src/web/controllers/manage-albums.controller.ts
src/web/schemas/{request-schemas,mcp/manage-albums}.ts
src/web/servers/mcp-tools/manage-albums/{index,organize-files}.ts
src/web/modules/graphql/{album.inputs,album.rows,album.resolver,schema.gql}
src/web/logging/web-logging.middleware.ts
__tests__/commands/manage-albums/organize-files*.test.ts
__tests__/lib/albums/organize-files*.test.ts
__tests__/web/**/*.test.ts                       scoped album contract tests
collections/harmonia-aquila-web/**/organize-files*.yml
docs/{album-organization,graphql,mcp-server,testing}.md
docs/organize-files-set-metadata.md
```

### Deleted or renamed files

- `src/commands/manage-albums/fix-tags.ts`.
- `src/lib/albums/fix-tags.ts` and obsolete fix-only execution code; reusable
  planner modules move to `metadata-fix-*` names.
- `src/web/servers/mcp-tools/manage-albums/fix-tags.ts`.
- Dedicated fix-tags tests and REST/GraphQL/MCP Bruno requests; their coverage
  moves to organize-files equivalents.
- `docs/fix-tags-set-metadata.md`, renamed and rewritten for organize-files.

### Files explicitly not modified

- `src/lib/albums/{list,summarize-source-dir,validate}.ts`.
- `src/commands/manage-audiobooks/**` and all audiobook web contracts.
- Package manifests and lockfiles because NFR-7 forbids dependencies.
- Historical specs; they remain immutable evidence of earlier workflows.

## 3. Combined contract

The merged option type composes filename, metadata, collision, selection, and
execution controls. Parsing stays centralized so every transport forwards
undefined values rather than reimplementing defaults (FR-1, FR-2, FR-15).

```ts
interface OrganizeFilesJsonOutputRow {
  action: 'would copy' | 'copied'
    | 'would ignore' | 'ignored'
    | 'would overwrite' | 'overwritten'
  album: string
  artistFilename: string
  destination: string
  discNumber: string
  discTotal: string
  filename: string
  tagChanges: MetadataFixJsonOutputRow
  titleFilename: string
  trackNumber: string
  // existing strategy fields remain
}
```

Organization fields contain effective values. `tagChanges` retains the former
fix-tags row shape: unprefixed fields describe source metadata and `new*`
fields describe requested values. It is present even when no changes are
requested, giving JSON, plaintext, REST, GraphQL, and MCP one stable row shape
(FR-5, FR-12).

| Former fix-tags input | New location |
| --- | --- |
| CLI option | Same flag on `manage-albums organize-files` |
| REST body field | `POST /manage-albums/organize-files` |
| GraphQL field | `AlbumOrganizeFilesInput` |
| MCP field | `manage_albums_organize_files` input schema |
| Fix-tags row | `AlbumOrganizeFilesRow.tagChanges` |

## 4. Planning pipeline

1. Parse `limit`, filename strategies, metadata strategies, and conflicts.
2. Enumerate the selected flat directory once and reconcile `setMetadata`
   against exactly those filenames.
3. Parse source metadata into a shared `ParsedAlbumSource` model.
4. Produce `PlannedMetadataFix` entries and effective metadata without writes.
5. Validate disc integrity from effective disc/track values.
6. Produce organization paths from effective album, artist, title, disc, and
   track values.
7. Apply single-album, single-artist, duplicate-path, and destination checks.
8. Return dry-run rows or pass the complete plan to execution.

The effective record overlays only defined tag fixes. Arrays such as artists,
album artists, and producers retain their current fallback behavior. Filename
strategies run after the overlay, so `setAlbumArtist: "Various Artists"` can
satisfy `artistFilenameStrategy: "albumartist"` in the same request (FR-3,
FR-4).

## 5. Execution and collisions

For each non-ignored plan, create a unique temporary filename inside the final
file's directory, copy the source to it, apply `AudioTagFix`, re-read and
verify every written field needed by the organization plan, then rename it to
the final destination. A `finally` block removes the temporary path when it
still exists (FR-7, FR-11).

| Strategy | Existing album/file behavior | Action |
| --- | --- | --- |
| `error` | Preserve current album-directory and exact-file rejection | `would copy` / `copied` |
| `ignore` | Skip an exact existing file; never alter it | `would ignore` / `ignored` |
| `overwrite` | Stage fully, then replace only the exact final file | `would overwrite` / `overwritten` |

All collision decisions are finalized before the first write. An execution
failure may leave earlier published files, matching current sequential
behavior; automatic album-wide rollback is out of scope.

## 6. Public-surface migration

| Surface | Remove | Retain/change |
| --- | --- | --- |
| CLI | `fix-tags` registration/module | Add repair flags to `organize-files`; update dry-run text |
| REST | `POST /manage-albums/fix-tags` and schema | Merge fields into organize body; retain root overrides rejection |
| GraphQL | `albumFixTags`, input, row | Add fields and nested `tagChanges` to `albumOrganizeFiles` |
| MCP | tool name/schema/registration | Merge schema into `manage_albums_organize_files`; keep path confinement |
| Logging | fix-tags safe-path entry | Keep organize-files logging |

The MCP tool order becomes list, summarize, validate, organize. The MCP input
continues to require slash-terminated `albumDir`; `useScratchDir` continues to
select its input root. REST and GraphQL preserve their existing configured-root
routing rather than broadening this migration into a root-contract redesign
(FR-13–FR-15).

## 7. Test updates

### 7.1 Coverage migration

| Existing case | Disposition |
| --- | --- |
| fix option defaults/conflicts | Move to metadata planner and organize command tests |
| set album/artist/metadata | Assert effective path plus `tagChanges` |
| disc inference/write verification | Move to organize disc tests |
| fix destination error/ignore/overwrite | Assert final organized collision behavior |
| standalone transport mappings | Remove; assert merged organize mappings |
| fix MCP discovery/path errors | Assert tool absence and organize merged schema/path errors |
| ordinary organize behavior | Preserve with additive `tagChanges` assertions |

### 7.2 Required new cases

- Dry run repairs missing metadata and creates a valid projected destination
  without changing source or destination.
- Execute produces repaired embedded metadata at exactly the dry-run path.
- A forced tag-write or publish failure removes the current temporary file.
- No-op metadata options preserve legacy paths and audio bytes.
- Removed CLI, REST, GraphQL, and MCP operations are undiscoverable.

## 8. Migration strategy

1. Lock baseline behavior and public symbol inventory.
2. Extract shared metadata source, option, plan, and projection types.
3. Make organization planning consume projected metadata and emit combined
   rows while execution remains disabled.
4. Implement temporary sibling repair/publish and collision strategies.
5. Move CLI and web inputs to the combined operation.
6. Remove standalone registrations and obsolete orchestrators.
7. Migrate tests, generated schema, collections, and documentation.
8. Run final verification only after all TypeScript edits are complete.

## 9. Risk Table

| Risk | Likelihood | Mitigation |
| --- | --- | --- |
| Projected tags differ from written tags | Medium | Share one plan object and verify staged metadata before publish. |
| Failure leaves temp artifacts | Medium | Unique sibling names plus unconditional best-effort cleanup tests. |
| Source equals destination root | Medium | Never edit source path; stage to a distinct final-directory temp path. |
| New collision modes overwrite unrelated data | Medium | Exact paths only; pre-plan all rows; never delete album directories. |
| Public fix-tags references remain | High | Repository-wide symbol/string audit in verification. |
| Large orchestration file violates style | High | Split types, planning, metadata projection, and execution modules. |
| Transport schemas drift | Medium | Mapping tests for every merged field and GraphQL schema assertions. |

## 10. Verification

After every source-code file edit:

1. `npm run lint -- <modified-file>` — exit 0 (NFR-1).

Once, after all TypeScript modifications:

1. `npm run lint` — exit 0.
2. `npm run build` — exit 0.
3. `npm test` — exit 0.
4. Start `npm run web:serve -- --source-dir etc --dest-dir etc --scratch-dir etc --host 127.0.0.1 --port 3000`.
5. From `collections/harmonia-aquila-web`, run
   `../../node_modules/.bin/bru run manage-albums graphql mcp --env local --bail`.
6. Stop the captured server process and confirm `git status --short -- etc` is
   empty.
7. `rg -n "fix-tags|albumFixTags|manage_albums_fix_tags|AlbumFixTags" src __tests__ docs collections`
   MUST return no active contract reference; explicitly reviewed historical
   prose, if any, MUST be documented in `tasks.md`.
8. `git --no-pager diff --stat -- src __tests__ docs collections` MUST match
   the scoped file groups in §2.
