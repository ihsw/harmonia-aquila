# Tasks: Preserve TPOS When Concatenating Albums

> ## Hard constraints (re-read before starting)
>
> - **DO NOT START** any task until the user explicitly directs execution;
>   this spec is a plan, not a work order.
> - **No `npx`** in any form. Use repository `npm run` scripts or
>   `./node_modules/.bin/<tool>` exclusively (NFR-4).
> - Make no edits outside concatenate metadata/layout planning, focused
>   CLI/web tests, related docs, and this spec (requirements §3).
> - Do not modify `etc/albums/**`, `package.json`, or lockfiles.
> - After **every** source code file modification, run
>   `npm run lint -- <modified-file>` and fix issues before continuing
>   (NFR-1). Do this per edit, not per task.
> - Do not run whole-codebase `npm run lint` as a pre-flight baseline; reserve
>   it for final verification after all TypeScript modifications are complete.
> - Mark the matching `- [x]` checkbox **immediately** when each task finishes
>   so progress remains resumable.

## Phase 1 — Pre-flight and behavioral lock

### 1.1 Capture the baseline

- [ ] Record `git status --short` and preserve all pre-existing changes.
- [ ] Run the focused concatenate tests and `npm test`, recording pass/fail
      counts without running whole-codebase lint.
- [ ] Confirm `package.json`, lockfiles, and `etc/albums/**` have no pending
      implementation changes.

### 1.2 Add failing revised-semantics tests

- [ ] Replace global-track/empty-disc expectations with local-track/canonical-
      disc expectations for ordered two- and three-directory fixtures
      (FR-1–FR-2, FR-6).
- [ ] Add missing, correct, partial, conflicting-number, and conflicting-total
      disc-tag cases (FR-3–FR-5, FR-9).
- [ ] Add flat-layout success and exact-destination atomic failure cases
      (FR-7–FR-8).
- [ ] After every test-file edit, run `npm run lint -- <modified-file>`.

## Phase 2 — Directory-derived disc context

### 2.1 Replace global track mapping

- [ ] Update `src/lib/albums/concatenate-album-sources.ts` to return canonical
      disc number/total by source path while retaining ordered local tracks
      (design §3).
- [ ] Remove global track assignment and retain existing positive/unique local
      track validation and deterministic ordering.
- [ ] Run `npm run lint -- src/lib/albums/concatenate-album-sources.ts`; fix and
      rerun until clean.

### 2.2 Apply conditional disc fixes

- [ ] Update concatenate orchestration in `src/lib/albums/organize-files.ts`
      to preserve local tracks and apply canonical disc context (design §4).
- [ ] Emit disc tag fixes and `tagChanges` only for components that differ;
      remove concatenate-generated track changes (FR-3–FR-6).
- [ ] Run `npm run lint -- src/lib/albums/organize-files.ts`; fix and rerun
      until clean.

## Phase 3 — Flat physical layout with multi-disc metadata

### 3.1 Add an internal layout policy

- [ ] Add the smallest typed internal policy needed to distinguish ordinary
      disc-directory layout from concatenate flat layout (design §5).
- [ ] Pass flat layout only from concatenate orchestration; preserve singular
      `infer` and `no change` defaults (FR-7, FR-13).
- [ ] After every affected source-file edit, run
      `npm run lint -- <modified-file>` and fix all findings immediately.

### 3.2 Retain collision and atomicity guarantees

- [ ] Prove distinct repeated local numbers can coexist when destinations
      differ by title.
- [ ] Prove an exact repeated local track/title/extension destination aborts
      the combined execution before audio or art is written (FR-8, FR-10).
- [ ] After every test-file edit, run `npm run lint -- <modified-file>`.

## Phase 4 — Metadata execution coverage

### 4.1 Verify destination tags

- [ ] Extend execution tests for correct tags (no redundant mutation), absent
      tags (set), and conflicting tags (repair), while sources remain unchanged.
- [ ] Add or extend an MP3 execution fixture that reparses the destination and
      verifies TPOS number/total plus the preserved local track number (FR-5).
- [ ] Add or extend equivalent FLAC destination verification.
- [ ] After every test-file edit, run `npm run lint -- <modified-file>`.

### 4.2 Verify public surfaces

- [ ] Update focused CLI expectations and help-text tests without changing
      request flags.
- [ ] Update REST, GraphQL, and MCP concatenate output expectations to canonical
      disc fields and preserved local tracks; retain input-schema assertions.
- [ ] Confirm artwork selection, `sourceDirectory`, result actions, and
      dry-run/execute parity remain unchanged (FR-10–FR-11).
- [ ] After every source or test-file edit, run
      `npm run lint -- <modified-file>`.

## Phase 5 — Documentation

### 5.1 Correct concatenate contracts

- [ ] Update `docs/album-organization.md` with ordered disc assignment, local
      track preservation, TPOS/FLAC writing, flat layout, and collision rules.
- [ ] Update `docs/graphql.md` and `docs/mcp-server.md` with the same semantics
      and a two-directory example (FR-12).
- [ ] Remove statements that concatenate globally renumbers tracks or clears
      disc tags; note that this spec supersedes those original semantics.

## Phase 6 — Final verification

### 6.1 Run last-call checks

- [ ] Run whole-codebase `npm run lint` only now; require exit 0.
- [ ] Run `npm run build`; require exit 0.
- [ ] Run `npm test`; require exit 0 and reconcile with the Phase 1 baseline.

### 6.2 Verify scope and acceptance

- [ ] Confirm `git --no-pager diff -- package.json package-lock.json` is empty.
- [ ] Confirm `git --no-pager diff -- etc/albums` is empty.
- [ ] Confirm `git status --short` lists only expected spec, source, test, and
      documentation files plus preserved pre-existing changes.
- [ ] Reconcile every acceptance criterion in `requirements.md` §6 and append
      concise execution notes beneath completed phases.
