# Tasks: Copy Album Art with Organize Files

> ## Hard constraints (re-read before starting)
>
> - **DO NOT START** any task until the user explicitly directs execution.
>   This file is a plan, not a work order.
> - **No `npx`** in any form. Use `npm run <script>` or
>   `./node_modules/.bin/<tool>` exclusively (NFR-4).
> - **No edits outside album organization source/tests, generated GraphQL
>   schema, relevant album collections/docs,
>   `.agents/skills/album-organization/SKILL.md`, and this spec** (NFR-8).
>   Stop and surface any required scope expansion.
> - After **every** source-code file modification, run
>   `npm run lint -- <modified-file>` and fix all findings before moving on
>   (NFR-1). Lint only the file just modified and do this per edit, not per task.
> - Do not run whole-codebase `npm run lint` as a pre-flight baseline. Reserve
>   it for final verification after all TypeScript modifications are complete.
> - Never modify source audio, source images, or ignored sidecars in tests or
>   collection smoke checks (FR-12, NFR-9).
> - Mark each matching `- [x]` checkbox **immediately** when its task finishes
>   so progress remains resumable.

## Phase 1 — Pre-flight

### 1.1 Capture baseline and contracts

- [ ] Record `git status --short` and preserve unrelated user changes.
- [ ] Do not run whole-codebase `npm run lint` during pre-flight.
- [ ] Run `npm test` and record baseline file/test counts and failures.
- [ ] Inventory current audio discovery, organization row, collision, CLI,
      REST, GraphQL, MCP, collection, documentation, and skill contracts.
- [ ] Record representative source image extensions and current strict error
      messages without changing configured media roots.

## Phase 2 — Discovery and row model

### 2.1 Add organization-only album-art classification

- [ ] Add case-insensitive FR-1 extension classification to
      `src/lib/albums/audio-files.ts`, gated behind organization-only behavior.
- [ ] Preserve summarize/validate discovery and unsupported-sidecar errors.
- [ ] Add focused supported-extension, strict-sidecar, ignore, symlink, and
      directory-entry tests.
- [ ] Run `npm run lint -- <modified-file>` immediately after each TypeScript
      edit; fix and rerun until clean.

### 2.2 Introduce discriminated organization rows

- [ ] Update `organize-files-types.ts` with shared, audio, and album-art row
      variants plus a generic planned-copy type (FR-5, FR-6).
- [ ] Add `fileType: "audio"` to every existing audio plan and update affected
      type/row assertions without changing other audio fields.
- [ ] Run per-file lint after every edited TypeScript file.

## Phase 3 — Album-art planning and execution

### 3.1 Plan image destinations

- [ ] Add `album-art-planner.ts` to sort recognized images and target the one
      effective album root while preserving basenames (FR-3, FR-4, FR-7).
- [ ] Compose audio and art plans in `organize-files.ts` only when at least one
      audio plan remains (FR-8).
- [ ] Pass the combined plan through duplicate and destination preflight before
      returning or executing (FR-9).
- [ ] Add dry-run tests for metadata repair, multi-disc placement, ordering,
      no-audio selection, and zero writes.
- [ ] Run per-file lint after every edited TypeScript file.

### 3.2 Publish images safely

- [ ] Generalize `organize-files-execution.ts` to stage and publish images
      without invoking metadata writes (FR-10, FR-11).
- [ ] Cover image error/ignore/overwrite behavior, byte preservation, source
      preservation, whole-plan preflight, and cleanup after injected failure.
- [ ] Confirm no album directory or unrelated destination content is deleted.
- [ ] Run per-file lint after every edited TypeScript file.

## Phase 4 — Public output contracts

### 4.1 Update CLI and REST behavior

- [ ] Update organize-files CLI description/dry-run text and JSON/plaintext
      tests to expose audio and album-art rows.
- [ ] Preserve REST inputs and root-override behavior; update controller or
      integration assertions for the discriminated output only where needed.
- [ ] Run per-file lint after every edited TypeScript file.

### 4.2 Update GraphQL contract

- [ ] Add required `fileType` and make audio-only
      `AlbumOrganizeFilesRow` fields nullable in `album.rows.ts`.
- [ ] Update generated `schema.gql`, resolver/schema tests, and integration
      queries for audio and album-art rows (FR-6, FR-13).
- [ ] Preserve `albumOrganizeFiles` input, dry-run default, and
      `BAD_USER_INPUT` translation.
- [ ] Run per-file lint after every edited TypeScript file.

### 4.3 Update MCP contract

- [ ] Preserve `manage_albums_organize_files` input schema, configured-root
      confinement, tool name, order, and annotations.
- [ ] Update MCP output/operation tests to parse and assert album-art rows and
      confirm execution remains opt-in.
- [ ] Run per-file lint after every edited TypeScript file.

## Phase 5 — Collections and documentation

### 5.1 Update dry-run collections

- [ ] Update representative REST, GraphQL, and MCP organize-files Bruno
      requests to assert `fileType` and an album-art destination.
- [ ] Keep all collection requests dry-run only and free of host filesystem
      paths or execution flags.
- [ ] Retain traversal, invalid-strategy, root-override, and metadata-repair
      coverage.

### 5.2 Update active guidance

- [ ] Update album organization, GraphQL, MCP server, and testing docs with the
      supported image extensions, album-root placement, row union, and collision
      behavior.
- [ ] Update `.agents/skills/album-organization/SKILL.md` so adjacent recognized
      images are reviewed and copied in the same combined plan.
- [ ] Leave historical specs unchanged.

## Phase 6 — Verification

### 6.1 Run targeted regression tests

- [ ] Run the affected album-library, CLI, controller, GraphQL, and MCP Vitest
      files directly with `./node_modules/.bin/vitest run <files>`; exit 0.
- [ ] Confirm coverage includes every row, extension, placement, selection,
      collision, cleanup, source-preservation, and transport case in
      `design.md` §8.

### 6.2 Run final repository checks

- [ ] Run whole-codebase `npm run lint` only now; exit 0.
- [ ] Run `npm run build`; exit 0.
- [ ] Run `npm test`; exit 0 and compare counts with Phase 1.
- [ ] Confirm every touched source/test file is at most 200 lines.
- [ ] Confirm `git diff -- package.json package-lock.json` and
      `git status --short -- etc` are empty.
- [ ] Run `git diff --check`; exit 0.

### 6.3 Verify live album dry runs

- [ ] Start the built server with the configured test roots and retain its PID.
- [ ] Run the album-only REST, GraphQL, and MCP Bruno dry-run requests; require
      all requests, tests, and assertions to pass without fixture writes.
- [ ] Stop the captured server in all cases and recheck
      `git status --short -- etc`.

### 6.4 Audit scope and contracts

- [ ] Review the final diff for source mutation, image traversal, disc-folder
      placement, accidental overwrite, partial failure, and row-contract
      regressions.
- [ ] Confirm `git --no-pager diff --stat -- src __tests__ docs collections
      .agents/skills/album-organization` matches `design.md` §2 (NFR-8).
- [ ] Add concise blockquoted execution notes with baseline/final counts,
      material deviations, Bruno results, and any blockers.
