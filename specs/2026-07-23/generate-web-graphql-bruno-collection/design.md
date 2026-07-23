# Design: Generate Web GraphQL Bruno Collection

> Scope reminder: this spec touches only `collections/harmonia-aquila-web/**`.
> No source, fixtures, dependency manifests, REST/MCP requests, or `npx`.

## 1. Overview

Add a sibling `graphql/` request folder to the existing REST-oriented folders.
Each YAML file follows the collection's established OpenCollection request
shape and posts a GraphQL document to `{{baseUrl}}/graphql` (FR-1, FR-2,
NFR-3). The collection remains a live local smoke-test artifact rather than a
replacement for GraphQL's Vitest integration suite.

Use GraphQL's standard HTTP behavior: application-level errors still commonly
return HTTP 200. Runtime assertions therefore inspect the `data` or `errors`
envelope, not REST status semantics (FR-3 through FR-5). All mutations remain
dry runs because their input omits `execute` (FR-4, NFR-4).

## 2. File layout

### Modified and new files

```text
collections/harmonia-aquila-web/environments/local.yml    (extend variables)
collections/harmonia-aquila-web/graphql/album-summarize-source-dir.yml
collections/harmonia-aquila-web/graphql/album-validate-source-dir.yml
collections/harmonia-aquila-web/graphql/audiobook-validate.yml
collections/harmonia-aquila-web/graphql/audiobook-crawl.yml
collections/harmonia-aquila-web/graphql/album-fix-tags.yml
collections/harmonia-aquila-web/graphql/album-organize-files.yml
collections/harmonia-aquila-web/graphql/audiobook-copy-and-rename.yml
collections/harmonia-aquila-web/graphql/audiobook-convert-files.yml
collections/harmonia-aquila-web/graphql/audiobook-merge.yml
collections/harmonia-aquila-web/graphql/audiobook-set-metadata.yml
collections/harmonia-aquila-web/graphql/album-summary-path-traversal.yml
```

### Files explicitly NOT modified

- `src/web/modules/graphql/**`: the collection validates the already committed
  GraphQL contract; it does not alter it.
- `collections/harmonia-aquila-web/{manage-albums,manage-audiobooks,mcp}/**`:
  existing adapter coverage remains unchanged.
- `etc/**`: live media fixtures must not be read-write test inputs.

## 3. Request contract

Each request uses `POST {{baseUrl}}/graphql`, `auth: inherit`, a JSON body,
and the existing timeout/redirect settings. The body uses a named operation
with GraphQL variables, keeping Bruno substitutions in JSON variables rather
than interpolating them into GraphQL syntax.

```yaml
body:
  type: json
  data: |-
    {
      "query": "query AlbumSummary($input: AlbumSummaryInput!) { albumSummarizeSourceDir(input: $input) { filename artist album title } }",
      "variables": {
        "input": {
          "dirName": "{{summarizeDirName}}",
          "ignoreNonAudioFiles": true
        }
      }
    }
```

All scripts first normalize `res.getBody()` into JSON. Successful requests
assert status 200, no `errors` property, and an array at their operation path.
The error-contract request asserts status 200, an `errors` array, and the
first error's `extensions.code`; it does not depend on exact validation text.

## 4. Operation mapping

| Request | Operation | Input strategy | Expected envelope |
| --- | --- | --- | --- |
| `album-summarize-source-dir.yml` | `albumSummarizeSourceDir` | `dirName: {{summarizeDirName}}` | Data array |
| `album-validate-source-dir.yml` | `albumValidateSourceDir` | Safe source directory, non-audio ignored | Data array |
| `audiobook-validate.yml` | `audiobookValidate` | Relative `{{sampleAudiobookFileName}}` | Data array or safe input error if fixture absent |
| `audiobook-crawl.yml` | `audiobookCrawl` | `dirName: {{summarizeDirName}}` | Data array |
| `album-fix-tags.yml` | `albumFixTags` | Dry-run options only | Data array or `BAD_USER_INPUT` |
| `album-organize-files.yml` | `albumOrganizeFiles` | Dry-run, `ignoreNonAudioFiles: true` | Data array |
| `audiobook-copy-and-rename.yml` | `audiobookCopyAndRename` | Relative sample filename, dry run | Data array or `BAD_USER_INPUT` |
| `audiobook-convert-files.yml` | `audiobookConvertFiles` | One relative filename, dry run | Data array or `BAD_USER_INPUT` |
| `audiobook-merge.yml` | `audiobookMerge` | Dry run with fixture-safe options | Data array or `BAD_USER_INPUT` |
| `audiobook-set-metadata.yml` | `audiobookSetMetadata` | Relative source/destination values, dry run | Data array or `BAD_USER_INPUT` |
| `album-summary-path-traversal.yml` | `albumSummarizeSourceDir` | `dirName: {{traversalDirName}}` | `BAD_USER_INPUT` |

Before authoring the requests, the implementer must inspect the configured
fixture roots and select relative audiobook variables that exist there. If no
stable positive audiobook fixture exists, each affected mutation/query uses a
schema-valid input guaranteed to reach the documented GraphQL input-error
mapping. The task notes must record that choice and its expected error code.

## 5. Environment variables

Retain `baseUrl`, `summarizeDirName`, `ignoreNonAudioFiles`,
`traversalDirName`, and `sampleAlbumFileName`. Add only relative variables
actually used after fixture inspection, such as `sampleAudiobookFileName`,
`graphqlMetadataDestination`, `graphqlAuthor`, and `graphqlTitle`. Do not add
an `execute` environment variable; it would invite accidental writes (FR-6,
FR-7).

## 6. Live verification

1. Build with `npm run build`.
2. Start `npm run web:serve -- --source-dir etc/1-source-files --dest-dir
   etc/2-destination-files --host 127.0.0.1 --port 3000` in the background and
   retain its specific PID.
3. Wait for `curl --fail http://127.0.0.1:3000/graphql` to establish that the
   endpoint is reachable; use a POST GraphQL query if the server rejects GET.
4. From `collections/harmonia-aquila-web/`, run
   `../../node_modules/.bin/bru run graphql --env local --bail`.
5. Stop only the captured server PID and confirm no `etc/**` files changed.

## 7. Risk Table

| Risk | Likelihood | Mitigation |
| --- | --- | --- |
| Fixture lacks an eligible audiobook | Medium | Use a schema-valid request that asserts `BAD_USER_INPUT`; record the fixture constraint. |
| GraphQL returns errors with HTTP 200 | High | Assert the GraphQL envelope, never REST 400/201 semantics. |
| Mutation accidentally writes media | Low | Omit `execute` from every request and inspect all request bodies before running. |
| Bruno cannot locate the collection from repo root | Medium | Run `bru` from `collections/harmonia-aquila-web/`, as established by the existing collection. |
| Result array is empty | Medium | Assert array type and selected response shape, not a minimum row count. |

## 8. Verification

No source code is changed. If source modification is explicitly approved,
run `npm run lint -- <modified-file>` after every such edit (NFR-1).

1. `npm run build`
2. `cd collections/harmonia-aquila-web && ../../node_modules/.bin/bru run graphql --env local --bail`
3. `git --no-pager diff --stat -- src __tests__ docs package.json package-lock.json etc`
4. `git --no-pager diff --stat -- collections/harmonia-aquila-web`
