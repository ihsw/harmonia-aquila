# Design: Refactor MCP Tool Registration

> Scope reminder: this spec touches **only** MCP-related files under
> `src/web/**`, web MCP tests under `__tests__/web/**`, and Bruno MCP collection
> files only if path/order assertions need direct updates. No new MCP tools, no
> REST behavior changes, no package metadata changes, and no `npx`.

## 1. Overview

Use a typed registry pattern. `WebMcpServerFactory` remains responsible for constructing a fresh `McpServer` and `StreamableHTTPServerTransport` for each HTTP request, but it delegates tool definitions to `src/web/servers/mcp-tools/**`. The factory builds a dependency context, gets a readonly list of tool registrations, and registers those definitions with one `Array.reduce()` call (FR-1 through FR-4).

This spec is intentionally structural. It moves the existing `manage_albums_summarize_source_dir` handler out of `mcp-server.ts` without adding the remaining operations yet (FR-2, FR-6). The folder and type shape should make later specs additive: each future tool gets one schema export, one tool definition file, and one group index entry.

## 2. File layout

### Modified and new files

```text
src/web/servers/mcp-server.ts                         (modified: build context + reduce registrations)
src/web/servers/mcp-tools/types.ts                    (new: shared tool registration/context types)
src/web/servers/mcp-tools/index.ts                    (new: compose all MCP tool groups)
src/web/servers/mcp-tools/manage-albums/index.ts      (new: album tool group)
src/web/servers/mcp-tools/manage-albums/summarize-source-dir.ts
                                                        (new: current tool definition)
src/web/servers/mcp-tools/manage-audiobooks/index.ts  (new: empty future tool group)
src/web/schemas/mcp/index.ts                          (new: schema barrel if useful)
src/web/schemas/mcp/manage-albums.ts                  (new or moved: album MCP schemas)
src/web/schemas/mcp-schemas.ts                        (modified or deleted after move)
__tests__/web/mcp.controller.test.ts                  (modified: import path and registry behavior)
collections/harmonia-aquila-web/mcp/**/*.yml          (modified only if assertions require path/order updates)
```

### Files explicitly NOT modified

- `src/web/controllers/mcp.controller.ts` keeps HTTP method and local-origin behavior.
- `src/web/controllers/manage-albums.controller.ts` and `src/web/controllers/manage-audiobooks.controller.ts` keep REST behavior.
- `src/web/schemas/request-schemas.ts` remains REST request validation.
- `src/lib/**` remains unchanged; MCP tools continue to call existing domain functions.
- `package.json` and `package-lock.json` remain unchanged (NFR-7).

## 3. Tool registration types

Recommended shared shape:

```ts
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'

import type { WebPathResolver } from '../../providers/path-resolver.js'

export interface WebMcpToolContext {
  pathResolver: WebPathResolver
}

export interface WebMcpToolRegistration {
  name: string
  options: Parameters<McpServer['registerTool']>[1]
  handler: Parameters<McpServer['registerTool']>[2]
}
```

If the SDK handler type is hard to reuse directly because of generic inference, prefer a small local generic helper over `any`. Keep unavoidable SDK casts inside `types.ts` or `mcp-server.ts`, not scattered through every tool file (NFR-6).

`mcp-server.ts` should become structurally similar to:

```ts
private createServer(): McpServer {
  const server = new McpServer({ name: 'harmonia-aquila-web', version: '1.0.0' })
  const context = { pathResolver: this.pathResolver }

  return getWebMcpToolRegistrations(context).reduce((registeredServer, tool) => {
    registeredServer.registerTool(tool.name, tool.options, tool.handler)
    return registeredServer
  }, server)
}
```

The reduce callback is intentionally simple: no conditional registration, no side-channel mutation outside the `registerTool` call, and no per-tool special cases in the server factory (FR-1).

## 4. Current tool extraction

Move the current inline registration into:

```text
src/web/servers/mcp-tools/manage-albums/summarize-source-dir.ts
```

Recommended shape:

```ts
export function createManageAlbumsSummarizeSourceDirTool(
  context: WebMcpToolContext,
): WebMcpToolRegistration {
  return {
    handler: async (input) => {
      const rows = await summarizeAlbumSourceDir({
        dirName: await context.pathResolver.resolveSource(input.dirName, 'dirName'),
        ...optionalEntry('ignoreNonAudioFiles', input.ignoreNonAudioFiles),
        ...optionalEntry('limit', input.limit === undefined ? undefined : String(input.limit)),
      })

      return { content: [{ text: JSON.stringify(rows), type: 'text' }] }
    },
    name: MANAGE_ALBUMS_SUMMARIZE_SOURCE_DIR_TOOL_NAME,
    options: {
      annotations: { readOnlyHint: true },
      description: 'Summarize FLAC and MP3 metadata under the configured source directory.',
      inputSchema: manageAlbumsSummarizeSourceDirInputSchema,
      title: 'Manage albums summarize source directory',
    },
  }
}
```

The exact export names may vary, but the behavior and metadata must match the current inline registration (FR-2, NFR-8).

## 5. Schema organization

Move the current MCP schema constants out of the generic `mcp-schemas.ts` file into functional schema files:

