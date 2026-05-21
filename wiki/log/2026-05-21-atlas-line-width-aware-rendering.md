# Atlas — Width-aware line rendering for Observe built-environment lines
**Date:** 2026-05-21
**Branch:** `feat/atlas-permaculture`

## Objective
Drawn linear features (driveway, fence, power line, buried utility) should render at widths reflecting their real-world metres, so a driveway reads as a band and a fence as a hairline at the same zoom.

## Scope as shipped
**Observe (BE V2)** — driveway 3.5 m, fence 0.1 m, power-line 0.2 m, buried-utility 0.3 m, with optional per-feature `widthM` override.

**Plan (DesignElement linear kinds)** — scoped in the approved plan (hedgerow 2.0 m, path 0.8 m, road 4.0 m, swale 1.5 m, insectary-strip 1.2 m) but **not landed** this session: every edit to `apps/web/src/v3/plan/canvas/elementCatalog.ts`, `apps/web/src/store/designElementsStore.ts`, and `apps/web/src/v3/plan/canvas/layers/DesignElementLayers.tsx` was silently reverted by the linter / a parallel write, mirroring the V1 BE-store revert pattern previously observed. The Observe stage is the surviving delivery; Plan-stage width-awareness remains an open followup.

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

## Open followups
- **Plan-stage width-awareness.** elementCatalog.ts `defaultWidthM`, designElementsStore.ts `widthM`, and DesignElementLayers.tsx paint expression all need to re-land. Recommend committing the moment each file verifies, per `feedback_commit_immediately_on_rebased_branches`.
- **Inline-edit field for `widthM`.** Observe annotationFieldSchemas.ts (4 kinds) + Plan inlineEditSchemas.ts (5 kinds). The rendering path uses kind defaults when no override exists, so the user-visible behaviour already differentiates kinds — the override field is the remaining polish.
- **V1 BE-store facade.** `apps/web/src/store/builtEnvironmentStore.ts` widthM passthrough was reverted by linter earlier. Routed through the V2 projection layer instead. Any future write path that goes through V1 directly will need this re-attempted.

## Stewardship posture
Width values are NRCS / extension-typical defaults, not field-measured. Steward can override per feature. No public-facing string changes; no capital framing touched.
