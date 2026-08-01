# Design: Organize Across the Universe via MCP

> Scope reminder: album work uses only `manage_albums_list`,
> `manage_albums_summarize_source_dir`, `manage_albums_validate`,
> `manage_albums_fix_tags`, and `manage_albums_organize_files`. No CLI, REST,
> GraphQL, Bruno, direct imports, filesystem inspection of configured roots,
> destructive collision handling, unrelated albums, source writes, or `npx`.

## 1. Overview

Use a gated MCP pipeline within one server configuration: discover and audit
the source album, plan tag repair, execute the accepted repair into scratch,
validate scratch, plan organization from scratch, and execute the accepted
organization into destination. MCP roots remain opaque; source selection comes
from list output, fix-tags always writes to scratch, and organization with
`useScratchDir: true` reads scratch and always writes to destination (FR-1–FR-3,
FR-8–FR-13).

The repair deliberately uses `setAlbum` because `grouping` and `originalalbum`
are empty. It uses `setAlbumArtist: "Various Artists"` because this is a
multi-performer soundtrack, and `discStrategy: "infer"` to validate and write
the complete multi-disc tags. The source already has disc 1/2 on the first 15
tracks and disc 2/2 on the remaining 16, so the repair preserves disc-local
track numbers and MUST NOT use `resetTrack`. Disc-aware destinations prevent
the repeated track numbers from colliding (FR-4–FR-7, NFR-10).

Every write has three gates: complete dry-run evidence, human review, and a
last precondition check. Execution changes only `execute` from omitted to
`true`; errors are blockers, not permission to retry with overwrite, ignore,
limits, or weaker strategies (FR-15, NFR-7–NFR-9).

## 2. Modified state

| State | Permitted change | Producer |
| --- | --- | --- |
| Configured source root | None | list, summarize, and validate only |
| Configured scratch root | 31 repaired soundtrack copies | `manage_albums_fix_tags` with `execute: true` |
| Configured destination root | 31 organized soundtrack copies | `manage_albums_organize_files` with `execute: true` |
| This spec | Checkbox and execution-note updates | implementing agent |

### Files and systems explicitly not modified

- Physical server-root configuration and paths: the MCP server owns routing.
- `src/**`, `__tests__/**`, package metadata, and MCP server code.
- Pre-existing scratch or destination entries: any such conflict blocks work.
- Unrelated source albums and organized destination albums.

## 3. Fixed MCP inputs

MCP success content is a JSON string in `content[0].text`; parse it before row
review. Treat `isError: true` or tool-error content as failure even if the text
is parseable or diagnostically useful (FR-1).

### 3.1 Discovery and source audit

```json
// manage_albums_list
{ "prefix": "" }

// manage_albums_list: scratch precondition
{ "prefix": "", "useScratchDir": true }

// manage_albums_summarize_source_dir
{ "dirName": "Across The Universe Soundtrack" }

// manage_albums_validate: source evidence
{
  "dirName": "Across The Universe Soundtrack",
  "artistFilenameStrategy": "albumartist",
  "titleFilenameStrategy": "title"
}
```

The source validation is expected to remain invalid until repair and therefore
cannot authorize direct source organization.

### 3.2 Tag-fix dry run and execution

The accepted dry-run input is:

```json
{
  "albumDir": "Across The Universe Soundtrack/",
  "destinationStrategy": "error",
  "discStrategy": "infer",
  "setAlbum": "Across The Universe-Music From The Motion Picture (Deluxe Edition)",
  "setAlbumArtist": "Various Artists"
}
```

After review and another empty-scratch list, execute by adding only:

```json
{ "execute": true }
```

The fix-tags JSON contract reports metadata deltas rather than action,
filename, or destination. Require 31 dry-run rows with the expected
`newAlbum`, `newAlbumartists`, `newDiscNumber`, and `newDiscTotal`, then require
identical execute rows. No `newTrackNumber` is expected. Prove copied filenames
separately through scratch list output.

### 3.3 Scratch inspection and validation

```json
// manage_albums_list
{ "prefix": "", "useScratchDir": true }

// manage_albums_validate
{
  "dirName": ".",
  "useScratchDir": true,
  "artistFilenameStrategy": "albumartist",
  "titleFilenameStrategy": "title"
}
```

Fix-tags writes files directly into the scratch root, so validation uses `.`;
it does not use the source album directory name. Exactly 31 valid rows with
unique `(discNumber, trackNumber)` pairs and destinations below `Disc 01` and
`Disc 02` are required (FR-9, FR-10).

### 3.4 Organize dry run and execution

The accepted dry-run input is:

```json
{
  "albumDir": "./",
  "useScratchDir": true,
  "artistFilenameStrategy": "albumartist",
  "titleFilenameStrategy": "title"
}
```

After complete row review and one final scratch validation, execute by adding
only:

```json
{ "execute": true }
```

The dry run must return 31 `would copy` rows. Execution must return the same 31
semantic rows and destinations with action `copied` (FR-11–FR-14).

## 4. Existing MCP evidence

The following completed calls are audit evidence, not substitutes for the
pre-execution reruns in `tasks.md`:

