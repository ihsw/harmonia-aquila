# Design: <Title>

> Scope reminder: this spec touches **only** <list of paths>. No edits
> to <forbidden paths>, no new dependencies <unless permitted by
> requirements §3>, no `npx`.

## 1. Overview

<2–4 paragraphs on the chosen approach. Name the dominant pattern
(thin-adapter, factory-injection, context-provider, folder-parity, etc.)
and the rationale. Reference FR-/NFR- numbers from `requirements.md`.>

## 2. File layout

### Modified files

```
<repo-relative path>          (rewritten / new / deleted, ≤ N LOC)
<repo-relative path>          (…)
```

### Files explicitly NOT modified

- `<path>` <one-line reason>
- `<path>` <…>

## 3. <Pattern / template>

<If multiple files share a shape, give a single template once and a
mapping table for the per-file deltas.>

```ts
// canonical adapter / factory / container shape
```

| File | Specific binding |
| ---- | ---------------- |
| `<path>` | `<symbol or override>` |

## 4. <Sub-system detail>

<Repeat for each non-trivial sub-system: callback semantics, side-effect
ordering, schema choices, mock strategy, etc.>

## 5. Component-by-component mapping

| File | Current export | New export |
| ---- | -------------- | ---------- |
| `<path>` | `<old>` | `<new>` |

## 6. Test updates

### 6.1 What stays the same

- <…>

### 6.2 What changes

```ts
// before / after mock or assertion snippets
```

### 6.3 Coverage parity table

| Original test case | Disposition |
| ------------------ | ----------- |
| <case> | kept / merged into "<new case>" / removed (justify) |

## 7. Migration strategy

1. <Ordered list of steps that minimize broken intermediate states.>
2. <…>

## 8. Risk Table

| Risk | Likelihood | Mitigation |
| ---- | ---------- | ---------- |
| <…>  | Low/Med/High | <…> |

## 9. Verification

After every source code file edit:
1. `<lint command>` (NFR-1)

Once at end of spec:
1. `<lint command>` — must exit 0
2. `<typecheck command>` — must exit 0
3. `<test command>` — must exit 0
4. `git --no-pager diff --stat <forbidden path>` — must be empty

## 10. Open decisions (optional)

1. <Decision needing user sign-off, with the recommended option and the
   alternative.>
