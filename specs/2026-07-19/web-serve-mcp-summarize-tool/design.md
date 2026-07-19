# Design: Web Serve MCP Summarize Tool

> Scope reminder: this spec touches only `package.json`, `package-lock.json`,
> `src/web/**`, `__tests__/web/**`, `collections/harmonia-aquila-web/**`,
> `docs/mcp-server.md`, and `docs/testing.md`. No edits to `src/lib/**`, no
> broad stdio MCP server, no extra tools, no dependencies except the official
> MCP SDK if needed, and no `npx`.

## 1. Overview

Add a thin MCP-over-HTTP adapter to the existing Nest web application. The web
application remains the process owner; the MCP controller delegates protocol
handling to a small MCP server factory that registers only
`manage_albums_summarize_source_dir` (FR-1 through FR-4, FR-9).

The MCP tool is an adapter over the same domain function used by the existing
REST route. It validates structured MCP arguments with Zod, resolves `dirName`
through `WebPathResolver`, converts `limit?: number` to the existing string
option, and returns the domain rows as MCP tool content (FR-5 through FR-8).

Use MCP Streamable HTTP rather than stdio because the feature is scoped to
`web serve`. If `@modelcontextprotocol/sdk` is not already installed, add it and
use its Streamable HTTP support. If the SDK version requires stateful HTTP
sessions, keep session state inside a web-scoped provider and validate it with
Bruno. If the SDK supports a stateless Streamable HTTP mode, prefer that simpler
mode as long as the Bruno request flow remains protocol-shaped.

## 2. File layout

### Modified and new files

```text
package.json                                      (modified only if MCP SDK is added)
package-lock.json                                 (modified only if MCP SDK is added)
src/web/app.module.ts                             (modified: register MCP controller/provider)
src/web/mcp.controller.ts                         (new: Nest /mcp HTTP adapter)
src/web/mcp-server.ts                             (new: MCP server/tool factory)
src/web/mcp-schemas.ts                            (new: Zod schemas and typed tool input)
__tests__/web/mcp.controller.test.ts              (new: tool list/call/error behavior)
__tests__/web/bootstrap.test.ts                   (modified only if route bootstrap coverage is added)
collections/harmonia-aquila-web/environments/local.yml
collections/harmonia-aquila-web/mcp/*.yml         (new Bruno MCP smoke requests)
docs/mcp-server.md                                (modified: clarify web-scoped MCP endpoint)
docs/testing.md                                   (modified: MCP Bruno smoke command if useful)
```

### Files explicitly NOT modified

- `src/lib/**` remains the shared album/audiobook domain layer.
- `src/commands/**` remains unchanged except for dependency installation side
  effects in package metadata; `web serve` already creates the web app.
- `collections/harmonia-aquila-web/manage-albums/**` keeps existing REST
  validation coverage.
- `src/mcp/**` is not introduced; this is not the broader stdio MCP server.

## 3. MCP endpoint shape

Expose `/mcp` from a Nest controller:

```ts
@Controller('mcp')
export class McpController {
  public constructor(private readonly mcpServerFactory: WebMcpServerFactory) {}

  @Post()
  public async post(@Req() request: Request, @Res() response: Response): Promise<void> {
    await this.mcpServerFactory.handleHttpRequest(request, response)
  }

  @Get()
  public get(@Res() response: Response): void {
    response.status(405).send()
  }
}
```

The exact controller body should follow the installed SDK's Streamable HTTP API,
but it must preserve these invariants:

| Method | Required behavior |
| ------ | ----------------- |
| `POST /mcp` | Accept JSON-RPC MCP messages with `Accept: application/json, text/event-stream`. |
| `GET /mcp` | Return 405 unless SSE support is explicitly implemented. |
| unsafe `Origin` | Return a non-success HTTP status before MCP handling. |
| unknown JSON-RPC method | Return the SDK/protocol error response. |

Origin handling should allow requests with no `Origin` header and local origins
such as `http://127.0.0.1:<port>` and `http://localhost:<port>`. It should
reject remote browser origins because this server can inspect local files
(NFR-10).

## 4. Tool registration and input schema

Register exactly one tool:

| Field | Value |
| ----- | ----- |
| Tool name | `manage_albums_summarize_source_dir` |
| Description | Summarize FLAC/MP3 metadata under a source-root-relative directory. |
| Read-only annotation | true, if supported by the SDK API. |
| Input | `dirName`, `ignoreNonAudioFiles`, `limit` |

Use a Zod schema equivalent to:

```ts
const summarizeSourceDirToolInputSchema = z.object({
  dirName: z.string().min(1),
  ignoreNonAudioFiles: z.boolean().optional(),
  limit: z.number().int().nonnegative().optional(),
})
```

The handler maps parsed input to the existing domain function:

```ts
const rows = await summarizeAlbumSourceDir({
  dirName: await pathResolver.resolveSource(input.dirName, 'dirName'),
  ignoreNonAudioFiles: input.ignoreNonAudioFiles,
  limit: input.limit === undefined ? undefined : String(input.limit),
})
```

Use `optionalEntry` or equivalent exact-optional-property-safe construction so
`exactOptionalPropertyTypes` stays clean. Do not pass `undefined` properties into
domain option objects.

## 5. MCP response shape