| Current export | New location |
| -------------- | ------------ |
| `MANAGE_ALBUMS_SUMMARIZE_SOURCE_DIR_TOOL_NAME` | `src/web/schemas/mcp/manage-albums.ts` |
| `manageAlbumsSummarizeSourceDirInputSchema` | `src/web/schemas/mcp/manage-albums.ts` |

`src/web/schemas/mcp/index.ts` may re-export group schema modules if it improves imports. Avoid keeping both old and new schema files with duplicated constants; either delete `mcp-schemas.ts` or reduce it to a temporary barrel only if test/import churn makes that worthwhile.

## 6. Future tool map

This spec prepares the registry for these future tools but MUST NOT implement them yet:

| REST/domain operation | Future MCP tool name | Future group |
| --------------------- | -------------------- | ------------ |
| `summarizeAlbumSourceDir` | `manage_albums_summarize_source_dir` | `manage-albums` |
| `fixAlbumTags` | `manage_albums_fix_tags` | `manage-albums` |
| `organizeAlbumFiles` | `manage_albums_organize_files` | `manage-albums` |
| `validateAudiobook` | `manage_audiobooks_validate` | `manage-audiobooks` |
| `crawlAudiobooks` | `manage_audiobooks_crawl` | `manage-audiobooks` |
| `copyAndRenameAudiobook` | `manage_audiobooks_copy_and_rename` | `manage-audiobooks` |
| `convertAudiobookFiles` | `manage_audiobooks_convert_file` | `manage-audiobooks` |
| `mergeAudiobooks` | `manage_audiobooks_merge` | `manage-audiobooks` |
| `setAudiobookMetadata` | `manage_audiobooks_set_metadata` | `manage-audiobooks` |

The empty `manage-audiobooks` group should export a function returning an empty readonly array for now. This proves the composition shape without changing `tools/list` (FR-5, FR-6).

## 7. Test updates

### 7.1 What stays the same

- `initialize` still advertises tool capabilities.
- `tools/list` still returns exactly one tool.
- Successful `tools/call` still invokes `summarizeAlbumSourceDir` with the same path-resolved options.
- Traversal and invalid input still do not call `summarizeAlbumSourceDir`.
- Unsafe browser origins are still rejected by the controller before MCP handling.

### 7.2 What changes

- Update imports of the tool name constant from the new schema path.
- Add a focused assertion or unit test proving the composed registration array currently has one tool and can include an empty future group.
- If testing the registry directly, instantiate it with a real or mocked `WebPathResolver` context; do not bypass context typing with casts.

### 7.3 Coverage parity table

| Existing test case | Disposition |
| ------------------ | ----------- |
| Initializes MCP endpoint | Kept unchanged. |
| Lists exactly summarize source directory tool | Kept; import path updated. |
| Calls summarize source directory tool | Kept; handler now comes from tool file. |
| Rejects traversal and invalid input | Kept; proves behavior parity after extraction. |
| Rejects unsafe browser origins | Kept unchanged. |

## 8. Migration strategy

1. Add shared MCP tool types.
2. Move MCP schema constants into `src/web/schemas/mcp/manage-albums.ts` and update imports.
3. Extract the current summarize tool into the manage-albums tool file.
4. Add manage-albums, manage-audiobooks, and root MCP tool group entrypoints.
5. Replace inline `server.registerTool(...)` in `mcp-server.ts` with the reduce-based registry.
6. Update tests and Bruno imports/assertions only as needed for moved constants.
7. Run focused and full verification.

## 9. Risk Table

| Risk | Likelihood | Mitigation |
| ---- | ---------- | ---------- |
| MCP SDK generics make the registration type awkward | Medium | Isolate SDK-specific type helpers in `mcp-tools/types.ts`; do not spread casts across tool files. |
| `tools/list` order changes unexpectedly | Low | Compose groups in deterministic array order and assert exact current list in tests. |
| Future empty group accidentally registers placeholder tools | Low | The manage-audiobooks group returns an empty readonly array and tests assert one total tool. |
| Handler loses access to `WebPathResolver` | Low | Require `WebMcpToolContext` in every tool factory and construct it in `mcp-server.ts`. |
| Old schema barrel causes duplicate constants | Medium | Prefer deleting or reducing `mcp-schemas.ts`; search for stale imports before final verification. |

## 10. Verification

After every source code file edit:

1. `npm run lint -- <modified-file>` — lint only the file just modified (NFR-1).

Focused checks during implementation:

1. `./node_modules/.bin/vitest run __tests__/web/mcp.controller.test.ts`
2. `./node_modules/.bin/vitest run __tests__/web`
3. `npm run build`

Live MCP/Bruno checks:

1. `npm run build`
2. `npm run web:serve -- --source-dir etc/albums --dest-dir etc/albums/3-organized-files --host 127.0.0.1 --port 3000`
3. `cd collections/harmonia-aquila-web && ../../node_modules/.bin/bru run . -r --env local --bail`
4. Stop the captured server PID with `kill <PID>`.

Final checks:

1. `npm run lint` — whole-codebase last-call lint after all TypeScript modifications are complete; must exit 0.
2. `npm run build` — must exit 0.
3. `npm test` — must exit 0.
4. `git --no-pager diff --stat -- src/web __tests__/web collections/harmonia-aquila-web` — must list only expected MCP registry refactor files.
