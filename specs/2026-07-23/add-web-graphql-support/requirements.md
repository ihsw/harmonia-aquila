# Requirements: Add Web GraphQL Support

## 1. Background

`web serve` currently creates a NestJS application in `src/web/main.ts`. Its
HTTP surface consists of ten scoped album and audiobook operations implemented
by `ManageAlbumsController` and `ManageAudiobooksController`. Their input
validation, source/destination confinement, dry-run defaults, and domain
services are already shared with CLI and MCP adapters.

The project has NestJS 11 with the Express platform but has no GraphQL
packages, GraphQL module, schema, decorated GraphQL contracts, or resolvers.
The addition must provide a typed GraphQL alternative without replacing or
changing REST, MCP, CLI, filesystem safety, or logging behavior.

## 2. Goal

`web serve` MUST expose a code-first Apollo GraphQL endpoint at `/graphql`
backed by a NestJS module named `graphql`. The endpoint MUST provide typed
queries for read-only operations and typed mutations for write-capable
operations, generate and commit a deterministic SDL schema, retain existing
domain-service semantics, and preserve all existing REST and MCP contracts.

## 3. Scope

### In scope

- Add compatible `@nestjs/graphql`, `@nestjs/apollo`, `@apollo/server`, and
  `graphql` runtime dependencies through npm and update `package-lock.json`.
- Add `src/web/modules/graphql/**` for the GraphQL Nest module, decorated
  input/object types, resolvers, error translation, and generated SDL.
- Register the module in `src/web/modules/app.module.ts`.
- Add GraphQL-focused tests under `__tests__/web/graphql/**` and update
  bootstrap tests when endpoint initialization needs coverage.
- Add `docs/graphql.md` describing the endpoint, operations, inputs, dry-run
  safety, and error contract.

### Out of scope

- Changing, removing, or duplicating the existing REST controllers, REST
  routes, MCP tools, CLI commands, domain services, or path resolver rules.
- Authentication, authorization, multi-tenancy, rate limiting, subscriptions,
  persisted queries, federation, batching/DataLoader, caching, or file upload.
- A browser UI or generated client SDK.
- Changing the semantics of `execute`, collision prevention, source/destination
  confinement, Docker/m4b-tool execution, Pino logging, or HTTP/MCP responses.
- Adding `class-validator`, `class-transformer`, `@nestjs/testing`,
  `@as-integrations/express5`, `ts-morph`, or GraphQL scalar packages unless
  npm identifies a direct, version-compatible runtime requirement.

## 4. Functional Requirements

- **FR-1** `package.json` MUST declare `@nestjs/graphql`, `@nestjs/apollo`,
  `@apollo/server`, and `graphql` versions compatible with NestJS 11 and
  Express 5, and `package-lock.json` MUST be regenerated through npm.
- **FR-2** A NestJS module named `graphql` MUST configure the Apollo driver
  with code-first schema generation, a deterministic committed
  `schema.gql`, and an HTTP endpoint at `/graphql`.
- **FR-3** The GraphQL module MUST expose decorated input and object types for
  every field accepted and returned by the ten current scoped web operations;
  optional fields and nullable output fields MUST faithfully represent the
  current TypeScript contracts without using `any` or an untyped JSON result.
- **FR-4** The API MUST expose these read-only queries: `albumSummarizeSourceDir`,
  `albumValidateSourceDir`, `audiobookValidate`, and `audiobookCrawl`.
- **FR-5** The API MUST expose these mutations: `albumFixTags`,
  `albumOrganizeFiles`, `audiobookCopyAndRename`, `audiobookConvertFiles`,
  `audiobookMerge`, and `audiobookSetMetadata`.
- **FR-6** Each resolver MUST delegate directly to the existing corresponding
  domain service and MUST map inputs to the same effective options as the
  REST controllers, including default `concurrency: '4'` and `jobs: '16'` for
  audiobook conversion and merge.
- **FR-7** Every client-controlled source or destination path in a GraphQL
  input MUST be resolved through `WebPathResolver`; GraphQL inputs MUST NOT
  permit source-root or destination-root overrides.
- **FR-8** Mutations MUST remain dry-run by default and MUST perform writes
  only when `execute: true` is explicitly supplied; existing collision,
  metadata, and post-write validation behavior MUST remain intact.
- **FR-9** `UserInputError` failures MUST be returned as GraphQL errors with
  `extensions.code: "BAD_USER_INPUT"` and a safe message; unexpected failures
  MUST use `extensions.code: "INTERNAL_SERVER_ERROR"` without exposing a
  filesystem path, request body, or stack trace.
- **FR-10** The generated SDL MUST contain the four queries, six mutations,
  all referenced input/object types, and nullability that agrees with the
  decorated contracts.
- **FR-11** Existing REST paths, response bodies/status codes, `/mcp` behavior,
  request-ID logging, and CLI output MUST remain unchanged after the GraphQL
  module is registered.
- **FR-12** User documentation MUST show a safe query and dry-run mutation,
  state that `execute: true` is required for writes, and enumerate the ten
  operations without documenting configured filesystem roots.

## 5. Non-Functional Requirements

- **NFR-1 — Lint after every source code file modification** After every
  source code file modification, `npm run lint -- <modified-file>` MUST be run
  so only the modified file is linted, and all reported issues MUST be fixed
  before proceeding. Whole-codebase `npm run lint` MUST be reserved for final
  verification after all TypeScript modifications are complete.
- **NFR-2 — Build** `npm run build` MUST exit 0 after implementation.
- **NFR-3 — Tests** `npm test` MUST exit 0 after implementation.
- **NFR-4 — No `npx`** `npx` is forbidden in all forms. Commands MUST use
  `npm run <script>` or `./node_modules/.bin/<tool>` exclusively.
- **NFR-5 — Type safety** The implementation MUST use strict TypeScript, no
  `any`, and no TypeScript suppression directives.
- **NFR-6 — File size** No created source or test file MAY exceed 200 lines.
- **NFR-7 — Scope discipline** `git --no-pager diff --stat -- src/lib
  src/commands src/web/controllers src/web/servers collections` MUST be empty
  after implementation.
- **NFR-8 — Behavioral parity** Domain outputs, validation, path confinement,
  dry-run/write behavior, REST/MCP contracts, and structured logging MUST
  remain unchanged.

## 6. Acceptance Criteria

1. `POST /graphql` accepts each of the four queries and six mutations with
   typed variables and returns the same row data as its corresponding domain
   service.
2. The committed SDL exposes exactly the required operation names and
   type-safe input/output fields; schema inspection confirms their nullability.
3. Resolver tests prove input mapping, root confinement, default values,
   explicit write opt-in, and both GraphQL error categories.
4. A GraphQL HTTP integration test proves `/graphql` coexists with existing
   REST and `/mcp` bootstrap behavior.
5. `npm run lint`, `npm run build`, and `npm test` exit 0, and the final diff
   is confined to the files in `design.md` section 2.
