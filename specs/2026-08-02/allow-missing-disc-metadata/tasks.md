# Tasks: Allow Missing Disc Metadata

> ## Hard constraints (re-read before starting)
>
> - **DO NOT START** any task until the user explicitly directs execution.
>   This file is a plan, not a work order.
> - **No `npx`** in any form. Use `npm run <script>` or
>   `./node_modules/.bin/<tool>` exclusively (NFR-2).
> - **No edits outside album disc validation/organization source and tests,
>   affected album transport tests/collections, generated GraphQL schema,
>   active album docs, `.agents/skills/album-organization/SKILL.md`, and this
>   spec** (NFR-8). Stop and surface any required scope expansion.
> - After **every** TypeScript source or test file modification, run
>   `npm run lint -- <modified-file>` and fix all findings before moving on
>   (NFR-1). Do this per edit, not per task.
> - Do not run whole-codebase `npm run lint` as a pre-flight baseline. Reserve
>   it for final verification after all TypeScript modifications are complete.
> - Never modify source audio, source images, ignored sidecars, or existing
>   destination media in tests or smoke checks (FR-11).
> - Mark each matching `- [x]` checkbox **immediately** when its task finishes
>   so progress remains resumable.

## Phase 1 — Pre-flight

### 1.1 Capture baseline and contracts

- [ ] Record `git status --short` and preserve unrelated user changes.
- [ ] Do not run whole-codebase lint during pre-flight.
- [ ] Run `npm test` and record baseline file/test counts and failures.
- [ ] Inventory every active `missing disc number`, repeated-track,
      disc-completeness, and multi-disc-path assertion in source, tests, docs,
      collections, and the album-organization skill.
- [ ] Confirm the current CLI, REST, GraphQL, and MCP inputs/outputs require no
      schema change and record the generated SDL baseline.
- [ ] Identify any touched source/test file near 200 lines and plan focused
      extraction before editing it.

## Phase 2 — Shared disc policy

### 2.1 Relax wholly absent metadata

- [ ] Update `src/lib/albums/disc-metadata.ts` so repeated track numbers alone
      do not activate disc-number completeness (FR-1).
- [ ] Make any explicit disc number or disc total activate completeness and
      preserve the deterministic `missing disc number` issue (FR-3, FR-4).
- [ ] Preserve numeric, total, continuity, duplicate-tuple, formatting,
      inference, and issue-order behavior (FR-6, NFR-6, NFR-9).
- [ ] Run `npm run lint -- src/lib/albums/disc-metadata.ts` immediately after
      the edit; fix and rerun until clean.

### 2.2 Lock the validation matrix

- [ ] Update focused pure tests so all-null `1, 2, 1, 2` is valid.
- [ ] Add partial-number and orphan-total cases that still report
      `missing disc number` deterministically.
- [ ] Preserve invalid-number, inconsistent-total, gap, and duplicate-tuple
      cases without weakening their assertions.
- [ ] Run `npm run lint -- <modified-test-file>` after each test edit.
- [ ] Run the focused disc validation/inference tests; require exit 0.

## Phase 3 — Organization and validation behavior

### 3.1 Plan flat repeated-track albums

- [ ] Add an organization dry-run fixture with repeated track numbers,
      distinct titles, and no disc metadata; assert flat paths, empty disc
      fields, deterministic ordering, and zero writes (FR-1, FR-2, FR-11).
- [ ] Add or preserve an exact duplicate-destination case proving repeated
      tracks do not bypass combined-plan preflight (FR-5).
- [ ] Add partial disc evidence and orphan-total preflight-no-write cases.
- [ ] Preserve complete two-disc and `discStrategy: "infer"` `Disc DD`
      coverage, including metadata repairs and row fields (FR-6).
- [ ] Cover selection-before-validation semantics for `limit` and trackless
      filtering (FR-7).
- [ ] Run per-file lint immediately after every modified TypeScript test.

### 3.2 Preserve the combined album-art plan

- [ ] Assert recognized images remain after audio rows and target the flat
      album root for an all-absent disc set (FR-8).
- [ ] Assert dry run does not copy audio or images and failure does not alter
      destination content (FR-11).
- [ ] Run per-file lint after each modified album-art test and run the focused
      organization test group.

### 3.3 Align validation

- [ ] Update validation tests so wholly absent repeated-track albums are not
      invalid solely for missing disc metadata (FR-10).
