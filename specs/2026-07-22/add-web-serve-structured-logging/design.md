# Design: Add Web Serve Structured Logging

> Scope reminder: this spec touches only `src/web/**`, `__tests__/web/**`,
> `package.json`, `package-lock.json`, directly related documentation, and this
> spec. No edits to `src/commands/**`, `src/lib/**`, `bin/**`, `etc/**`, or
> `reports/**`; no `npx`.

## 1. Overview

Use a small Pino adapter plus bootstrap-installed HTTP middleware and exception
boundary. This keeps logging cross-cutting and out of album/audiobook controllers,
which protects their route and MCP behavior (FR-4, FR-6, FR-9). Pino is used
directly; no Nest/Pino wrapper package is required (FR-1).

The logger writes newline-delimited JSON to stderr. A request context supplies an
opaque ID, safe method/path fields, and elapsed time. It deliberately excludes
client-supplied data and filesystem/media fields (FR-2, FR-7, FR-8). Tests inject
an in-memory Pino destination through the logger factory (FR-10).

## 2. File layout

### Modified and new files

```text
package.json                                      (modified: add pino)
package-lock.json                                 (modified by npm)
src/web/main.ts                                   (modified: install logger integration)
src/web/logging/web-logger.ts                     (new: Pino factory, Nest adapter, safe request helpers)
src/web/logging/web-logging.middleware.ts         (new: request ID and completion logging)
src/web/logging/web-logging-exception.filter.ts   (new: unexpected-error logging)
__tests__/web/logging.test.ts                     (new: structured logging coverage)
docs/mcp-server.md                                (modified: concise web logging behavior)
```

### Files explicitly NOT modified

- `src/web/controllers/**` and `src/web/servers/**`: logging must not alter route
  handlers or the MCP transport.
- `src/commands/**` and `src/lib/**`: this feature is scoped to `web serve`.
- `bin/**`, `etc/**`, and `reports/**`: no operational scripts or media files.

## 3. Logger and bootstrap integration

`createWebLogger` creates a Pino instance configured with JSON output to stderr and
a test-overridable destination. `WebLogger` adapts Pino to Nest's `LoggerService`
methods so Nest lifecycle diagnostics use the same format. The production factory
uses a conservative default level of `info`; it MAY honor a documented
`HARMONIA_AQUILA_LOG_LEVEL` value only after validating it against Pino's known
levels.

```ts
export interface CreateWebAppOptions {
  logger?: Logger
}

export function createWebLogger(destination?: DestinationStream): Logger
export async function createWebApp(
  roots: WebRoots,
  options: CreateWebAppOptions = {},
): Promise<INestApplication>
```

`createWebApp` installs the Nest logger, request middleware, and exception filter
after constructing the application. `serveWeb` emits `web.server.ready` only after
`app.listen` resolves, using the actual listening address where available (FR-3).
It must not log configured source/destination roots.

## 4. Request and error records

### 4.1 Request completion

The middleware runs before controller dispatch. It accepts an `x-request-id` only
when it matches a bounded safe-token expression; otherwise it creates a UUID. It
sets that value on the response header, stores it on the request, and attaches a
single `finish` listener to log completion.

```json
{
  "level": 30,
  "time": 1784760000000,
  "event": "web.request.completed",
  "requestId": "opaque-id",
  "method": "POST",
  "path": "/mcp",
  "statusCode": 200,
  "durationMs": 12
}
```

Use `request.url` only after removing its query component; do not parse or log query
values. 5xx records use Pino's error level; other statuses use info (FR-4, FR-5,
FR-8).

### 4.2 Error boundary

A global exception filter obtains the request-scoped ID and logs only unexpected
errors. It calls the existing Nest exception handling path after logging so
`BadRequestException`, `ForbiddenException`, current JSON envelopes, and MCP
responses remain unchanged. Expected `HttpException` instances are not error-logged
by the filter; their completion record captures the 4xx result.

```json
{
  "level": 50,
  "event": "web.request.failed",
  "requestId": "opaque-id",
  "err": { "type": "Error", "message": "..." }
}
```

The implementation must verify Pino's default error serializer does not add
request payloads. It must never decorate errors with raw request data (FR-6, FR-8).

## 5. Test updates

`__tests__/web/logging.test.ts` creates an application with temporary roots and an
in-memory Pino destination. It calls routes through the app HTTP server, parses
captured newline-delimited JSON, and asserts:

| Case | Required assertion |
| --- | --- |
| Valid request | One `web.request.completed` info record has safe fields and returned request ID. |
| Invalid request | One info completion record has a 4xx status and no error record. |
| Unexpected failure | A `web.request.failed` error record and one error completion record share the request ID. |
| Query/body redaction | Log JSON contains neither raw query value nor request-body marker. |
| Request-ID validation | Valid inbound ID is echoed; invalid input is replaced with a generated ID. |
| Startup | `serveWeb` emits one `web.server.ready` record after listening. |

Existing controller, bootstrap, and MCP tests remain unchanged except for passing
the optional in-memory logger where their assertions need deterministic output.

## 6. Migration strategy

1. Add `pino` using npm, then implement and lint the pure logger factory.
2. Add request middleware and its isolated tests before installing it globally.
3. Add the exception filter and prove existing error response parity.
4. Wire the integration into `createWebApp` and ready logging into `serveWeb`.
5. Update documentation, then run full verification and scope checks.

## 7. Risk Table

| Risk | Likelihood | Mitigation |
| --- | --- | --- |
| Logs contaminate MCP or CLI output | Medium | Route Pino exclusively to stderr and test `/mcp` response behavior. |
| Middleware double-logs requests | Medium | Attach one `finish` listener per request and assert exact record count. |
| Exception filter changes error responses | Medium | Delegate to Nest's normal exception handling and retain existing error tests. |
| Sensitive data appears in logs | Medium | Construct allowlisted fields only; test body/query/path redaction. |
| Random IDs make tests flaky | Low | Inject Pino destination and assert format/correlation, not a fixed UUID. |

## 8. Verification

After every source code file edit:

1. `npm run lint -- <modified-file>` — lint only the file just modified (NFR-1).

At the end:

1. `npm run lint` — final whole-codebase lint after all TypeScript modifications.
2. `npm run build` — must exit 0.
3. `npm test` — must exit 0.
4. `./node_modules/.bin/vitest run __tests__/web/logging.test.ts` — focused
   structured-logging coverage must pass.
5. Start `node build/dist/index.js web serve --source-dir <safe-temp-source>
   --dest-dir <safe-temp-dest> --port 0`, send one safe request, and confirm JSON
   logs appear only on stderr.
6. `git --no-pager diff --stat -- src/commands src/lib bin etc reports` — must be
   empty (NFR-7).
