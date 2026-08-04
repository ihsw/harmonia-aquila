# Design: Remove Deprecated Web Scratch Directory

> Scope reminder: this spec changes only web-root configuration, album web adapters, their tests and Bruno requests, active documentation/scripts, and album-organization guidance. No shared library, standalone CLI, dependency, media-fixture, historical-spec, or npx changes are permitted.

## 1. Overview

This is a subtractive root-contract refactor. The web bootstrap keeps the existing trusted-root pattern but reduces WebRoots to source and destination only (FR-1, FR-2). Every album read resolves relative to source; every album organization plan and execution publishes relative to destination. This brings REST and GraphQL in line with the existing MCP organizer binding (FR-3 through FR-5).

useScratchDir is removed rather than ignored. It disappears from typed REST request schemas, GraphQL inputs/SDL, MCP input schemas, handlers, discovery, tests, collection requests, and user guidance. Generic REST unknown-query/body handling otherwise retains its established behavior; the change does not add a special compatibility endpoint or warning (FR-3 through FR-7).

## 2. File layout

### Modified files

~~~
src/commands/web/serve.ts
src/web/providers/path-resolver.ts
src/web/controllers/manage-albums.controller.ts
src/web/schemas/request-schemas.ts
src/web/modules/graphql/album.inputs.ts
src/web/modules/graphql/album.resolver.ts
src/web/modules/graphql/schema.gql                         (generated)
src/web/schemas/mcp/manage-albums.ts
src/web/servers/mcp-tools/manage-albums/list.ts
src/web/servers/mcp-tools/manage-albums/validate.ts
__tests__/commands/web/serve.test.ts
__tests__/web/{bootstrap,controllers,logging,mcp-test-helpers}.ts
__tests__/web/manage-albums-{controller,organization-errors,organize-metadata,validation-errors}.test.ts
__tests__/web/mcp.manage-albums{,-operations,-validate}.test.ts
__tests__/web/graphql/{album-organize-output.integration,album.resolver,audiobook.resolver,graphql.integration}.test.ts
bin/web-serve.sh
collections/harmonia-aquila-web/graphql/album-organize-files.yml
collections/harmonia-aquila-web/mcp/tools-list.yml
README.md
docs/{graphql,mcp-server,testing}.md
.agents/skills/album-organization/SKILL.md
~~~

### Deleted files

~~~
collections/harmonia-aquila-web/graphql/album-list-scratch.yml
collections/harmonia-aquila-web/manage-albums/list-scratch.yml
collections/harmonia-aquila-web/mcp/call-manage-albums-list-scratch.yml
collections/harmonia-aquila-web/mcp/call-manage-albums-validate-scratch.yml
collections/harmonia-aquila-web/mcp/call-manage-albums-validate-scratch-path-traversal.yml
collections/harmonia-aquila-web/mcp/call-manage-albums-organize-files-scratch-path-traversal.yml
~~~

### Files explicitly not modified

