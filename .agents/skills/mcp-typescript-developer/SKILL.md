---
name: mcp-typescript-developer
description: Design, implement, refactor, and test TypeScript Model Context Protocol servers, transports, registries, and tools. Use for MCP SDK dependency setup, Zod input schemas, typed tool callbacks and context injection, Streamable HTTP or stdio lifecycle work, tool discovery and annotations, JSON-RPC error/output contracts, protocol-level Vitest tests, or MCP client collections.
---

# MCP TypeScript Developer

Build MCP boundaries as thin, typed adapters around independently testable
domain operations. Preserve protocol contracts, transport lifecycle, security,
and write-safety metadata while following the host repository's TypeScript
conventions.

## 1. Start with an audit

Before changing code:

1. Inspect `package.json`, the lockfile, TypeScript configs, lint config, and
   test config.
2. Inspect the installed `@modelcontextprotocol/sdk` exports and nearby working
   server/tool code. SDK APIs and protocol revisions evolve; do not code from
   memory when local types are authoritative.
3. Trace the full boundary: host endpoint or process entrypoint → transport →
   server lifecycle → registry → schema → handler → domain operation → result
   or error.
4. Find discovery, invocation, invalid-input, lifecycle, and live-client tests.
5. Record existing tool names, ordering, annotations, response shape, protocol
   version, headers, and default behavior before editing.
6. Preserve unrelated worktree changes and avoid dependency/config churn unless
   the task requires it.

## 2. Use the minimum dependency set

| Concern | Preferred dependency |
| --- | --- |
| MCP server, transports, and protocol types | `@modelcontextprotocol/sdk` |
| Tool input validation and inference | `zod` |
| TypeScript runtime types and build | `typescript`, `@types/node` |
| Unit and protocol integration tests | `vitest` |
| HTTP framework or dependency injection | Reuse the host application |

- Install the MCP SDK and a Zod version compatible with that installed SDK.
- Use SDK-provided transports rather than implementing JSON-RPC framing.
- Do not add an HTTP framework solely for MCP when the application already has
  one.
- Keep runtime dependencies in `dependencies` and compiler/test/lint packages
  in `devDependencies`.
- Use the repository package manager and lockfile. Do not use `npx`.

## 3. Configure TypeScript for the transport

- Use ESM and NodeNext conventions when the repository does: set
  `"type": "module"`, use `"module": "nodenext"`, and retain explicit `.js`
  suffixes in relative TypeScript imports.
- Keep strict checking, `isolatedModules`, `noUncheckedIndexedAccess`, and
  `exactOptionalPropertyTypes`.
- Keep production emission separate from editor/test checking. Include tests
  in the non-emitting config and only runtime source in the build config.
- Include MCP source and tests in the existing ESLint and Vitest scopes.
- Add only the scripts the transport needs, such as a build command and a
  server entrypoint. Do not duplicate existing scripts.
- Treat host registration files—dependency-injection modules, controllers,
  routers, executable entrypoints, and environment configuration—as directly
  related config. Update them only when server wiring changes.

## 4. Separate transport, registry, tools, and domain logic

Use four layers:

1. **Transport host** owns HTTP/stdio integration, origin or authorization
   checks, sessions, connection lifecycle, and shutdown.
2. **Server composition** creates `McpServer`, declares server identity and
   capabilities, and registers a deterministic tool list.
3. **Tool adapters** validate native MCP inputs, resolve server-controlled
   resources, invoke one domain operation, and encode a protocol result.
4. **Domain operations** contain business logic and know nothing about MCP,
   JSON-RPC, transports, or console output.

Prefer one schema module and one adapter module per coherent tool group. Export
tool-name constants so registry code, tests, and clients do not repeat strings.
Use a typed definition helper when the registry needs a common erased type but
each callback still needs schema-derived input inference.

Inject server-owned dependencies through a small context object:

```ts
interface ToolContext {
  service: DomainService
}

function defineTool<InputSchema extends ZodRawShapeCompat>(
  tool: ToolDefinition<InputSchema>,
): ToolRegistration {
  return tool
}
```

Do not import mutable application singletons directly into each tool.

## 5. Choose and manage the transport deliberately

### Streamable HTTP

- Let the SDK transport handle MCP framing and request bodies.
- Decide whether the endpoint is stateless per request or sessionful. Match
  server and transport lifetime to that decision.
- Close every created server/transport in `finally`.
- Define supported HTTP methods explicitly and return deliberate statuses for
  unsupported methods.
- Validate browser origins and add authentication/authorization when the
  exposure boundary requires it.
- Keep request bodies, credentials, and client filesystem paths out of logs.

### stdio

