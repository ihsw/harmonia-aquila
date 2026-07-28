# Design: Add Web Scratch Directory Routing

> Scope reminder: this spec changes only web root configuration and the REST,
> GraphQL, and MCP album adapters/tests/docs listed below. Shared album
> libraries, standalone album CLI commands, audiobook behavior, dependencies,
> `etc/**`, and `npx` are excluded.

## 1. Overview

Extend the existing trusted-root injection pattern with `scratchDir`. Commander
requires the root, `normalizeWebRoots` resolves and validates it once, and every
Nest adapter receives the same normalized `WebPathResolver` contract (FR-1
through FR-3). This is an additive extension of the 2026-07-18
`constrain-web-serve-dirs` design; requests still never provide a filesystem
root.

Album adapters select only the `destDir` argument passed to existing shared
operations. `fix-tags` always binds scratch (FR-4). `organize-files` consumes a
transport field named `useScratchDir` and chooses scratch only when the value is
exactly `true`; omitted and `false` bind the configured source root (FR-6,
FR-7, FR-9). The configured `destDir` remains available only to unchanged
audiobook bindings (FR-12).

For MCP organization, `albumDir` remains the input selector below source, but
it does not become the destination base. This keeps destination semantics
identical across REST, GraphQL, and MCP (FR-8).

## 2. File layout

### Modified files

```text
src/commands/web/serve.ts
src/web/providers/path-resolver.ts
src/web/controllers/manage-albums.controller.ts
src/web/schemas/request-schemas.ts
src/web/modules/graphql/album.inputs.ts
src/web/modules/graphql/album.resolver.ts
src/web/modules/graphql/schema.gql
src/web/schemas/mcp/manage-albums.ts
src/web/servers/mcp-tools/manage-albums/fix-tags.ts
src/web/servers/mcp-tools/manage-albums/organize-files.ts
__tests__/commands/web/serve.test.ts
__tests__/web/bootstrap.test.ts
__tests__/web/controllers.test.ts
__tests__/web/logging.test.ts
__tests__/web/mcp-test-helpers.ts
__tests__/web/mcp.manage-albums.test.ts
__tests__/web/graphql/album.resolver.test.ts
__tests__/web/graphql/audiobook.resolver.test.ts
__tests__/web/graphql/graphql.integration.test.ts
collections/harmonia-aquila-web/manage-albums/fix-tags.yml
collections/harmonia-aquila-web/manage-albums/organize-files.yml
collections/harmonia-aquila-web/graphql/album-fix-tags.yml
collections/harmonia-aquila-web/graphql/album-organize-files.yml
collections/harmonia-aquila-web/mcp/call-manage-albums-fix-tags.yml
collections/harmonia-aquila-web/mcp/call-manage-albums-organize-files.yml
docs/graphql.md
docs/mcp-server.md
docs/testing.md
```

`src/web/main.ts`, `src/web/modules/app.module.ts`, and
`src/web/modules/graphql/graphql.module.ts` already propagate `WebRoots`
structurally and require no logic change. They MAY be edited only if the
compiler demonstrates a necessary explicit propagation change.

### Files explicitly NOT modified

- `src/lib/**` and `src/commands/manage-albums/**`: library and direct CLI
  contracts already accept explicit `sourceDir`/`destDir`.
- Audiobook controller/resolver/tool source: all retain configured `destDir`.
- `package.json`, `package-lock.json`, and `etc/**`: no dependency or fixture
  changes.

## 3. Root contract

The root provider becomes:

```ts
export interface WebRoots {
  destDir: string
  scratchDir: string
  sourceDir: string
}
```

`normalizeWebRoots` calls the existing `normalizeRoot` with
`--scratch-dir`. `WebPathResolver` adds a read-only `scratchDir` getter. No
`resolveScratch` method is needed because clients cannot supply a scratch
relative path (FR-2, FR-5).

Commander adds `.option('--scratch-dir <dir>', ...)`, requires it through the
existing `requiredOption`, and calls:

```ts
serveWeb({ destDir, host, port, scratchDir, sourceDir })
```

All three roots must exist; none is created. Root equality is permitted.

## 4. Adapter routing

| Surface | Input source | `fixAlbumTags.destDir` | `organizeAlbumFiles.destDir` |
| --- | --- | --- | --- |
| REST | configured source root | scratch root | `useScratchDir ? scratch : source` |
| GraphQL | configured source root | scratch root | `useScratchDir ? scratch : source` |
| MCP | resolved source-root-relative `albumDir` for organize; configured source for fix | scratch root | `useScratchDir ? scratch : configured source` |

Use a small local selection helper where it avoids repeated ternaries, but do
not add the request flag to shared library options:

