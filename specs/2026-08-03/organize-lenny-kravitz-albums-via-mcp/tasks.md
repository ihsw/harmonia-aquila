# Tasks: Organize Lenny Kravitz Albums via MCP

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

> Current discovery, audit, and dry-run evidence shaped this plan but does not
> satisfy future execution preconditions. Rerun current MCP checks after
> explicit authorization.

## Phase 1 — Pre-flight rediscovery

### 1.1 Reconfirm collection inventory

- [ ] List the configured source root and select the exact slash-terminated
      Lenny Kravitz collection entry.
- [ ] Descend the collection and require 14 album directories plus collection
      `Album.nfo` and `cd.jpg`.
- [ ] Descend the four nested releases and require their eight exact disc
      directories, producing 18 flat workflows.
- [ ] Record direct audio, direct art, logs, and nested artwork directories;
      stop if inventory differs from `design.md` §3.

### 1.2 Reconfirm safety and scope

- [ ] Record source as read-only and destination strategy as `error`.
- [ ] Record omitted `limit` and the ban on overwrite, ignore-destination,
      deletion, source restructuring, and destructive recovery.
- [ ] Record logs, nested art, and collection-level files as preserved boundary
      content.

## Phase 2 — Full metadata and edition audit

### 2.1 Summarize every workflow

- [ ] Run unlimited `manage_albums_summarize_source_dir` for all 18 workflows
      with `ignoreNonAudioFiles: true`.
- [ ] Require exactly 258 MP3 rows and the per-workflow counts from
      `design.md` §3.
- [ ] Review every metadata field required by FR-3 and record quality,
      edition, featured-artist, and multi-disc observations.

### 2.2 Validate intended filenames

- [ ] Run unlimited `manage_albums_validate` for all 18 workflows with
      `ignoreNonAudioFiles: true`, `albumartist`, and `title` strategies.
- [ ] Require 258 valid rows with empty issues and unique destinations within
      each workflow.
- [ ] Confirm all source album-artist values remain `eNJoY-iT` and therefore
      require the planned destination-copy repair.

### 2.3 Reconcile the two 2001 Lenny candidates

- [ ] Compare all 12 titles, tracks, bitrates, sample rates, durations, and
      predicted destinations between standard and advance-promo sources.
- [ ] Confirm both remain 320 kbps/44.1 kHz, the title sets match, and the two
      one-second duration differences remain ambiguous rather than evidence for
      deletion.
- [ ] Retain both candidates and approve `Lenny (Advance Promo)` as the promo's
      effective destination album.

## Phase 3 — Refresh and review dry runs

### 3.1 Refresh standard plans

- [ ] Dry-run the standard request from `design.md` §4.2 for all workflows
      except the advance promo.
- [ ] Require only `would copy` audio/art rows with album artist
      `Lenny Kravitz`, preserved track artists, and expected album paths.
- [ ] Require one direct `Folder.png` at each album root and no nested artwork
      row.

### 3.2 Refresh the advance-promo plan

- [ ] Dry-run the promo request from `design.md` §4.3 without `execute` or
      `limit`.
- [ ] Require 12 audio and one art `would copy` row below
      `Lenny Kravitz/Lenny (Advance Promo)/`.
- [ ] Confirm only album and album artist change; reject track, title, or
      quality changes.

### 3.3 Complete the global review gate

- [ ] Require exactly 258 audio and 18 art dry-run rows across 18 workflows.
- [ ] Require 276 unique destinations and one occurrence of each source audio
      filename within its workflow.
- [ ] Review every file type, action, effective metadata, strategy, tag change,
      and destination before making an execute call.

## Phase 4 — Execute reviewed workflows

### 4.1 Execute single-directory top-level albums sequentially

- [ ] Immediately rerun and review each exact dry run before its execution.
- [ ] Execute the 1989, 1993, 1995, and 1999 workflows sequentially.
- [ ] Execute advance-promo `Lenny`, then standard `Lenny`, using their distinct
      accepted requests.
- [ ] Execute the 2004, 2008, 2011, and 2014 workflows sequentially.
- [ ] After each call, require `copied` rows matching the accepted dry run after
      normalizing only `action`; stop on the first mismatch.

### 4.2 Execute nested-disc workflows sequentially

- [ ] Immediately rerun and review each exact disc dry run before execution.
- [ ] Execute both 2009 Let Love Rule anniversary disc workflows.
- [ ] Execute both 2012 Black and White America tour-edition disc workflows.
- [ ] Execute both 2012 Mama Said anniversary disc workflows.
- [ ] Execute both 2013 Are You Gonna Go My Way anniversary disc workflows.
- [ ] Require exact per-disc parity and stop without a weaker retry on any
      collision, error, or partial result.

## Phase 5 — Verification and documentation

### 5.1 Verify album outcomes

- [ ] Reconcile execute output to exactly 258 audio and 18 art `copied` rows.
- [ ] Compare all execute rows with accepted dry runs after action normalization
      and require 276 unique destinations.
- [ ] Re-run unlimited source summaries and require exact equality with the
      pre-execution 258-row evidence.
- [ ] Confirm every album operation used only scoped MCP tools, omitted `limit`,
      and used no collision workaround.

### 5.2 Record boundary content and scope

- [ ] Re-list source entries and confirm logs, nested artwork directories,
      collection `Album.nfo`, and collection `cd.jpg` remain present.
- [ ] Add concise execution notes beneath each completed phase, including exact
      counts, parity results, and blockers if stopped.
- [ ] Confirm repository changes are limited to this spec's Markdown files and
      MCP writes are limited to destination output.
- [ ] Mark each completed checkbox immediately and leave pending or failed work
      accurate for resumability.

### 5.3 Apply project verification rules if needed

- [ ] If no source code was modified, record lint, build, and tests as not
      applicable to this operational spec.
- [ ] If source code was unexpectedly modified, confirm per-edit
      `npm run lint -- <modified-file>` was performed, then run final
      `npm run lint`, `npm run build`, and `npm test` after all TypeScript edits.
