# Tasks: Album Disc Metadata Support

> ## Hard constraints (re-read before starting)
>
> - **DO NOT START** any task below until the user explicitly directs you to.
>   This file is delivered as a plan, not as a work order.
> - **No `npx`** in any form. Use `./node_modules/.bin/<tool>` or
>   `npm run <script>` exclusively (NFR-2).
> - **No edits outside the album domain/adapters/tests/collections/docs listed
>   in `design.md` §2** (NFR-9). If another change is necessary, STOP and
>   surface it; do not patch silently.
> - After **every** source code file modification, run
>   `npm run lint -- <modified-file>` and fix all issues before moving on
>   (NFR-1). Lint only the file just modified and do this per edit, not per
>   task.
> - Run whole-codebase `npm run lint` only as final verification after all
>   TypeScript modifications are complete; never use it as pre-flight.
> - Mark the matching `- [x]` checkbox **immediately** when each task is
>   finished so progress is resumable.

## Phase 1 — Pre-flight

### 1.1 Record baseline and scope

- [ ] Do not run whole-codebase lint as a baseline.
- [ ] Record `git status --short` and preserve all pre-existing user changes.
- [ ] Run `npm test` and record pass/fail counts.
- [ ] Confirm the installed `music-metadata` disk shape and
      `node-taglib-sharp` disc/discCount writer APIs.
- [ ] Confirm the expected files in `design.md` §2 and identify any files that
      must be split to remain at or below 200 lines.

## Phase 2 — Pure disc model

### 2.1 Add canonical helpers

- [ ] Add `src/lib/albums/disc-metadata.ts` with canonical types, formatting,
      multi-disc detection, structured validation issues, and deterministic
      inference from `design.md` §§3–6.
- [ ] Run `npm run lint -- src/lib/albums/disc-metadata.ts`; fix and rerun
      until clean.

### 2.2 Test the pure policy

- [ ] Add focused helper, validation-matrix, and inference tests, splitting
      files as listed in `design.md` §2.
- [ ] After each test-file edit, run
      `npm run lint -- <modified-test-file>` and fix all findings immediately.
- [ ] Run the three focused disc-helper Vitest files and mark this task
      complete only when they pass.

## Phase 3 — Tag writer and set-metadata

### 3.1 Extend format-independent writes

- [ ] Add `discNumber` and `discTotal` to `AudioTagFix` and assign
      `tag.disc`/`tag.discCount` before save.
- [ ] Run `npm run lint -- src/lib/albums/audio-tags.ts`; fix and rerun until
      clean.
- [ ] Extend MP3 and FLAC tag-writer tests for disc 2 of 3, save, and dispose.
- [ ] Run `npm run lint -- __tests__/lib/albums/audio-tags.test.ts`; fix and
      rerun until clean.
- [ ] Run the focused audio-tags test.

### 3.2 Extend JSON/CSV metadata records

- [ ] Add optional positive-integer `discNumber` and `discTotal` parsing and
      cross-field validation without changing existing required fields.
- [ ] Run
      `npm run lint -- src/commands/manage-albums/helpers/set-metadata.ts`;
      fix and rerun until clean.
- [ ] Add backward compatibility and invalid-value JSON/CSV tests.
- [ ] Run
      `npm run lint -- __tests__/commands/manage-albums/helpers/set-metadata.test.ts`;
      fix and rerun until clean.
- [ ] Run the focused set-metadata test.

## Phase 4 — Summary and validation

### 4.1 Expose summary fields

- [ ] Add formatted `discNumber` and `discTotal` summary fields (FR-4).
- [ ] Run `npm run lint -- src/lib/albums/summarize-source-dir.ts`; fix and
      rerun until clean.
- [ ] Extend summary domain and CLI tests for absent and present values,
      linting each modified test file immediately.
- [ ] Run the focused summary tests.

### 4.2 Enforce disc validation

- [ ] Integrate the shared disc validator into validation after `limit` and
      before destination creation.
- [ ] Add disc fields and deterministic issues to validation rows (FR-5–FR-7).
- [ ] Run `npm run lint -- src/lib/albums/validate.ts`; fix and rerun after
      each edit until clean.
- [ ] Add the validation matrix, issue-order, limit, and legacy regression
      tests, linting each modified test file immediately.
- [ ] Run the focused validation domain and CLI tests.

## Phase 5 — Disc-aware organization

### 5.1 Extend destination planning

- [ ] Add optional disc context to the organization-plan destination helper,
      preserving the exact legacy path and adding `Disc DD` only for
      multi-disc sets.
- [ ] Run `npm run lint -- src/lib/albums/organization-plan.ts`; fix and rerun
      until clean.

### 5.2 Integrate organization preflight

- [ ] Parse disc metadata, validate the selected set, compute set-wide
      multi-disc context, and add disc row fields before filesystem checks.
- [ ] Run `npm run lint -- src/lib/albums/organize-files.ts`; fix and rerun
      after each edit until clean.
- [ ] Add legacy-path, disc-folder, repeated-track, collision, limit, and
      preflight-no-write tests; split oversized test files.
