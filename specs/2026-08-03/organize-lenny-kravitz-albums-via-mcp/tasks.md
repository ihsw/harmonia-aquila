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

- [x] List the configured source root and select the exact slash-terminated
      Lenny Kravitz collection entry.
- [x] Descend the collection and require 14 album directories plus collection
      `Album.nfo` and `cd.jpg`.
- [x] Descend the four nested releases and require their eight exact disc
      directories, producing 18 flat workflows.
- [x] Record direct audio, direct art, logs, and nested artwork directories;
      stop if inventory differs from `design.md` §3.

> Execution note: MCP rediscovery matched the spec: 14 top-level candidates,
> eight nested disc directories, 18 flat workflows, 258 MP3s, 18 direct covers,
> and 18 `foo_dr.log` files. Four top-level inputs contain nested artwork dirs.

### 1.2 Reconfirm safety and scope

- [x] Record source as read-only and destination strategy as `error`.
- [x] Record omitted `limit` and the ban on overwrite, ignore-destination,
      deletion, source restructuring, and destructive recovery.
- [x] Record logs, nested art, and collection-level files as preserved boundary
      content.

> Execution note: source is read-only; every complete call omits `limit` and
> organization uses destination strategy `error`. Logs, nested artwork,
> `Album.nfo`, and collection `cd.jpg` remain preserved boundary content.

## Phase 2 — Full metadata and edition audit

### 2.1 Summarize every workflow

- [x] Run unlimited `manage_albums_summarize_source_dir` for all 18 workflows
      with `ignoreNonAudioFiles: true`.
- [x] Require exactly 258 MP3 rows and the per-workflow counts from
      `design.md` §3.
- [x] Review every metadata field required by FR-3 and record quality,
      edition, featured-artist, and multi-disc observations.

> Execution note: all 18 unlimited summaries succeeded with exactly 258 MP3
> rows and expected per-workflow counts. Metadata review preserved featured
> artists and confirmed separate edition/disc album tags with no disc metadata.

### 2.2 Validate intended filenames

- [x] Run unlimited `manage_albums_validate` for all 18 workflows with
      `ignoreNonAudioFiles: true`, `albumartist`, and `title` strategies.
- [x] Require 258 valid rows with empty issues and unique destinations within
      each workflow.
- [x] Confirm all source album-artist values remain `eNJoY-iT` and therefore
      require the planned destination-copy repair.

> Execution note: validation returned 258 valid rows with empty issues and
> unique destinations within every workflow. All 258 album-artist values remain
> `eNJoY-iT`, isolating the planned destination-copy repair.

### 2.3 Reconcile the two 2001 Lenny candidates

- [x] Compare all 12 titles, tracks, bitrates, sample rates, durations, and
      predicted destinations between standard and advance-promo sources.
- [x] Confirm both remain 320 kbps/44.1 kHz, the title sets match, and the two
      one-second duration differences remain ambiguous rather than evidence for
      deletion.
- [x] Retain both candidates and approve `Lenny (Advance Promo)` as the promo's
      effective destination album.

> Execution note: both 12-title sets match at 320 kbps/44.1 kHz. `Battlefield
> Of Love` and `Dig In` differ by one reported second, so both sources remain;
> the promo's distinct effective album name is approved.

## Phase 3 — Refresh and review dry runs

### 3.1 Refresh standard plans

- [x] Dry-run the standard request from `design.md` §4.2 for all workflows
      except the advance promo.
- [x] Require only `would copy` audio/art rows with album artist
      `Lenny Kravitz`, preserved track artists, and expected album paths.
- [x] Require one direct `Folder.png` at each album root and no nested artwork
      row.

> Execution note: all 17 standard plans returned only `would copy` rows under
> `Lenny Kravitz`, preserved every track artist, and included exactly one direct
> `Folder.png` per album root with no nested artwork rows.

### 3.2 Refresh the advance-promo plan

- [x] Dry-run the promo request from `design.md` §4.3 without `execute` or
      `limit`.
- [x] Require 12 audio and one art `would copy` row below
      `Lenny Kravitz/Lenny (Advance Promo)/`.