- src/lib/** and src/commands/manage-albums/**: their generic roots and standalone CLI interface remain valid.
- Audiobook controller, resolver, and MCP tool sources: they already use the source/destination contract and need no routing change.
- src/web/main.ts and module wiring: they propagate WebRoots structurally; edit only if TypeScript demonstrates a necessary type-only adjustment.
- package.json, package-lock.json, etc/**, and all prior specs.

## 3. Root and operation contract

The bootstrap model changes as follows (FR-1 through FR-5):

~~~ts
// Before
interface WebRoots { sourceDir: string; destDir: string; scratchDir: string }

// After
interface WebRoots { sourceDir: string; destDir: string }
~~~

normalizeWebRoots continues to normalize both remaining, existing directories once. WebPathResolver retains resolveSource, resolveDest, and their reachable-symlink confinement checks; it removes scratchDir and resolveScratch.

| Surface and operation | Input root after change | Output root after change |
| --- | --- | --- |
| REST / GraphQL / MCP list, summarize, validate | source | none |
| REST / GraphQL / MCP album organize | source | destination |
| Existing audiobook operations | source | destination |

REST organization and the GraphQL mutation must change from their current source-or-scratch destination selection to pathResolver.destDir. MCP organization already binds destination and needs only schema cleanup. Multi-disc albumDirs continue to resolve independently under source.

## 4. Public contract removal

| Surface | Remove | Preserve |
| --- | --- | --- |
| Commander | --scratch-dir option and required-option handling | host, port, source, destination validation |
| REST schemas/controller | list/body useScratchDir parsing and routing | route paths, source resolution, body behavior |
| GraphQL | useScratchDir decorators, input properties, generated SDL | query/mutation names and return envelopes |
| MCP | list/validate/organize schema properties and scratch handlers | tool names/order, annotations, native types, JSON text content |
| Collections/docs | scratch calls, variables, instructions, traversal assertions | source traversal and dry-run checks |

Run application initialization to regenerate schema.gql; do not hand-edit that generated file. Preserve the server-controlled-root rule: no request may supply a replacement source or destination root (NFR-6).

## 5. Test and collection updates

All application and server fixtures will construct only distinct source and destination temporary directories. Remove scratch setup/cleanup and old exact-call assertions. Replace them with the following coverage:

| Area | Required proof |
| --- | --- |
| Commander/bootstrap | Scratch is absent from help and not required; source/destination validate and propagate. |
| Path resolver | Source/destination normalization and traversal protection remain; no scratch API remains. |
| REST | List/summary/validation bind source; organizer gets source input and destination output. |
| GraphQL | Inputs/SDL omit selectors; list reads source and organizer writes destination. |
| MCP | Discovery omits selector properties; list/validate resolve source; organizer uses source plus destination; tool metadata stays stable. |
| Errors | Source traversal continues to fail before a domain call; collisions/dry-run behavior stay unchanged. |
| Bruno | Remove scratch-only requests and variables; retain source-root list/validation, source traversal, and non-executing organize coverage. |

The full active-tree audit is a removal proof, not a requirement to rewrite historical specs:

~~~sh
rg -n -i "scratch-dir|scratchDir|useScratchDir" \
  --glob '!specs/**' --glob '!build/**' --glob '!node_modules/**' .
~~~

It must produce no matches after implementation (FR-7).

## 6. Migration strategy

1. Establish two-root bootstrap/path-resolver tests, then remove the command option and resolver member.
2. Remove REST and GraphQL selector inputs; route both album organizers to destination and regenerate GraphQL SDL.
3. Remove MCP selectors and scratch-dependent tool code while preserving discovery order and annotations.
4. Update all fixtures, focused tests, Bruno collection files, scripts, docs, and agent guidance; delete obsolete collection requests.
5. Run focused tests, full quality checks, a two-root live dry-run collection, and the active-tree audit.

## 7. Risk Table

| Risk | Likelihood | Mitigation |
| --- | --- | --- |
| REST/GraphQL organizer accidentally writes to source | Medium | Exact-call tests use distinct roots and assert destDir. |
| Public schema removal alters unrelated tool metadata | Low | Assert MCP names/order/annotations and GraphQL SDL/envelopes. |
| A constructor fixture still supplies or needs scratch | High | Audit all WebRoots, createWebApp, and serveWeb construction before edits. |
| Documentation leaves a stale setup command | Medium | Run the active-tree audit and update README, docs, script, skill, and collection files. |
| Removing old Bruno calls weakens safety coverage | Medium | Retain source traversal and dry-run organizer requests. |
| Source writes occur during validation | Low | Reuse existing dry-run/execute tests and live collection without execute: true. |

## 8. Verification

After every source-code edit:

1. npm run lint -- <modified-file> (NFR-1).

Focused checks:

1. ./node_modules/.bin/vitest run __tests__/commands/web/serve.test.ts __tests__/web/bootstrap.test.ts __tests__/web/controllers.test.ts
2. ./node_modules/.bin/vitest run __tests__/web/manage-albums-controller.test.ts __tests__/web/manage-albums-organization-errors.test.ts __tests__/web/manage-albums-organize-metadata.test.ts __tests__/web/manage-albums-validation-errors.test.ts
3. ./node_modules/.bin/vitest run __tests__/web/mcp.manage-albums.test.ts __tests__/web/mcp.manage-albums-operations.test.ts __tests__/web/mcp.manage-albums-validate.test.ts
4. ./node_modules/.bin/vitest run __tests__/web/graphql/album.resolver.test.ts __tests__/web/graphql/graphql.integration.test.ts __tests__/web/graphql/album-organize-output.integration.test.ts

Final checks:

1. npm run lint
2. npm run build
3. npm test
4. Start npm run web:serve -- --source-dir <temp-source> --dest-dir <temp-dest> --host 127.0.0.1 --port 3000, then run cd collections/harmonia-aquila-web && ../../node_modules/.bin/bru run . --env local --bail without any execute: true request.
5. Run the active-tree audit from section 5 and git diff --check.