- [ ] After each test edit, run `npm run lint -- <modified-test-file>` and fix
      all findings immediately.
- [ ] Run the focused organization tests.

## Phase 6 — Fix-tags planning, inference, and verification

### 6.1 Add the domain strategy

- [ ] Add `discStrategy` parsing/default/error behavior and option conflicts.
- [ ] Integrate deterministic inference and explicit set-metadata values after
      selected metadata is parsed.
- [ ] Add old/new disc output fields and include disc changes in `hasChanges`
      and `AudioTagFix`.
- [ ] Add normalized post-write persistence verification for planned disc
      changes.
- [ ] Extract focused helpers if necessary so `fix-tags.ts` and new modules
      remain at or below 200 lines.
- [ ] After every source edit, run `npm run lint -- <modified-source-file>`;
      fix and rerun until clean.

### 6.2 Test fix-tags behavior

- [ ] Add tests for default no-change, dry-run inference, repeated/decreasing
      tracks, complete matching metadata, contradictions, missing tracks,
      `resetTrack`, set-metadata conflicts, execute writes, and failed
      persistence verification.
- [ ] Split tests by inference/write concern when necessary for NFR-5.
- [ ] After every test edit, run `npm run lint -- <modified-test-file>`; fix
      and rerun until clean.
- [ ] Run all focused fix-tags domain tests.

### 6.3 Register the CLI option

- [ ] Add `--disc-strategy <strategy>` with documented values and pass it
      unchanged to the domain.
- [ ] Run `npm run lint -- src/commands/manage-albums/fix-tags.ts`; fix and
      rerun until clean.
- [ ] Extend CLI option/output/error tests and lint each modified test file.
- [ ] Run all `__tests__/commands/manage-albums` tests.

## Phase 7 — REST, GraphQL, and MCP parity

### 7.1 Wire REST

- [ ] Add `discStrategy` to the fix-tags body schema and controller pass-through.
- [ ] After each edit, lint `src/web/schemas/request-schemas.ts` and
      `src/web/controllers/manage-albums.controller.ts` individually.
- [ ] Add REST schema/pass-through/output/error tests in the focused disc test
      file and lint it immediately.

### 7.2 Wire GraphQL

- [ ] Add `discStrategy` to `AlbumFixTagsInput`; add summary, validation,
      organization, and old/new fix-tags disc fields to row types.
- [ ] Pass `discStrategy` through the resolver and update generated
      `schema.gql`.
- [ ] After each TypeScript edit, run
      `npm run lint -- <modified-graphql-source-file>` and fix all findings.
- [ ] Add resolver and HTTP integration parity tests, linting each test file
      immediately.

### 7.3 Wire MCP

- [ ] Add optional `discStrategy` to the fix-tags Zod schema and handler
      pass-through without changing tool names, roots, or annotations.
- [ ] Lint the schema and handler separately after each modification.
- [ ] Add discovery, pass-through, output, invalid strategy, and error tests
      in the focused MCP file; lint it immediately.
- [ ] Run the focused REST, GraphQL, and MCP disc-parity tests.

## Phase 8 — Documentation and safe contract requests

### 8.1 Update public documentation

- [ ] Document tag mappings, validation rules, inference ordering and safety,
      set-metadata columns, destination shapes, and dry-run review in the docs
      listed by `design.md` §2.
- [ ] Update `docs/testing.md` for newly split focused tests.

### 8.2 Update Bruno coverage

- [ ] Update only affected summary/validate/organize/fix-tags REST, GraphQL,
      and MCP requests to query/assert additive disc fields.
- [ ] Add safe inference dry-run coverage with execute omitted; do not add an
      execute request.
- [ ] Run the affected Bruno folder or requests against a temporary
      three-root server and stop the captured server afterward.

## Phase 9 — Verification

### 9.1 Focused verification

- [ ] Run the four focused command groups from `design.md` §11; all exit 0.
- [ ] Confirm tests cover every FR-6 validation state and FR-14 inference
      boundary.
- [ ] Confirm no test or source file produced by the work exceeds 200 lines.

### 9.2 Final lint, build, and tests

- [ ] Run `npm run lint` once as the whole-codebase last-call lint after all
      TypeScript modifications are complete; exit 0.
- [ ] Run `npm run build`; exit 0.
- [ ] Run `npm test`; exit 0 and compare counts with Phase 1.

### 9.3 Scope verification

- [ ] Run
      `git --no-pager diff --stat -- etc package.json package-lock.json src/lib/audiobooks src/commands/manage-audiobooks`;
      confirm this spec introduced no changes.
- [ ] Run `git --no-pager diff --stat` and confirm all changes match
      `design.md` §2.
- [ ] Confirm no real source, scratch, or destination media was written.

## Phase 10 — Documentation handoff

### 10.1 Record execution notes

- [ ] Record baseline/final test counts and any approved deviations beneath
      the relevant phase as blockquoted notes.
- [ ] Confirm every completed task was marked `[x]` immediately and leave all
      unfinished tasks unchecked.
