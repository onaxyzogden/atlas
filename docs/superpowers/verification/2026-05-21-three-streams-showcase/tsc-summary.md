# Phase 3 Task 16 — `tsc --noEmit` summary

Command:
```
NODE_OPTIONS=--max-old-space-size=8192 pnpm --filter @ogden/web exec tsc --noEmit
```

Run timestamp: 2026-05-21 (local).

## Result

**Errors total: 6 (all baseline / unrelated to Phase 3 showcase code).**
**NEW errors introduced by Phase 3: 0.**

## Baseline errors

These files were not authored by Phase 3 and the failures pre-existed in the
working tree (introduced via the external rebases on `feat/atlas-permaculture`
that the project memory warns about):

| File | Line | Code | Notes |
|---|---|---|---|
| `src/features/project/wizard/StepBoundary.tsx` | 365 | TS2322 | `unknown` → `ReactNode` |
| `src/v3/observe/components/layers/ObserveAnnotationLayers.tsx` | 674 | TS2769 | turf overload mismatch |
| `src/v3/observe/components/layers/ObserveAnnotationLayers.tsx` | 679 | TS2339 | `geometry` on `never` |
| `src/v3/plan/engine/vegetationResolver.ts` | 86 | TS2345 | `Polygon \| MultiPolygon` → `Polygon` |
| `src/v3/plan/layers/__tests__/HostUnionContextMenu.test.tsx` | 58 | TS2345 | `number \| undefined` |
| `src/v3/plan/layers/__tests__/HostUnionDrilldownCard.test.tsx` | 25 | TS2322 | `'understory'` → `GuildLayer` |

## NEW errors fixed during Task 16

Two new errors were introduced by Task 15 (`covenant.test.ts`) and **fixed in
this Task 16 session** before this summary was recorded:

| File | Line | Code | Resolution |
|---|---|---|---|
| `src/showcase/__tests__/covenant.test.ts` | 66 | TS2345 | Added `?? ''` fallback for `lines[i]` |
| `src/showcase/__tests__/covenant.test.ts` | 67 | TS2532 | Same fix — `noUncheckedIndexedAccess` |

After fix: showcase code contributes 0 TS errors.

## Build implication

The web app `build` script is defined as `tsc && vite build`. Because the 6
baseline errors block the script-level build, Task 16's verification run used
`pnpm --filter @ogden/web exec vite build` directly followed by
`pnpm --filter @ogden/web run prerender:showcase`. The vite build itself
emits cleanly (`✓ built in 37.31s`, 748 PWA precache entries, 4 prerendered
showcase routes).

A follow-up task should re-establish a passing top-level `build` script —
either by clearing the baseline errors or by moving the `tsc` gate to a
separate `lint` step. Out of scope for Phase 3.