```ts
function getAlbumOrganizationDestDir(
  pathResolver: WebPathResolver,
  useScratchDir: boolean | undefined,
): string {
  return useScratchDir === true
    ? pathResolver.scratchDir
    : pathResolver.sourceDir
}
```

REST adds `useScratchDir: optionalBodyBoolean()` to
`organizeFilesBodySchema`. GraphQL adds a nullable Boolean field to
`AlbumOrganizeFilesInput`. MCP adds `useScratchDir:
z.boolean().optional()`. Each adapter consumes the field before calling the
library (FR-6 through FR-10).

Existing forbidden `sourceDir`/`destDir` request fields remain rejected.
Messages should explain that roots are controlled by `web serve` and
`useScratchDir`, without including root values (NFR-9).

## 5. Test updates

| Area | Required coverage |
| --- | --- |
| Commander | Help lists scratch; source/destination/scratch are each required; valid values reach `serveWeb`. |
| Root/bootstrap | Scratch is normalized to realpath; blank/missing/file scratch fails; app/server initializes with three roots. |
| REST | Fix binds scratch; organize omitted and false bind source; true binds scratch; invalid flag rejects before operation call. |
| GraphQL resolver | Exact fix and both organize destination calls; source/destination audiobook assertions stay unchanged. |
| GraphQL integration/SDL | Nullable Boolean field is introspectable/committed; omitted/true requests preserve GraphQL envelopes. |
| MCP | Test helper owns/removes scratch; fix binds scratch; organize distinguishes resolved input source from configured destination; invalid flag is rejected. |
| Logging | All application/bootstrap fixtures supply scratch; logging behavior remains unchanged. |

Regenerate `src/web/modules/graphql/schema.gql` through application
initialization; do not hand-edit the generated file (FR-13).

Bruno calls remain dry-run. Update existing fix calls to exercise scratch-backed
routing and organize calls so the REST/GraphQL/MCP set covers both omitted
default and explicit `"useScratchDir": true`. The live server command supplies
an empty temporary scratch directory and all execute flags remain omitted
(FR-14).

## 6. Migration strategy

1. Extend and test the root type, normalization, CLI requirement, and bootstrap
   fixtures.
2. Change REST schemas/routing and focused controller tests.
3. Change GraphQL input/resolver tests, initialize the app, and commit generated
   SDL.
4. Change MCP schemas/tools/test helper and focused MCP tests.
5. Update Bruno contracts and user documentation.
6. Run focused, full, and live dry-run verification.

## 7. Risk Table

| Risk | Likelihood | Mitigation |
| --- | --- | --- |
| Album adapters accidentally retain `destDir` | Medium | Exact-call tests assert scratch/source values and distinct temp roots. |
| Omitted flag routes to scratch | Medium | Test omitted, explicit false, and true independently on all transports. |
| MCP organizes into selected album folder instead of configured source root | Medium | Use distinct resolved `albumDir` and root values in exact-call assertion. |
| Scratch path is unvalidated or leaks publicly | Low | Reuse root normalization; assert option-name-only errors. |
| Adding required root breaks hidden bootstraps | Medium | Audit every `createWebApp`, `serveWeb`, `WebRoots`, and resolver fixture call. |
| Audiobook output is rerouted accidentally | Low | Keep dest getter and rerun exact-call audiobook adapter tests. |
| Bruno writes source or scratch content | Low | Omit execute, use safe limits/current validation fixtures, and diff roots. |

## 8. Verification

After every source code file edit:

1. `npm run lint -- <modified-file>` (NFR-1).

Focused checks:

1. `./node_modules/.bin/vitest run __tests__/commands/web/serve.test.ts __tests__/web/bootstrap.test.ts`
2. `./node_modules/.bin/vitest run __tests__/web/controllers.test.ts __tests__/web/logging.test.ts`
3. `./node_modules/.bin/vitest run __tests__/web/graphql/album.resolver.test.ts __tests__/web/graphql/audiobook.resolver.test.ts __tests__/web/graphql/graphql.integration.test.ts`
4. `./node_modules/.bin/vitest run __tests__/web/mcp.manage-albums.test.ts __tests__/web/mcp.controller.test.ts`

Final checks:

1. `npm run lint`
2. `npm run build`
3. `npm test`
4. Start `npm run web:serve -- --source-dir <temp-source> --dest-dir
   <temp-dest> --scratch-dir <temp-scratch> --host 127.0.0.1 --port 3000`.
5. `cd collections/harmonia-aquila-web && ../../node_modules/.bin/bru run
   manage-albums graphql mcp --env local --bail`
6. Stop the server and confirm source, destination, scratch, and `etc/**`
   contents are unchanged by dry runs.
7. Run the NFR-8 forbidden-path diff command and confirm it is empty.