| Tool | Observed result |
| --- | --- |
| `manage_albums_list` | Source includes `Across The Universe Soundtrack/`. |
| `manage_albums_list` on scratch | Returned `[]` before and after the new dry run. |
| `manage_albums_summarize_source_dir` | 31 MP3 rows; 15 disc-1 and 16 disc-2 rows; disc total 2 throughout; two album tags; empty album artist. |
| `manage_albums_validate` | 31 invalid rows with only `missing albumartist`; disc fields are complete. |
| `manage_albums_fix_tags` dry run | Accepted `discStrategy: "infer"`; returned the canonical album/artist and preserved 1/2 then 2/2 disc metadata on 31 rows. |
| `manage_albums_organize_files` source dry run | Tool error on `1-01 Girl.mp3` missing `albumartist`; no writes. |

This evidence validates the disc-aware repair strategy. The empty scratch result
must still be reconfirmed immediately before execution; no dry run proves
destination availability until repaired scratch can be organized.

## 5. Gate sequence

| Gate | Required evidence | Unlocks |
| --- | --- | --- |
| Source and scratch preflight | exact source entry; scratch list is `[]`; 31-row disc-aware summary | Fix-tags dry run |
| Tag-fix plan | 31 intended metadata rows; disc split 15/16; total 2; tracks unchanged | Final empty-scratch check |
| Tag-fix execute | execute rows match dry run; scratch lists 31 MP3s | Scratch validation |
| Scratch validation | 31 valid rows; one artist/album; valid disc/track pairs; unique destinations | Organize dry run |
| Organize plan | 31 reviewed `would copy` rows; expected subtree; no collision | Final scratch validation |
| Organize execute | 31 `copied` rows matching dry-run destinations | Completion verification |

## 6. Comparison rules

### 6.1 Fix-tags parity

Compare the parsed dry-run and execute arrays exactly. Both calls report the
same metadata transformation rather than action state. Require 31 rows and:

- canonical `newAlbum` on every row;
- `newAlbumartists` equal to `["Various Artists"]` on every row;
- `newDiscNumber: 1` on the first 15 rows and `2` on the final 16;
- `newDiscTotal: 2` on every row, matching current disc metadata;
- no `newTrackNumber`, `newArtists`, `newTitle`, or producer changes.

### 6.2 Organize parity

Compare every field after normalizing only `action` from `would copy` to
`copied`. Require the same 31 source filenames and destination paths. Title
sanitization is accepted only when returned by both MCP calls consistently.
Require disc 1 destinations under `Disc 01` with tracks `01–15` and disc 2
destinations under `Disc 02` with tracks `01–16`.

## 7. Failure and recovery behavior

- Non-empty scratch before tag-fix execution blocks the workflow. MCP exposes
  no deletion operation in this scope; stop and request external remediation or
  server reconfiguration to an empty scratch root.
- Any scratch validation error blocks organization. Do not organize merely
  because tag-fix execution returned success.
- Any existing destination or organize dry-run error blocks execution.
- Partial tag-fix or organize execution preserves all evidence and stops. Do
  not retry with ignore/overwrite or delete partial output without a separately
  approved recovery plan.
- Never fall back to organizing the unmodified source album.

## 8. Risk Table

| Risk | Likelihood | Mitigation |
| --- | --- | --- |
| Scratch gains stale files after refinement | Medium | Require empty MCP scratch list twice before tag-fix execute. |
| Two disc-local track sequences collide | High | Infer/preserve complete disc metadata and require `Disc 01`/`Disc 02` destinations. |
| Track reset destroys disc-local numbering | Medium | Omit `resetTrack` and reject any `newTrackNumber` field. |
| Performers create multiple artist directories | High | Set `Various Artists` and organize with `albumartist`. |
| `limit` hides Disc 2 or a conflict | High | Omit it from every complete operation. |
| Dry-run and execute inputs drift | Medium | Add only `execute: true`; compare parsed output rows. |
| Existing destination appears | Medium | Require successful organize dry run immediately before execute. |
| Source/scratch roots are confused | Medium | Source uses returned albumDir; scratch uses `.`/`./` with explicit root selection. |
| Partial write tempts destructive retry | Medium | Stop, preserve state, and require a separate recovery plan. |

## 9. Verification

1. Confirm every album operation used one of the five scoped MCP tools.
2. Confirm all complete calls omitted `limit` and all writes followed a reviewed
   dry run with identical inputs except `execute: true`.
3. Confirm fix-tags dry-run/execute parity, the 15/16 disc split, disc total 2,
   unchanged track numbers, and scratch list count of 31.
4. Confirm scratch validation has 31 valid, disc-aware collision-free rows.
5. Confirm organize dry-run/execute parity and 31 `copied` execution rows.
6. Confirm no tool used ignore/overwrite or operated on unmodified source for
   organization.
7. If source code is unexpectedly modified, run
   `npm run lint -- <modified-file>` after every edit; reserve whole-codebase
   `npm run lint` for final verification after all TypeScript edits, followed
   by `npm run build` and `npm test`.

## 10. Completion condition

The goal is complete only when `manage_albums_organize_files` executes
successfully from validated scratch and returns 31 `copied` rows matching the
accepted dry run. A successful tag repair or dry run alone is not completion.
