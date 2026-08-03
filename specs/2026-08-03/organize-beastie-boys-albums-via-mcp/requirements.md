# Requirements: Organize Beastie Boys Albums via MCP

## 1. Background

The configured Harmonia Aquila MCP source contains the slash-terminated entry
`Beastie Boys Discography 1986-2011 [FLAC] vtwin88cube/`. MCP discovery found
16 top-level album directories. Fifteen are flat album inputs; the 1999
anthology contains `CD1/` and `CD2/`, producing 17 flat workflows in total.

Read-only evidence collected on 2026-08-03 covers all 245 FLAC tracks. The 16
standard workflows (the 15 flat albums plus anthology CD1) produced 223 audio
and 15 adjacent-cover `would copy` rows. Anthology CD2 initially failed because
disc number 2 is non-contiguous when selected alone; a complete 22-record
inline `setMetadata` dry run that preserved album, artist, title, filename, and
track while changing disc `2` to `1/1` then produced 22 `would copy` rows. All
other validation rows were valid with `albumartist` and `title` filename
strategies.

Every album directory also contains audit sidecars such as `.log`, `.m3u`, and
`.txt`. Successful plans therefore deliberately use
`ignoreNonAudioFiles: true`. The anthology cover is in the parent directory,
not adjacent to either flat disc input, so the current MCP contract cannot copy
it as part of either disc operation.

## 2. Goal

Use only Harmonia Aquila MCP album tools to rediscover, audit, dry-run, review,
and—only after separate execution authorization—organize all 245 Beastie Boys
FLAC tracks and the 15 adjacent covers into collision-free destination paths.
The source MUST remain unchanged, every executing request MUST match its
accepted dry run except for `execute: true`, and the non-adjacent anthology
cover MUST remain preserved and explicitly reported.

## 3. Scope

### In scope

- `manage_albums_list`, `manage_albums_summarize_source_dir`,
  `manage_albums_validate`, and `manage_albums_organize_files`.
- The 16 discovered top-level album entries and 17 flat MCP workflows.
- Complete inline `setMetadata` records for anthology CD2.
- Updating this spec's Markdown checkboxes and execution notes.
- MCP-managed destination copies created by a later authorized execution.

### Out of scope

- CLI, REST, GraphQL, Bruno, direct library calls, or filesystem inspection of
  MCP-configured album roots.
- Source deletion, renaming, moving, tag writes, transcoding, or sidecar edits.
- Copying the anthology parent-level `cover.jpg` or root `Jolly Roger.png` by a
  non-MCP workaround.
- Normalizing `The Beastie Boys` to `Beastie Boys` for the 2005 release without
  separate metadata approval.
- `limit`, overwrite, ignore-destination, destructive cleanup, or collision
  bypasses.
- TypeScript, tests, package metadata, dependencies, or MCP configuration.

## 4. Functional Requirements

- **FR-1** Discovery MUST begin with `manage_albums_list`, retain every trailing
  slash returned by MCP, and select exactly the discography plus its 16 album
  entries and the anthology's two disc entries.
- **FR-2** Every flat workflow MUST be summarized without `limit`; review MUST
  cover album, grouping, original album, artist, album artist, title, subtitle,
  track/disc values, year, bitrate, sample rate, label, publisher, and producer
  fields exposed by the tool.
- **FR-3** Every flat workflow MUST be validated without `limit` using
  `artistFilenameStrategy: "albumartist"`,
  `titleFilenameStrategy: "title"`, and `ignoreNonAudioFiles: true`.
- **FR-4** The 16 standard workflows MUST each call
  `manage_albums_organize_files` with their exact returned `albumDir`,
  `ignoreNonAudioFiles: true`, `destinationStrategy: "error"`, and the same
  `albumartist`/`title` strategies, while omitting `execute` and `limit`.
- **FR-5** Standard dry runs MUST collectively return 223 audio rows and 15
  album-art rows, all with `action: "would copy"`, unique destinations, and no
  tool errors.