- [x] Confirm only album and album artist change; reject track, title, or
      quality changes.

> Execution note: the promo plan returned 12 audio plus one art `would copy`
> row below `Lenny Kravitz/Lenny (Advance Promo)/`; only album and album artist
> change on destination copies.

### 3.3 Complete the global review gate

- [x] Require exactly 258 audio and 18 art dry-run rows across 18 workflows.
- [x] Require 276 unique destinations and one occurrence of each source audio
      filename within its workflow.
- [x] Review every file type, action, effective metadata, strategy, tag change,
      and destination before making an execute call.

> Execution note: global review accepted 276 `would copy` rows—258 audio and 18
> art—with 276 unique destinations and no unresolved blocker.

## Phase 4 — Execute reviewed workflows

### 4.1 Execute single-directory top-level albums sequentially

- [x] Immediately rerun and review each exact dry run before its execution.
- [x] Execute the 1989, 1993, 1995, and 1999 workflows sequentially.
- [x] Execute advance-promo `Lenny`, then standard `Lenny`, using their distinct
      accepted requests.
- [x] Execute the 2004, 2008, 2011, and 2014 workflows sequentially.
- [x] After each call, require `copied` rows matching the accepted dry run after
      normalizing only `action`; stop on the first mismatch.

> Execution note: all ten top-level workflows were rerun immediately before
> sequential execution and returned 148 matching `copied` rows with exact
> parity after action normalization. No collision, error, or retry occurred.

### 4.2 Execute nested-disc workflows sequentially

- [x] Immediately rerun and review each exact disc dry run before execution.
- [x] Execute both 2009 Let Love Rule anniversary disc workflows.
- [x] Execute both 2012 Black and White America tour-edition disc workflows.
- [x] Execute both 2012 Mama Said anniversary disc workflows.
- [x] Execute both 2013 Are You Gonna Go My Way anniversary disc workflows.
- [x] Require exact per-disc parity and stop without a weaker retry on any
      collision, error, or partial result.

> Execution note: all eight nested-disc workflows were rerun immediately before
> sequential execution and returned 128 matching `copied` rows with exact
> per-disc parity. No collision, error, partial result, or retry occurred.

## Phase 5 — Verification and documentation

### 5.1 Verify album outcomes

- [x] Reconcile execute output to exactly 258 audio and 18 art `copied` rows.
- [x] Compare all execute rows with accepted dry runs after action normalization
      and require 276 unique destinations.
- [x] Re-run unlimited source summaries and require exact equality with the
      pre-execution 258-row evidence.
- [x] Confirm every album operation used only scoped MCP tools, omitted `limit`,
      and used no collision workaround.

> Execution note: aggregate execution contains exactly 258 audio and 18 art
> `copied` rows with 276 unique destinations and exact global dry-run parity.
> All 18 unlimited source summaries remain exactly equal to pre-execution MCP
> evidence. Only scoped MCP tools were used, with no `limit` or workaround.

### 5.2 Record boundary content and scope

- [x] Re-list source entries and confirm logs, nested artwork directories,
      collection `Album.nfo`, and collection `cd.jpg` remain present.
- [x] Add concise execution notes beneath each completed phase, including exact
      counts, parity results, and blockers if stopped.
- [x] Confirm repository changes are limited to this spec's Markdown files and
      MCP writes are limited to destination output.
- [x] Mark each completed checkbox immediately and leave pending or failed work
      accurate for resumability.

> Execution note: post-execution MCP lists exactly match pre-execution source
> inventory, including all 18 logs, nested artwork directories, collection
> `Album.nfo`, and `cd.jpg`. `git status --short` lists only this tasks file;
> every completed phase has an execution note.

### 5.3 Apply project verification rules if needed

- [x] If no source code was modified, record lint, build, and tests as not
      applicable to this operational spec.
- [x] If source code was unexpectedly modified, confirm per-edit
      `npm run lint -- <modified-file>` was performed, then run final
      `npm run lint`, `npm run build`, and `npm test` after all TypeScript edits.

> Execution note: no source code was modified. Per-file lint, final lint, build,
> and tests are therefore not applicable to this MCP operational run.
