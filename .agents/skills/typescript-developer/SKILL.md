---
name: typescript-developer
description: Develop TypeScript CLIs with conventional dependencies, linting, unit tests, p-limit concurrency, and commander command patterns.
---

# Skill: TypeScript Developer

Use this skill for TypeScript development work in this repository, especially
when adding or modifying `.ts` / `.tsx` CLI commands, typed helpers, unit
tests, linting, or bounded parallel execution.

---

## 1. When to use this skill

Trigger on user requests that involve:

- TypeScript source, tests, or config.
- CLI command development with `commander`.
- Unit testing with Vitest.
- ESLint or type-aware lint setup.
- Concurrency, batching, or bounded parallel execution with `p-limit`.
- Dependency selection for basic TypeScript CLI projects.

Do not use this skill for audiobook/media-specific workflows unless the change
also requires TypeScript implementation guidance.

---

## 2. File exclusivity

- Apply implementation guidance only to TypeScript source files with `.ts` and
  `.tsx` extensions.
- Do not create or modify JavaScript source files (`.js`, `.jsx`, `.cjs`,
  `.mjs`) as implementation targets when invoking this skill.
- JavaScript config files such as `eslint.config.mjs` are allowed only when the
  tool convention requires them or the repository already uses that format.
- JSON config files and package manifests are allowed when they directly support
  the TypeScript workflow.
- Prefer `.ts` for Node CLI code and tests. Use `.tsx` only for files that
  contain JSX.

---

## 3. Baseline dependencies

For a Node.js TypeScript CLI, prefer this dependency shape:

| Category | Packages |
| -------- | -------- |
| Runtime CLI parsing | `commander` |
| Bounded concurrency | `p-limit` |
| TypeScript build | `typescript`, `@types/node` |
| Linting | `eslint`, `typescript-eslint`, `@eslint/js` |
| Unit testing | `vitest` |

Avoid adding new dependencies when an existing Node.js API or installed package
solves the problem clearly.

---

## 4. TypeScript config conventions

- Keep shared compiler options in a base config.
- Keep production builds separate from editor/test type-checking.
- Build configs may set `rootDir: "./src"` and emit declarations.
- Editor/test configs should include tests and config files, use `noEmit: true`,
  and set `rootDir: "."` or omit `rootDir` to avoid `TS6059` for tests outside
  `src`.
- Prefer `"module": "nodenext"` for ESM Node CLI projects with
  `"type": "module"`.
- Use explicit `.js` extensions in relative TypeScript imports when compiling
  under `nodenext`.
- Keep `strict`, `isolatedModules`, `noUncheckedIndexedAccess`, and
  `exactOptionalPropertyTypes` enabled unless the user explicitly requests a
  compatibility exception.

Sample files:

- `sample-configs/package.json`
- `sample-configs/tsconfig.base.json`
- `sample-configs/tsconfig.json`
- `sample-configs/tsconfig.build.json`

---

## 5. Linting conventions

- Use ESLint flat config for new projects.
- Use type-aware linting with `typescript-eslint` when the project already has
  the dependency and a TypeScript project file.
- Point ESLint at a config that includes both source and tests.
- Do not silence rules globally unless the repository already does so or the
  rule conflicts with a documented project convention.
- Prefer local, targeted disables only when a specific line has an unavoidable
  false positive.

Sample file:

- `sample-configs/eslint.config.mjs`

---

## 6. Unit testing conventions

- Use Vitest for TypeScript unit tests.
- Keep tests under `__tests__` or a repository-established test directory.
- Mock external effects, filesystem writes, command execution, and console
  output at the boundary.
- Assert both success output and error behavior for CLI commands.
- Use temporary directories/files for filesystem behavior and always clean them
  up in `afterEach`.
- Run tests through `npm test`; avoid Jest-only flags such as `--runInBand`.

Sample file:

- `sample-configs/vitest.config.ts`

---

## 7. Commander CLI conventions

- Build commands as functions that return a configured `Command`, so tests can
  instantiate commands without invoking the process entrypoint.
- Put side-effecting `program.parseAsync()` only in the executable entrypoint.
- Use `exitOverride()` in tests to assert command failures without exiting the
  test process.
- Validate option values at the command boundary and throw via
  `command.error(...)` for user-facing input errors.
- Prefer typed option-normalization helpers over reading untyped option objects
  throughout business logic.
- Keep command handlers thin: parse options, call typed domain functions, write
  output.

Sample file:

- `sample-configs/commander-command.ts`

---

## 8. p-limit concurrency conventions

- Use `p-limit` when processing many independent async items that touch the
  filesystem, network, child processes, media tools, or other constrained
  resources.
- Make concurrency explicit and configurable when users may need to tune it.
- Validate concurrency as a positive integer.
- Preserve output ordering when users expect stable output by mapping input
  items to limited promises and awaiting `Promise.all`.
- Prefer fail-fast `Promise.all` when one failure should abort the operation.
  Use `Promise.allSettled` only when partial success is a documented behavior
  and failed items are reported explicitly.
- Do not use unbounded `Promise.all(items.map(async ...))` for large or
  resource-heavy batches.

Sample file:

- `sample-configs/p-limit.ts`

---

## 9. Verification workflow

After TypeScript source or config changes, run the existing project commands
that apply:

```sh
npm run build
npm run lint -- --quiet
npm test
```

If changing only one layer, still run enough verification to prove the affected
layer works. For dependency or config changes, run the full set.

---

## 10. Anti-patterns to avoid

- ❌ Using `any` to bypass type errors instead of modeling the shape.
- ❌ Creating `.js` / `.jsx` source implementations when `.ts` / `.tsx` files
  are expected.
- ❌ Catching errors broadly and returning success-shaped fallback values.
- ❌ Letting CLI entrypoints parse process arguments during unit tests.
- ❌ Adding tests outside the TypeScript project used by the editor/linter.
- ❌ Reusing a production `rootDir: "./src"` config for tests in `__tests__`.
- ❌ Using unbounded parallelism for file/media/batch operations.
- ❌ Adding new dependencies without first checking existing project packages.
