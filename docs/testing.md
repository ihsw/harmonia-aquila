# Testing

## Running the Suite

Run all tests once (CI / pre-commit):

```sh
npm test
```

Start watch mode for active development:

```sh
npm run test:watch
```

## Running a Single Test File

Use the locally installed Vitest binary directly — never `npx`:

```sh
./node_modules/.bin/vitest run __tests__/command-utils.test.ts
./node_modules/.bin/vitest run __tests__/commands/manage-albums/summarize-source-dir.test.ts
./node_modules/.bin/vitest run __tests__/commands/manage-audiobooks/merge.test.ts
```

Any file glob or path that matches `__tests__/**/*.test.ts` works:

```sh
./node_modules/.bin/vitest run __tests__/commands/manage-albums/
./node_modules/.bin/vitest run __tests__/commands/manage-audiobooks/
```

## Hermetic Rules

The test suite is fully hermetic:

- **No real media files.** Tests create empty placeholder files (`.flac`, `.mp3`, `.m4b`) in temporary directories.
- **No Docker.** `mergeWithM4bTool` is mocked at the module boundary; dry-run tests assert it is never called.
- **No network.** All metadata reads use `vi.mock('music-metadata', ...)` with deterministic fixture factories.
- **No native writes.** `node-taglib-sharp`'s `File.createFromPath` is mocked; real tag writes never occur.
- **No machine paths.** Temporary directories are created beneath the operating
  system's temporary directory and removed after each test.

## Test Layout

Tests live in the root `__tests__/` tree, grouped to mirror the source
modules they exercise. Keeping tests outside `src/` prevents `npm run build`
from emitting test files into `build/dist`.

```
__tests__/command-utils.test.ts
__tests__/commands/manage-albums/helpers/utils.test.ts
__tests__/commands/manage-albums/summarize-source-dir.test.ts
__tests__/commands/manage-albums/fix-tags.test.ts
__tests__/commands/manage-albums/organize-files.test.ts
__tests__/commands/manage-audiobooks/validate.test.ts
__tests__/commands/manage-audiobooks/copy-and-rename.test.ts
__tests__/commands/manage-audiobooks/crawl.test.ts
__tests__/commands/manage-audiobooks/merge.test.ts
__tests__/commands/manage-audiobooks/convert-file.test.ts
__tests__/commands/manage-audiobooks/set-metadata.test.ts
```

Shared fixtures and temporary-directory helpers are in `__tests__/test-helpers.ts`.
