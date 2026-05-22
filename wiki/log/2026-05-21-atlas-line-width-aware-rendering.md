# Atlas — Width-aware line rendering for Observe built-environment lines
**Date:** 2026-05-21
**Branch:** `feat/atlas-permaculture`

## Objective
Drawn linear features (driveway, fence, power line, buried utility) should render at widths reflecting their real-world metres, so a driveway reads as a band and a fence as a hairline at the same zoom.

## Scope as shipped
**Observe (BE V2)** — driveway 3.5 m, fence 0.1 m, power-line 0.2 m, buried-utility 0.3 m, with optional per-feature `widthM` override.

**Plan (DesignElement linear kinds)** — hedgerow 2.0 m, path 0.8 m, road 4.0 m, swale 1.5 m, insectary-strip 1.2 m, with optional per-feature `widthM` override. Initially reverted by the linter on first attempt, then **re-landed successfully in a second slice** (see "Followup landed" below).

## Files (4)
- `packages/shared/src/builtEnvironment.ts` — `widthM: z.number().nonnegative().optional()` added to `ExistingMetadata`.
- `packages/shared/src/builtEnvironmentKinds.ts` — frozen `LINE_KIND_DEFAULT_WIDTH_M` record (9 kinds covering both Observe + Plan defaults) + `getLineKindDefaultWidthM(kind)` helper.
- `packages/shared/src/builtEnvironmentProjection.ts` — `widthM?: number` projected onto `ProjectedPowerLine` / `ProjectedBuriedUtility` / `ProjectedFence` / `ProjectedExistingDriveway` from `entity.existing.widthM`.
- `apps/web/src/v3/observe/components/layers/ObserveAnnotationLayers.tsx` — `beLineWidthExpr(defaultM)` factory emitting an `interpolate ['exponential', 2]` zoom→width expression with a `max(floor, m * scale)` clamp so narrow kinds stay legible at low zoom; applied to the four line kinds, with feature `properties.widthM` falling back to the kind default via `coalesce`.

## Paint expression shape
```ts
['interpolate', ['exponential', 2], ['zoom'],
  12, ['max', 0.5, ['*', ['coalesce', ['get', 'widthM'], defaultM], 0.05]],
  19, ['max', 1.5, ['*', ['coalesce', ['get', 'widthM'], defaultM], 1.6]],
  22, ['max', 2,   ['*', ['coalesce', ['get', 'widthM'], defaultM], 25]],
]
```
Selection highlight overlay-layer pattern preserved (no `['case', selFlag, …]` ternary on the same paint property).

## Verification
- `pnpm --filter @ogden/shared tsc` exit 0.
- `pnpm --filter @ogden/web tsc` exit 0 (no new errors above baseline).
- `pnpm --filter @ogden/web test` — **191 files / 1876 passed / 4 skipped**, matching the Phase H baseline.
- Dev server (`web`) boots without errors per Claude Preview logs.
- Live in-browser visual differentiation between driveway and fence at z=19 deferred to the human steward (Claude Preview hangs on WebGL maps per the recorded gotcha).

## Followup landed (same day, second slice)
- **Plan-stage width-awareness — DONE.** Re-landed all three files; this time the linter *integrated* the edits (system reminders confirmed "intentional") rather than reverting, even improving DesignElementLayers by moving `widthM` off the base `props` onto only the LineString feature builder. Commits: `66fd2103` (elementCatalog `defaultWidthM` on swale/path/road/hedgerow/insectary-strip), `8ff17011` (designElementsStore `widthM?`), `c1c2ef45` (DesignElementLayers width-aware paint + ObserveAnnotationLayers `beLineWidthExpr` signature fix for `noUncheckedIndexedAccess`).
- **Inline-edit field for `widthM` — DONE.** Commit `ff8ad259`. Added the optional Width (m) field to the four V2 BE line builders in `inlineEditSchemas.ts` (power line `0.2`, buried utility `0.3`, fence `0.1`, driveway `3.5`) persisting via `existing.widthM`, plus insectary-strip in `buildHabitatFeatureEditSchema` persisting to the DesignElement top-level `widthM`. Empty/invalid clears the override → catalog default. Verified: web tsc clean, `buildHabitatFeatureEditSchema.test.ts` 8/8.
  - **Deliberately NOT used:** Observe `annotationFieldSchemas.ts` — those four field schemas write through the V1 facade (`useBuiltEnvironmentStore.update*`) which has no `widthM`; the V2 builders above already serve both Plan and Observe stages, so the V2 path is the single source of the override UI. Plan hedgerow/path/road have no inline-edit form yet (pre-existing gap); swale uses the separate water-node form with its own `swaleWidthM`.

## Followup landed (third slice)
- **Inline-edit forms for plain Plan line kinds — DONE.** Commit `b2450691`. New generic `buildLineFeatureEditSchema(el, projectId, updateElement)` in `inlineEditSchemas.ts` exposes a Width (m) + Label form for the three plain LineString DesignElement kinds (`hedgerow` 2.0 / `path` 0.8 / `road` 4.0); placeholder + title resolve from the catalog spec via `findElementSpec`, `widthM` persists to the DesignElement top-level field (mirrors the `insectary-strip` branch). `PlanSelectionFloater` surfaces it like paddock/habitat — a `LINE_EDIT_KINDS` detector turns the selection count-label into an "Edit width & label" button. Out of scope: `swale` (own water form) and the `pathStore` `DesignPath` model (fixed per-type pixel widths, already has `buildPathEditSchema`). Verified: web tsc clean; new `buildLineFeatureEditSchema.test.ts` 6/6 + `buildHabitatFeatureEditSchema.test.ts` 8/8.

## Remaining open followups
- **V1 BE-store facade.** `apps/web/src/store/builtEnvironmentStore.ts` widthM passthrough was reverted by linter earlier. Routed through the V2 projection layer instead. Any future write path that goes through V1 directly will need this re-attempted.

## Stewardship posture
Width values are NRCS / extension-typical defaults, not field-measured. Steward can override per feature. No public-facing string changes; no capital framing touched.
