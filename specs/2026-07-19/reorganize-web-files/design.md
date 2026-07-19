# Design: Reorganize Web Files

> Scope reminder: this spec touches **only** `src/web/**`, import updates in
> `src/commands/web/**`, web-focused tests under `__tests__/web/**`, and directly
> related docs if they already mention old `src/web/` paths. No behavior changes,
> no new dependencies, no `npx`.

## 1. Overview

Use a folder-by-responsibility refactor. The implementation should move the existing flat `src/web/*.ts` files into logical subdirectories and update imports, without introducing adapter facades or duplicated logic. This satisfies FR-1 through FR-3 while keeping the observable web and MCP contracts stable under FR-4 through FR-6.

The root of `src/web/` should contain only intentional entrypoints if keeping them at the root improves import ergonomics. Recommended root entrypoint retention is `main.ts` because `src/commands/web/serve.ts` imports it as the web bootstrap API. All other files should move under the responsibility directories below unless implementation reveals a stronger reason to keep a tiny barrel file.

## 2. File layout

### Modified and moved files

```text
src/web/app.module.ts                         -> src/web/modules/app.module.ts
src/web/manage-albums.controller.ts           -> src/web/controllers/manage-albums.controller.ts
src/web/manage-audiobooks.controller.ts       -> src/web/controllers/manage-audiobooks.controller.ts
src/web/mcp.controller.ts                     -> src/web/controllers/mcp.controller.ts
src/web/request-schemas.ts                    -> src/web/schemas/request-schemas.ts
src/web/mcp-schemas.ts                        -> src/web/schemas/mcp-schemas.ts
src/web/path-resolver.ts                      -> src/web/providers/path-resolver.ts
src/web/mcp-server.ts                         -> src/web/servers/mcp-server.ts
src/web/http-errors.ts                        -> src/web/http-errors.ts or src/web/providers/http-errors.ts
src/web/main.ts                               -> src/web/main.ts
src/commands/web/**/*.ts                      (import path updates only)
__tests__/web/**/*.ts                         (import path/mock updates only)
```

`http-errors.ts` may remain at `src/web/http-errors.ts` if it is treated as a cross-cutting HTTP utility, or move to `src/web/providers/http-errors.ts` if the implementing agent chooses a stricter "providers include error mapping" convention. Make the choice once and update all imports consistently (FR-3).

### Target directory shape

```text
src/web/
  controllers/
    manage-albums.controller.ts
    manage-audiobooks.controller.ts
    mcp.controller.ts
  modules/
    app.module.ts
  providers/
    path-resolver.ts
    http-errors.ts        (optional target; see above)
  schemas/
    mcp-schemas.ts
    request-schemas.ts
  servers/
    mcp-server.ts
  main.ts
  http-errors.ts          (optional retained utility; see above)
```

### Files explicitly NOT modified

- `src/lib/**` remains the shared domain layer used by CLI, web controllers, and MCP tools.
- `collections/harmonia-aquila-web/**` remains unchanged unless a path-only test harness import requires no contract changes; Bruno request/assertion behavior should not change.
- `package.json` and `package-lock.json` remain unchanged because this is a source layout refactor with no dependency changes.
- Generated `build/**` remains untouched.

## 3. Import strategy

Prefer direct relative imports to the moved implementation files. Do not add compatibility files at the old root paths unless a real external consumer requires them; current repo-local consumers should be updated directly (FR-3).

Expected representative import changes:

```ts
// src/web/main.ts
import { createAppModule } from './modules/app.module.js'
import { normalizeWebRoots, type WebRoots } from './providers/path-resolver.js'

// src/web/modules/app.module.ts
import { ManageAlbumsController } from '../controllers/manage-albums.controller.js'
import { ManageAudiobooksController } from '../controllers/manage-audiobooks.controller.js'
import { McpController } from '../controllers/mcp.controller.js'
import { WebMcpServerFactory } from '../servers/mcp-server.js'
import { WebPathResolver, type WebRoots } from '../providers/path-resolver.js'
```

If `http-errors.ts` moves to `providers`, controllers import `throwHttpError` from `../providers/http-errors.js`; otherwise they import it from `../http-errors.js`.

## 4. Component-by-component mapping

