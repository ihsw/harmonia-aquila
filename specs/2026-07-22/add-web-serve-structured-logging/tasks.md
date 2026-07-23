# Tasks: Add Web Serve Structured Logging

> ## Hard constraints (re-read before starting)
>
> - **DO NOT START** any task below until the user explicitly directs you to.
>   This file is delivered as a plan, not as a work order.
> - **No `npx`** in any form. Use `npm run <script>` or
>   `./node_modules/.bin/<tool>` exclusively.
> - **No edits outside** `src/web/**`, `__tests__/web/**`, `package.json`,
>   `package-lock.json`, directly related docs, and this spec (NFR-7). If a
>   blocker needs another file, stop and request approval.
> - After **every** source-code file modification, run
>   `npm run lint -- <modified-file>` and fix reported issues before moving on
>   (NFR-1). This MUST lint only the file just modified, per edit, not per task.
> - Run whole-codebase `npm run lint` only as final verification after all
>   TypeScript modifications are complete.
> - Mark the matching `- [x]` checkbox **immediately** when each task is
>   finished, so progress is resumable.

## Phase 1 — Pre-flight

### 1.1 Confirm logging boundaries

- [ ] Inspect `src/web/main.ts`, existing bootstrap tests, and `/mcp` behavior;
      do not run whole-codebase lint as a baseline.
- [ ] Record existing `web serve` stdout/stderr behavior and ensure tests can use
      temporary source and destination roots.

## Phase 2 — Dependency and logger foundation

### 2.1 Add Pino

- [ ] Add `pino` as a production dependency with npm and commit the resulting
      `package.json` and `package-lock.json` changes only.

### 2.2 Create the web logger adapter

- [ ] Create `src/web/logging/web-logger.ts` with the Pino factory, stderr
      production destination, test-injectable destination, safe log-level parsing,
      and Nest `LoggerService` adapter described in `design.md` section 3.
- [ ] Run `npm run lint -- src/web/logging/web-logger.ts`. Fix issues and rerun
      until clean.

## Phase 3 — Request and failure logging

### 3.1 Add request completion middleware

- [ ] Create `src/web/logging/web-logging.middleware.ts` to set/validate
      `x-request-id`, store request context, and write one allowlisted completion
      record on response finish.
- [ ] Run `npm run lint -- src/web/logging/web-logging.middleware.ts`. Fix issues
      and rerun until clean.

### 3.2 Add unexpected-error logging

- [ ] Create `src/web/logging/web-logging-exception.filter.ts` to emit Pino
      serialized-error records for unexpected failures without changing Nest's
      existing responses.
- [ ] Run `npm run lint -- src/web/logging/web-logging-exception.filter.ts`. Fix
      issues and rerun until clean.

### 3.3 Wire bootstrap and lifecycle logging

- [ ] Update `src/web/main.ts` to install the Pino logger, middleware, exception
      filter, optional test injection, and post-listen `web.server.ready` event.
- [ ] Run `npm run lint -- src/web/main.ts`. Fix issues and rerun until clean.

## Phase 4 — Tests

### 4.1 Add structured logging coverage

- [ ] Create `__tests__/web/logging.test.ts` covering each case in
      `design.md` section 5, including request correlation and redaction.
- [ ] Run `npm run lint -- __tests__/web/logging.test.ts`. Fix issues and rerun
      until clean.
- [ ] Run `./node_modules/.bin/vitest run __tests__/web/logging.test.ts` and fix
      failures.

### 4.2 Protect existing web and MCP behavior

- [ ] Run `./node_modules/.bin/vitest run __tests__/web` and address only
      logging-caused regressions.
- [ ] Confirm the `/mcp` test suite still receives valid protocol responses and
      no log data in HTTP response bodies.

## Phase 5 — Documentation

### 5.1 Document web logging

- [ ] Update `docs/mcp-server.md` or the relevant web-serving documentation with
      JSON-on-stderr behavior, record categories, safe request-ID correlation, and
      the absence of request-body/query logging.

## Phase 6 — Final verification

### 6.1 Run full project checks

- [ ] Run `npm run lint` only now, after all TypeScript modifications are complete.
- [ ] Run `npm run build`.
- [ ] Run `npm test`.

### 6.2 Verify runtime behavior and scope

- [ ] Start the built `web serve` command with disposable roots and port `0`;
      verify a lifecycle record and a request record are valid JSON on stderr.
- [ ] Confirm stdout and `/mcp` HTTP responses contain no Pino log records.
- [ ] Run `git --no-pager diff --stat -- src/commands src/lib bin etc reports`;
      output MUST be empty (NFR-7).
- [ ] Run `git --no-pager diff --stat`; output MUST list only the files in
      `design.md` section 2.
