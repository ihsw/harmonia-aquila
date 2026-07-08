# Requirements: <Title>

<!--
  Replace placeholders in <angle brackets>. Delete sections that don't
  apply, but keep the numbering of the remaining sections stable.
  Use RFC 2119 keywords (MUST / MUST NOT / MAY / SHOULD) in FRs and NFRs.
-->

## 1. Background

<2–4 paragraphs explaining the current state. Link concrete file paths
(`apps/web-ui/...`, `packages/ui/...`). If this spec follows or depends
on a prior spec, name it: `The 2026-MM-DD spec <slug> …`.>

## 2. Goal

<One paragraph. Plain English description of what "done" looks like,
ideally including the externally observable invariants that MUST hold
(URL paths, JSON shapes, status codes, public exports, etc.).>

## 3. Scope

### In scope

- <Bullet list of files / folders / packages / public APIs that this
  spec is allowed to touch.>

### Out of scope

- <Bullet list of things this spec explicitly will NOT change. Be
  generous here — every "out of scope" bullet prevents future drift.>

## 4. Functional Requirements

- **FR-1** <Testable, observable requirement using MUST/MAY.>
- **FR-2** <…>
- **FR-3** <…>

<!--
  Tips:
  - Each FR is a single sentence (or a short bullet list under one).
  - Reference exact identifiers ("`createXxxHandler`",
    "`resolveStackSlug`", "`stackSlug`") when they exist or will exist.
  - For permitted behavioral deltas, use sub-FRs like FR-7a / FR-7b
    and document the rationale.
-->

## 5. Non-Functional Requirements

- **NFR-1 (lint after every edit)** After every modification of any file
  under `<scope path>`, the appropriate lint command MUST be run and any
  reported issues fixed before moving on. This applies per-edit, not
  per-task. <!-- Mandatory per AGENTS.md. -->
- **NFR-2 (typecheck)** `npm run build:ts` (or workspace equivalent)
  MUST exit 0 after the spec is complete.
- **NFR-3 (tests)** `npm test` MUST exit 0 after the spec is complete.
- **NFR-4 (no `npx`)** `npx` is forbidden in **all** forms (no
  `--no-install`, no one-off jest/tsc invocations). Any command line
  containing the substring `npx` is a violation. Use
  `./node_modules/.bin/<tool>` or `npm run <script>` exclusively.
  <!-- Mandatory per AGENTS.md. -->
- **NFR-5 (file size)** No file produced by this spec MAY exceed 200
  lines (per the project style guide).
- **NFR-6 (type safety)** Strict TypeScript; no `any`, no `// @ts-…`
  escapes.
- **NFR-7 (scope discipline)** `git diff --stat <forbidden path>` MUST
  be empty after the spec.
- **NFR-8 (behavioral parity)** <When refactoring, name the observable
  invariants that MUST be preserved.>

## 6. Acceptance Criteria

1. <Concrete, mechanically verifiable check, e.g. "`import { X } from
   '@ez-quote-admin/ui'` resolves and type-checks".>
2. <Lint, typecheck, tests all exit 0 in the affected workspace.>
3. <`git diff --stat` matches the expected file list.>
4. <Optional: manual smoke check, e.g. `curl` against a dev server.>

