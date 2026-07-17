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
./node_modules/.bin/vitest run src/command-utils.test.ts
./node_modules/.bin/vitest run src/commands/manage-albums/summarize-source-dir.test.ts
./node_modules/.bin/vitest run src/commands/manage-audiobooks/merge.test.ts
```

Any file glob or path that matches `src/**/*.test.ts` works:

```sh
./node_modules/.bin/vitest run src/commands/manage-albums/
./node_modules/.bin/vitest run src/commands/manage-audiobooks/
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

Tests live beside the source modules they exercise:

```
src/command-utils.test.ts
src/commands/manage-albums/helpers/utils.test.ts
src/commands/manage-albums/summarize-source-dir.test.ts
src/commands/manage-albums/fix-tags.test.ts
src/commands/manage-albums/organize-files.test.ts
src/commands/manage-audiobooks/validate.test.ts
src/commands/manage-audiobooks/copy-and-rename.test.ts
src/commands/manage-audiobooks/crawl.test.ts
src/commands/manage-audiobooks/merge.test.ts
src/commands/manage-audiobooks/convert-file.test.ts
src/commands/manage-audiobooks/set-metadata.test.ts
```

Shared fixtures and temporary-directory helpers are in `src/test-helpers.ts`.
