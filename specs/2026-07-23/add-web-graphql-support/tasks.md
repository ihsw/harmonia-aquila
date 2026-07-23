# Tasks: Add Web GraphQL Support

> ## Hard constraints (re-read before starting)
>
> - **DO NOT START** any task below until the user explicitly directs you to.
>   This is a plan, not a work order.
> - **No `npx`** in any form. Use `npm run <script>` or
>   `./node_modules/.bin/<tool>` exclusively.
> - **No edits outside** dependency manifests, `tsconfig.base.json`,
>   `src/web/modules/graphql/**`, `src/web/modules/app.module.ts`, GraphQL
>   tests, and `docs/graphql.md`
>   (NFR-7). Stop and request approval for any scope expansion.
> - After **every** source code modification, run
>   `npm run lint -- <modified-file>` and fix all reported issues before moving
>   on (NFR-1). Do this per edit, not per task.
> - Run whole-codebase `npm run lint` only as final verification after all
>   TypeScript modifications; do not use it as a pre-flight baseline.
> - Mark the matching `- [x]` checkbox **immediately** when each task is
>   finished, so progress remains resumable.

## Phase 1 — Pre-flight and dependencies

### 1.1 Confirm boundaries and current behavior

- [x] Inspect `createAppModule`, `WebPathResolver`, all ten controller methods,
      domain output interfaces, bootstrap tests, and existing dirty-worktree
      state.
- [x] Do not run whole-codebase lint as a pre-flight baseline.
- [x] Confirm REST controllers, MCP tools, CLI/domain services, and collections
      are excluded from the implementation diff.

### 1.2 Install compatible runtime packages

- [x] Use npm to add `@nestjs/graphql`, `@nestjs/apollo`, `@apollo/server`,
      `@as-integrations/express5`, and `graphql` with versions compatible with
      the existing NestJS 11/Express 5 dependency graph; update
      `package-lock.json`.
- [x] Inspect npm's resolved peer dependencies and add no optional package
      unless it is a direct runtime blocker documented with the change.
- [x] Enable `emitDecoratorMetadata` in `tsconfig.base.json` after explicit
      user approval; NestJS GraphQL requires resolver argument metadata during
      schema construction.

## Phase 2 — Decorated contracts and GraphQL module

### 2.1 Define GraphQL input and object types

- [x] Create scoped `album.inputs.ts`, `album.rows.ts`, `audiobook.inputs.ts`,
      and `audiobook.rows.ts` with `@InputType` and
      `@ObjectType` classes for all ten operations and every current row field,
      including nullable and list fields from `design.md` section 4.
- [x] Represent GraphQL optionals/nullability explicitly and preserve
      string-based strategy, limit, jobs, and concurrency service contracts.
- [x] Run lint after each GraphQL contract file modification. Fix
      issues and re-run until clean.

### 2.2 Add error handling and resolvers

- [x] Create `graphql-error.filter.ts` to map `UserInputError` to
      `BAD_USER_INPUT`, mask unexpected errors as `INTERNAL_SERVER_ERROR`, and
      retain existing logger integration.
- [x] Create `album.resolver.ts` with the two read-only queries and two
      dry-run-first mutations, using `WebPathResolver` for all relevant paths.
- [x] Create `audiobook.resolver.ts` with the two queries and four mutations,
      resolving each source/destination path and preserving jobs/concurrency
      defaults.
- [x] Run per-file lint immediately after each of the three source-file edits,
      fixing issues before the next edit.

### 2.3 Configure the named NestJS module

- [x] Create `graphql.module.ts` with the Apollo driver, `/graphql`,
      deterministic code-first SDL generation, the dynamic root-bound path
      resolver, resolvers, and error filter.
- [x] Update `src/web/modules/app.module.ts` to import the dynamic module
      without changing existing controller/provider behavior.
- [x] Initialize the application to generate and commit
      `src/web/modules/graphql/schema.gql`; do not hand-edit generated SDL.
- [x] Run `npm run lint -- src/web/modules/graphql/graphql.module.ts` and
      `npm run lint -- src/web/modules/app.module.ts`, fixing each before
      proceeding.

## Phase 3 — Test GraphQL behavior

### 3.1 Test album resolver mapping

- [x] Add `__tests__/web/graphql/album.resolver.test.ts` covering both queries,
      both mutations, exact domain-service options, source traversal rejection,
      and default dry-run behavior.
- [x] Run `npm run lint -- __tests__/web/graphql/album.resolver.test.ts`. Fix
      issues and re-run until clean.
- [x] Run `./node_modules/.bin/vitest run __tests__/web/graphql/album.resolver.test.ts`.

### 3.2 Test audiobook resolver mapping

- [x] Add `__tests__/web/graphql/audiobook.resolver.test.ts` covering query and
      mutation mapping, each source/destination boundary, filenames arrays, and
      default conversion/merge jobs and concurrency.
- [x] Run `npm run lint -- __tests__/web/graphql/audiobook.resolver.test.ts`.
      Fix issues and re-run until clean.
- [x] Run `./node_modules/.bin/vitest run __tests__/web/graphql/audiobook.resolver.test.ts`.

### 3.3 Test GraphQL HTTP integration

- [x] Add `__tests__/web/graphql/graphql.integration.test.ts` for `/graphql`
      queries/mutations, schema availability, `BAD_USER_INPUT`, masked internal
      failures, and coexistence with REST and `/mcp`.
- [x] Leave `__tests__/web/bootstrap.test.ts` unchanged: the new integration
      suite asserts GraphQL initialization directly.
      successful GraphQL initialization.
- [x] Run per-file lint after every test edit, then run
      `./node_modules/.bin/vitest run __tests__/web/graphql/graphql.integration.test.ts __tests__/web/bootstrap.test.ts`.

## Phase 4 — Documentation

### 4.1 Document the public GraphQL API

- [x] Create `docs/graphql.md` with the `/graphql` endpoint, all operation
      names, typed variable examples, dry-run-first behavior, `execute: true`
      write opt-in, error codes, and the statement that configured roots are
      never client inputs.
- [x] Verify examples do not expose real filesystem paths or promise
      authentication/subscriptions outside the scope.

## Phase 5 — Final verification

### 5.1 Run final quality checks

- [x] Regenerate the SDL by normal app initialization and confirm the tracked
      `schema.gql` matches the decorated API.
- [x] `npm run lint` — final whole-codebase lint; exit 0.
- [x] `npm run build` — exit 0.
- [x] `npm test` — exit 0.

### 5.2 Verify scope and compatibility

- [x] Confirm `git --no-pager diff --stat -- src/lib src/commands
      src/web/controllers src/web/servers collections` is empty.
- [x] Confirm expected changes are limited to `package.json`,
      `package-lock.json`, `src/web/modules/**`, `__tests__/web/graphql/**`,
      any needed bootstrap test, and `docs/graphql.md`.
- [x] Confirm REST controller and MCP test suites still pass as part of the
      complete test run.
