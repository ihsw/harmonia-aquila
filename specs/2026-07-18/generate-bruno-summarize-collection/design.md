# Design: Generate Bruno Summarize Collection

> Scope reminder: this spec touches **only** `collections/harmonia-aquila-web/**`
> unless an implementation blocker requires explicit user approval. Do not edit
> `extern/bruno-starter-guide/**`, live media fixture contents, TypeScript
> source, package manifests, or generated build output. No new dependencies; no
> `npx`.

## 1. Overview

Use the Bruno starter guide as a format reference, not as a source to modify. The new collection should mirror its OpenCollection YAML structure: root `opencollection.yml`, `environments/local.yml`, and request YAML with `info`, `http`, `runtime`, and `settings`. This satisfies FR-1 through FR-5 while keeping the collection Git-friendly and local-first.

The collection is a live smoke test for the `web serve` API. Verification builds the CLI, starts `node build/dist/index.js web serve` (or `npm run web:serve -- ...`) with the real `etc/` source/destination roots, waits for the server to accept connections, then runs `./node_modules/.bin/bru run` against the request using the `local` environment (FR-6, FR-7). The server must be stopped by PID after Bruno finishes.

## 2. File layout

### New files

```text
collections/harmonia-aquila-web/opencollection.yml
collections/harmonia-aquila-web/environments/local.yml
collections/harmonia-aquila-web/manage-albums/summarize-source-dir.yml
```

### Files explicitly NOT modified

- `extern/bruno-starter-guide/**` is a reference submodule only.
- `etc/1-source-files/**` and `etc/2-destination-files/**` are live fixtures and must not be changed.
- `src/**`, `__tests__/**`, `package.json`, and `package-lock.json` should not be touched for this collection-only spec.
- `build/**` must not be hand-edited.

## 3. Bruno collection shape

Follow the starter guide's `opencollection.yml` pattern:

```yaml
opencollection: 1.0.0

info:
  name: Harmonia Aquila Web
bundled: false
extensions:
  bruno:
    ignore:
      - node_modules
      - .git
```

Use `environments/local.yml` for live-server variables:

```yaml
name: local
variables:
  - name: baseUrl
    value: http://127.0.0.1:3000
  - name: summarizeDirName
    value: .
  - name: ignoreNonAudioFiles
    value: 'true'
```

The request should use a relative `dirName` so it works with the `web serve --source-dir` path resolver from the directory-constrained web spec:

```yaml
info:
  name: summarize-source-dir
  type: http
  seq: 1

http:
  method: GET
  url: "{{baseUrl}}/manage-albums/summarize-source-dir?dirName={{summarizeDirName}}&ignoreNonAudioFiles={{ignoreNonAudioFiles}}"
  auth: inherit

runtime:
  scripts:
    - type: tests
      code: |-
        test("200 status code", function () {
          expect(res.getStatus()).to.eql(200);
        });

        test("response body is an array", function () {
          expect(res.getBody()).to.be.an("array");
        });
  assertions:
    - expression: res.status
      operator: eq
      value: "200"

settings:
  encodeUrl: true
  timeout: 0
  followRedirects: true
  maxRedirects: 5
```

If Bruno's runtime reports that `res.getBody()` is a string for this response, update the test to parse JSON explicitly while preserving the array assertion.

## 4. `bru run` usage

The installed CLI reports `bru run [paths...]` and supports request/folder paths plus environment options. The implementation should run the specific request or the collection folder:

```sh
./node_modules/.bin/bru run collections/harmonia-aquila-web/manage-albums/summarize-source-dir.yml --env local --bail
```

If collection auto-detection fails from the repository root, run the command from `collections/harmonia-aquila-web/` with the request path relative to that collection:

```sh
(cd collections/harmonia-aquila-web && ../../../node_modules/.bin/bru run manage-albums/summarize-source-dir.yml --env local --bail)
```

Do not use `npx`. Do not require external network access.

## 5. Live verification workflow

1. Build first: `npm run build`.
2. Start the server in the background:

```sh
npm run web:serve -- --source-dir etc/1-source-files --dest-dir etc/2-destination-files --host 127.0.0.1 --port 3000
```

3. Wait until `curl --fail "http://127.0.0.1:3000/manage-albums/summarize-source-dir?dirName=.&ignoreNonAudioFiles=true"` succeeds.
4. Run Bruno with the local environment and `--bail`.
5. Stop the server using the specific PID captured when starting it.

If port `3000` is occupied, use a different local port and override Bruno's environment variable with `--env-var baseUrl=http://127.0.0.1:<port>`.

## 6. Test updates

### 6.1 What stays the same

- Existing Vitest command/web tests remain unchanged.
- Existing `etc/1-source-files/**` and `etc/2-destination-files/**` fixture contents remain unchanged.

### 6.2 What changes

- The Bruno collection itself becomes the behavioral smoke test artifact.
- No TypeScript test should be added unless implementation changes TypeScript source, which is out of scope by default.

### 6.3 Coverage parity table

| Area | Disposition |
| ---- | ----------- |
| `GET /manage-albums/summarize-source-dir` route | Covered by live Bruno request against `web serve`. |
| Directory-constrained source root | Covered by `dirName=.` while `web serve` is started with `--source-dir etc/1-source-files`. |
| Destination root argument | Covered by server startup command with `--dest-dir etc/2-destination-files`. |

## 7. Migration strategy

1. Confirm `extern/bruno-starter-guide/` reference format and `./node_modules/.bin/bru run --help` behavior.
2. Create the new collection files under `collections/harmonia-aquila-web/**`.
3. Build the CLI.
4. Start `web serve` with the live `etc/` roots.
5. Run the Bruno request with `--env local --bail`.
6. Stop the server and verify no fixture files changed.

## 8. Risk Table

| Risk | Likelihood | Mitigation |
| ---- | ---------- | ---------- |
| Bruno CLI does not auto-detect the OpenCollection root from repo root | Medium | Fall back to running `bru run` from `collections/harmonia-aquila-web/`. |
| Port `3000` is already in use | Medium | Override `baseUrl` with `--env-var` and start `web serve` on an alternate local port. |
| Live fixture contains unsupported non-audio files | Low | Use `ignoreNonAudioFiles=true` in the request. |
| Bruno test body helper returns string instead of parsed JSON | Medium | Parse JSON in the runtime test while keeping the array assertion. |
| Server process is left running | Medium | Capture PID and stop that PID explicitly after Bruno exits. |

## 9. Verification

After every source code file edit, if any TypeScript source edit is explicitly approved:

1. `npm run lint -- <modified-file>` — lint only the file just modified (NFR-1).

Once the collection files are created:

1. `npm run build` — must exit 0.
2. Start `npm run web:serve -- --source-dir etc/1-source-files --dest-dir etc/2-destination-files --host 127.0.0.1 --port 3000` and capture the server PID.
3. `curl --fail "http://127.0.0.1:3000/manage-albums/summarize-source-dir?dirName=.&ignoreNonAudioFiles=true"` — must exit 0.
4. `./node_modules/.bin/bru run collections/harmonia-aquila-web/manage-albums/summarize-source-dir.yml --env local --bail` — must exit 0.
5. Stop the captured server PID.
6. `git --no-pager diff --stat -- extern src __tests__ package.json package-lock.json` — must show no unintended files.

## 10. Open decisions

1. If Bruno requires `.bru` request files instead of starter-guide `.yml` files in this installed CLI version, prefer preserving the same collection semantics in Bruno's supported local file format and document the deviation in `tasks.md`.
