# Tasks: Generate Web GraphQL Bruno Collection

> ## Hard constraints (re-read before starting)
>
> - **DO NOT START** any task below until the user explicitly directs you to.
>   This file is a plan, not a work order.
> - **No `npx`** in any form. Use `npm run <script>` or
>   `./node_modules/.bin/<tool>` exclusively.
> - **No edits outside `collections/harmonia-aquila-web/**`** (NFR-5). Stop and
>   request approval for any scope expansion; do not edit source, fixtures,
>   manifests, or existing REST/MCP requests.
> - After **every** source code file modification, run
>   `npm run lint -- <modified-file>` and fix all issues before proceeding
>   (NFR-1). This specification must not modify source code.
> - Run whole-codebase `npm run lint` only as final verification after all
>   TypeScript modifications are complete; do not use it as a pre-flight
>   baseline.
> - Mark the matching `- [x]` checkbox **immediately** when each task is
>   finished, so progress remains resumable.

## Phase 1 — Pre-flight

### 1.1 Confirm the live GraphQL contract and fixtures

- [x] Inspect `src/web/modules/graphql/schema.gql`, `docs/graphql.md`, the
      current collection layout, and the installed Bruno CLI behavior.
- [x] Inspect the configured local fixture roots and identify only relative,
      non-sensitive audiobook values that can safely be used in dry runs.
- [x] Do not run whole-codebase `npm run lint` as a pre-flight baseline.
- [x] Record a blockquoted task note if an audiobook operation can only
      deterministically exercise the `BAD_USER_INPUT` contract.

> note: The repository uses `etc/albums/**` and `etc/audiobooks/**`, not the
> planned `etc/1-source-files` and `etc/2-destination-files` paths. The server
> therefore uses `etc` as both confined roots. `albumFixTags`,
> `audiobookCopyAndRename`, and `audiobookMerge` deterministically assert
> `BAD_USER_INPUT`; the remaining operations validate data arrays.

## Phase 2 — GraphQL collection requests

### 2.1 Add query coverage

- [x] Create GraphQL POST requests for `albumSummarizeSourceDir`,
      `albumValidateSourceDir`, `audiobookValidate`, and `audiobookCrawl` per
      `design.md` sections 3 and 4.
- [x] Assert status 200, absence of top-level `errors`, and the typed data
      array for every query with stable fixture inputs.

### 2.2 Add dry-run mutation coverage

- [x] Create GraphQL POST requests for `albumFixTags`, `albumOrganizeFiles`,
      `audiobookCopyAndRename`, `audiobookConvertFiles`, `audiobookMerge`, and
      `audiobookSetMetadata`.
- [x] Omit `execute` from every mutation input and assert either the typed data
      array or the documented `BAD_USER_INPUT` envelope selected in Phase 1.
- [x] Select only representative fields declared in `schema.gql`; do not copy
      REST response expectations or status codes.

### 2.3 Add GraphQL error-contract coverage

- [x] Create the traversal request using `{{traversalDirName}}`.
- [x] Assert HTTP 200, a non-empty `errors` array, and
      `errors[0].extensions.code === "BAD_USER_INPUT"` without binding to an
      implementation-specific path or message.

## Phase 3 — Local environment

### 3.1 Add minimal GraphQL variables

- [x] Extend `environments/local.yml` with only the relative sample variables
      used by the GraphQL requests, preserving all existing variables.
- [x] Confirm no variable contains an absolute host filesystem path or enables
      execution.

## Phase 4 — Live verification

### 4.1 Build and run the local server

- [x] Run `npm run build`.
- [x] Start `npm run web:serve -- --source-dir etc --dest-dir etc --host
      127.0.0.1 --port 3000` and retain the
      specific PID.
- [x] Confirm `POST /graphql` is reachable before running Bruno.

### 4.2 Run and clean up the collection

- [x] From `collections/harmonia-aquila-web/`, run
      `../../node_modules/.bin/bru run graphql --env local --bail`.
- [x] Stop the captured server with `kill <PID>` and confirm no fixture file
      under `etc/**` changed.

## Phase 5 — Scope verification

### 5.1 Confirm the collection-only diff

- [x] `git --no-pager diff --stat -- src __tests__ docs package.json
      package-lock.json etc` is empty (NFR-5).
- [x] `git --no-pager diff --stat -- collections/harmonia-aquila-web` lists
      only the GraphQL request files and permitted environment update.