- [ ] Preserve duplicate-destination issues and strict partial-disc issues.
- [ ] Assert organization and validation make the same absence/partial policy
      decision for equivalent effective metadata.
- [ ] Run per-file lint after each modified validation test and run the focused
      validation group.

## Phase 4 — Public regression coverage

### 4.1 Preserve CLI behavior

- [ ] Assert CLI JSON and plaintext dry runs expose the existing row shape,
      flat destinations, and empty disc fields for wholly absent metadata.
- [ ] Confirm `--execute` remains required for writes and no new option is
      registered (FR-9, FR-11).
- [ ] Run per-file lint after every CLI test edit and run the focused command
      tests.

### 4.2 Preserve REST and GraphQL behavior

- [ ] Add or update focused REST and GraphQL assertions for a successful
      all-absent result and a strict partial-disc error.
- [ ] Preserve configured-root selection, dry-run defaults, status/error
      translation, GraphQL input/row fields, and `BAD_USER_INPUT` behavior.
- [ ] Regenerate/check `schema.gql`; require no semantic schema delta.
- [ ] Run per-file lint after every modified TypeScript file and run focused
      REST/GraphQL tests.

### 4.3 Preserve MCP behavior

- [ ] Parse and assert a successful all-absent organize result through the MCP
      protocol-level test (FR-9).
- [ ] Preserve `manage_albums_organize_files` name, native input schema, tool
      order, annotations, configured-root confinement, and execute opt-in.
- [ ] Preserve tool-error content for partial/invalid explicit disc metadata.
- [ ] Run per-file lint after every MCP test edit and run the focused MCP tests.

## Phase 5 — Active guidance and collections

### 5.1 Update documentation and skill

- [ ] Update active album organization guidance to explain the wholly absent
      versus partial policy and the continued duplicate-path check (FR-12).
- [ ] Update GraphQL, MCP, and testing docs only where they state or enumerate
      affected behavior/tests.
- [ ] Update `.agents/skills/album-organization/SKILL.md` so missing disc
      metadata alone is not treated as a blocker when it is absent everywhere,
      while partial evidence and destination duplicates remain blockers.
- [ ] Leave historical specs unchanged.

### 5.2 Keep smoke requests safe

- [ ] Update only affected REST, GraphQL, or MCP Bruno assertions if needed to
      demonstrate the relaxed dry run.
- [ ] Keep every request dry-run-only, confined to configured test roots, and
      free of host paths or execution flags.
- [ ] Preserve traversal, root-override, invalid-strategy, metadata-repair,
      multi-disc, and album-art coverage.

## Phase 6 — Verification

### 6.1 Run focused regression tests

- [ ] Run every focused Vitest command from `design.md` §9 directly with
      `./node_modules/.bin/vitest run`; require exit 0.
- [ ] Confirm coverage includes all-null repetitions, partial evidence, orphan
      totals, exact destination duplicates, explicit/inferred multi-disc,
      selection, album art, source safety, and all public surfaces.

### 6.2 Run final repository checks

- [ ] Run whole-codebase `npm run lint` only now; require exit 0.
- [ ] Run `npm run build`; require exit 0.
- [ ] Run `npm test`; require exit 0 and compare counts with Phase 1.
- [ ] Confirm every touched source/test file is at most 200 lines.
- [ ] Confirm `git diff -- package.json package-lock.json` and
      `git status --short -- etc` are empty.
- [ ] Run `git diff --check`; require exit 0.

### 6.3 Verify dry-run transports

- [ ] Start the built server with isolated configured test roots and retain its
      process/session identifier.
- [ ] Run only affected album REST, GraphQL, and MCP Bruno dry-run requests;
      require every request, test, and assertion to pass.
- [ ] Stop the captured server in all cases and recheck that fixtures and
      configured media roots are unchanged.

### 6.4 Audit scope and record results

- [ ] Review the final diff for weakened explicit-disc validation, mixed flat
      and disc-folder plans, collision bypasses, source mutation, schema drift,
      or execution-default changes.
- [ ] Confirm the final diff matches `design.md` §2 and contains no audiobook,
      dependency, root-configuration, historical-spec, or real-media edits.
- [ ] Add concise blockquoted execution notes with baseline/final counts,
      focused tests, schema result, Bruno result, deviations, and blockers.
