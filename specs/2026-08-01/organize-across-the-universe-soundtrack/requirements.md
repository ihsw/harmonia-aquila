# Requirements: Organize Across the Universe via MCP

## 1. Background

Harmonia Aquila is available through a configured MCP server whose album tools
operate relative to server-controlled source, scratch, and destination roots.
The workflow MUST treat those roots as opaque boundaries and use only MCP
identifiers returned by `manage_albums_list`; it MUST NOT substitute repository
paths, CLI arguments, or inferred filesystem locations.

MCP-only evidence collected on 2026-08-01 found the source entry
`Across The Universe Soundtrack/` and 31 MP3 tracks. Tracks 1–15 use album
`Across The Universe-Music From The Motion Picture (Deluxe Edition)`; tracks
16–31 append ` (Disc 2)`. The source already contains complete two-disc
metadata: 15 rows are disc `01`, 16 rows are disc `02`, and all 31 rows have
disc total `02`. Every track has an empty `albumartist`. Source validation with
the intended compilation strategy marked all 31 rows invalid, and a source
organization dry run stopped at
`1-01 Girl.mp3 is missing required metadata: albumartist`.

The registered summarize tool is `manage_albums_summarize_source_dir`, which
is the server's exact name for the requested summarize capability. Completing
the album now requires `manage_albums_fix_tags`: first plan and then execute a
repaired copy into the configured scratch root, validate that scratch input,
and only then dry-run and execute organization into the configured destination.

## 2. Goal

Use only Harmonia Aquila MCP tools to produce a reviewed scratch copy with one
canonical album, `Various Artists` as album artist, and preserved two-disc
metadata with disc-local tracks `01–15` and `01–16`; validate all 31 scratch
tracks; obtain a successful, collision-free `manage_albums_organize_files` dry
run with `Disc 01` and `Disc 02` directories; and execute that exact plan
successfully into the configured destination without changing the source.

## 3. Scope

### In scope

- `manage_albums_list` against configured source and scratch roots.
- `manage_albums_summarize_source_dir` against the selected source album.
- `manage_albums_validate` against source and repaired scratch inputs.
- `manage_albums_fix_tags` dry-run and execution into the configured scratch
  root.
- `manage_albums_organize_files` dry-run and execution from scratch into the
  configured destination root.
- Parsing and comparing MCP JSON strings returned in `content[0].text`.
- Updating this spec's requirements, design, tasks, checkboxes, and notes.

### Out of scope

- Any album operation through CLI, shell scripts, REST, GraphQL, Bruno, direct
  library imports, or filesystem inspection of configured roots.
- Modifying, renaming, moving, or deleting source files.
- Deleting, ignoring, or overwriting pre-existing scratch or destination files
  to evade a collision.
- Running against a non-empty scratch root; it must be empty before tag-fix
  execution or the workflow MUST stop for external root remediation.
- Using `limit`, ignore flags, weaker filename strategies, or partial album
  selection to bypass validation failures.
- Editing TypeScript, tests, package metadata, or MCP server configuration.
- Organizing any album other than the selected Across the Universe soundtrack.

## 4. Functional Requirements

- **FR-1** Every album operation MUST use only the five MCP tools named in
  scope; all success payloads MUST be parsed from `content[0].text`, and MCP
  tool-error content MUST remain a failure.
- **FR-2** `manage_albums_list` MUST select the exact returned source entry
  `Across The Universe Soundtrack/`; all non-empty MCP `albumDir` and list
  prefixes MUST retain their trailing slash.
- **FR-3** Before writes, `manage_albums_list` MUST inspect scratch with
  `{ "prefix": "", "useScratchDir": true }`; any returned entry MUST block
  tag-fix execution without automatic deletion, ignore, or overwrite.
- **FR-4** `manage_albums_summarize_source_dir` MUST summarize
  `dirName: "Across The Universe Soundtrack"` without `limit`, and review all
  31 rows across album, grouping, original album, artist, album artist, title,
  subtitle, disc number, disc total, year, bitrate, sample rate, label, and
  publisher.
- **FR-5** Source validation MUST use
  `artistFilenameStrategy: "albumartist"` and
  `titleFilenameStrategy: "title"`, retain the observed invalid rows as repair
  evidence, and MUST NOT authorize direct source organization.
- **FR-6** `manage_albums_fix_tags` MUST target
  `albumDir: "Across The Universe Soundtrack/"`, set album to
  `Across The Universe-Music From The Motion Picture (Deluxe Edition)`, set
  album artist to `Various Artists`, use `discStrategy: "infer"`, use
  destination strategy `error`, omit `resetTrack`, and omit `limit`.
- **FR-7** Tag repair MUST first omit `execute`; its 31 parsed rows MUST show
  only the intended canonical `newAlbum`,
  `newAlbumartists: ["Various Artists"]`, and disc metadata consisting of 15
  rows with `newDiscNumber: 1`, 16 rows with `newDiscNumber: 2`, and all rows
  with `newDiscTotal: 2`; track numbers MUST remain disc-local and unchanged.
