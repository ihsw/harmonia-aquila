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
npm run web:serve -- --source-dir etc/1-source-files --dest-dir etc/2-destination-files --host 127.0.0.1 --port 3000
```

In another shell, run the Bruno collection from its collection root:

```sh
cd collections/harmonia-aquila-web
../../node_modules/.bin/bru run . -r --env local --bail
```

The collection proves source-root reads and destination-root dry-run plans.

The collection includes both the REST web routes and the scoped `/mcp` endpoint
for the current manage-albums and manage-audiobooks tool surface.

The `inline-set-metadata` group is designed for an isolated flat source with a
single file named `track.mp3`. It verifies equivalent REST, GraphQL, and MCP
inline-record dry runs; it never sets `execute`.

### Multiple-album conflict smoke test

The dedicated six-request group requires a temporary flat source containing
two tracks with **distinct album tags**. No two files in `etc/**` carry distinct
albums any more — the surviving OC ReMix collection tags every file
`album: "ocremix.org"` — so the album values must be written onto temporary
copies. Never edit the source files or anything under `etc/**`:

```sh
MULTI_ALBUM_ROOT="$(mktemp -d)"
mkdir "$MULTI_ALBUM_ROOT/source" "$MULTI_ALBUM_ROOT/destination"
OCR="etc/albums/1-source-files/OC ReMix Collection - 1 to 4000 [v20201028]"
cp "$OCR/7th_Guest_AmIEviL_OC_ReMix.mp3"   "$MULTI_ALBUM_ROOT/source/track-a.mp3"
cp "$OCR/7th_Guest_Fat_Dance_OC_ReMix.mp3" "$MULTI_ALBUM_ROOT/source/track-b.mp3"
npm run build
node -e "
const { writeAudioTagFix } = await import('./build/dist/lib/albums/audio-tags.js');
writeAudioTagFix(process.argv[1] + '/source/track-a.mp3', { album: 'Album A' });
writeAudioTagFix(process.argv[1] + '/source/track-b.mp3', { album: 'Album B' });
" "$MULTI_ALBUM_ROOT"
npm run web:serve -- --source-dir "$MULTI_ALBUM_ROOT/source" --dest-dir "$MULTI_ALBUM_ROOT/destination" --host 127.0.0.1 --port 3000 >"$MULTI_ALBUM_ROOT/web.log" 2>&1 &
MULTI_ALBUM_SERVER_PID=$!
```

The two copies keep their original artists (`AmIEviL`, `The Fat Man`) and track
numbers (127, 741), so after the album rewrite they resolve to two distinct
albums and the group's `Multiple albums found:` contract holds.

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
rmdir "$MULTI_ALBUM_ROOT/source" "$MULTI_ALBUM_ROOT/destination"
rmdir "$MULTI_ALBUM_ROOT"
```

### Multiple-album allowed smoke test

The `multiple-album-allowed` group proves the opposite contract: with
`allowMultipleAlbums`, one run plans several `Artist/Album` trees. It needs the
**unmodified** OC ReMix copies — request 4 asserts the source's real tags, one
album title (`ocremix.org`) held by two artists — so build a second fixture
without the album rewrite:

```sh
ALLOW_ROOT="$(mktemp -d)"
mkdir "$ALLOW_ROOT/source" "$ALLOW_ROOT/destination"
OCR="etc/albums/1-source-files/OC ReMix Collection - 1 to 4000 [v20201028]"
cp "$OCR/7th_Guest_AmIEviL_OC_ReMix.mp3"   "$ALLOW_ROOT/source/track-a.mp3"
cp "$OCR/7th_Guest_Fat_Dance_OC_ReMix.mp3" "$ALLOW_ROOT/source/track-b.mp3"
npm run build
npm run web:serve -- --source-dir "$ALLOW_ROOT/source" --dest-dir "$ALLOW_ROOT/destination" --host 127.0.0.1 --port 3000 >"$ALLOW_ROOT/web.log" 2>&1 &
ALLOW_SERVER_PID=$!
```

```sh
cd collections/harmonia-aquila-web
../../node_modules/.bin/bru run multiple-album-allowed -r --env local --bail
cd ../..
```

Requests 1–3 send inline `setMetadata` assigning two distinct albums with **both
tracks numbered 1**, on REST, GraphQL and MCP: the case that fails with
`Duplicate track numbers were detected:` without the flag, because disc
validation is otherwise scoped to the whole run. Request 4 sends no
`setMetadata` and proves the artist guard is relaxed too. None sets `execute`.

**Stop the previous server before starting the next one.** The two groups need
different fixtures, and a surviving process keeps port 3000 — the new server then
fails to bind with `EADDRINUSE` while Bruno silently tests the old fixture:

```sh
kill "$ALLOW_SERVER_PID"
wait "$ALLOW_SERVER_PID" || true
rm -rf "$ALLOW_ROOT"
```

## Manual ID3v2.3 Tag Verification Check

The automated suite mocks both `music-metadata` and `node-taglib-sharp`, so it
cannot prove that a real ID3v2.3 round trip survives verification. Run this by
hand after changing anything in `src/lib/albums/audio-tag-verification.ts` or
`audio-tags.ts`. It is the only check here that touches real media, and it is
deliberately outside the hermetic suite.

Point `--dest-dir` at a scratch path that **does not yet exist**. Under the
default `--destination-strategy error` an existing album directory aborts the
run before any tag is written, which will mask whatever you meant to test.

```sh
npm run build
node . manage-albums organize-files --limit 5 --format json \
  --allow-multiple-albums --ignore-non-audio-files \
  --title-filename-strategy subtitle --album-artists-strategy aggregate \
  --set-artist "OverClocked ReMix" --album-strategy grouping \
  --source-dir "etc/albums/1-source-files/OC ReMix Collection - 1 to 4000 [v20201028]" \
  --dest-dir etc/scratchpad/verify-dest --execute
```

Expect exit 0 and five `"action": "copied"` rows across three album
directories under `OverClocked ReMix/`: `7th Guest` (three tracks, aggregated to
the album artists `AmIEviL`, `Mazedude`, `The Fat Man`), `3D Pinball- Space
Cadet` (one), and `3-D Ultra Pinball- Creep Night` (one). Re-reading a published
`7th Guest` track must show the joined `TPE2` value
`"AmIEviL/Mazedude/The Fat Man"` in `native['ID3v2.3']` — that joined form is
the pass condition, not a defect.

To exercise the involved-people frame as well, repeat with
`--producer-strategy copy-from-album-artists` into a second fresh destination.
The sources carry no producer tags, so `--producer-strategy aggregate` yields an
empty list and never reaches that code path. A published track should then carry
`IPLS {"producer":["OverClocked ReMix"]}` while `common.producer` stays
`undefined`. Any `Metadata was not persisted` failure is a regression.

Remove the scratch destinations afterwards.

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
__tests__/commands/manage-albums/organize-files-set-metadata.test.ts
__tests__/commands/manage-albums/organize-files-disc.test.ts
__tests__/lib/albums/organize-files-disc-policy.test.ts
__tests__/lib/albums/organize-files-metadata.test.ts
__tests__/lib/albums/audio-tag-verification.test.ts
__tests__/lib/albums/organize-files-tag-verification.test.ts
__tests__/lib/albums/organize-files-set-metadata-input.test.ts
__tests__/lib/albums/organize-files-metadata-disc.test.ts
__tests__/lib/albums/audio-files-album-art.test.ts
__tests__/lib/albums/organize-files-album-art.test.ts
__tests__/lib/albums/organize-files-album-art-execution.test.ts
__tests__/lib/albums/multiple-album-guard.test.ts
__tests__/lib/albums/allow-multiple-albums.test.ts
__tests__/web/manage-albums-allow-multiple-albums.test.ts
__tests__/web/manage-albums-organize-metadata.test.ts
__tests__/web/mcp.manage-albums-set-metadata.test.ts
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
