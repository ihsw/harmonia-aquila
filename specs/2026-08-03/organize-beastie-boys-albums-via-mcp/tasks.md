# Tasks: Organize Beastie Boys Albums via MCP

> ## Hard constraints (re-read before starting)
>
> - **DO NOT START** pending tasks until the user explicitly directs execution.
>   This spec is a plan, not a write authorization.
> - Use only the four MCP album tools in `requirements.md` §3. No CLI, REST,
>   GraphQL, Bruno, direct imports, or configured-root filesystem inspection.
> - Keep source read-only and destination strategy `error`. Never use `limit`,
>   overwrite, ignore-destination, deletion, or destructive recovery.
> - **No `npx`** in any form (NFR-2).
> - No repository edits outside this spec's Markdown files (NFR-9).
> - After **every** source code file modification, run
>   `npm run lint -- <modified-file>` and fix issues before continuing (NFR-1).
>   Lint only the file just modified and do this per edit, not per task.
> - Do not run whole-codebase `npm run lint` as a pre-flight baseline. Reserve
>   it for final verification after all TypeScript modifications are complete.
> - Mark the matching `- [x]` checkbox **immediately** when each task finishes
>   so progress remains resumable.

> Existing 2026-08-03 discovery, audit, validation, and dry-run evidence shaped
> this plan but does not satisfy future execution preconditions. Rerun current
> MCP checks after explicit authorization.

## Phase 1 — Pre-flight rediscovery

### 1.1 Reconfirm the MCP inventory

- [x] List the configured source root and select the exact returned Beastie
      Boys discography entry with its trailing slash.
- [x] Descend the discography and require exactly 16 album directories plus
      the non-directory root image.
- [x] Descend the anthology and require exactly `CD1/`, `CD2/`, and its parent
      cover, producing 17 flat workflows.
- [x] Stop and document the difference if inventory has changed.

> Execution note: MCP rediscovery returned the exact discography entry, 16
> album directories plus `Jolly Roger.png`, and anthology `CD1/`, `CD2/`, plus
> parent `cover.jpg`. Inventory matches the spec; no stop condition occurred.

### 1.2 Reconfirm source preservation and collision policy

- [x] Record that all source operations remain read-only and that known audit
      sidecars will be ignored but not modified.
- [x] Record `destinationStrategy: "error"`, omitted `limit`, and the ban on
      overwrite, ignore-destination, and destructive cleanup.
- [x] Record the anthology cover and root image as preserved MCP boundary cases.

> Execution note: source remains read-only. All complete requests omit `limit`,
> organization uses destination strategy `error`, and the two non-adjacent
> images remain preserved boundary cases.

## Phase 2 — Full metadata audit

### 2.1 Summarize every flat workflow

- [x] Run unlimited `manage_albums_summarize_source_dir` for all 17 workflows
      with `ignoreNonAudioFiles: true`.
- [x] Require exactly 245 FLAC rows and review every metadata field listed in
      FR-2.
- [x] Reconcile the source filename set and per-workflow counts with
      `design.md` §3; stop on a mismatch.

> Execution note: all 17 unlimited summaries succeeded and returned exactly
> 245 FLAC rows with per-workflow counts matching `design.md` §3. The exposed
> metadata fields were present and reviewed for every row.

### 2.2 Validate intended destinations

- [x] Run unlimited `manage_albums_validate` for all 17 workflows with
      `ignoreNonAudioFiles: true`, `albumartist`, and `title` strategies.
- [x] Require all 223 standard rows to be valid with empty issues.
- [x] Require anthology CD2's 22 rows to have only the known non-contiguous
      disc-2 issue; stop on any additional issue.
- [x] Preserve the observed `The Beastie Boys` values for the 2005 workflow.

> Execution note: validation returned 223 standard `valid` rows with no issues.
> CD2 returned 22 `invalid` rows whose sole issue was the expected
> `non-contiguous disc numbers: 2`. The 2005 artist and album artist remain
> `The Beastie Boys`.

## Phase 3 — Refresh and review dry runs

### 3.1 Refresh the 16 standard plans

- [x] Dry-run the exact standard request from `design.md` §4.2 for every
      workflow except anthology CD2.
- [x] Require 223 audio and 15 art rows, all `would copy`, with the exact
      per-workflow counts in `design.md` §3.
- [x] Review every row's file type, source, effective metadata, strategies,
      tag changes, and destination.
- [x] Require every adjacent cover exactly once at its album root.

> Execution note: the 16 standard dry runs returned 223 audio and 15 art rows,
> all `would copy`, with exact expected counts and unique per-workflow
> destinations. No standard audio row proposed a metadata repair; every cover
> appeared once at its album root.

### 3.2 Rebuild and review anthology CD2 metadata

- [x] Join current CD2 summary and validation rows by exact filename and prove
      a 22-to-22 bijection.
- [x] Build 22 complete inline records that preserve filename, album, artist,
      title, and track while setting only disc number/total to `1/1`.
- [x] Dry-run CD2 using the exact common options plus the reviewed
      `setMetadata` array; omit `execute` and `limit`.
