# Fill-remainder field-test on the operator's real property

**Date:** 2026-05-21
**Branch:** feat/atlas-permaculture
**Commits under test:** 2a6def92 (matrix+patches feature), a5a6f9a1
(wiki log), 101efca4 (F1 extraction + F2 regression tests)
**Property:** `/v3/project/mtc/observe`

## Pre-state

Read from localStorage-backed Zustand stores via `preview_eval`:

| Store | Total | In project | Geometry types |
|---|---|---|---|
| `ogden-conventional-crops` | 2 | 2 | Polygon, Polygon |
| `ogden-pastures` | 2 | 2 | Polygon, Polygon |
| `ogden-vegetation` | 0 | 0 | — |
| `ogden-built-environment-v2` | 0 | 0 | — |

Subtractees available for Fill-remainder: 2 crops (no buildings). Plan
allows a subtractee set of just crops — the math is the same.

## Steps

### Step 1 — Pre-state confirmed

- Pre: see table above.
- Action: `preview_eval` against the four stores (localStorage-backed).
- Observation: ✅ 2 crops present; vegetation + pasture + buildings empty
  in the `mtc` project slice. Pre-state read succeeded via localStorage
  keys (`ogden-vegetation`, `ogden-pastures`, `ogden-conventional-crops`,
  `ogden-built-environment-v2`) before the React tree fully mounted.

### BLOCKER — preview won't mount (steps 2–14 cannot run)

After `location.reload()`, `document.getElementById('root').children.length`
stayed at 0. Dynamic-import probe of `/src/main.tsx` returned
`TypeError: Failed to fetch dynamically imported module`. Direct GET of
`/src/features/dashboard/DecisionTriad.tsx` from the Vite server returned
**HTTP 500** with the error:

> `Failed to resolve import "@ogden/shared/evidence" from
> "src/features/dashboard/DecisionTriad.tsx". Does the file exist?`

Frame:
```
26 |  import { selectEvidenceFor } from "@ogden/shared/evidence";
```

**This is not caused by F1/F2.** The git working tree shows uncommitted
in-flight changes by another worker:

- M `apps/web/src/features/biodiversity/habitatFeatureCatalog.ts`
- M `apps/web/src/store/workItemStore.ts`
- M `packages/shared/src/schemas/workItem.schema.ts`
- ?? `apps/web/src/features/biodiversity/geometryHelpers.ts`

None of these are mine, and none are `@ogden/shared/evidence` — but the
subpath itself doesn't resolve from the live workspace state, which
suggests either (a) `packages/shared/src/evidence/index.ts` (or
equivalent) hasn't been authored yet and `DecisionTriad.tsx` imports a
not-yet-existing module, or (b) a `packages/shared/package.json`
`exports` map entry for `./evidence` is missing.

**Decision:** F3 manual field-test cannot run today. F1/F2 work (the
extraction + 10-case Vitest suite + 2 downstream typecheck regressions
fixed) is independently verified and was committed as `101efca4` and
pushed. F3 is deferred to a follow-up session once the dev server
mounts again. A spawn-task is filed for the underlying `@ogden/shared/evidence`
resolution failure.

### Steps 2–14 — Deferred

Not executed. Will pick up the checklist verbatim from the plan
(`what-happens-to-overlapping-expressive-phoenix.md` → Field-test
plan → Phase F3) once the preview mounts.

## Summary

- ✅ F1 extraction landed (`subtractPatches.ts`, both tools refactored).
- ✅ F2 regression suite landed (10/10 passing; total vitest 1888/1892).
- ✅ Two downstream typecheck regressions fixed
  (`vegetationResolver.ts` `overlapArea` signature widened;
  `ObserveAnnotationLayers.tsx` paddock-fence `turf.buffer` cast).
- ❌ F3 manual checklist blocked — preview won't mount because an
  unrelated import (`@ogden/shared/evidence`) doesn't resolve.
- 🟡 F4 spawn: one follow-up task filed for the
  `@ogden/shared/evidence` subpath.

