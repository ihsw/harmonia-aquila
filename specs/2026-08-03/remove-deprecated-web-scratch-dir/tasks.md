# Tasks: Remove Deprecated Web Scratch Directory

> ## Hard constraints (re-read before starting)
>
> - **DO NOT START** any task below until the user explicitly directs you to. This file is a plan, not a work order.
> - **No npx** in any form. Use npm run <script> or ./node_modules/.bin/<tool> exclusively.
> - Do not edit outside design.md section 2. If a required change falls outside that list, stop and obtain direction rather than expanding scope.
> - Do not modify shared libraries, standalone album commands, audiobook tool source, dependencies, etc/**, or historical specs.
> - After **every** source-code file modification, run npm run lint -- <modified-file> and fix reported issues before moving on (NFR-1). Lint only that edited file, per edit.
> - Run whole-codebase npm run lint only as final verification after all TypeScript modifications are complete; never use it as a pre-flight check.
> - Mark the matching - [x] checkbox **immediately** when each task is finished, so progress is resumable.

## Phase 1 — Pre-flight

### 1.1 Audit the deprecated contract

- [ ] Record git status --short and preserve unrelated user work.
- [ ] Audit every active scratchDir, --scratch-dir, and useScratchDir reference, every WebRoots/createWebApp/serveWeb construction, and affected REST, GraphQL, MCP, Bruno, script, documentation, and skill contracts from design.md section 2.
- [ ] Run the focused Vitest commands in design.md section 8 and record the baseline; do not run whole-codebase lint.

## Phase 2 — Two-root web bootstrap

### 2.1 Remove the scratch configuration

- [ ] Remove the Commander scratch option, its required-option check, and serveWeb propagation in src/commands/web/serve.ts (FR-1).
- [ ] Reduce WebRoots, normalizeWebRoots, and WebPathResolver to source and destination roots, including removal of scratch-only APIs (FR-2).
- [ ] Update command, bootstrap, logging, controller, MCP-helper, and shared web test fixtures to create and clean up only source/destination roots.
- [ ] After every edited TypeScript file, run npm run lint -- <modified-file> and rerun the focused bootstrap/command tests until clean.

## Phase 3 — REST and GraphQL album routing

### 3.1 Remove REST scratch selection

- [ ] Remove useScratchDir from REST list and organize request schemas.
- [ ] Make REST list, summary, and validation use source; make organization pass source input and destination output to the shared operation (FR-3).
- [ ] Update REST controller/error/metadata tests to assert distinct source/destination values, source traversal rejection, and dry-run safety without scratch cases.
- [ ] Run npm run lint -- <modified-file> after every source/test edit and rerun the focused REST test commands.

### 3.2 Remove GraphQL scratch selection

- [ ] Remove the fields and decorators from AlbumListInput and AlbumOrganizeFilesInput (FR-4).
- [ ] Route albumList to source and albumOrganizeFiles to destination; preserve source resolution for single and multi-disc inputs.
- [ ] Regenerate src/web/modules/graphql/schema.gql through application initialization; do not hand-edit it.
- [ ] Update resolver and integration tests for the reduced schema, distinct roots, unchanged envelopes, and destination organization output.
- [ ] Run per-file lint after every TypeScript edit and the focused GraphQL tests until they pass.

## Phase 4 — MCP contract cleanup

### 4.1 Remove MCP scratch selection

- [ ] Remove useScratchDir from the list, validation, and organization MCP Zod input schemas (FR-5).
- [ ] Simplify list and validation handlers to source-root resolution; retain organization's source input and configured destination output.
- [ ] Update MCP tests for discovery schemas without selector properties, source resolution/traversal failures, dry-run behavior, and unchanged tool names, ordering, annotations, and JSON-text results.
- [ ] Run npm run lint -- <modified-file> after every source/test edit and rerun the focused MCP test command.

## Phase 5 — Collections, scripts, and documentation

### 5.1 Remove obsolete live requests

- [ ] Delete the six scratch-specific Bruno requests in design.md section 2.
- [ ] Remove useScratchDir from the remaining GraphQL organizer request and MCP discovery assertions; retain source traversal and dry-run coverage.
- [ ] Update bin/web-serve.sh for two-root startup and run the relevant collection validation without an execute request.

### 5.2 Document the two-root model

- [ ] Update README, MCP server, GraphQL, and testing documentation to remove scratch setup/selection and describe source reads plus destination writes.
- [ ] Update .agents/skills/album-organization/SKILL.md with the same transport routing and prompt guidance.
- [ ] Run the active-tree removal audit from design.md section 5; it must report no non-spec references.

## Phase 6 — Final verification

### 6.1 Complete quality checks

- [ ] Rerun every focused Vitest command in design.md section 8.
- [ ] Run npm run lint as the final whole-codebase lint after all TypeScript modifications; fix any findings and rerun as needed.
- [ ] Run npm run build and npm test; both must exit 0.
- [ ] Run git diff --check and verify no unexpected generated files changed.

### 6.2 Live two-root smoke test and scope audit

- [ ] Start web serve with distinct existing temporary source/destination roots and no scratch option, as defined in design.md section 8.
- [ ] Run the Bruno collection with ./node_modules/.bin/bru; all calls must retain dry-run behavior and source files must remain unchanged.
- [ ] Stop the captured server process and clean up only the known temporary test roots.
- [ ] Confirm the active-tree scratch audit is empty and the final diff is limited to design.md section 2 plus this spec directory (NFR-5).

