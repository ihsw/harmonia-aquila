# Tasks: Reorganize Web Files

> ## Hard constraints (re-read before starting)
>
> - **DO NOT START** any task below until the user explicitly directs you to.
>   This file is delivered as a plan, not as a work order.
> - **No `npx`** in any form. Forbidden in **all** invocations
>   (no `--no-install`, no one-off Vitest/tsc runs, etc.). Any command line
>   containing the substring `npx` is a violation and must be rewritten before
>   execution. Use `npm run <script>` or existing binaries under
>   `./node_modules/.bin/` exclusively.
> - **No edits outside `src/web/**`, import updates in `src/commands/web/**`,
>   web-focused tests under `__tests__/web/**`, and directly related docs** for
>   this spec unless a blocker is found and the user explicitly approves
>   expanding scope.
> - After **every** source code file modification (for example, a `.ts` edit),
>   run `npm run lint -- <modified-file>` and fix any reported issues before
>   moving on (NFR-1). This MUST lint only the file just modified. Do this per
>   source-code edit, not per-task.
> - Run whole-codebase `npm run lint` only as a last-call verification after all
>   TypeScript modifications are complete, including not using whole-codebase
>   lint as a pre-flight baseline.
> - Mark the matching `- [x]` checkbox **immediately** when each task is
>   finished, so progress is resumable.

## Phase 1 — Pre-flight

### 1.1 Confirm current web import surface

- [ ] Inspect repo-local imports of `src/web/*.ts` and record the files that need path updates.
- [ ] Inspect `__tests__/web/**` for direct imports and mocks that reference flat `src/web/` files.
- [ ] Do **not** run whole-codebase `npm run lint` as a pre-flight baseline; reserve it for final verification.

### 1.2 Confirm target layout

- [ ] Re-read `design.md` §2 and choose whether `http-errors.ts` remains root-level or moves to `src/web/providers/http-errors.ts`.
- [ ] Create the target subdirectories: `controllers`, `modules`, `providers`, `schemas`, and `servers`.

## Phase 2 — Schemas

### 2.1 Move HTTP and MCP schema files

- [ ] Move `src/web/request-schemas.ts` to `src/web/schemas/request-schemas.ts`.
- [ ] Move `src/web/mcp-schemas.ts` to `src/web/schemas/mcp-schemas.ts`.
- [ ] Update all source imports that reference the moved schema files.
- [ ] Run `npm run lint -- src/web/schemas/request-schemas.ts`. Fix issues. Re-run until clean.
- [ ] Run `npm run lint -- src/web/schemas/mcp-schemas.ts`. Fix issues. Re-run until clean.

## Phase 3 — Providers and servers

### 3.1 Move path resolver provider

- [ ] Move `src/web/path-resolver.ts` to `src/web/providers/path-resolver.ts`.
- [ ] Update all source and test imports that reference `WebPathResolver`, `WebRoots`, or `normalizeWebRoots`.
- [ ] Run `npm run lint -- src/web/providers/path-resolver.ts`. Fix issues. Re-run until clean.

### 3.2 Move MCP server factory

- [ ] Move `src/web/mcp-server.ts` to `src/web/servers/mcp-server.ts`.
- [ ] Update imports for `WebMcpServerFactory`, MCP schemas, path resolver, and request schema helpers.
- [ ] Run `npm run lint -- src/web/servers/mcp-server.ts`. Fix issues. Re-run until clean.

### 3.3 Place HTTP error mapping

- [ ] Either keep `src/web/http-errors.ts` as the root cross-cutting utility or move it to `src/web/providers/http-errors.ts` per `design.md` §2.
- [ ] Update all controller imports of `throwHttpError` consistently and do not leave duplicate implementations.
- [ ] If moved, run `npm run lint -- src/web/providers/http-errors.ts`; if retained and edited, run `npm run lint -- src/web/http-errors.ts`. Fix issues. Re-run until clean.

## Phase 4 — Controllers and module

### 4.1 Move controllers

- [ ] Move `src/web/manage-albums.controller.ts` to `src/web/controllers/manage-albums.controller.ts`.
- [ ] Move `src/web/manage-audiobooks.controller.ts` to `src/web/controllers/manage-audiobooks.controller.ts`.
- [ ] Move `src/web/mcp.controller.ts` to `src/web/controllers/mcp.controller.ts`.
- [ ] Update imports in each moved controller for schemas, providers, servers, HTTP errors, and shared `src/lib/**` modules.
- [ ] Run `npm run lint -- src/web/controllers/manage-albums.controller.ts`. Fix issues. Re-run until clean.
- [ ] Run `npm run lint -- src/web/controllers/manage-audiobooks.controller.ts`. Fix issues. Re-run until clean.
- [ ] Run `npm run lint -- src/web/controllers/mcp.controller.ts`. Fix issues. Re-run until clean.

### 4.2 Move app module

- [ ] Move `src/web/app.module.ts` to `src/web/modules/app.module.ts`.
- [ ] Update module imports for controllers, providers, and server factory.
- [ ] Update `src/web/main.ts` to import `createAppModule` from `./modules/app.module.js` and web roots from the provider path.
- [ ] Run `npm run lint -- src/web/modules/app.module.ts`. Fix issues. Re-run until clean.
- [ ] Run `npm run lint -- src/web/main.ts`. Fix issues. Re-run until clean.

## Phase 5 — Tests and import consumers

### 5.1 Update web tests

- [ ] Update `__tests__/web/**` imports and mocks to the moved web file paths.
- [ ] Keep all behavioral assertions intact; do not weaken validation, route, MCP, or path traversal expectations.
- [ ] Run `npm run lint -- <modified-test-file>` for each modified test file. Fix issues. Re-run until clean.

### 5.2 Update command imports

- [ ] Update `src/commands/web/**` imports only if they reference moved non-root web files.
- [ ] Preserve `src/web/main.ts` as the preferred bootstrap import unless implementation explicitly moves it and updates `design.md`.
- [ ] Run `npm run lint -- <modified-command-file>` for each modified command file. Fix issues. Re-run until clean.

### 5.3 Remove old root files

- [ ] Confirm old root-level implementation files under `src/web/` are gone except intentionally retained `main.ts` and optional `http-errors.ts`.
- [ ] Search for stale imports of old paths and update them before verification.

## Phase 6 — Verification

### 6.1 Focused verification

- [ ] `./node_modules/.bin/vitest run __tests__/web` — exit 0.
- [ ] `npm run build` — exit 0 before live Bruno verification.

### 6.2 Live Bruno verification

- [ ] Start `npm run web:serve -- --source-dir etc/1-source-files --dest-dir etc/2-destination-files --host 127.0.0.1 --port 3000` and capture the specific PID.
- [ ] `cd collections/harmonia-aquila-web && ../../node_modules/.bin/bru run . -r --env local --bail` — exit 0.
- [ ] Stop the captured `web serve` PID using `kill <PID>`.

### 6.3 Full verification

- [ ] `npm run lint` — whole-codebase last-call lint after all TypeScript modifications are complete; exit 0.
- [ ] `npm run build` — exit 0.
- [ ] `npm test` — exit 0.
- [ ] `git --no-pager diff --stat -- src/web src/commands/web __tests__/web` lists only expected moves and import/test updates.

## Phase 7 — Documentation

### 7.1 Update directly related docs only

- [ ] If an existing web architecture or API document references the old flat `src/web/` layout, update those path references.
- [ ] If no such document exists, do not create broad new docs; the spec and tests are sufficient.
