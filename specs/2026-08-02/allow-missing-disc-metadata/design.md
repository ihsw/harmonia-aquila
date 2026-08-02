# Design: Optional Disc Metadata with Explicit Inference

> Scope reminder: this spec changes shared album disc validation, focused
> album organization/validation tests, active album guidance, and this spec.
> No new transport fields, dependencies, real-media writes, audiobook changes,
> historical-spec edits, or `npx`.

## 1. Overview

Preserve the disc completeness trigger: a repeated track number, any disc
number, or any disc total requires complete effective disc numbers. An entirely
untagged set follows the legacy flat-album path only when selected track numbers
are unique. Repeated tracks without effective disc identity fail before
destination planning, even if their titles would make flat paths distinct
(FR-1, FR-2, FR-7).

The explicit exception is `discStrategy: "infer"`. Metadata repair/inference
must run after audio selection but before shared disc validation. Successful
filename-order inference projects complete disc numbers and totals, after which
the unchanged validator and planner produce `Disc DD` paths. Omitted/default
`no change` never performs this projection or suppresses missing-disc issues
(FR-3, FR-8, FR-9).

Explicit evidence remains strict. A disc number or disc total on any selected
row activates completeness for the entire selected set. All numeric, total,
continuity, and tuple rules remain shared by validation and organization
(FR-5, FR-6, FR-8).

No public input or output shape changes. CLI, REST, GraphQL, and MCP adapters
already delegate to `organizeAlbumFiles`/`validateAlbumSourceDir`; focused
tests prove the shared policy reaches those surfaces while preserving dry
run and configured-root behavior (FR-7–FR-11).

## 2. File layout

### Expected modified or explicitly audited files

```text
src/lib/albums/disc-metadata.ts
__tests__/lib/albums/disc-validation.test.ts
__tests__/commands/manage-albums/organize-files-disc.test.ts
__tests__/lib/albums/validate-disc.test.ts
__tests__/web/manage-albums-organize-metadata.test.ts
__tests__/web/graphql/album-disc-metadata.test.ts       if shared GraphQL parity needs coverage
__tests__/web/mcp.manage-albums-operations.test.ts
docs/album-organization.md
docs/graphql.md                                         only if old strict prose is present
docs/mcp-server.md                                      only if old strict prose is present
docs/testing.md                                         if focused test layout changes
.agents/skills/album-organization/SKILL.md
specs/2026-08-02/allow-missing-disc-metadata/tasks.md
```

Existing focused transport tests SHOULD be updated instead of modifying
adapter implementation. Generated `src/web/modules/graphql/schema.gql` is
regenerated and checked, but SHOULD have no semantic diff because the schema
does not change. If baseline inspection proves a listed policy is already
implemented, tasks MUST preserve it with focused regression coverage rather
than manufacture a source delta. Any touched source/test file must remain at
most 200 lines (NFR-5).

### Files explicitly not modified

- `src/lib/albums/organization-plan.ts`, `organization-planner.ts`, and
  `organize-files-execution.ts`: flat planning, duplicate preflight, and
  publication already have the required behavior.
- CLI, REST, GraphQL, and MCP schemas/handlers: no new option or row field.
- Album-art planner/discovery: images remain part of the same album-root plan.
- `package.json` and lockfile: no dependency work.
- `etc/**`: no real source or destination media is used for verification.
- Audiobook code and historical specs: outside this album-only policy change.

## 3. Disc-set policy

`validateDiscSet` remains the single policy entry point. Completeness uses both
repeated tracks and explicit disc evidence:

```ts
const hasRepeatedTrack = [...trackCounts.values()].some(count => count > 1)
const hasDiscEvidence = records.some(record =>
  record.discNumber !== null || record.discTotal !== null)

if (hasRepeatedTrack || hasDiscEvidence) {
  // report missing disc number for each row without one
}
```

The total rule continues to require a total on every row when any total is
present. These rules allow ordinary unique-track flat albums while rejecting
repeated tracks, orphan totals, and partially tagged sets that lack complete
disc identity (FR-1, FR-2, FR-5, FR-6).

