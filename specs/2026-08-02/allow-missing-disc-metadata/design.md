# Design: Allow Missing Disc Metadata

> Scope reminder: this spec changes shared album disc validation, focused
> album organization/validation tests, active album guidance, and this spec.
> No new transport fields, dependencies, real-media writes, audiobook changes,
> historical-spec edits, or `npx`.

## 1. Overview

Change the disc completeness trigger from “a track number repeats or any disc
number exists” to “any explicit disc evidence exists.” An entirely untagged set
therefore follows the legacy flat-album path even when track numbers repeat.
The organization planner does not need a bypass or a new option: it continues
to call the shared validator, computes `multiDisc = false`, and relies on its
existing complete-path collision check (FR-1, FR-2, FR-5).

Explicit evidence remains strict. A disc number or disc total on any selected
row activates completeness for the entire selected set. This prevents partial
metadata from placing some tracks below `Disc DD` and others at the album root.
All numeric, total, continuity, and tuple rules remain shared by validation and
organization (FR-3, FR-4, FR-6, FR-10).

No public input or output shape changes. CLI, REST, GraphQL, and MCP adapters
already delegate to `organizeAlbumFiles`/`validateAlbumSourceDir`; focused
tests prove the new shared result reaches those surfaces while preserving dry
run and configured-root behavior (FR-7–FR-11).

## 2. File layout

### Expected modified files

```text
src/lib/albums/disc-metadata.ts
__tests__/lib/albums/disc-validation.test.ts
__tests__/commands/manage-albums/organize-files-disc.test.ts
__tests__/lib/albums/validate-disc.test.ts
__tests__/web/manage-albums-disc-metadata.test.ts       if shared REST parity needs coverage
__tests__/web/graphql/album-disc-metadata.test.ts       if shared GraphQL parity needs coverage
__tests__/web/mcp.manage-albums-disc-metadata.test.ts   if shared MCP parity needs coverage
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
does not change. Any touched source/test file must remain at most 200 lines
(NFR-5).

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

`validateDiscSet` remains the single policy entry point. Only completeness
triggering changes:

```ts
const hasDiscEvidence = records.some(record =>
  record.discNumber !== null || record.discTotal !== null)

if (hasDiscEvidence) {
  // report missing disc number for each row without one
}
```

Repeated tracks are intentionally absent from this trigger. The total rule
continues to require a total on every row when any total is present. Together,
these rules reject an orphan total and all partially tagged sets while allowing
only the unambiguous policy state “no disc metadata anywhere” (FR-1, FR-3,
FR-4).

| Selected effective metadata | Completeness result | Layout |
| --- | --- | --- |
| All disc numbers/totals null; unique tracks | valid | flat |
| All disc numbers/totals null; repeated tracks | valid | flat |
| One number present; another missing | `missing disc number` | no plan |
| Total present without number | `missing disc number` | no plan |
| Complete disc 1/2 and 2/2 | existing validation | `Disc DD` |
| Complete inferred metadata | existing validation | `Disc DD` |

Numeric validity, number-versus-total, total agreement, contiguity, and
duplicate tuple helpers are unchanged. Deterministic final issue sorting is
unchanged (NFR-6, NFR-9).

## 4. Organization and collision behavior

The organization pipeline remains:

1. Apply selection (`limit`, trackless filtering) and metadata repairs.
2. Validate the effective selected disc set.
3. Compute the set-wide multi-disc flag.
4. Plan all audio rows, then album-art rows.
5. Check duplicate and existing destinations for the combined plan.
6. Return dry-run rows or execute the reviewed plan.

For an all-absent disc set, step 2 now succeeds and step 3 remains false.
Repeated track numbers do not by themselves define destination identity;
`getAlbumDestination` still includes track number, sanitized title, and source
extension. Distinct titles can therefore produce unique flat destinations.
Rows that produce the same complete path still fail the existing
`Multiple files resolve to the same destination` preflight (FR-2, FR-5).

Album-art rows remain after audio rows and target `Artist/Album/<basename>`.
No metadata writes are attempted for images, and dry run performs no writes
(FR-8, FR-11).

## 5. Validation and public surfaces

`validateAlbumSourceDir` uses the same helper, so all-absent repeated tracks no
longer receive `missing disc number`. It still performs ordinary required-field
and complete-destination checks. If repeated rows resolve to an exact duplicate
destination, existing duplicate-destination issues remain visible (FR-5,
FR-10).

| Surface | Input delta | Output/schema delta | Required proof |
| --- | --- | --- | --- |
| CLI | none | none | dry-run flat rows and unchanged execute opt-in |
| REST | none | none | shared rows/errors; roots unchanged |
| GraphQL | none | none | nullable/current fields unchanged; dry-run default |
| MCP | none | none | tool name/schema/order/annotations unchanged |

Transport tests MAY mock the new shared row/error result when that is the
existing test pattern. At least one protocol-level test MUST parse a successful
all-absent organize result, and no collection smoke request may execute.

## 6. Test updates

### 6.1 Pure validation matrix

- Replace “requires disc numbers for repeated tracks” with acceptance of a
  fully absent repeated-track set.
- Add explicit coverage that any number or total activates disc-number
  completeness.
- Preserve invalid values, inconsistent totals, gaps, and duplicate tuple
  assertions verbatim where possible.

### 6.2 Organization and validation

- Dry-run tracks `1, 2, 1, 2` with distinct titles and no disc metadata;
  assert flat paths, empty disc fields, deterministic row order, and no writes.
- Use repeated track/title/extension values to produce an exact destination
  duplicate; assert failure before destination creation.
- Preserve the complete two-disc `Disc 01`/`Disc 02` test.
- Assert a partially tagged set and orphan total still fail before writes.
- Assert validation agrees with organization for wholly absent and partial
  disc evidence.
- Cover selection semantics and album-art placement without real media.

### 6.3 Public regression

- Keep CLI plaintext/JSON and dry-run wording stable.
- Verify REST, GraphQL, and MCP inputs are unchanged and a successful result
  carries existing empty disc fields.
- Verify execution remains opt-in and configured-root/path confinement remains
  unchanged.
- Do not add an execute Bruno request.

## 7. Migration strategy

1. Capture the current test/status baseline and inventory all strict-disc
   assertions and prose.
2. Update the pure completeness trigger and its validation matrix.
3. Update organization and validation regressions, splitting files as needed.
4. Update transport regressions only where they prove shared behavior.
5. Update active documentation and skill guidance; leave historical specs.
6. Run focused tests, final lint/build/full suite, dry-run smoke checks, and
   scope/media audits.

## 8. Risk Table

| Risk | Likelihood | Mitigation |
| --- | --- | --- |
| Repeated tracks silently overwrite one another | Medium | Preserve complete-path duplicate preflight and test no-write failure. |
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
2. `./node_modules/.bin/vitest run __tests__/commands/manage-albums/organize-files-disc.test.ts __tests__/lib/albums/organize-files-album-art.test.ts`
3. `./node_modules/.bin/vitest run __tests__/web/manage-albums-disc-metadata.test.ts __tests__/web/graphql/album-disc-metadata.test.ts __tests__/web/mcp.manage-albums-disc-metadata.test.ts`

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

1. The relaxation applies only when both disc fields are absent from every
   selected row. Partial explicit metadata remains invalid.
2. Repeated track numbers are permitted but do not bypass complete-path
   duplicate detection.
3. Shared validation changes with organization to preserve one consistent
   album policy; no transport option is added.