- **FR-8** After human review of the complete tag-fix dry run and a final empty
  scratch check, the identical `manage_albums_fix_tags` input MUST be repeated
  with only `execute: true` added.
- **FR-9** After tag-fix execution, `manage_albums_list` with
  `useScratchDir: true` MUST return exactly 31 MP3 filenames directly in the
  scratch root and no unrelated entries.
- **FR-10** Scratch validation MUST use `dirName: "."`,
  `useScratchDir: true`, `artistFilenameStrategy: "albumartist"`, and
  `titleFilenameStrategy: "title"`; all 31 rows MUST be valid, have empty
  issues, expose the same complete two-disc metadata, and resolve to unique
  destinations under one artist, one album, and `Disc 01`/`Disc 02` folders.
- **FR-11** `manage_albums_organize_files` MUST read repaired scratch with
  `albumDir: "./"`, `useScratchDir: true`, and the same filename strategies;
  its first call MUST omit `execute` and `limit`.
- **FR-12** The organization dry run MUST return exactly 31 `would copy` rows
  with unique destinations below
  `Various Artists/Across The Universe-Music From The Motion Picture (Deluxe Edition)`,
  beginning `Disc 01/01 - Girl.mp3` and ending
  `Disc 02/16 - Lucy In The Sky With Diamonds.mp3`.
- **FR-13** After human review of the complete organization dry run and a final
  successful scratch validation, the identical organize input MUST be repeated
  with only `execute: true` added.
- **FR-14** Organization execution MUST return exactly 31 `copied` rows whose
  filenames, track numbers, titles, strategies, albums, artists, and
  destinations match the accepted dry run; only `action` MAY differ.
- **FR-15** Any unexpected entry, row, metadata change, invalid status,
  collision, existing destination, tool error, or dry-run/execute mismatch MUST
  stop the workflow without destructive recovery or strategy weakening.

## 5. Non-Functional Requirements

- **NFR-1 — Lint after every source code file modification** After every
  modification of a source code file (for example, a `.ts` file),
  `npm run lint -- <modified-file>` MUST be run so only the modified file is
  linted, and reported issues MUST be fixed before moving on. This applies per
  source-code edit, not per task. Whole-codebase `npm run lint` MUST be reserved
  for final verification after all TypeScript modifications are complete.
- **NFR-2 — No `npx`** `npx` is forbidden in all forms. Any command line
  containing that substring is a violation; album work MUST use the configured
  MCP tools.
- **NFR-3 (MCP-only album operations)** No CLI, REST, GraphQL, Bruno, direct
  import, or filesystem-based album inspection MAY supplement or replace MCP
  evidence or execution.
- **NFR-4 (source preservation)** MCP source operations MUST remain read-only;
  tag repair MUST write only to scratch and organization only to destination.
- **NFR-5 (complete input)** `limit` MUST be omitted from every final summary,
  validation, tag-fix, and organization call.
- **NFR-6 (root safety)** Inputs MUST remain relative to configured roots;
  source album selection and scratch `./` semantics MUST match the MCP contract.
- **NFR-7 (safe collision handling)** Tag repair MUST use destination strategy
  `error`; ignore, overwrite, automatic deletion, and manual merging are
  forbidden as conflict workarounds.
- **NFR-8 (dry-run parity)** Each executing call MUST differ from its accepted
  dry-run input only by `execute: true`; returned semantic row sets MUST match.
- **NFR-9 (explicit write gates)** Human review MUST occur after each complete
  dry run and immediately before its corresponding executing call.
- **NFR-10 (disc integrity)** The repair MUST preserve the 15-track/16-track
  disc split, consistent disc total 2, and all original disc-local track
  numbers; flattening to tracks `1–31` is forbidden.
- **NFR-11 (scope discipline)** File changes outside MCP-managed scratch and
  destination output MUST be limited to this spec's Markdown progress updates.

## 6. Acceptance Criteria

1. The exact source entry is discovered through MCP and the configured scratch
   root is proven empty before tag-fix execution.
2. The tag-fix dry run and execution each return 31 matching metadata rows with
   one canonical album, album artist `Various Artists`, disc total 2, 15 disc-1
   rows, 16 disc-2 rows, and unchanged disc-local tracks.
3. Scratch contains exactly 31 expected MP3 files and validation returns 31
   valid rows with no issues or duplicate `(discNumber, trackNumber)` pairs.
4. The organization dry run returns 31 reviewed `would copy` rows under the
   expected artist/album and `Disc 01`/`Disc 02` directories.
5. Organization execution returns 31 matching `copied` rows and no tool error.
6. No source file is changed and no collision is bypassed through deletion,
   ignore, overwrite, limit, or alternate strategies.
7. All album operations, including both executions, use only MCP tools.
