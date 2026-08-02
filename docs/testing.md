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

Run all tests with coverage reporting:

```sh
npm run test:coverage
```

Coverage artifacts are written to `reports/coverage/`. Global coverage
thresholds are enforced at 85% statements, 85% lines, 90% functions, and 70%
branches.

## Running a Single Test File

Use the locally installed Vitest binary directly — never `npx`:

```sh
./node_modules/.bin/vitest run __tests__/command-utils.test.ts
./node_modules/.bin/vitest run __tests__/lib/albums/list.test.ts
./node_modules/.bin/vitest run __tests__/commands/manage-albums/summarize-source-dir.test.ts
./node_modules/.bin/vitest run __tests__/commands/manage-audiobooks/merge.test.ts
```

Any file glob or path that matches `__tests__/**/*.test.ts` works:

```sh
./node_modules/.bin/vitest run __tests__/commands/manage-albums/
./node_modules/.bin/vitest run __tests__/commands/manage-audiobooks/
```

## Running the Bruno Web Smoke Test

Build and start the local web server against the live example directories:

```sh
npm run build
WEB_SCRATCH_DIR="$(mktemp -d)"
mkdir "$WEB_SCRATCH_DIR/scratch-only"
npm run web:serve -- --source-dir etc/1-source-files --dest-dir etc/2-destination-files --scratch-dir "$WEB_SCRATCH_DIR" --host 127.0.0.1 --port 3000
```

In another shell, run the Bruno collection from its collection root:

```sh
cd collections/harmonia-aquila-web
../../node_modules/.bin/bru run . -r --env local --bail
```

The `scratch-only/` marker lets REST, GraphQL, and MCP list requests prove that
`useScratchDir: true` selects the configured scratch root. After stopping the
server, remove only the known marker and temporary root:

```sh
rmdir "$WEB_SCRATCH_DIR/scratch-only"
rmdir "$WEB_SCRATCH_DIR"
```

The collection includes both the REST web routes and the scoped `/mcp` endpoint
for the current manage-albums and manage-audiobooks tool surface.

### Multiple-album conflict smoke test

The dedicated six-request group requires a temporary flat source containing
two tracks with distinct album tags. Build it from read-only sample tracks;
never edit those source files or anything under `etc/**`:

```sh
MULTI_ALBUM_ROOT="$(mktemp -d)"
mkdir "$MULTI_ALBUM_ROOT/source" "$MULTI_ALBUM_ROOT/scratch" "$MULTI_ALBUM_ROOT/destination"
cp "etc/albums/1-source-files/Across The Universe Soundtrack/1-01 Girl.mp3" "$MULTI_ALBUM_ROOT/source/across.mp3"
cp "etc/albums/1-source-files/Requiem For A Dream - OST/01.Summer - Summer Overture.mp3" "$MULTI_ALBUM_ROOT/source/requiem.mp3"
npm run build
npm run web:serve -- --source-dir "$MULTI_ALBUM_ROOT/source" --scratch-dir "$MULTI_ALBUM_ROOT/scratch" --dest-dir "$MULTI_ALBUM_ROOT/destination" --host 127.0.0.1 --port 3000 >"$MULTI_ALBUM_ROOT/web.log" 2>&1 &
MULTI_ALBUM_SERVER_PID=$!
```

Run only the conflict group. Its organization requests are dry runs and never
set `execute`:

```sh
cd collections/harmonia-aquila-web
../../node_modules/.bin/bru run multiple-album-conflicts -r --env local --bail
cd ../..
```

Stop only the captured process and remove only the known temporary files and
directories:

```sh
kill "$MULTI_ALBUM_SERVER_PID"
wait "$MULTI_ALBUM_SERVER_PID" || true
rm "$MULTI_ALBUM_ROOT/source/across.mp3" "$MULTI_ALBUM_ROOT/source/requiem.mp3" "$MULTI_ALBUM_ROOT/web.log"
rmdir "$MULTI_ALBUM_ROOT/source" "$MULTI_ALBUM_ROOT/scratch" "$MULTI_ALBUM_ROOT/destination"
rmdir "$MULTI_ALBUM_ROOT"
```

## Hermetic Rules

The test suite is fully hermetic:

- **No real media files.** Tests create placeholder audio and image files in temporary directories.
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
__tests__/lib/albums/list.test.ts
__tests__/commands/manage-albums/helpers/utils.test.ts
__tests__/commands/manage-albums/list.test.ts
__tests__/commands/manage-albums/summarize-source-dir.test.ts
__tests__/lib/albums/disc-metadata.test.ts
__tests__/lib/albums/disc-validation.test.ts
__tests__/lib/albums/disc-inference.test.ts
__tests__/commands/manage-albums/organize-files.test.ts
__tests__/commands/manage-albums/organize-files-disc.test.ts
__tests__/lib/albums/organize-files-metadata.test.ts
__tests__/lib/albums/organize-files-metadata-disc.test.ts
__tests__/lib/albums/audio-files-album-art.test.ts
__tests__/lib/albums/organize-files-album-art.test.ts
__tests__/lib/albums/organize-files-album-art-execution.test.ts
__tests__/web/manage-albums-organize-metadata.test.ts
__tests__/web/graphql/album-disc-metadata.test.ts
__tests__/web/graphql/album-organize-output.integration.test.ts
__tests__/commands/manage-audiobooks/validate.test.ts
__tests__/commands/manage-audiobooks/copy-and-rename.test.ts
__tests__/commands/manage-audiobooks/crawl.test.ts
__tests__/commands/manage-audiobooks/merge.test.ts
__tests__/commands/manage-audiobooks/convert-file.test.ts
__tests__/commands/manage-audiobooks/set-metadata.test.ts
```

Shared fixtures and temporary-directory helpers are in `__tests__/test-helpers.ts`.
