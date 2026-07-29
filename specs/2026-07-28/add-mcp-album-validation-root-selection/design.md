# Design: Add MCP Album Validation Root Selection

> Scope reminder: this spec touches only the MCP album-validation schema and
> adapter, focused MCP tests and Bruno requests, and MCP documentation. No
> CLI, REST, GraphQL, shared album operation, root-provider, dependency, or
> `npx` changes.

## 1. Overview

Use the existing thin-adapter pattern from MCP organize-files. Add optional
`useScratchDir` to the validation Zod schema, then select
`WebPathResolver.resolveScratch` only for exact boolean `true`; omitted and
explicit `false` continue through `resolveSource` (FR-1–FR-3).

The adapter resolves `dirName` before invoking `validateAlbumSourceDir` and
does not forward the transport-only selector. The shared operation continues
to own audio discovery, metadata checks, strategies, limits, collision
validation, and row construction (FR-4–FR-7, NFR-9).

## 2. File layout

### Modified files

```text
src/web/schemas/mcp/manage-albums.ts
src/web/servers/mcp-tools/manage-albums/validate.ts
__tests__/web/mcp.manage-albums-operations.test.ts
collections/harmonia-aquila-web/mcp/tools-list.yml
docs/mcp-server.md
```

### New collection requests

```text
collections/harmonia-aquila-web/mcp/call-manage-albums-validate-scratch.yml
collections/harmonia-aquila-web/mcp/call-manage-albums-validate-scratch-path-traversal.yml
```

If the focused MCP operations test would exceed 200 lines, split validation
cases into a new `__tests__/web/mcp.manage-albums-validate.test.ts` and keep
shared helpers in the existing test support module (NFR-6).

### Files explicitly NOT modified

- `src/lib/albums/validate.ts`: the root selector is transport-only.
- `src/web/providers/path-resolver.ts`: `resolveSource` and `resolveScratch`
  already provide the required confinement and root-specific errors.
- `src/commands/manage-albums/**`, REST controllers/schemas, and GraphQL
  inputs/resolvers/SDL: only the MCP contract gains the selector.
- Existing source validation Bruno requests: they preserve omitted-selector
  backward-compatibility.
- Other MCP tools, `etc/**`, media fixtures, and package manifests.

## 3. Input and routing design

Add the selector beside the existing validation fields:

```ts
export const manageAlbumsValidateInputSchema = {
  // existing properties
  useScratchDir: z.boolean().optional(),
}
```

Resolve the requested directory with exact-true selection:

```ts
const dirName = input.useScratchDir === true
  ? await context.pathResolver.resolveScratch(input.dirName, 'dirName')
  : await context.pathResolver.resolveSource(input.dirName, 'dirName')

const rows = await validateAlbumSourceDir({
  dirName,
  // unchanged optional mappings; no useScratchDir
})
```

| `useScratchDir` input | Resolver | Confinement error |
| --- | --- | --- |
| omitted | `resolveSource` | `dirName must stay within --source-dir` |
| `false` | `resolveSource` | `dirName must stay within --source-dir` |
| `true` | `resolveScratch` | `dirName must stay within --scratch-dir` |
| non-boolean | none | existing MCP invalid-arguments result |

The tool remains read-only. Its description changes from source-only wording
to “configured source or scratch directory”; the name, title, output encoding,
and annotation stay unchanged (FR-5–FR-8).

## 4. Domain call invariants

| Option | Existing mapping retained |
| --- | --- |
| `dirName` | selected-root absolute path |
| `artistFilenameStrategy` | optional string |
| `ignoreNonAudioFiles` | optional boolean |
| `limit` | optional integer converted to string |
| `titleFilenameStrategy` | optional string |
| `useScratchDir` | consumed by adapter; never forwarded |

Path resolution occurs before the domain call. A schema or confinement
failure therefore leaves `validateAlbumSourceDir` uncalled. Successful results
continue through `jsonToolContent(rows)`, and domain `UserInputError` values
continue through the existing MCP tool-error translation.