| Selected effective metadata | Completeness result | Layout |
| --- | --- | --- |
| All disc numbers/totals null; unique tracks | valid | flat |
| All disc numbers/totals null; repeated tracks; no inference | `missing disc number` | no plan |
| Same repeated sequence after successful inference | valid | `Disc DD` |
| One number present; another missing | `missing disc number` | no plan |
| Total present without number | `missing disc number` | no plan |
| Complete disc 1/2 and 2/2 | existing validation | `Disc DD` |
| Complete inferred metadata | existing validation | `Disc DD` |

Numeric validity, number-versus-total, total agreement, contiguity, and
duplicate tuple helpers are unchanged. Deterministic final issue sorting is
unchanged (NFR-6, NFR-9).

## 4. Organization, inference, and collision behavior

The organization pipeline remains:

1. Apply selection (`limit`, trackless filtering) and ordinary metadata
   repairs.
2. If and only if `discStrategy: "infer"` is explicit, infer effective disc
   metadata from the selected filename-ordered track sequence.
3. Validate the effective selected disc set.
4. Compute the set-wide multi-disc flag.
5. Plan all audio rows, then album-art rows.
6. Check duplicate and existing destinations for the combined plan.
7. Return dry-run rows or execute the reviewed plan.

For an all-absent unique-track set, step 3 succeeds and step 4 remains false.
For an all-absent repeated-track set, step 3 fails unless step 2 supplied
complete inferred metadata. Complete-path collision detection remains a
separate later guard and still reports
`Multiple files resolve to the same destination`; it never substitutes for
disc identity validation (FR-2, FR-3, FR-7).

When repeated tracks specifically activate `missing disc number`, organization
formats one shared actionable error. It groups filenames by repeated track
number, recommends whole-album `setMetadata` (CLI: `--set-metadata` with a
JSON/CSV path) for incorrect numbering, recommends explicit inference only for
real disc boundaries, and confirms that no files were written. Other disc-set
failures retain the compact deterministic issue list. Transport adapters pass
the shared `UserInputError` message through unchanged (FR-13).

Album-art rows remain after audio rows and target `Artist/Album/<basename>`.
No metadata writes are attempted for images, and dry run performs no writes
(FR-8, FR-11).

## 5. Validation and public surfaces

`validateAlbumSourceDir` uses the same helper, so all-absent repeated tracks
continue to receive `missing disc number`. Because validation has no inference
input, callers that intend inference must review the combined
`organize-files` dry run with `discStrategy: "infer"`; the inferred effective
rows, not baseline source validation, are the authoritative proposed plan.
Unique-track all-absent albums remain valid (FR-1–FR-3).

| Surface | Input delta | Output/schema delta | Required proof |
| --- | --- | --- | --- |
| CLI | existing `--disc-strategy infer` | actionable error text | repeated tracks fail by default and infer explicitly |
| REST | existing `discStrategy` | shared HTTP 400 message | shared rows/errors; roots unchanged |
| GraphQL | existing `discStrategy` | shared `BAD_USER_INPUT` message | nullable/current fields unchanged; dry-run default |
| MCP | existing `discStrategy` | shared tool-error text | tool name/schema/order/annotations unchanged |

Transport tests MAY mock the new shared row/error result when that is the
existing test pattern. At least one protocol-level test MUST parse a successful
unique-track all-absent or explicitly inferred organize result, and no
collection smoke request may execute.

## 6. Test updates

### 6.1 Pure validation matrix

- Preserve “requires disc numbers for repeated tracks” when inference has not
  projected effective values.
- Add explicit coverage that unique all-null tracks remain valid and any
  number or total activates disc-number completeness.
- Preserve invalid values, inconsistent totals, gaps, and duplicate tuple
  assertions verbatim where possible.

### 6.2 Organization and validation

- Dry-run tracks `1, 2, 1, 2` with no disc metadata and default/no-change
  strategy; assert deterministic missing-disc failure and no writes.
