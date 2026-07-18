---
name: spec-generation
description: Generate requirements, design, and task specifications for this repository.
---

# Skill: Spec Generation

Authoritative procedure for generating specs in this repository. Use this
skill whenever the user asks for a "spec", "requirements + design + tasks",
or any planning artifact that will guide implementation work.

This skill formalizes patterns observed across the existing specs under
`specs/2026-04-20/`, `2026-04-28/`, `2026-04-29/`, `2026-04-30/`,
`2026-05-08/`, and `2026-05-09/`. Reuse those as concrete reference
examples when in doubt.

---

## 1. When to use this skill

Trigger on any user request that:

- Asks to "create a spec" / "write a spec" / "draft a spec".
- Asks for "requirements", "design", and/or "tasks" for a non-trivial
  change (anything bigger than a one-file edit).
- Asks to "plan" a refactor, migration, package extraction, or
  cross-package wiring change.
- Mentions phrases like "before we start, write up…", "let's do this in
  three docs", or otherwise implies a planning artifact precedes work.

Do **not** trigger for trivial typo fixes, single-config edits, or
questions answerable without a plan.

---

## 2. Hard rules (from `AGENTS.md`)

These are non-negotiable and apply to every spec you generate:

1. **Folder name = today's date in `YYYY-MM-DD`.** Place the spec at
   `specs/<YYYY-MM-DD>/<feature-slug>/`. The date folder is the parent;
   the slug folder is its child. Reuse an existing date folder if you
   are emitting multiple specs the same day.
2. **`feature-slug`** is kebab-case, descriptive, and mirrors the verb
   of the work (e.g. `migrate-…`, `refactor-…`, `wire-…`,
   `extract-…`, `…-folder-parity`).
3. **Do not start tasks** after generating the spec. Hand the plan to
   the user and stop. Wait for explicit "start" / "execute" /
   "proceed with tasks" before touching implementation files.
4. **Every `requirements.md` MUST include an NFR that mandates running
   the project's lint command against the exact modified source file after
   every source code file modification** and fixing reported issues before
   the change is considered complete. Phrase it as
   `NFR-<n> — Lint after every source code file modification` and require
   `npm run lint -- <modified-file>` rather than whole-codebase linting
   during per-file edits.
5. **Every `tasks.md` MUST have a `- [ ]` checkbox under every task
   heading** so progress is resumable. Sub-tasks are also checkboxes.
6. **Mark `- [x]` immediately** when each task is finished — not at the
   end. Restate this rule inside the tasks file's "Hard constraints"
   blockquote so an implementing agent re-reads it.
7. **No `npx`.** Encode this as an explicit NFR in `requirements.md`
   ("NFR — No `npx`") and again in the `tasks.md` "Hard constraints"
   blockquote.

---

## 3. Files to produce

For every spec, emit at minimum:

```
specs/<YYYY-MM-DD>/<feature-slug>/
  requirements.md
  design.md
  tasks.md
```

Optionally add a short `README.md` (≤ 15 lines) when the spec benefits
from a one-paragraph orientation + links to the three files. See
`specs/2026-04-28/code-check-folder-parity/README.md` for the canonical
shape.

Templates live alongside this skill at:

- `templates/requirements.template.md`
- `templates/design.template.md`
- `templates/tasks.template.md`
- `templates/README.template.md`

Copy a template, fill the placeholders, and delete sections that do not
apply (better to drop a section than to leave it empty).

---

## 4. Workflow

Follow this sequence, stopping after step 5:

1. **Locate today's date folder.** If `specs/<YYYY-MM-DD>/` does not
   exist, create it. Choose a kebab-case `<feature-slug>` and create
   `specs/<YYYY-MM-DD>/<feature-slug>/`.
2. **Read related specs.** If the work continues a prior spec
   (e.g. "wire-…" follows "migrate-…"), read its `tasks.md` and
   `design.md` first so you can cross-link and avoid contradicting
   prior decisions.
3. **Generate `requirements.md`** from the template. Numbered FRs and
   NFRs in RFC 2119 style (MUST / MAY / MUST NOT). Always include the
   lint-per-source-code-edit NFR and the no-`npx` NFR.
4. **Generate `design.md`** from the template. Reference FR-/NFR-
   numbers from `requirements.md` to anchor decisions. Prefer
   "modified vs not-modified" file lists, before/after code blocks,
   and a component-by-component mapping table.
5. **Generate `tasks.md`** from the template. Phase the work
   (Pre-flight → per-file edits → Verification → Documentation).
   Every task heading MUST have at least one `- [ ]` subtask. Open
   the file with a "Hard constraints (re-read before starting)"
   blockquote that restates: do-not-start, no-`npx`, scope limits,
   lint-after-every-source-code-edit using `npm run lint -- <modified-file>`,
   mark-`[x]`-immediately, and reserve whole-codebase `npm run lint` for the
   final verification phase after all TypeScript modifications are complete
   (including not using whole-codebase lint as a pre-flight baseline).
