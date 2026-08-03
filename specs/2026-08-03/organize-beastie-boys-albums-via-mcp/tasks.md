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

- [ ] List the configured source root and select the exact returned Beastie
      Boys discography entry with its trailing slash.
- [ ] Descend the discography and require exactly 16 album directories plus
      the non-directory root image.
- [ ] Descend the anthology and require exactly `CD1/`, `CD2/`, and its parent
      cover, producing 17 flat workflows.
- [ ] Stop and document the difference if inventory has changed.

### 1.2 Reconfirm source preservation and collision policy

- [ ] Record that all source operations remain read-only and that known audit
      sidecars will be ignored but not modified.
- [ ] Record `destinationStrategy: "error"`, omitted `limit`, and the ban on
      overwrite, ignore-destination, and destructive cleanup.
- [ ] Record the anthology cover and root image as preserved MCP boundary cases.

## Phase 2 — Full metadata audit

### 2.1 Summarize every flat workflow

- [ ] Run unlimited `manage_albums_summarize_source_dir` for all 17 workflows
      with `ignoreNonAudioFiles: true`.
- [ ] Require exactly 245 FLAC rows and review every metadata field listed in
      FR-2.
- [ ] Reconcile the source filename set and per-workflow counts with
      `design.md` §3; stop on a mismatch.

### 2.2 Validate intended destinations

- [ ] Run unlimited `manage_albums_validate` for all 17 workflows with
      `ignoreNonAudioFiles: true`, `albumartist`, and `title` strategies.
- [ ] Require all 223 standard rows to be valid with empty issues.
- [ ] Require anthology CD2's 22 rows to have only the known non-contiguous
      disc-2 issue; stop on any additional issue.
- [ ] Preserve the observed `The Beastie Boys` values for the 2005 workflow.

## Phase 3 — Refresh and review dry runs

### 3.1 Refresh the 16 standard plans

- [ ] Dry-run the exact standard request from `design.md` §4.2 for every
      workflow except anthology CD2.
- [ ] Require 223 audio and 15 art rows, all `would copy`, with the exact
      per-workflow counts in `design.md` §3.
- [ ] Review every row's file type, source, effective metadata, strategies,
      tag changes, and destination.
- [ ] Require every adjacent cover exactly once at its album root.

### 3.2 Rebuild and review anthology CD2 metadata

- [ ] Join current CD2 summary and validation rows by exact filename and prove
      a 22-to-22 bijection.
- [ ] Build 22 complete inline records that preserve filename, album, artist,
      title, and track while setting only disc number/total to `1/1`.
- [ ] Dry-run CD2 using the exact common options plus the reviewed
      `setMetadata` array; omit `execute` and `limit`.
- [ ] Require 22 audio `would copy` rows with tracks 1–22, disc `01/01`, the
      expected `[CD2]` destination, and no unintended metadata changes.

### 3.3 Complete the global review gate

- [ ] Require exactly 245 audio and 15 art dry-run rows across all workflows.
- [ ] Require 260 unique destinations and one occurrence of every source audio
      filename within its workflow.
- [ ] Complete human review of all rows and record approval or blockers before
      making any execute call.

## Phase 4 — Execute reviewed workflows

### 4.1 Execute the 16 standard workflows sequentially

- [ ] Immediately rerun and review each workflow's exact dry run before its
      execution; stop if destination state or output changed.
- [ ] Execute `1986 - Licensed To Ill/` with only `execute: true` added.
- [ ] Execute `1989 - Paul's Boutique/` with only `execute: true` added.
- [ ] Execute both standard 1992 workflows with only `execute: true` added.
- [ ] Execute all three standard 1994 workflows with only `execute: true` added.
- [ ] Execute both standard 1995 workflows with only `execute: true` added.
- [ ] Execute `1996 - The In Sound From Way Out!/` with only `execute: true`.
- [ ] Execute `1998 - Hello Nasty/` with only `execute: true` added.
- [ ] Execute anthology `CD1/` with only `execute: true` added.
- [ ] Execute `2004 - To The 5 Boroughs/` with only `execute: true` added.
- [ ] Execute `2005 - Right Right Now Now/` without artist normalization and
      with only `execute: true` added.
- [ ] Execute `2007 - The Mix-Up/` with only `execute: true` added.
- [ ] Execute `2011 - Hot Sauce Committee Part Two/` with only `execute: true`.
- [ ] After each call, require `copied` rows matching that workflow's accepted
      dry run after normalizing only `action`; stop on the first mismatch.

### 4.2 Execute anthology CD2 sequentially

- [ ] Rebuild the inline array from current MCP evidence and repeat the exact
      CD2 dry run immediately before execution.
- [ ] Require exact equality with the accepted 22-row plan and reconfirm human
      approval of the disc `2` to `1/1` destination-copy repair.
- [ ] Add only `execute: true`, then require 22 matching `copied` rows.
- [ ] Stop and preserve evidence on any error or partial result; do not weaken
      the request or clean up destructively.

## Phase 5 — Verification and documentation

### 5.1 Verify album outcomes

- [ ] Reconcile execute output to exactly 245 audio and 15 album-art `copied`
      rows across 17 workflows.
- [ ] Compare every execute row with its accepted dry-run row after action
      normalization and require 260 unique destinations.
- [ ] Re-run unlimited source summaries and confirm the same 245 source rows,
      demonstrating that source metadata and inventory remain available.
- [ ] Confirm every operation used only the scoped MCP tools, omitted `limit`,
      and used no collision workaround.

### 5.2 Record boundary cases and scope

- [ ] Record that anthology `cover.jpg` and root `Jolly Roger.png` remain
      preserved but unorganized because they are not adjacent to a flat album
      input.
- [ ] Add concise execution notes beneath each completed phase, including row
      counts, parity results, and exact blockers if stopped.
- [ ] Confirm repository changes are limited to this spec's Markdown files and
      MCP writes are limited to destination output.
- [ ] Mark every finished checkbox immediately and leave failed or pending work
      accurate for resumability.

### 5.3 Apply project verification rules if needed

- [ ] If no source code was modified, record lint, build, and tests as not
      applicable to this operational spec.
- [ ] If source code was unexpectedly modified, confirm per-edit
      `npm run lint -- <modified-file>` was performed, then run final
      `npm run lint`, `npm run build`, and `npm test` after all TypeScript edits.
