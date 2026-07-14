# Design: Remove Processed Audiobook Sources

> Scope reminder: modify only approved files in
> `etc/audiobooks/1-source-files/` and ignored evidence in
> `reports/audiobooks/remove-processed-sources/`. Do not alter destination
> M4Bs, source directories, metadata, code, or dependencies; do not use `npx`.

## 1. Overview

This is a destructive data-cleanup workflow, so it uses a two-phase
reconciliation pattern: create and approve an immutable candidate manifest,
then delete exactly its paths (FR-1, FR-2, FR-6). Destination validation is a
necessary gate, but never sufficient evidence by itself (FR-3, FR-5).

The manifest distinguishes byte-identical copies from transformations. Hash
comparison proves copied M4B provenance; merge, conversion, and metadata
correction require the exact input set and the prior spec or execution record
that named the resulting M4B (FR-4, FR-5). Every unresolved entry remains in
place (NFR-5).

## 2. File layout

### Modified files

```text
etc/audiobooks/1-source-files/<approved source>       (deleted only)
reports/audiobooks/remove-processed-sources/inventory.json
reports/audiobooks/remove-processed-sources/manifest.json
reports/audiobooks/remove-processed-sources/approval.txt
reports/audiobooks/remove-processed-sources/delete.log
reports/audiobooks/remove-processed-sources/verification.json
```

### Files explicitly NOT modified

- `etc/audiobooks/3-renamed-files/` — final M4Bs are evidence, not cleanup
  targets.
- `etc/audiobooks/2-aggregated-files/` — staging media is not source cleanup.
- `src/`, `package.json`, and lockfiles — no application change is required.
- `specs/2026-07-12/` and `specs/2026-07-13/` — prior specs remain provenance
  references, not mutable records.

## 3. Manifest and reconciliation

`manifest.json` is an array of candidate records:

```json
{
  "sourcePaths": ["done/example-source.m4b"],
  "finalPath": "etc/audiobooks/3-renamed-files/Author - Title.m4b",
  "transformation": "copy-and-rename",
  "provenance": "specs/2026-07-13/process-done-audiobooks/design.md §2.1",
  "sourceSha256": ["<digest>"],
  "finalSha256": "<digest>",
  "validation": {"valid": true},
  "approved": false
}
```

| Transformation | Required proof | Eligibility rule |
| --- | --- | --- |
| Direct copy / copy-and-rename | Same source and final SHA-256; validated final | One source may be removed. |
| `convert-file` | Exact one-source mapping and prior execution evidence; validated final | That source may be removed. |
| `merge` | Exact complete input set, expected final path, and prior execution evidence; validated final | Remove the entire listed source set or none. |
| `set-metadata` then copy | Exact original-to-final mapping from the correction workflow; validated final | Original source may be removed. |

The reconciliation starts from the four prior specs named in
`requirements.md` §1, then compares every listed path against fresh inventory.
A source that appears in neither an approved record nor a complete transformed
set is explicitly emitted as `excluded`; it is not a candidate (FR-2, FR-5).

## 4. Deletion sequence

1. Build the inventory and manifest without deleting files; validate each
   proposed final M4B with `node build/dist/index.js manage-audiobooks validate
   --file-name "<final>" --format json`.
2. Review every candidate record, write the manifest digest and approver to
   `approval.txt`, then change only reviewed records to `"approved": true`.
3. Re-check approved paths, hashes, and final validation immediately before
   deletion. Stop if the manifest digest or filesystem state changed.
4. For each approved source path, execute `rm -- "<source>"`, append the path
   and timestamp to `delete.log`, and stop at the first failure.
5. Re-inventory sources and finals; verify the absence/presence/validation
   conditions in FR-8.

## 5. Risk Table

| Risk | Likelihood | Mitigation |
| --- | --- | --- |
| Similar but unrelated files are matched | Medium | Require digest equality or exact transformation provenance. |
| Partial merged set is deleted | Medium | Treat a merge as atomic; exclude the entire set if any input lacks proof. |
| Destination is corrupt or later changed | Low | Validate before and after deletion. |
| Shell expansion deletes an unintended path | Low | Consume quoted manifest paths one at a time with `rm --`; forbid wildcards and recursion. |
| Audit record is lost | Low | Store all evidence under the ignored reports directory before deletion. |

## 6. Verification

After every repository file edit:

1. `npm run lint` (NFR-1).

Before and after cleanup:

1. `npm run build` — must exit 0.
2. `npm run lint` — must exit 0.
3. `node build/dist/index.js manage-audiobooks validate --file-name "<final>" --format json` — every mapped final must be valid.
4. `sha256sum "<source>" "<final>"` — direct-copy records must match.
5. `find etc/audiobooks/1-source-files -type f -print` — compare against the
   approved and excluded manifest sets.
6. `git --no-pager diff --stat` — must contain no tracked implementation,
   configuration, or dependency changes.