- **FR-6** Anthology CD2 MUST use exactly 22 complete inline `setMetadata`
  records joined by filename from current summary and validation output; each
  record MUST preserve filename, album, artist, title, and track number while
  setting `discNumber: 1` and `discTotal: 1`.
- **FR-7** The CD2 dry run MUST use the common options from FR-4 plus the
  reviewed `setMetadata` array and MUST return 22 audio `would copy` rows under
  `Beastie Boys/Anthology- The Sounds Of Science [CD2]/`, with tracks `01–22`
  and effective disc `01/01`.
- **FR-8** Across all 17 accepted dry runs, the plan MUST contain exactly 245
  audio and 15 album-art rows; every source audio filename MUST occur once and
  every destination MUST be unique.
- **FR-9** The 2005 workflow MUST preserve its current `The Beastie Boys`
  artist and album-artist metadata and destination directory; all other
  workflows MUST preserve their observed `Beastie Boys` values.
- **FR-10** Every returned row MUST receive human review of file type, action,
  source filename, effective metadata, strategies, tag changes, and destination
  before that workflow may execute.
- **FR-11** After explicit execution authorization, each accepted request MUST
  be repeated with only `execute: true` added; `limit` MUST remain omitted and
  destination strategy MUST remain `error`.
- **FR-12** Execution MUST return 245 `copied` audio rows and 15 `copied`
  album-art rows matching the accepted dry-run rows after normalizing only the
  action field.
- **FR-13** Any changed inventory, unexpected sidecar, invalid metadata,
  incomplete `setMetadata` join, duplicate destination, existing destination,
  tool error, or parity mismatch MUST stop the affected workflow without a
  weaker retry.
- **FR-14** The anthology parent `cover.jpg` and root `Jolly Roger.png` MUST be
  left unchanged and reported as preserved-but-unorganized MCP boundary cases.

## 5. Non-Functional Requirements

- **NFR-1 — Lint after every source code file modification** After every source
  code file modification, `npm run lint -- <modified-file>` MUST lint only that
  file and reported issues MUST be fixed before continuing. Whole-codebase
  `npm run lint` MUST be reserved for final verification after all TypeScript
  modifications are complete.
- **NFR-2 — No `npx`** `npx` is forbidden in all forms; album work MUST use the
  configured MCP tools.
- **NFR-3 (MCP-only album operations)** No alternate interface or direct
  configured-root filesystem access MAY supplement MCP evidence or execution.
- **NFR-4 (source preservation)** Source audio, images, sidecars, and
  directories MUST remain unchanged.
- **NFR-5 (complete operations)** `limit` MUST be omitted from every final
  summary, validation, dry run, and execution.
- **NFR-6 (collision safety)** Destination strategy MUST remain `error`; no
  overwrite, ignore, deletion, or manual merge MAY bypass a collision.
- **NFR-7 (dry-run parity)** Execution inputs MUST differ from accepted dry-run
  inputs only by `execute: true`, and semantic output rows MUST match.
- **NFR-8 (explicit write gate)** No organize execution MAY occur until the
  user explicitly starts this spec and reviews the current complete dry runs.
- **NFR-9 (scope discipline)** Repository changes MUST be limited to this
  spec's Markdown files; MCP writes MUST be limited to configured destination
  output.
- **NFR-10 (no new dependencies)** The workflow MUST use existing MCP tools and
  MUST NOT add a dependency.

## 6. Acceptance Criteria

1. MCP rediscovery yields 16 top-level albums and 17 flat workflows.
2. Unlimited summary and validation account for all 245 FLAC tracks.
3. Current dry runs contain 245 audio plus 15 adjacent-cover `would copy` rows
   with unique destinations and no unresolved errors.
4. Anthology CD2's 22 complete metadata records preserve all values except the
   reviewed isolated-disc normalization to `1/1`.
5. Later execution returns 260 matching `copied` rows without source changes or
   collision workarounds.
6. The two non-adjacent/root images remain unchanged and are reported.
7. All album operations use only the four scoped MCP tools.