- Create one server and one stdio transport for the process lifetime.
- Reserve stdout exclusively for protocol messages; write diagnostics to
  stderr.
- Handle shutdown without emitting non-protocol output or abandoning active
  operations.

Do not mix transports in one entrypoint unless the lifecycle and logging rules
are explicit and independently tested.

## 6. Define tools as stable public contracts

For every tool:

- Use a stable, descriptive name and a concise title/description.
- Define input with native Zod types: booleans as booleans, numbers as numbers,
  and arrays as arrays. Do not expose CLI string encodings through MCP.
- Make required versus optional fields intentional. Reject malformed input
  before side effects or domain invocation.
- Keep transport-only selectors in the adapter; do not leak them into domain
  options.
- Resolve paths, IDs, tenant scope, or other server-controlled resources
  before calling the domain operation. Never accept arbitrary roots merely for
  convenience.
- Convert values only where the existing domain API requires it.
- Return `CallToolResult`-compatible content. Preserve the repository's
  established JSON/text or structured-content shape.
- Mark read-only tools with `readOnlyHint: true`. Mark write-capable tools
  accurately and preserve dry-run defaults where available.
- Never turn a domain failure into success-shaped output. Let expected errors
  use the established MCP tool-error path and unexpected errors remain
  failures.

## 7. Common task playbooks

### Add a tool

1. Add the name constant and Zod schema.
2. Add a typed thin adapter with accurate annotations.
3. Register it in the intended deterministic position.
4. Update expected discovery names and metadata assertions.
5. Add protocol-level `tools/call` success and invalid-input tests.
6. Add domain-error and side-effect-safety tests.
7. Add a live client request and public documentation when the tool is exposed.

### Change a tool input

1. Change the schema first and inspect inferred callback types.
2. Update adapter mapping without widening the domain API unnecessarily.
3. Assert discovery JSON Schema, including type and requiredness.
4. Test omitted/default, explicit valid, invalid-type, and boundary values.
5. Update client examples and compatibility notes.

### Add a tool dependency

1. Add the narrow dependency to the shared tool context.
2. Construct it at the server composition or host dependency-injection layer.
3. Pass it through registries; do not instantiate it in handlers.
4. Supply a real or controlled test instance and assert exact adapter calls.

### Change transport or server lifecycle

1. Write lifecycle tests before changing construction.
2. Preserve initialization, capability discovery, and invocation behavior.
3. Test connection closure, unsupported methods, malformed requests, and
   exposure security.
4. Run a real client against the built server.

### Add write capability

1. Keep dry-run behavior as the default when the domain supports it.
2. Require an explicit execute signal for destructive work.
3. Set annotations honestly and test both dry-run and execute routing.
4. Assert path confinement, destination collisions, and no-write-on-error
   behavior before testing successful writes.

## 8. Test at protocol and domain boundaries

- Unit-test domain operations separately from MCP.
- For tool tests, start the real MCP host/transport and mock only the domain
  boundary. Send actual `initialize`, `tools/list`, and `tools/call` JSON-RPC
  requests.
- Assert tool name/order, schema property types, required fields, title,
  description when contractual, and safety annotations.
- Assert exact domain calls so transport-only inputs cannot leak through.
- Assert invalid schema input and resource-confinement failures occur before
  domain invocation.
- Use temporary roots and close applications/transports in `afterEach`.
- Test write-capable tools for dry-run defaults and no side effects on errors.
- Add a live collection or client smoke test for transport headers, protocol
  version negotiation, and built-artifact behavior.

## 9. Verify in risk order

1. After each modified TypeScript file, run the repository's targeted lint
   command for that file and fix all findings.
2. Run focused tool and server tests.
3. Run the TypeScript build.
4. Run final whole-project lint and the complete test suite.
5. Run the live MCP client/collection against the built server.
6. Stop captured processes, remove only known temporary resources, and inspect
   the final diff for schema, registry, docs, and dependency-lock consistency.

## 10. Avoid these failures

- Do not spawn the CLI from an MCP handler.
- Do not duplicate business logic in tool callbacks.
- Do not use untyped request bodies or `any` to bypass SDK generics.
- Do not expose arbitrary filesystem roots, service credentials, or host
  configuration as tool inputs.
- Do not use truthiness for boolean selectors; compare with exact `true` when
  only true opts into alternate behavior.
- Do not forget registry/discovery expectations when adding a tool.
- Do not leave server or transport instances open after request/test failure.
- Do not log to stdout in a stdio server.
- Do not rely only on direct callback tests; exercise the protocol transport.
- Do not upgrade the SDK, Zod, host framework, or protocol version as an
  incidental part of an unrelated tool change.
