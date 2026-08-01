# Tasks: Organize Across the Universe via MCP

> ## Hard constraints (re-read before starting)
>
> - **DO NOT START** pending tasks until the user explicitly directs execution.
>   Execute calls are in scope but remain gated by their preceding dry run and
>   human review.
> - Use only `manage_albums_list`, `manage_albums_summarize_source_dir`,
>   `manage_albums_validate`, `manage_albums_fix_tags`, and
>   `manage_albums_organize_files` for album work. No CLI, REST, GraphQL,
>   Bruno, direct imports, or filesystem inspection of configured roots
>   (NFR-3).
> - Keep source read-only. Fix-tags may write only to configured scratch;
>   organize may write only from scratch to configured destination (NFR-4).
> - **No `npx`** in any form (NFR-2).
> - Never use `limit`, ignore, overwrite, deletion, alternate filename
>   strategies, or source organization to bypass a blocker (NFR-5, NFR-7).
> - After **every** source code file modification, run
>   `npm run lint -- <modified-file>` and fix issues before moving on (NFR-1).
>   Lint only the file just modified and do this per edit, not per task.
> - Do not run whole-codebase `npm run lint` as a pre-flight baseline. Reserve
>   it for final verification after all TypeScript modifications are complete.
> - Mark the matching `- [x]` checkbox **immediately** when each task finishes
>   so progress remains resumable.

> Existing read-only evidence selects the repair strategy but does not satisfy
> the scratch or destination preconditions for execution. All operational work
> below starts pending and must be rerun against current MCP state.

## Phase 1 — Pre-flight rerun

### 1.1 Reconfirm source selection and metadata

- [x] Call `manage_albums_list` with `{ "prefix": "" }` and reconfirm the
      exact slash-terminated soundtrack entry.
- [x] Re-run the unlimited source summary and require the same 31 tracks and
      known metadata conditions from `design.md` §4, including 15 disc-1 rows,
      16 disc-2 rows, and disc total 2 throughout.
- [x] Re-run source validation with `albumartist`/`title`; stop on any issue
      beyond the planned missing album artist and two-album repair.

> Execution note: source discovery returned the exact soundtrack entry. The
> summary returned 31 rows (15 disc 1, 16 disc 2, total 2) and validation
> returned 31 invalid rows whose sole issue was `missing albumartist`.

### 1.2 Prove scratch is empty

- [x] Call `manage_albums_list` with
      `{ "prefix": "", "useScratchDir": true }`.
- [x] Require the parsed result to be `[]`; stop without deletion, ignore,
      overwrite, or execution if any entry exists.
- [x] Record the empty-scratch result immediately before tag-fix planning.

> Execution note: scratch list returned `[]`; no cleanup or collision strategy
> was needed.

## Phase 2 — Repair into scratch

### 2.1 Review the tag-fix dry run

- [x] Call `manage_albums_fix_tags` with the exact dry-run input from
      `design.md` §3.2 and omit `execute` and `limit`.
- [x] Parse exactly 31 rows from `content[0].text` and require the canonical
      album and `["Various Artists"]` album artists on every row.
- [x] Require `newDiscNumber: 1` on the first 15 rows,
      `newDiscNumber: 2` on the final 16, and `newDiscTotal: 2` on all rows.
- [x] Require proposed disc values to match current disc metadata, preserve
      disc-local track numbers `01–15` and `01–16`, and omit `newTrackNumber`.
- [x] Confirm no artist, title, producer, source, or unrelated metadata change
      is proposed.
- [x] Complete human review of every row; stop on any unexpected value or tool
      error.

> Execution note: the dry run returned 31 reviewed rows. Proposed disc metadata
> matched current values (15 × 1/2 and 16 × 2/2); album and album artist were
> the only substantive changes, and no `newTrackNumber` field was present.

### 2.2 Execute the accepted tag repair

- [x] Re-run scratch list and require `[]` immediately before execution.
- [x] Repeat the accepted fix-tags input with only `execute: true` added.
- [x] Parse exactly 31 execute rows and require exact equality with the dry-run
      metadata rows.
- [x] Stop and preserve MCP error/state evidence on any failure; do not retry
      destructively.

> Execution note: fix-tags execution returned 31 rows exactly equal to the
> accepted dry run. No error or destructive retry occurred.

