# Requirements: Organize Lenny Kravitz Albums via MCP

## 1. Background

The configured Harmonia Aquila MCP source currently exposes
`Lenny Kravitz - Album Collection(1989-2014)[320Kbps]eNJoY-iT/`. Discovery on
2026-08-03 found 14 top-level album candidates, four of which contain two flat
disc directories, for 18 flat organization workflows. Those workflows contain
258 MP3 tracks, 18 adjacent `Folder.png` images, and one `foo_dr.log` sidecar
per workflow. Three selected top-level workflows also contain nested artwork
directories; collection-level `Album.nfo` and `cd.jpg` are not adjacent to an
album workflow.

Unlimited summaries and validation cover all 258 tracks. Track artists and
albums are populated, but every album-artist tag is the release-group value
`eNJoY-iT`. Validation is structurally successful, yet organizing directly with
the required `albumartist` filename strategy would publish under that incorrect
directory. Current dry runs therefore set album artist to `Lenny Kravitz` on
destination copies while preserving track artists, including featured artists.

The standard and advance-promo 2001 `Lenny` sources both contain the same 12
titles at 320 kbps/44.1 kHz and initially collide on 12 audio destinations plus
`Folder.png`; two reported durations differ by one second. A reviewed dry run
preserves both potential masters by naming the promo destination album
`Lenny (Advance Promo)`. With that repair, all 18 workflows produce 258 audio
and 18 art `would copy` rows with 276 unique destinations.

## 2. Goal

Use only Harmonia Aquila MCP tools to rediscover, audit, plan, review, and—only
after separate execution authorization—organize all 258 MP3 tracks and 18
adjacent covers under `Lenny Kravitz/`, preserving all source content and track
artist metadata, retaining distinct multi-disc and promo editions, and
requiring exact dry-run/execution parity without collision workarounds.

## 3. Scope

### In scope

- `manage_albums_list`, `manage_albums_summarize_source_dir`,
  `manage_albums_validate`, and `manage_albums_organize_files`.
- Fourteen top-level candidates and 18 discovered flat workflows.
- Destination-copy album-artist normalization to `Lenny Kravitz`.
- Destination-copy album normalization of the advance promo to
  `Lenny (Advance Promo)`.
- Updating this spec's Markdown checkboxes and execution notes.
- MCP-managed destination copies created by a later authorized execution.

### Out of scope

- CLI, REST, GraphQL, Bruno, direct imports, or filesystem inspection of
  MCP-configured album roots.
- Source writes, moves, renames, deletion, transcoding, or sidecar edits.
- Flattening or combining separately nested disc inputs into one source or
  destination album.
- Copying nested `Cover/` or `Artwork/` content, collection-level `cd.jpg`, or
  `Album.nfo` through a non-MCP workaround.
- Discarding either 2001 `Lenny` source as a duplicate without a future reviewed
  audio-quality decision.
- `limit`, overwrite, ignore-destination, deletion, or destructive recovery.
- TypeScript, tests, package metadata, dependencies, or MCP configuration.

## 4. Functional Requirements

- **FR-1** Discovery MUST begin with `manage_albums_list`, use exact returned
  slash-terminated prefixes, and identify 14 top-level candidates plus eight
  nested disc entries, producing 18 flat workflows.
- **FR-2** Listing MUST record direct MP3, direct recognized-image, sidecar, and
  nested-directory counts for every candidate before any ignore flag is used.
- **FR-3** Every flat workflow MUST be summarized without `limit`; review MUST
  cover every metadata field exposed by MCP, including album, grouping,
  original album, artist, album artist, title, subtitle, track/disc values,
  year, bitrate, sample rate, label, and publisher.
- **FR-4** Every flat workflow MUST be validated without `limit` using
  `ignoreNonAudioFiles: true`, `artistFilenameStrategy: "albumartist"`, and
  `titleFilenameStrategy: "title"`; all 258 rows MUST remain structurally valid.
- **FR-5** The workflow MUST explicitly record that all 258 source rows have
  album artist `eNJoY-iT` and MUST NOT publish under that value.
- **FR-6** Every organize request MUST use its exact returned `albumDir`,
  `ignoreNonAudioFiles: true`, `destinationStrategy: "error"`, the
  `albumartist`/`title` strategies, and `setAlbumArtist: "Lenny Kravitz"`, while
  omitting `execute` and `limit` for its first call.
- **FR-7** The advance-promo request MUST additionally use
  `setAlbum: "Lenny (Advance Promo)"`; its 12 tracks and cover MUST resolve
  below that distinct album directory without colliding with standard `Lenny`.
- **FR-8** Dry runs MUST preserve every track artist, including featured-artist
  values in the two Black and White America editions; only album artist and the
  approved promo album name MAY change.
- **FR-9** The four two-disc releases MUST remain eight flat workflows and MUST
  retain their observed `CD1`/`CD2` destination album names because their source
  tracks have no disc metadata and cannot be combined by one MCP call.
- **FR-10** The complete dry-run set MUST contain exactly 258 audio and 18
  album-art rows, all `would copy`, with 276 unique destinations and no tool
  errors.
- **FR-11** Every returned row MUST receive human review of file type, action,
  source filename, effective metadata, strategies, tag changes, and destination
  before execution is permitted.
- **FR-12** After explicit execution authorization, each accepted request MUST
  be rerun immediately and repeated with only `execute: true` added.
- **FR-13** Execution MUST return 258 audio and 18 album-art `copied` rows whose
  fields match the accepted dry runs after normalizing only `action`.
- **FR-14** Any changed inventory, unexpected metadata, duplicate destination,
  existing destination, tool error, partial result, or parity mismatch MUST
  stop the workflow without a weaker retry.
- **FR-15** Ignored logs, nested artwork directories, collection `Album.nfo`,
  and collection `cd.jpg` MUST remain unchanged and be reported as preserved
  but unorganized boundary content.

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
- **NFR-5 (complete operations)** `limit` MUST be omitted from every final list
  traversal, summary, validation, dry run, and execution.
- **NFR-6 (collision safety)** Destination strategy MUST remain `error`; no
  overwrite, ignore, deletion, or manual merge MAY bypass a collision.
- **NFR-7 (dry-run parity)** Execution inputs MUST differ from accepted dry-run
  inputs only by `execute: true`, and semantic output rows MUST match.
- **NFR-8 (explicit write gate)** No execution MAY occur until the user starts
  this spec and reviews current complete dry runs.
- **NFR-9 (scope discipline)** Repository changes MUST be limited to this
  spec's Markdown files; MCP writes MUST be limited to destination output.
- **NFR-10 (no new dependencies)** The workflow MUST use existing MCP tools and
  MUST NOT add a dependency.

## 6. Acceptance Criteria

1. MCP rediscovery yields 14 top-level candidates, 18 flat workflows, 258 MP3s,
   and 18 adjacent covers.
2. Unlimited summaries and validation account for all 258 tracks and preserve
   every track artist.
3. Dry runs normalize album artist to `Lenny Kravitz`, distinguish the advance
   promo, and return 276 unique `would copy` destinations.
4. Later execution returns 276 matching `copied` rows without source changes or
   collision workarounds.
5. Sidecars and non-adjacent/nested artwork remain unchanged and are reported.
6. All album operations use only the four scoped MCP tools.
