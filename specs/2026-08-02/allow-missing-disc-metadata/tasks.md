# Tasks: Optional Disc Metadata with Explicit Inference

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

- [x] Record `git status --short` and preserve unrelated user changes.
- [x] Do not run whole-codebase lint during pre-flight.
- [x] Run `npm test` and record baseline file/test counts and failures.
- [x] Inventory every active `missing disc number`, repeated-track,
      disc-completeness, and multi-disc-path assertion in source, tests, docs,
      collections, and the album-organization skill.
- [x] Confirm the current CLI, REST, GraphQL, and MCP inputs/outputs require no
      schema change and record the generated SDL baseline.
- [x] Identify any touched source/test file near 200 lines and plan focused
      extraction before editing it.

> Baseline: the worktree had no unrelated changes. The suite ran 54 files / 247
> tests; 53 files / 246 tests passed and the generated-SDL reader failed because
> it observed an empty schema while parallel app tests rewrote that file. The
> current contracts already expose `discStrategy` everywhere and already infer
> before organization validation. `disc-metadata.ts` and
> `metadata-fix-planner.ts` are exactly 200 lines, so no lines may be added;
> focused new test files will avoid growing near-limit tests.

## Phase 2 — Shared disc policy

### 2.1 Lock optional and repeated-track policy

- [x] Confirm or update `src/lib/albums/disc-metadata.ts` so unique-track sets
      with wholly absent disc fields remain valid (FR-1).
- [x] Ensure repeated track numbers, any explicit disc number, or any disc
      total activate completeness and preserve deterministic
      `missing disc number` issues (FR-2, FR-5, FR-6).
- [x] Preserve numeric, total, continuity, duplicate-tuple, formatting,
      inference, and issue-order behavior (FR-6, NFR-6, NFR-9).
- [x] Run `npm run lint -- src/lib/albums/disc-metadata.ts` immediately after
      the edit; fix and rerun until clean.

### 2.2 Lock the validation matrix

- [x] Preserve focused pure coverage that all-null `1, 2, 3` is valid and
      all-null `1, 2, 1, 2` reports `missing disc number`.
- [x] Add partial-number and orphan-total cases that still report
      `missing disc number` deterministically.
- [x] Preserve invalid-number, inconsistent-total, gap, and duplicate-tuple
      cases without weakening their assertions.
- [x] Run `npm run lint -- <modified-test-file>` after each test edit.
- [x] Run the focused disc validation/inference tests; require exit 0.

## Phase 3 — Organization and validation behavior

### 3.1 Enforce explicit inference for repeated tracks

- [x] Add an organization dry-run fixture with repeated track numbers and no
      disc metadata; with omitted/default `discStrategy`, assert deterministic
      missing-disc failure and zero writes (FR-2, FR-11).
- [x] Repeat the fixture with `discStrategy: "infer"`; assert inference runs
      before validation and returns complete `Disc DD` rows (FR-3, FR-8).
- [x] Preserve a unique-track all-absent fixture with flat paths and empty disc
      fields (FR-1, FR-4).
- [x] Add or preserve an exact duplicate-destination case after valid disc
      validation, proving combined-plan preflight remains separate (FR-7).
- [x] Add partial disc evidence and orphan-total preflight-no-write cases.
- [x] Preserve complete two-disc and `discStrategy: "infer"` `Disc DD`
      coverage, including metadata repairs and row fields (FR-8).
- [x] Cover selection-before-inference/validation semantics for `limit` and
      trackless filtering (FR-9).
- [x] Run per-file lint immediately after every modified TypeScript test.

### 3.2 Preserve the combined album-art plan

- [x] Assert recognized images remain after audio rows and target the album
      root for both unique-track flat and inferred multi-disc sets (FR-10).
- [x] Assert dry run does not copy audio or images and failure does not alter
      destination content (FR-11).
- [x] Run per-file lint after each modified album-art test and run the focused
      organization test group.

### 3.3 Align validation

- [x] Preserve validation tests proving wholly absent repeated-track albums are
      invalid for missing disc metadata (FR-2).
- [x] Preserve unique-track all-absent validation success (FR-1).
- [x] Preserve duplicate-destination issues and strict partial-disc issues.
- [x] Assert validation and default organization agree for unique, repeated,
      and partial source metadata; separately assert explicit organization
      inference makes a repeated sequence valid.
- [x] Run per-file lint after each modified validation test and run the focused
      validation group.

## Phase 4 — Public regression coverage

### 4.1 Preserve CLI behavior

- [x] Assert CLI JSON/plaintext preserves flat unique-track rows and that
      repeated tracks fail without `--disc-strategy infer`.
- [x] Assert `--disc-strategy infer` returns existing inferred disc fields and
      `Disc DD` destinations for a valid repeated sequence.
- [x] Confirm `--execute` remains required for writes and no new option is
      registered (FR-9, FR-11).
- [x] Run per-file lint after every CLI test edit and run the focused command
      tests.

### 4.2 Preserve REST and GraphQL behavior

- [x] Add or update focused REST and GraphQL assertions for successful
      unique-track and explicitly inferred results plus repeated-track default
      and partial-disc errors.
- [x] Preserve configured-root selection, dry-run defaults, status/error
      translation, GraphQL input/row fields, and `BAD_USER_INPUT` behavior.
- [x] Regenerate/check `schema.gql`; require no semantic schema delta.
- [x] Run per-file lint after every modified TypeScript file and run focused
      REST/GraphQL tests.

### 4.3 Preserve MCP behavior