- [x] Require 22 audio `would copy` rows with tracks 1–22, disc `01/01`, the
      expected `[CD2]` destination, and no unintended metadata changes.

> Execution note: the current 22-to-22 filename join was bijective. The CD2
> dry run returned 22 audio `would copy` rows with effective disc `01/01` and
> preserved album, artist, title, and track values.

### 3.3 Complete the global review gate

- [x] Require exactly 245 audio and 15 art dry-run rows across all workflows.
- [x] Require 260 unique destinations and one occurrence of every source audio
      filename within its workflow.
- [x] Complete human review of all rows and record approval or blockers before
      making any execute call.

> Execution note: global review accepted 260 rows with 260 unique destinations:
> 245 audio tracks and 15 covers. No unresolved blocker remained before writes.

## Phase 4 — Execute reviewed workflows

### 4.1 Execute the 16 standard workflows sequentially

- [x] Immediately rerun and review each workflow's exact dry run before its
      execution; stop if destination state or output changed.
- [x] Execute `1986 - Licensed To Ill/` with only `execute: true` added.
- [x] Execute `1989 - Paul's Boutique/` with only `execute: true` added.
- [x] Execute both standard 1992 workflows with only `execute: true` added.
- [x] Execute all three standard 1994 workflows with only `execute: true` added.
- [x] Execute both standard 1995 workflows with only `execute: true` added.
- [x] Execute `1996 - The In Sound From Way Out!/` with only `execute: true`.
- [x] Execute `1998 - Hello Nasty/` with only `execute: true` added.
- [x] Execute anthology `CD1/` with only `execute: true` added.
- [x] Execute `2004 - To The 5 Boroughs/` with only `execute: true` added.
- [x] Execute `2005 - Right Right Now Now/` without artist normalization and
      with only `execute: true` added.
- [x] Execute `2007 - The Mix-Up/` with only `execute: true` added.
- [x] Execute `2011 - Hot Sauce Committee Part Two/` with only `execute: true`.
- [x] After each call, require `copied` rows matching that workflow's accepted
      dry run after normalizing only `action`; stop on the first mismatch.

> Execution note: all 16 standard workflows were rerun immediately before
> execution. They returned 238 `copied` rows (223 audio and 15 art) with exact
> dry-run parity after normalizing only `action`; no collision or retry occurred.

### 4.2 Execute anthology CD2 sequentially

- [x] Rebuild the inline array from current MCP evidence and repeat the exact
      CD2 dry run immediately before execution.
- [x] Require exact equality with the accepted 22-row plan and reconfirm human
      approval of the disc `2` to `1/1` destination-copy repair.
- [x] Add only `execute: true`, then require 22 matching `copied` rows.
- [x] Stop and preserve evidence on any error or partial result; do not weaken
      the request or clean up destructively.

> Execution note: fresh MCP evidence rebuilt the same bijective 22-record
> manifest and the immediate dry run exactly matched the accepted plan. CD2
> execution returned 22 matching `copied` rows; no error, partial result, or
> recovery action occurred.

## Phase 5 — Verification and documentation

### 5.1 Verify album outcomes

- [x] Reconcile execute output to exactly 245 audio and 15 album-art `copied`
      rows across 17 workflows.
- [x] Compare every execute row with its accepted dry-run row after action
      normalization and require 260 unique destinations.
- [x] Re-run unlimited source summaries and confirm the same 245 source rows,
      demonstrating that source metadata and inventory remain available.
- [x] Confirm every operation used only the scoped MCP tools, omitted `limit`,
      and used no collision workaround.

> Execution note: aggregate execution contains exactly 245 audio and 15 art
> `copied` rows with 260 unique destinations and exact global dry-run parity.
> All 17 unlimited source summaries remain byte-for-byte equal to pre-execution
> MCP results and total 245 rows. Only scoped MCP tools were used; no `limit` or
> collision workaround was used.

### 5.2 Record boundary cases and scope

- [x] Record that anthology `cover.jpg` and root `Jolly Roger.png` remain
      preserved but unorganized because they are not adjacent to a flat album
      input.
- [x] Add concise execution notes beneath each completed phase, including row
      counts, parity results, and exact blockers if stopped.
- [x] Confirm repository changes are limited to this spec's Markdown files and
      MCP writes are limited to destination output.
- [x] Mark every finished checkbox immediately and leave failed or pending work
      accurate for resumability.

> Execution note: final MCP lists still expose anthology `cover.jpg` and root
> `Jolly Roger.png`; both remain preserved and unorganized. `git status --short`
> lists only this tasks file, and all completed phases have execution notes.

### 5.3 Apply project verification rules if needed

- [x] If no source code was modified, record lint, build, and tests as not
      applicable to this operational spec.
- [x] If source code was unexpectedly modified, confirm per-edit
      `npm run lint -- <modified-file>` was performed, then run final
      `npm run lint`, `npm run build`, and `npm test` after all TypeScript edits.

> Execution note: no source code was modified. Per-file lint, final lint, build,
> and tests are therefore not applicable to this MCP operational run.
