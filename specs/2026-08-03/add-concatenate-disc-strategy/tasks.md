# Tasks: Add Concatenate Disc Strategy

> ## Hard constraints (re-read before starting)
>
> - **DO NOT START** any task until the user explicitly directs execution;
>   this spec is a plan, not a work order.
> - **No `npx`** in any form. Use repository `npm run` scripts or
>   `./node_modules/.bin/<tool>` exclusively (NFR-4).
> - Make no edits outside the album organization core, its CLI/web/MCP
>   adapters, focused tests, docs, and this spec (requirements §3).
> - Do not modify `etc/albums/**`, `package.json`, or lockfiles.
> - After **every** source code file modification, run
>   `npm run lint -- <modified-file>` and fix issues before continuing
>   (NFR-1). Do this per edit, not per task.
> - Do not run whole-codebase `npm run lint` as a pre-flight baseline; reserve
>   it for final verification after all TypeScript modifications are complete.
> - Mark the matching `- [x]` checkbox **immediately** when each task finishes
>   so progress remains resumable.

## Phase 1 — Pre-flight and contracts

### 1.1 Capture the baseline

- [ ] Record `git status --short` and preserve all pre-existing changes.
- [ ] Run focused existing organize-files tests, then `npm test`, recording
      pass/fail counts without running whole-codebase lint.
- [ ] Confirm dependency manifests are unchanged before implementation.

### 1.2 Lock public behavior

- [ ] Add failing type/parser tests for `concatenate`, `sourceDirs`, and
      `albumArtStrategy` values and conflicts (FR-1–FR-3, FR-9, FR-15, FR-20).
- [ ] Add singular regression assertions before changing the implementation
      (FR-23).
- [ ] After each test-file edit, run `npm run lint -- <modified-file>`.

## Phase 2 — Core multi-source concatenation

### 2.1 Add option types and validation

- [ ] Add the discriminated singular/multi-source contract and new strategy
      types in the focused album type modules (design §3).
- [ ] Parse the strategies and reject cardinality, duplication, and incompatible
      option combinations with actionable errors.
- [ ] After every source-file edit, run `npm run lint -- <modified-file>`.

### 2.2 Read ordered flat sources

- [ ] Add `concatenate-album-sources.ts` to read each explicit directory
      without recursion and retain source index/directory identity (FR-4–FR-5).
- [ ] Require positive unique local track numbers, sort locally, and assign a
      continuous global sequence (FR-6).
- [ ] Cover duplicate basenames, reversed directory order, invalid later
      sources, and missing/duplicate tracks.
- [ ] After every source-file edit, run `npm run lint -- <modified-file>`.

### 2.3 Plan flat destinations and clear disc tags

- [ ] Add explicit numeric tag `set`/`clear` intent and migrate existing disc
      inference without changing its behavior (design §5).
- [ ] Make concatenate clear both disc fields and plan all tracks directly in
      one album folder after effective identity validation (FR-7–FR-8).
- [ ] Add dry-run and execution tests for global tracks, empty disc fields,
      no `Disc NN/`, destination-copy tags, and source immutability.
- [ ] After every source-file edit, run `npm run lint -- <modified-file>`.

## Phase 3 — Album-art collision strategy

### 3.1 Separate source-art selection from destination policy

- [ ] Group direct recognized art by sanitized resolved destination while
      retaining source order (FR-16).
- [ ] Fail atomically with all collision details when the strategy is missing
      (FR-17).
- [ ] Implement `first`, `last`, and `neither`; preserve every non-colliding
      art file (FR-18).
- [ ] Apply existing destination `error|ignore|overwrite` only to selected art
      (FR-21).
- [ ] After every source-file edit, run `npm run lint -- <modified-file>`.

### 3.2 Report every art decision

- [ ] Add `would exclude`/`excluded` actions and optional
      `sourceDirectory`, keeping exclusion rows out of copy execution
      (FR-13, FR-19).
- [ ] Make result ordering and dry-run/execute normalization deterministic
      (FR-22, NFR-8).
- [ ] Test no collision, missing strategy, all three strategies, multiple
      collision groups, retained unique art, and destination collisions.
- [ ] After every source-file edit, run `npm run lint -- <modified-file>`.

## Phase 4 — Public adapters

### 4.1 Wire the CLI

- [ ] Keep `--source-dir`, add mutually exclusive variadic `--source-dirs`,
      and add `--album-art-strategy` with accurate help text (FR-10, FR-15).
- [ ] Add CLI mapping, validation-error, dry-run output, and singular regression
      tests.
- [ ] After every source-file edit, run `npm run lint -- <modified-file>`.

### 4.2 Wire REST and GraphQL

- [ ] Add `albumDirs` and `albumArtStrategy` request fields, independently
      resolve each path, and preserve configured-root fallback (FR-12).
- [ ] Add nullable `sourceDirectory` and new actions to GraphQL output/schema.
- [ ] Cover mapping, input types, containment errors, output serialization, and
      existing singular requests in controller/resolver/integration tests.
- [ ] After every source-file edit, run `npm run lint -- <modified-file>`.

### 4.3 Wire MCP

- [ ] Make `albumDir` optional only when valid `albumDirs` is present; enforce
      array cardinality, uniqueness, trailing slashes, and mutual exclusion
      (FR-11).
- [ ] Resolve ordered entries independently through the selected MCP source or
      scratch root and pass `albumArtStrategy` to the core.
- [ ] Add tool-schema, handler-mapping, path-containment, output, and singular
      compatibility tests.
- [ ] After every source-file edit, run `npm run lint -- <modified-file>`.

## Phase 5 — Atomicity and regression coverage

### 5.1 Prove whole-plan preflight

- [ ] Add execute-mode tests in which a later source, metadata guard, art
      collision, or destination check fails, and assert no output was written
      (FR-14).
- [ ] Prove excluded rows never copy and selected rows preserve ordinary
      destination actions.
- [ ] After every source-file edit, run `npm run lint -- <modified-file>`.

### 5.2 Prove legacy parity

- [ ] Run and extend tests for singular input, `infer`, `no change`, album-art
      copying, all destination strategies, and existing adapters (FR-23).
- [ ] Confirm singular JSON omits `sourceDirectory` and retains its established
      row ordering and messages.
- [ ] After every test-file edit, run `npm run lint -- <modified-file>`.

## Phase 6 — Documentation

### 6.1 Document usage and safety rules

- [ ] Update album organization docs with CLI examples, ordered-source
      semantics, option conflicts, track/disc behavior, and an artwork table.
- [ ] Update REST, GraphQL, and MCP examples with `albumDirs` and
      `albumArtStrategy`, including the mandatory-on-collision error.
- [ ] State that destination collision strategy is separate and that dry-run
      review remains required before execution.

## Phase 7 — Final verification

### 7.1 Run last-call checks

- [ ] Run whole-codebase `npm run lint` only now; require exit 0.
- [ ] Run `npm run build`; require exit 0.
- [ ] Run `npm test`; require exit 0 and reconcile with the Phase 1 baseline.

### 7.2 Verify scope and acceptance

- [ ] Confirm `git --no-pager diff -- package.json package-lock.json` is empty.
- [ ] Confirm `git status --short` contains only expected files plus preserved
      pre-existing changes.
- [ ] Reconcile all acceptance criteria in `requirements.md` §6 and record
      concise execution notes beneath completed phases.
