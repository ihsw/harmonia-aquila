# Tasks: <Title>

> ## Hard constraints (re-read before starting)
>
> - **DO NOT START** any task below until the user explicitly directs
>   you to. This file is delivered as a plan, not as a work order.
> - **No `npx`** in any form. Forbidden in **all** invocations
>   (no `--no-install`, no one-off jest runs, etc.). Any command line
>   containing the substring `npx` is a violation and must be rewritten
>   before execution. Use `./node_modules/.bin/<tool>` or
>   `npm run <script>` exclusively.
> - **No edits outside <scope path>** for the duration of this spec
>   (NFR-<n>). If a real bug surfaces elsewhere, STOP and surface it;
>   do not patch silently.
> - After **every** source code file modification (for example, a `.ts` edit),
>   run `npm run lint -- <modified-file>` and fix any reported issues before
>   moving on (NFR-1). This MUST lint only the file just modified. Do this per
>   source-code edit, not per-task.
> - Run whole-codebase `npm run lint` only as a last-call verification after all
>   TypeScript modifications are complete.
> - Mark the matching `- [x]` checkbox **immediately** when each task
>   is finished, so progress is resumable.

## Phase 1 — Pre-flight

### 1.1 Confirm clean baseline

- [ ] Do **not** run whole-codebase `npm run lint` as a pre-flight baseline;
      reserve it for final verification after all TypeScript modifications are
      complete.
- [ ] Run `<test command>` and capture pass/fail counts as the baseline.
- [ ] <Other "before-state" checks: confirm dependency present, audit
      consumers, snapshot `git status`, etc.>

## Phase 2 — <Per-unit work, e.g. "Adapter rewrite: foo.ts">

### 2.1 <Concrete sub-step>

- [ ] <Imperative sentence: "Rewrite `<path>` per `design.md` §3.">
- [ ] Run `npm run lint -- <modified-file>`. Fix issues. Re-run until clean.

## Phase 3 — <…repeat per file/component/area…>

### 3.1 <…>

- [ ] <…>
- [ ] <…>

## Phase N-1 — Verification

### N-1.1 Full lint + typecheck + test

- [ ] `npm run lint` — whole-codebase last-call lint after all TypeScript
      modifications are complete; exit 0.
- [ ] `<typecheck command>` — exit 0.
- [ ] `<test command>` — exit 0; baseline pass count from Phase 1.x ±
      documented changes.

### N-1.2 Scope verification

- [ ] `git --no-pager diff --stat <forbidden path>` — output MUST be
      empty (NFR-<n>).
- [ ] `git --no-pager diff --stat <allowed path>` — output MUST list
      only the expected files from `design.md` §2 (NFR-<n>).

### N-1.3 Behavior smoke check (manual, optional)

- [ ] <Manual curl / UI click / log inspection that confirms parity.>

## Phase N — Documentation

### N.1 Update <doc>

- [ ] <Update `docs/<file>.md` to reflect the new layout / API.>

<!--
  Optional pattern: append blockquoted "> Notes:" beneath any phase as
  the agent records context discovered during execution. Example:

  > Audit notes:
  > - <observation that informs later tasks>
-->