## 5. Test updates

| Area | Required coverage |
| --- | --- |
| Routing | Omitted and false resolve the same `dirName` under source; true resolves it under scratch. |
| Mapping | Strategies, ignore flag, and numeric limit remain unchanged; no selector reaches the domain options. |
| Rejection | Non-boolean selector fails before path/domain work. |
| Confinement | Source traversal names `--source-dir`; true scratch traversal names `--scratch-dir`; neither invokes validation. |
| Discovery | `useScratchDir` has JSON Schema type `boolean`, is not required, and `readOnlyHint` remains true. |
| Regression | Existing successful rows and multi-artist tool errors remain unchanged. |

Prefer extending `mcp.manage-albums-operations.test.ts` only while it remains
at or below 200 lines. Otherwise move all validate-specific cases into the
focused file named in section 2 rather than weakening coverage.

## 6. Bruno validation

Keep `call-manage-albums-validate.yml` unchanged to prove the omitted selector
still validates under source. Add:

| Request | Arguments | Assertion |
| --- | --- | --- |
| `call-manage-albums-validate-scratch.yml` | `dirName: "{{scratchAlbumEntry}}"`, `useScratchDir: true`, `limit: 0` | successful JSON array |
| `call-manage-albums-validate-scratch-path-traversal.yml` | traversal `dirName`, `useScratchDir: true` | tool error includes `--scratch-dir` |

The documented test server already creates the empty `scratch-only/` marker
represented by `scratchAlbumEntry`. A zero limit makes the successful request
read-only and independent of audio metadata while still requiring directory
resolution. Extend `tools-list.yml` to assert the validate tool advertises an
optional Boolean selector and remains read-only (FR-7, FR-10).

## 7. Migration strategy

1. Record baseline MCP behavior and file sizes.
2. Add focused routing, discovery, and rejection tests.
3. Add the schema property and exact-true path selection, linting after each
   TypeScript edit.
4. Add safe scratch Bruno requests and discovery assertions.
5. Update MCP documentation.
6. Run focused checks, final lint/build/tests, live collection checks, and
   scope verification.

## 8. Risk Table

| Risk | Likelihood | Mitigation |
| --- | --- | --- |
| Omitted selector changes the source default | Medium | Use exact-true selection and assert omitted plus false calls. |
| Selector leaks into the domain options | Medium | Assert the exact `validateAlbumSourceDir` call object. |
| Traversal errors mention the wrong root | Medium | Test source and scratch traversal independently before domain invocation. |
| Tool loses read-only metadata | Low | Assert discovery annotation together with the new schema property. |
| Scratch Bruno check depends on media metadata | Low | Validate the existing empty marker directory with `limit: 0`. |
| Existing MCP test exceeds 200 lines | High | Split validate cases into the focused test file before adding coverage. |

## 9. Verification

After every source code file edit:

1. `npm run lint -- <modified-file>` — lint only the file just modified
   (NFR-1).

Focused checks:

1. `./node_modules/.bin/vitest run __tests__/web/mcp.manage-albums-operations.test.ts`
2. If split, `./node_modules/.bin/vitest run __tests__/web/mcp.manage-albums-validate.test.ts`

Final checks:

1. `npm run lint`
2. `npm run build`
3. `npm test`
4. Start `npm run web:serve` with the documented source, destination, and
   temporary scratch roots, then run
   `cd collections/harmonia-aquila-web &&
   ../../node_modules/.bin/bru run mcp -r --env local --bail`.
5. Stop the captured server process and remove only the documented
   `scratch-only/` marker and known temporary scratch root with `rmdir`.
6. `git --no-pager diff --stat -- src/lib src/commands src/web/controllers
   src/web/modules/graphql` — empty.
7. `git --no-pager diff --stat -- package.json package-lock.json etc` — empty.