## Phase 3 — Validate repaired scratch

### 3.1 Inspect staged files

- [x] Call `manage_albums_list` with `prefix: ""` and
      `useScratchDir: true`.
- [x] Require exactly 31 expected MP3 filenames directly in scratch and no
      directory, sidecar, or unrelated entry.
- [x] Stop before validation if scratch contents differ from the source album
      filename set.

> Execution note: scratch contains exactly the 31 source MP3 filenames and no
> directory, sidecar, or unrelated entry.

### 3.2 Validate all staged metadata

- [x] Call `manage_albums_validate` with `dirName: "."`,
      `useScratchDir: true`, and the `albumartist`/`title` strategies.
- [x] Require exactly 31 rows with `status: "valid"`, empty `issues`, unique
      `(discNumber, trackNumber)` pairs, disc total `02`, and the 15/16 split.
- [x] Require every destination under the one expected `Various Artists` album
      directory and the appropriate `Disc 01` or `Disc 02` subdirectory.
- [x] Stop before organization on any invalid row or tool error.

> Execution note: validation returned 31 valid rows, zero issues, 31 unique
> disc/track pairs, and 31 unique destinations across the expected two disc
> directories.

## Phase 4 — Organize repaired scratch

### 4.1 Review the organization dry run

- [x] Call `manage_albums_organize_files` with the exact dry-run input from
      `design.md` §3.4 and omit `execute` and `limit`.
- [x] Require exactly 31 `would copy` rows with unique expected destinations,
      beginning `Disc 01/01 - Girl.mp3` and ending
      `Disc 02/16 - Lucy In The Sky With Diamonds.mp3`.
- [x] Inspect every returned filename, album, artist, track, title, strategy,
      and sanitized destination.
- [x] Complete human review of every row; stop on any collision, unexpected
      value, or tool error.

> Execution note: the dry run returned 31 reviewed `would copy` rows. All
> fields matched staged validation and the source filename set; destinations
> were unique from Disc 01 track 01 through Disc 02 track 16.

### 4.2 Execute the accepted organization plan

- [x] Re-run scratch validation immediately before execution and require the
      same 31 valid rows.
- [x] Repeat the accepted organize input with only `execute: true` added.
- [x] Require exactly 31 `copied` rows matching every dry-run field and
      destination after normalizing only `action`.
- [x] Stop and preserve MCP error/state evidence on any failure; do not retry
      destructively.

> Execution note: organization execution returned 31 `copied` rows with exact
> dry-run parity after normalizing only `action`. No error or retry occurred.

## Phase 5 — Completion verification

### 5.1 Verify MCP outcomes and invariants

- [x] Confirm fix-tags dry-run/execute arrays match and scratch contains exactly
      the 31 repaired tracks with the accepted two-disc metadata.
- [x] Confirm scratch validation remains fully valid after organization.
- [x] Confirm organize dry-run/execute arrays match after normalizing `action`
      and execution reports 31 copied rows.
- [x] Confirm every album operation used only the five scoped MCP tools, every
      complete operation omitted `limit`, and no conflict workaround was used.
- [x] Mark the organization complete only when all acceptance criteria pass.

> Execution note: final MCP verification confirmed fix-tags parity, 31 scratch
> MP3s, 31 valid scratch rows after organization, organize parity, and 31
> `copied` rows. No `limit`, ignore, overwrite, or alternate strategy was used.

### 5.2 Verify documentation and project scope

- [x] Record concise execution notes under each phase, including MCP errors,
      row counts, review decisions, and exact blockers if stopped.
- [x] Confirm spec files are the only repository file changes; album writes are
      confined to MCP-managed scratch and destination roots.
- [x] If source code was unexpectedly edited, ensure per-edit lint was already
      performed, then run final `npm run lint`, `npm run build`, and `npm test`;
      otherwise record that source-code checks are not applicable.
- [x] Mark each completed checkbox immediately and leave failed or pending work
      accurate for resumability.

> Execution note: `git status --short` listed only `specs/2026-08-01/` as a
> repository change. No source code was edited, so lint, build, and test checks
> were not applicable. A final 31-row source summary exactly matched the
> pre-flight summary. All tasks completed without an MCP error.