- [x] Parse and assert successful unique-track and explicit-inference organize
      results through the MCP protocol-level test (FR-11).
- [x] Preserve `manage_albums_organize_files` name, native input schema, tool
      order, annotations, configured-root confinement, and execute opt-in.
- [x] Preserve tool-error content for partial/invalid explicit disc metadata.
- [x] Run per-file lint after every MCP test edit and run the focused MCP tests.

## Phase 5 — Active guidance and collections

### 5.1 Update documentation and skill

- [x] Update active album organization guidance to explain unique-track
      optionality, repeated-track failure without inference, explicit
      inference review, partial metadata, and duplicate-path checks (FR-12).
- [x] Update GraphQL, MCP, and testing docs only where they state or enumerate
      affected behavior/tests.
- [x] Update `.agents/skills/album-organization/SKILL.md` so missing disc
      metadata is accepted for unique tracks, while repeated tracks require
      complete explicit metadata or reviewed `discStrategy: "infer"` output.
- [x] Leave historical specs unchanged.

### 5.2 Keep smoke requests safe

- [x] Update only affected REST, GraphQL, or MCP Bruno assertions if needed to
      demonstrate a unique-track dry run and explicit inference behavior.
- [x] Keep every request dry-run-only, confined to configured test roots, and
      free of host paths or execution flags.
- [x] Preserve traversal, root-override, invalid-strategy, metadata-repair,
      multi-disc, and album-art coverage.

## Phase 6 — Verification

### 6.1 Run focused regression tests

- [x] Run every focused Vitest command from `design.md` §9 directly with
      `./node_modules/.bin/vitest run`; require exit 0.
- [x] Confirm coverage includes unique all-null success, repeated all-null
      default failure, repeated explicit-inference success, partial evidence,
      orphan totals, exact destination duplicates, explicit multi-disc,
      selection, album art, source safety, and all public surfaces.

### 6.2 Run final repository checks

- [x] Run whole-codebase `npm run lint` only now; require exit 0.
- [x] Run `npm run build`; require exit 0.
- [x] Run `npm test`; require exit 0 and compare counts with Phase 1.
- [x] Confirm every touched source/test file is at most 200 lines.
- [x] Confirm `git diff -- package.json package-lock.json` and
      `git status --short -- etc` are empty.
- [x] Run `git diff --check`; require exit 0.

### 6.3 Verify dry-run transports

- [x] Start the built server with isolated configured test roots and retain its
      process/session identifier.
- [x] Run only affected album REST, GraphQL, and MCP Bruno dry-run requests;
      require every request, test, and assertion to pass.
- [x] Stop the captured server in all cases and recheck that fixtures and
      configured media roots are unchanged.

### 6.4 Audit scope and record results

- [x] Review the final diff for weakened explicit-disc validation, mixed flat
      and disc-folder plans, collision bypasses, source mutation, schema drift,
      or execution-default changes.
- [x] Confirm the final diff matches `design.md` §2 and contains no audiobook,
      dependency, root-configuration, historical-spec, or real-media edits.
- [x] Add concise blockquoted execution notes with baseline/final counts,
      focused tests, schema result, Bruno result, deviations, and blockers.

> Execution results: baseline `npm test` ran 54 files / 247 tests, with 53
> files / 246 tests passing and one generated-SDL read race. Final lint and
> build passed; final `npm test` passed all 55 files / 253 tests. The three
> focused design commands passed 7, 10, and 8 tests respectively, with broader
> focused groups also passing.
>
> The generated GraphQL SDL has no semantic diff. The isolated Bruno smoke run
> passed all 3 REST/GraphQL/MCP requests, 5/5 tests, and 3/3 assertions; the
> captured server was stopped and its destination and scratch roots remained
> empty. No repository media, dependency manifests, or root configuration were
> changed.
>
> Implementation deviations: repeated-track default failure and explicit
> inference ordering were already implemented, so they were locked with
> regression coverage rather than rewritten. The source changes add orphan
> disc-total completeness and remove redundant validation that ran before
> trackless-file selection; authoritative validation remains in the combined
> organization planner. The SDL reader now tolerates concurrent schema
> regeneration. There were no blockers.

## Phase 7 — Actionable repeated-track organization errors

- [x] Extract organization-only disc error formatting so validation rows retain
      their existing deterministic issue contract.
- [x] Group duplicate track numbers and filenames when repeated tracks activate
      `missing disc number` validation.
- [x] Recommend whole-album `setMetadata` JSON/CSV-path repair for incorrect
      numbering and explicit `discStrategy: "infer"` for real disc boundaries.
- [x] Confirm in the error that no files were written and preserve unrelated
      disc-set issue details.
- [x] Cover the shared diagnostic plus CLI, REST, GraphQL, and MCP error
      propagation without changing their schemas or execution defaults.
- [x] Update active album, GraphQL, MCP, skill, requirements, and design
      guidance; keep historical specs unchanged.
- [x] Run focused tests, final lint/build/test, the real Requiem dry run, line
      limits, scope audit, and `git diff --check`; record results below.

> Phase 7 results: focused shared/CLI/REST/GraphQL/MCP checks passed 35 tests,
> and the focused GraphQL HTTP integration passed 2 tests. Final lint and build
> passed; final `npm test` passed 55 files / 258 tests. The built Requiem dry
> run identified duplicate track 32 and both filenames, included `setMetadata`
> and explicit inference guidance, exited before planning, and confirmed no
> files were written. All touched source/test files remain at most 200 lines;
> package manifests, generated SDL, root configuration, and `etc/**` have no
> diff; `git diff --check` passed. There were no blockers.