Successful tool calls should return a normal MCP tool result. Prefer structured
content if the installed SDK supports it, while always including text content so
simple clients and Bruno can assert the result:

```json
{
  "content": [
    {
      "type": "text",
      "text": "[...]"
    }
  ]
}
```

The text payload may be pretty or compact JSON, but Bruno tests should parse it
and assert it is an array. If structured content is added, use `{ "rows": [...] }`
and keep the text content for compatibility.

Validation, path traversal, and domain `UserInputError` failures should be
mapped through MCP error handling consistently. It is acceptable for the SDK to
represent these as JSON-RPC `error` responses or as MCP tool results with
`isError: true`, as long as Bruno and unit tests assert the exact implemented
shape and the message includes useful source-root context (FR-7).

## 6. Bruno collection updates

Add a new folder under the existing collection:

```text
collections/harmonia-aquila-web/mcp/
  initialize.yml
  initialized.yml                 (only if the SDK/session flow requires it)
  tools-list.yml
  call-manage-albums-summarize-source-dir.yml
  call-manage-albums-summarize-source-dir-path-traversal.yml
```

All MCP requests should use:

```text
POST {{baseUrl}}/mcp
Accept: application/json, text/event-stream
Content-Type: application/json
MCP-Protocol-Version: {{mcpProtocolVersion}}
```

If initialization returns an `Mcp-Session-Id` header, the initialize request must
store it in a Bruno variable such as `mcpSessionId`, and subsequent requests must
send `Mcp-Session-Id: {{mcpSessionId}}`. If the endpoint is implemented
statelessly and no session header is returned, the collection should not require
one.

Coverage expectations:

| Bruno request | Key assertions |
| ------------- | -------------- |
| `initialize.yml` | HTTP success, JSON-RPC response id matches, tool capabilities exist. |
| `tools-list.yml` | Exactly one tool is returned and its name is `manage_albums_summarize_source_dir`. |
| `call-manage-albums-summarize-source-dir.yml` | HTTP success, tool content parses to an array. |
| `call-manage-albums-summarize-source-dir-path-traversal.yml` | Failure shape is asserted and message mentions source-root restriction. |

## 7. Test updates

Unit tests should cover the tool behavior without requiring network I/O:

- `tools/list` exposes exactly one tool.
- Successful tool call resolves paths inside `WebPathResolver.sourceDir` and
  calls `summarizeAlbumSourceDir` with expected options.
- Invalid input and traversal do not call `summarizeAlbumSourceDir`.
- Unsafe `Origin` is rejected before protocol handling.

Existing web controller tests mock domain operations directly. Follow that
pattern and add a focused `__tests__/web/mcp.controller.test.ts` or test the
extracted MCP handler factory directly if that produces simpler assertions.

## 8. Migration strategy

1. Confirm whether `@modelcontextprotocol/sdk` is already installed.
2. Add the SDK dependency only if needed, applying package-lock changes with
   `npm install @modelcontextprotocol/sdk`.
3. Add the MCP schemas and tool/server factory.
4. Add the Nest controller and register it in `createAppModule`.
5. Add unit tests and focused web verification.
6. Add Bruno MCP requests and update `local.yml` variables.
7. Run live `web serve` plus Bruno smoke verification.
8. Update directly related docs if they would otherwise contradict the new web
   MCP endpoint.

## 9. Risk Table

| Risk | Likelihood | Mitigation |
| ---- | ---------- | ---------- |
| MCP SDK Streamable HTTP API differs from examples | Medium | Keep protocol handling isolated in `mcp-server.ts` and let `npm run build` drive exact API fixes. |
| Bruno cannot persist MCP session headers | Medium | Prefer stateless Streamable HTTP if supported; otherwise add a small initialize request script to store `Mcp-Session-Id`. |
| Tool errors are returned as a different MCP failure shape than expected | Medium | Unit-test the implemented shape and keep Bruno assertions semantic but specific. |
| `/mcp` exposes more than one tool through SDK defaults | Low | Assert exact tool count in unit tests and Bruno. |
| DNS rebinding or browser-origin access to local files | Medium | Reject unsafe `Origin` headers before protocol handling. |
| Optional values violate `exactOptionalPropertyTypes` | Medium | Use exact optional object construction before calling domain functions. |

## 10. Verification

After every source code file edit:

1. `npm run lint -- <modified-file>` - lint only the file just modified (NFR-1).

Focused checks during implementation:

1. `./node_modules/.bin/vitest run __tests__/web`
2. `npm run build`

Live MCP/Bruno checks:

1. `npm run build`
2. `npm run web:serve -- --source-dir etc/1-source-files --dest-dir etc/2-destination-files --host 127.0.0.1 --port 3000`
3. `cd collections/harmonia-aquila-web && ../../node_modules/.bin/bru run . -r --env local --bail`
4. Stop the captured server PID with `kill <PID>`.

Final checks:

1. `npm run lint` - whole-codebase last-call lint after all TypeScript modifications are complete; must exit 0.
2. `npm run build` - must exit 0.
3. `npm test` - must exit 0.
4. `git --no-pager diff --stat -- package.json package-lock.json src/web __tests__/web collections/harmonia-aquila-web docs/mcp-server.md docs/testing.md` - must list only expected files.
