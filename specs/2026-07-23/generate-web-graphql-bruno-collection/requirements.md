# Requirements: Generate Web GraphQL Bruno Collection

## 1. Background

`web serve` now exposes a code-first Apollo GraphQL endpoint at `POST
/graphql`. The committed schema at `src/web/modules/graphql/schema.gql`
contains four read-only queries and six dry-run-first mutations. The current
Bruno collection at `collections/harmonia-aquila-web/` exercises REST and MCP,
but contains no requests for the GraphQL adapter.

The related `2026-07-23/add-web-graphql-support` spec explicitly excluded
collections. This follow-up adds local, version-controlled Bruno requests that
allow a developer to validate the public GraphQL HTTP contract against a
locally started `web serve` process without adding an alternate test harness.

## 2. Goal

The existing Harmonia Aquila Web Bruno collection MUST gain a `graphql/`
folder that can validate all public GraphQL operation names, representative
typed result fields, dry-run mutation behavior, and the documented
`BAD_USER_INPUT` GraphQL error contract using the `local` environment.

## 3. Scope

### In scope

- Add GraphQL Bruno request YAML files under
  `collections/harmonia-aquila-web/graphql/`.
- Extend `collections/harmonia-aquila-web/environments/local.yml` only with
  variables necessary for GraphQL requests.
- Use the existing collection root and local `baseUrl` variable.

### Out of scope

- Changes to GraphQL resolvers, schema, REST controllers, MCP tools, domain
  services, source code, tests, dependencies, package manifests, or build
  output.
- Changes to collection metadata, other REST/MCP Bruno requests, or live
  fixture files under `etc/**`.
- Any mutation request with `execute: true`, filesystem writes, Docker/m4b-tool
  execution, authentication, or remote-server validation.

## 4. Functional Requirements

- **FR-1** The collection MUST add a `graphql/` folder containing a POST
  request for each schema operation: `albumSummarizeSourceDir`,
  `albumValidateSourceDir`, `audiobookValidate`, `audiobookCrawl`,
  `albumFixTags`, `albumOrganizeFiles`, `audiobookCopyAndRename`,
  `audiobookConvertFiles`, `audiobookMerge`, and `audiobookSetMetadata`.
- **FR-2** Every GraphQL request MUST post JSON to `{{baseUrl}}/graphql` with a
  `query` document and, where needed, typed `variables`; it MUST select only
  schema fields relevant to validating that operation's typed response.
- **FR-3** Query requests MUST use safe local-environment values and assert an
  HTTP 200 response, no top-level `errors`, and an array at the corresponding
  `data.<operation>` path.
- **FR-4** Mutation requests MUST omit `execute` or set it to `false`, MUST
  assert HTTP 200, and MUST assert the GraphQL response envelope rather than
  any REST-specific status code. A mutation whose fixture preconditions are not
  stable MAY assert its expected `BAD_USER_INPUT` error instead of a data row.
- **FR-5** The collection MUST include a GraphQL invalid-path request using
  `{{traversalDirName}}` that asserts HTTP 200, a top-level `errors` array, and
  `errors[0].extensions.code === "BAD_USER_INPUT"` without asserting a
  filesystem-dependent error message.
- **FR-6** Request scripts MUST parse `res.getBody()` when necessary, tolerate
  valid empty result arrays, and never contain absolute local filesystem paths
  or `execute: true`.
- **FR-7** `local.yml` MUST preserve existing variables and add only
  non-sensitive, relative sample values needed by the GraphQL request bodies.

## 5. Non-Functional Requirements

- **NFR-1 — Lint after every source code file modification** After every
  modification of a source code file, `npm run lint -- <modified-file>` MUST
  be run so only the modified file is linted, and reported issues MUST be fixed
  before proceeding. Whole-codebase `npm run lint` MUST be reserved for final
  verification after all TypeScript modifications are complete. This
  collection-only specification MUST NOT modify source code.
- **NFR-2 — No `npx`** `npx` is forbidden in all forms. Commands MUST use
  `npm run <script>` or `./node_modules/.bin/<tool>` exclusively.
- **NFR-3 — Collection compatibility** New request files MUST follow the
  existing OpenCollection YAML shape (`info`, `http`, `runtime`, and
  `settings`) and run with the installed `@usebruno/cli`.
- **NFR-4 — Safety** Requests MUST be local-only, deterministic where fixture
  state permits, and read-only or dry-run; they MUST NOT create, overwrite, or
  delete fixture files.
- **NFR-5 — Scope discipline** `git --no-pager diff --stat -- src __tests__
  docs package.json package-lock.json etc` MUST be empty after implementation.

## 6. Acceptance Criteria

1. `graphql/` contains one request for each of the ten GraphQL operations plus
   the invalid-path error-contract request.
2. Running each request from `collections/harmonia-aquila-web/` with
   `../../node_modules/.bin/bru run graphql --env local --bail` succeeds
   against a locally running server configured with the documented fixture
   roots.
3. The query requests prove the data envelope and typed array results; mutation
   requests prove dry-run data envelopes or documented `BAD_USER_INPUT`
   responses without writing files.
4. The final diff is confined to `collections/harmonia-aquila-web/**`.