6. **STOP.** Do not run lint, do not edit source. Tell the user the
   spec is ready and which folder it lives in. Wait for them to
   direct execution.

---

## 5. Style conventions

- **Title rows** of each file use the same human-readable name
  (`# Requirements: <Title>`, `# Design: <Title>`, `# Tasks: <Title>`).
- **RFC 2119 keywords** — `MUST`, `MUST NOT`, `MAY`, `SHOULD` — for FRs
  and NFRs in `requirements.md`.
- **FR-/NFR- numbering** is stable within a spec and is referenced
  verbatim from `design.md` and `tasks.md`.
- **Scope sections** explicitly enumerate "In scope" and "Out of scope"
  bullets. Out-of-scope items prevent silent scope creep.
- **Hard constraints blockquote** at the top of `tasks.md` is the
  agent's "re-read before starting" prompt.
- **Tables** are preferred over prose for file-by-file mappings,
  before/after deltas, risk registers, and coverage parity.
- **Risk Table** in `design.md` has columns `Risk | Likelihood |
  Mitigation`.
- **Verification section** in `design.md` lists the exact shell
  commands (no `npx`) that prove the spec is done.
- **Inline notes** in `tasks.md` are blockquoted (`> note:`) under the
  relevant phase to record context discovered while executing.
- **Line limit reminder.** Each spec file should stay readable; aim for
  ≤ 300 lines. Split into multiple files (`design-<topic>.md`) if
  exceeded.

---

## 6. Standard NFR catalogue

Use these wordings when applicable. They appear in nearly every spec:

- `NFR — Lint after every source code file modification.` Mandatory (per
  `AGENTS.md`). The required command form is
  `npm run lint -- <modified-file>` so only the file just modified is linted
  during implementation. Whole-codebase `npm run lint` is reserved for the
  final verification phase after all TypeScript modifications are complete.
- `NFR — No npx.` Mandatory (per `AGENTS.md`). Forbid `npx` in **all**
  forms (no `--no-install`, no one-off jest invocations). Tell the
  agent to use `./node_modules/.bin/<tool>` or `npm run <script>`.
- `NFR — File size ≤ 200 lines.` (per `.github/copilot-instructions.md`
  "Keep component under 200 lines").
- `NFR — Strict TypeScript / no any.`
- `NFR — Type-check (`npm run build:ts`) MUST exit 0.`
- `NFR — Tests (`npm test`) MUST exit 0.`
- `NFR — Scope discipline.` E.g. `git diff --stat <forbidden-path>` is
  empty after the spec.
- `NFR — No new dependencies` (when applicable; otherwise list the
  permitted additions in `requirements.md` §3 In scope).
- `NFR — Behavioral parity.` When refactoring, name the observable
  invariants that MUST hold (status codes, JSON shapes, URL paths,
  etc.).

---

## 7. Anti-patterns to avoid

- ❌ Starting implementation immediately after writing the spec.
- ❌ Forgetting the date folder (writing `specs/<feature-slug>/`
  directly).
- ❌ Tasks without checkboxes, or checkboxes only at the phase level.
- ❌ Using `npx` in any example command in `tasks.md` or `design.md`.
- ❌ Using `pnpm`/`yarn` examples — this monorepo is `npm`-based.
- ❌ Vague FRs ("the code should be cleaner"). Every FR is testable
  and observable.
- ❌ Omitting "Out of scope". A bare "In scope" list invites drift.
- ❌ Skipping the lint NFR.
- ❌ Modifying `apps/web-ui` from a `packages/ui` spec (or vice versa)
  without an explicit, justified scope expansion.

---

## 8. Reference specs

When unsure, study these as exemplars:

| Spec | Why it's a good reference |
| ---- | ------------------------- |
| `specs/2026-04-29/code-check-api-in-ui-package/` | Clean additive package extraction; tight scope; typical NFR set; execution-note pattern in `tasks.md`. |
| `specs/2026-04-28/code-check-folder-parity/` | Folder-restructure spec with backwards-compat facade; thorough phased tasks. |
| `specs/2026-04-30/refactor-code-check-ui-containers/` | Pattern-shift refactor; has before/after code blocks and a component-by-component mapping table. |
| `specs/2026-05-08/migrate-code-check-api-handlers/` | Strict "no edits in `apps/web-ui`" boundary; rich FR-4 error-string parity table. |
| `specs/2026-05-09/wire-web-ui-code-check-handlers/` | Closes the loop on a prior additive spec; demonstrates cross-spec cross-references and an FR-7a "permitted exception" clause. |