- Repeat with explicit inference; assert inferred fields, deterministic row
  order, and `Disc 01`/`Disc 02` paths.
- Dry-run unique tracks without disc metadata; assert flat paths and empty disc
  fields.
- Preserve exact destination duplicate preflight after valid disc validation.
- Preserve the complete two-disc `Disc 01`/`Disc 02` test.
- Assert a partially tagged set and orphan total still fail before writes.
- Assert validation and default organization agree for unique, repeated, and
  partial evidence; separately assert inference makes repeated organization
  valid.
- Cover selection semantics and album-art placement without real media.

### 6.3 Public regression

- Keep CLI plaintext/JSON and dry-run wording stable.
- Verify REST, GraphQL, and MCP retain the existing `discStrategy` mapping and
  successful unique/inferred results carry current fields.
- Verify execution remains opt-in and configured-root/path confinement remains
  unchanged.
- Do not add an execute Bruno request.

## 7. Migration strategy

1. Capture the current test/status baseline and inventory all strict-disc and
   inference-order assertions and prose.
2. Lock the pure completeness matrix for unique versus repeated tracks.
3. Verify or correct inference-before-validation ordering in organization.
4. Update organization, validation, and transport regressions, splitting files
   as needed.
5. Update active documentation and skill guidance; leave historical specs.
6. Run focused tests, final lint/build/full suite, dry-run smoke checks, and
   scope/media audits.

## 8. Risk Table

| Risk | Likelihood | Mitigation |
| --- | --- | --- |
| Repeated tracks bypass disc identity | Medium | Preserve missing-disc failure unless explicit inference succeeds. |
| Partial multi-disc metadata creates mixed layout | Medium | Treat any number or total as explicit evidence requiring every disc number. |
| Complete multi-disc albums lose disc folders | Low | Preserve existing complete-set tests and inference regressions. |
| Validation and organization disagree | Medium | Keep one shared validator and assert both domain entry points. |
| Transport contracts drift unnecessarily | Low | No schema changes; assert existing inputs/rows and generated SDL parity. |
| Real media is modified during verification | Low | Temporary fixtures and dry-run-only collection/MCP checks. |
| Touched tests exceed 200 lines | Medium | Add focused test files rather than growing near-limit files. |

## 9. Verification

After every TypeScript source/test edit:

1. `npm run lint -- <modified-file>` — exit 0 before the next edit (NFR-1).

Focused checks:

1. `./node_modules/.bin/vitest run __tests__/lib/albums/disc-validation.test.ts __tests__/lib/albums/validate-disc.test.ts`
2. `./node_modules/.bin/vitest run __tests__/commands/manage-albums/organize-files-disc.test.ts __tests__/lib/albums/organize-files-disc-policy.test.ts __tests__/lib/albums/organize-files-album-art.test.ts`
3. `./node_modules/.bin/vitest run __tests__/web/manage-albums-organize-metadata.test.ts __tests__/web/graphql/album-disc-metadata.test.ts __tests__/web/mcp.manage-albums-operations.test.ts`

Final checks, only after all TypeScript edits:

1. `npm run lint`
2. `npm run build`
3. `npm test`
4. Start the built server with isolated existing test roots; run only affected
   dry-run REST/GraphQL/MCP Bruno requests; stop the captured process.
5. `git diff --check`
6. `git status --short -- etc`
7. `git diff -- package.json package-lock.json`
8. `git --no-pager diff --stat -- src __tests__ docs collections .agents/skills/album-organization`

## 10. Resolved decisions

1. Missing disc metadata is optional only for selected sets with unique track
   numbers. Partial explicit metadata remains invalid.
2. Repeated track numbers remain invalid without effective disc numbers;
   `discStrategy: "infer"` is the only automatic, explicit exception.
3. Inference runs before organization disc validation, but is never applied by
   default. Baseline `validate` continues to report missing disc metadata for
   repeated source tracks because it does not accept an inference option.
4. Complete-path duplicate detection remains mandatory after disc validation;
   no transport option or row shape is added.
