# Requirements: Migrate Fix Tags into Organize Files

## 1. Background

Harmonia Aquila currently exposes album tag repair and file organization as
separate `manage-albums fix-tags` and `manage-albums organize-files`
operations. The split exists in the domain library, CLI, REST, GraphQL, and
MCP surfaces. A repair workflow must copy an album into scratch, validate that
copy, then invoke organization against scratch.

The completed 2026-08-01 spec
`organize-across-the-universe-soundtrack` demonstrates the cost of that split:
the caller had to coordinate two dry runs, two executions, scratch-root
preconditions, cross-operation row comparisons, and explicit root switching.
The tag values also determine the eventual artist, album, disc, track, and
title paths, so they are logically part of organization planning.

## 2. Goal

Make `manage-albums organize-files` the single album mutation. It MUST accept
the existing metadata-repair controls, plan destinations from the effective
post-repair metadata, expose both tag and path changes in one dry run, and on
execution fix each staged copy before publishing it at its organized path. The
standalone `fix-tags` operation MUST be removed from every public surface.

## 3. Scope

### In scope

- Album tag planning, effective-metadata projection, destination planning, and
  execution under `src/lib/albums/**`.
- `manage-albums` CLI registration and `organize-files` options/output.
- REST, GraphQL, and MCP album organization contracts and root confinement.
- Unit, command, controller, GraphQL, MCP, and integration tests.
- GraphQL schema, Bruno collections, and album/API documentation.
- Migration of the `--set-metadata` JSON/CSV workflow to `organize-files`.

### Out of scope

- Changing list, summarize, validate, or audiobook behavior.
- Editing audio metadata formats or supporting audio types beyond FLAC/MP3.
- Recursive album discovery, multi-album organization, or multi-artist output
  within one normalized album directory.
- Automatic rollback of files successfully published before a later file
  fails.
- A compatibility alias for CLI `fix-tags`, REST `/manage-albums/fix-tags`,
  GraphQL `albumFixTags`, or MCP `manage_albums_fix_tags`.
- New runtime dependencies or changes to configured web root semantics.

## 4. Functional Requirements

- **FR-1** `OrganizeFilesOptions` MUST accept all existing organization options
  and the former fix-tags options: `albumArtistsStrategy`, `albumStrategy`,
  `destinationStrategy`, `discStrategy`, `producerStrategy`, `resetTrack`,
  `setAlbum`, `setAlbumArtist`, `setArtist`, `setMetadata`, and
  `swapArtistAlbumartist`.
- **FR-2** Existing option defaults and conflict messages MUST remain
  unchanged, except command names in errors MUST identify `organize-files`.
- **FR-3** One invocation MUST enumerate and parse the selected files once,
  compute the tag-fix plan, project each file's effective metadata, and build
  the organization plan from that projection in this exact order.
- **FR-4** Album, artist, disc, track, and title validation plus destination
  generation MUST use effective post-repair values, allowing metadata that is
  invalid at rest to become a valid organization plan when supplied repair
  options make it valid.
- **FR-5** Each organization output row MUST retain the current organization
  fields and MUST add a `tagChanges` object matching the former
  `FixTagsJsonOutputRow` contract for the same source file.
- **FR-6** A dry run MUST perform all parsing, option-conflict, disc-set,
  single-album, single-artist, duplicate-destination, and existing-destination
  checks without copying or modifying any file.
- **FR-7** With `execute: true`, the implementation MUST copy each source to a
  uniquely named temporary sibling, apply and verify its planned metadata
  changes there, and only then atomically publish it at the organized
  destination; temporary files MUST be removed after success or failure.
- **FR-8** `destinationStrategy` MUST default to `error`; `error` MUST preserve
  current organization collision rejection, `ignore` MUST leave existing
  destination files unchanged, and `overwrite` MUST replace only exact planned
  file destinations without deleting unrelated content.
- **FR-9** Result actions MUST distinguish `would copy`/`copied`,
  `would ignore`/`ignored`, and `would overwrite`/`overwritten`; tag changes
  MUST NOT create a second result array or require a second operation.
- **FR-10** `limit` MUST select one identical file set for tag planning and
  organization, and `--set-metadata` reconciliation MUST apply to that set
  using the existing exact-filename validation.
- **FR-11** If planning fails, execution MUST write nothing; if execution
  fails, it MUST stop, clean the current temporary file, preserve the causal
  error, and MUST NOT silently retry, ignore, overwrite, or weaken validation.
- **FR-12** With no metadata-repair options and the default destination
  strategy, destinations, validations, action values, and copied audio bytes
  MUST preserve current `organize-files` behavior apart from the additive
  `tagChanges` field.
- **FR-13** The CLI MUST expose only `list`, `summarize-source-dir`, `validate`,
  and `organize-files` beneath `manage-albums`; the removed `fix-tags` command
  MUST fail as an unknown command.
- **FR-14** REST MUST remove `POST /manage-albums/fix-tags`, GraphQL MUST remove
  `albumFixTags` and its dedicated input/row types, and MCP MUST stop
  advertising or accepting `manage_albums_fix_tags`.
- **FR-15** The surviving REST, GraphQL, and MCP organize inputs MUST expose
  the merged repair options while preserving their existing configured-root
  selection and traversal rejection behavior.
- **FR-16** Documentation and Bruno requests MUST describe and exercise a
  single organize dry-run/execute workflow; no active example MAY instruct a
  caller to stage through the removed operation.

## 5. Non-Functional Requirements

- **NFR-1 — Lint after every source code file modification** After every
  source-code modification, `npm run lint -- <modified-file>` MUST lint only
  that file, and reported issues MUST be fixed before moving on. Whole-codebase
  `npm run lint` MUST be reserved for final verification after all TypeScript
  modifications are complete.
- **NFR-2 (typecheck)** `npm run build` MUST exit 0.
- **NFR-3 (tests)** `npm test` MUST exit 0.
- **NFR-4 — No `npx`** `npx` is forbidden in all forms. Commands MUST use
  `npm run <script>` or `./node_modules/.bin/<tool>`.
- **NFR-5 (file size)** No source or test file produced by this spec MAY exceed
  200 lines; larger responsibilities MUST be split into focused modules.
- **NFR-6 (type safety)** TypeScript MUST remain strict, with no `any` or
  `// @ts-...` escape added by this work.
- **NFR-7 (no dependencies)** No runtime or development dependency MAY be
  added.
- **NFR-8 (source preservation)** Organization MUST never write metadata to a
  selected source file, including when source and destination roots overlap.
- **NFR-9 (path safety)** Temporary and final paths MUST remain inside the
  resolved destination root, and all existing web traversal protections MUST
  remain effective.
- **NFR-10 (scope discipline)** Changes MUST be limited to album organization
  source/tests, generated GraphQL schema, album web collections, relevant
  documentation, and this spec.

## 6. Acceptance Criteria

1. A source album missing album artist can be dry-run with
   `setAlbumArtist`, and its returned destination uses that repaired value.
2. The dry-run row contains the effective organization fields and the matching
   `tagChanges`, while source and destination trees remain unchanged.
3. Execution publishes files whose embedded tags match `tagChanges` and whose
   paths match the accepted dry run; no temporary file remains.
4. Default, ignore, and overwrite collision cases satisfy FR-8 and FR-9.
5. The standalone CLI, REST, GraphQL, and MCP fix-tags operations are absent,
   and their former options work through organize-files.
6. Existing disc inference, per-track metadata, option-conflict, path-safety,
   single-album, and single-artist cases pass through the consolidated flow.
7. Per-edit lint, final lint, build, automated tests, and scoped Bruno dry runs
   all exit successfully.
