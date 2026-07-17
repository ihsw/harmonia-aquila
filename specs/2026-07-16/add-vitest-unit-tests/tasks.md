# Tasks: Add Vitest Unit Tests

> ## Hard constraints (re-read before starting)
>
> - **DO NOT START** implementation until the user explicitly directs it. This
>   file is a plan, not a work order.
> - **No `npx`** in any form. Use `npm run <script>` or
>   `./node_modules/.bin/<tool>` only.
> - Make no edits outside test infrastructure, `src/**` test seams/tests, and
>   testing documentation (NFR-7). Stop and report any unrelated defect.
> - After **every** `src/**/*.ts` modification, run `npm run lint` and fix all
>   reported issues before the next source-code edit (NFR-1).
> - Mark each matching `- [x]` checkbox **immediately** when its task is
>   complete, so progress remains resumable.

## Phase 1 — Pre-flight

### 1.1 Record the baseline

- [x] Run `npm run lint`, `npm run build`, and `npm test`; record their exit
      statuses, including the expected placeholder-test failure.
- [x] Inspect the installed package and lockfile state before dependency edits.

## Phase 2 — Establish Vitest infrastructure

### 2.1 Add the local test runner

- [x] Add Vitest as a development dependency with npm and update
      `package-lock.json` (FR-1).
- [x] Replace the placeholder `test` script and add the `test:watch` script
      (FR-1, FR-2).

### 2.2 Configure discovery

- [x] Create `vitest.config.ts` for Node-based `src/**/*.test.ts` discovery
      and generated/dependency directory exclusions (FR-3).
- [x] Run `npm run build` and `npm test`; resolve configuration or ESM errors.

## Phase 3 — Add shared and album coverage

### 3.1 Create test utilities

- [x] Add typed temporary-directory and metadata-fixture helpers under the
      selected test layout; do not introduce real media fixtures (NFR-5).
- [x] Add `command-utils` tests for JSON output, invalid format, and path
      existence (FR-4).
- [x] Run `npm run lint` after each `src/**/*.ts` edit.

### 3.2 Cover album operations

- [x] Add helper tests for file discovery, extension enforcement, and limits
      (FR-5).
- [x] Add summarize, fix-tags, and organize-files tests matching the coverage
      matrix in `design.md` §5 (FR-5).
- [x] Extract only narrow typed seams required by those tests and verify
      Commander JSON/error parity (FR-9, NFR-8).
- [x] Run `npm run lint` after each `src/**/*.ts` edit.

## Phase 4 — Add audiobook coverage

### 4.1 Mock external boundaries

- [x] Add typed Vitest mocks for `music-metadata`, `node-taglib-sharp`, and
      the m4b-tool helper; reset mocks between tests (FR-7, FR-8).
- [x] Run `npm run lint` after each `src/**/*.ts` edit.

### 4.2 Cover audiobook operations

- [x] Add tests for validate, copy-and-rename, and crawl using the coverage
      matrix in `design.md` §5 (FR-6).
- [x] Add merge and convert-file tests proving dry runs do not invoke the
      m4b-tool boundary (FR-6, FR-8).
- [x] Add set-metadata plan and invalid-destination tests without native writes
      (FR-6, FR-7).
- [x] Run `npm run lint` after each `src/**/*.ts` edit.

## Phase 5 — Verify and document

### 5.1 Complete automated verification

- [x] Run `npm run lint` — exit 0.
- [x] Run `npm run build` — exit 0.
- [x] Run `npm test` — exit 0.
- [x] Confirm the suite needs neither Docker, network access, nor real media
      files (NFR-5).

### 5.2 Document the workflow

- [x] Add `docs/testing.md` with full-suite, watch-mode, and focused-test
      commands that do not use `npx` (FR-10).
- [x] Compare `git --no-pager diff -- docs/mcp-server.md` with the Phase 1
      baseline; verify this work added no MCP-design changes. Confirm `etc/**`
      remains unchanged (NFR-7).