| Current file | Responsibility | New file |
| ------------ | -------------- | -------- |
| `src/web/app.module.ts` | NestJS module wiring | `src/web/modules/app.module.ts` |
| `src/web/main.ts` | Web app/server bootstrap API | `src/web/main.ts` |
| `src/web/manage-albums.controller.ts` | Album HTTP routes | `src/web/controllers/manage-albums.controller.ts` |
| `src/web/manage-audiobooks.controller.ts` | Audiobook HTTP routes | `src/web/controllers/manage-audiobooks.controller.ts` |
| `src/web/mcp.controller.ts` | MCP HTTP endpoint controller | `src/web/controllers/mcp.controller.ts` |
| `src/web/request-schemas.ts` | HTTP request Zod schemas and parse helpers | `src/web/schemas/request-schemas.ts` |
| `src/web/mcp-schemas.ts` | MCP tool input schemas | `src/web/schemas/mcp-schemas.ts` |
| `src/web/path-resolver.ts` | Injectable web root/path resolver provider | `src/web/providers/path-resolver.ts` |
| `src/web/mcp-server.ts` | MCP server factory/provider | `src/web/servers/mcp-server.ts` |
| `src/web/http-errors.ts` | HTTP error mapping utility | `src/web/http-errors.ts` or `src/web/providers/http-errors.ts` |

## 5. Test updates

### 5.1 What stays the same

- Web controller tests keep the same behavioral assertions.
- Bootstrap tests keep proving app creation and server startup behavior without changing exposed command behavior.
- MCP tests keep asserting local-origin protection, method behavior, tool schema behavior, and response content.
- Bruno collection requests and assertions remain behaviorally unchanged.

### 5.2 What changes

- Update test imports for moved controllers, schemas, providers, modules, or server factories.
- Update `vi.mock(...)` specifiers if tests mock moved web modules.
- If snapshot text includes old file paths, update only the path text and keep behavior expectations intact.

### 5.3 Coverage parity table

| Existing coverage area | Disposition |
| ---------------------- | ----------- |
| Album web route mapping and validation | Kept; imports updated only. |
| Audiobook web route mapping and validation | Kept; imports updated only. |
| Web path resolver root/traversal behavior | Kept; imports updated only. |
| MCP endpoint and tool behavior | Kept; imports updated only. |
| Web serve command bootstrap | Kept; import path to `createWebApp`/`serveWeb` remains `src/web/main.ts` unless tests import deeper module internals. |

## 6. Migration strategy

1. Move schema files first and update controller/MCP server imports.
2. Move provider/server files and update module, bootstrap, controller, and tests imports.
3. Move controllers and app module, then update `createWebApp` imports and test imports.
4. Decide whether `http-errors.ts` stays root-level or moves to `providers`, then update all controller imports consistently.
5. Run focused web tests, then final full verification.

This order keeps imports resolvable after each small batch and avoids behavior edits while paths are changing.

## 7. Risk Table

| Risk | Likelihood | Mitigation |
| ---- | ---------- | ---------- |
| Relative imports become hard to audit after moves | Medium | Use the mapping table as the source of truth and run `npm run build` after moves. |
| Tests accidentally weaken behavior while updating mocks | Medium | Restrict test edits to import/mock specifiers unless a failing assertion proves a path-only update is needed. |
| `http-errors.ts` classification becomes inconsistent | Low | Choose root utility or provider target once; do not leave duplicate files. |
| External imports expect old root paths | Low | Search repo-local imports before deleting old paths; if non-repo consumers are discovered, stop and ask before adding shims. |
| MCP server/provider terminology overlaps with Nest providers | Low | Keep DI class names unchanged and only change file paths. |

## 8. Verification

After every source code file edit:

1. `npm run lint -- <modified-file>` — lint only the file just modified (NFR-1).

Focused checks during implementation:

1. `./node_modules/.bin/vitest run __tests__/web`

At the end:

1. `npm run lint` — whole-codebase last-call lint after all TypeScript modifications are complete; must exit 0.
2. `npm run build` — must exit 0.
3. `npm test` — must exit 0.
4. Start `npm run web:serve -- --source-dir etc/1-source-files --dest-dir etc/2-destination-files --host 127.0.0.1 --port 3000` and capture the server PID.
5. `cd collections/harmonia-aquila-web && ../../node_modules/.bin/bru run . -r --env local --bail` — must exit 0.
6. Stop the captured server PID with `kill <PID>`.
7. `git --no-pager diff --stat -- src/web src/commands/web __tests__/web` — must list only expected moves and import/test updates.
