# Requirements: Remove Processed Audiobook Sources

## 1. Background

Previous audiobook workflows copied, converted, merged, and metadata-corrected
sources from `etc/audiobooks/1-source-files/` into
`etc/audiobooks/3-renamed-files/`, while deliberately retaining all source
media. The 2026-07-12 `process-renaming-audiobooks` and 2026-07-13
`process-done-audiobooks`, `convert-graham-greene-audiobooks`, and
`correct-missing-audiobook-metadata` specs define the relevant source-to-output
provenance.

The source tree currently contains 293 files and the renamed stage contains 63
M4Bs. Filename similarity alone cannot safely prove processing: merging and
metadata correction can produce a different filename and byte stream. Cleanup
must therefore be manifest-driven, validation-gated, and explicitly approved
before this destructive operation begins.

## 2. Goal

Remove only source audiobook files whose exact processing provenance maps them
to an existing, validated final M4B in `etc/audiobooks/3-renamed-files/`;
unmatched, ambiguous, invalid, and unverified sources MUST remain untouched.

## 3. Scope

### In scope

- Files under `etc/audiobooks/1-source-files/`.
- Validated M4Bs under `etc/audiobooks/3-renamed-files/`.
- An ignored cleanup manifest, command output, and inventory under
  `reports/audiobooks/remove-processed-sources/`.

### Out of scope

- Creating, converting, merging, renaming, or changing metadata in media files.
- Deleting or overwriting destination M4Bs.
- Deleting source directories, including empty directories.
- Inferring a match from a basename, partial metadata, or destination existence.
- TypeScript, CLI, dependency, or configuration changes.

## 4. Functional Requirements

- **FR-1** The workflow MUST inventory every source file and final M4B before
  deletion, recording path, size, SHA-256 digest, and relevant metadata.
- **FR-2** A deletion manifest MUST map each candidate source to one final M4B
  or to a complete source set and final M4B, citing the prior processing spec
  or retained execution evidence that establishes its provenance.
- **FR-3** Every mapped final M4B MUST exist and return `"valid": true` from
  `manage-audiobooks validate --format json` before its source is eligible.
- **FR-4** Byte-for-byte copied M4B sources MUST have the same SHA-256 digest
  as their mapped final M4B; any digest mismatch MUST exclude that source.
- **FR-5** Converted, merged, and metadata-corrected sources MAY be eligible
  only when the manifest records the exact input file set, transformation type,
  expected final path, and provenance reference; no heuristic match is allowed.
- **FR-6** The manifest MUST be reviewed and approved before deletion, and the
  deletion command MUST consume only its approved source-path list.
- **FR-7** Deletion MUST use `rm --` on one manifest path at a time, stop on
  the first error, and record each successful removal; wildcard deletion,
  recursive deletion, and force deletion are forbidden.
- **FR-8** After deletion, the workflow MUST prove that every approved source
  path is absent, every mapped final M4B remains present and valid, and every
  excluded source remains present.

## 5. Non-Functional Requirements

- **NFR-1 — Lint after every file modification** After every repository file
  modification, `npm run lint` MUST run and all reported issues MUST be fixed
  before continuing.
- **NFR-2 — No `npx`** `npx` is forbidden in all forms. Commands MUST use
  `npm run <script>` or `node build/dist/index.js`.
- **NFR-3 — Auditability** The inventory, reviewed manifest, approval record,
  command transcript, and post-delete verification results MUST be retained
  under `reports/audiobooks/remove-processed-sources/`.
- **NFR-4 — Scope discipline** Only source files explicitly listed in the
  approved manifest MAY be removed; `git --no-pager diff --stat` MUST show no
  tracked implementation, configuration, or dependency changes.
- **NFR-5 — Fail closed** Missing evidence, a failed validation, a digest
  mismatch, or an unexpected filesystem change MUST stop cleanup and preserve
  all remaining source files.

## 6. Acceptance Criteria

1. Each removed source has a reviewed manifest entry satisfying FR-2 through
   FR-5 and a corresponding validated final M4B.
2. No source absent from the approved manifest is removed.
3. All mapped final M4Bs exist and validate after cleanup.
4. The retained records provide a complete before/after audit of the operation.
