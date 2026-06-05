# 2026-04-29 — v3 strict-null TS sweep + market-garden bed-length override


### Done

**Part 1 — v3 TypeScript strict-null sweep.** Cleared all 24 pre-existing TS errors in `apps/web/src/v3/**` so `tsc --noEmit` now reports zero errors across the entire web app.

- [`v3/components/DiagnoseMap.tsx`](../apps/web/src/v3/components/DiagnoseMap.tsx): `polygonBounds()` now returns `LngLatBounds | null` after guarding empty rings + undefined coord components. Both call sites (initial-center derivation + `fitBounds`) handle the null case.
- [`v3/components/FiltersBar.tsx`](../apps/web/src/v3/components/FiltersBar.tsx): `f.options[idx + 1] ?? null` to satisfy `noUncheckedIndexedAccess`.
- [`v3/components/overlays/SpotlightPulse.tsx`](../apps/web/src/v3/components/overlays/SpotlightPulse.tsx) + [`v3/components/rails/DiagnoseRail.tsx`](../apps/web/src/v3/components/rails/DiagnoseRail.tsx) + [`v3/components/rails/OperateRail.tsx`](../apps/web/src/v3/components/rails/OperateRail.tsx): `css.foo ?? ""` for CSS-module string accesses (typed as `string | undefined` under the project's strict CSS-module typing).
- [`v3/components/rails/HomeRail.tsx`](../apps/web/src/v3/components/rails/HomeRail.tsx): non-null assertion on `currentStage` after the `currentIdx >= 0 ? currentIdx : 0` guard makes the index always valid.
- [`v3/components/rails/ProveRail.tsx`](../apps/web/src/v3/components/rails/ProveRail.tsx): added `&& visible[0]` to the IntersectionObserver callback before reading `.target.id`.
- [`v3/components/Sparkline.tsx`](../apps/web/src/v3/components/Sparkline.tsx): `(values[values.length - 1] ?? 0)` for the last-point Y calc.

**Part 2 — Market-garden bed-length override (deferred Phase 3 item).** Users can now tune the per-bundle bed length instead of being locked to the 30 m default; bed-count math in the popup updates live.

- [`marketGardenBundles.ts`](../apps/web/src/features/crops/marketGardenBundles.ts): `computeMarketGardenGeometry(areaM2, bundle, bedLengthM?)` — optional 3rd arg falls back to `ASSUMED_BED_LENGTH_M` (30 m) when undefined or non-positive.
- [`cropStore.ts`](../apps/web/src/store/cropStore.ts): added optional `marketGardenBedLengthM?: number` to `CropArea`. Only persisted when the user moved the slider away from the default — keeps existing localStorage records clean.
- [`CropPanel.tsx`](../apps/web/src/features/crops/CropPanel.tsx):
  - New `marketGardenBedLengthM` state, default `ASSUMED_BED_LENGTH_M`, reset on each new draw.
  - Threaded into the `mgGeom` useMemo and the save payload (with the dependency array updated).
  - New range slider (5–60 m, 1 m step) just below the bundle dropdown, with a hint clarifying the 30 m default. Bed-geometry read-out now shows `bed Wm × Lm` so the override is visible inline.

### Verified

- `tsc --noEmit` clean across the entire web app (0 errors in `src/`).
- Bed-length math: `computeMarketGardenGeometry(1000, mixedBundle, 20)` → bedFraction 0.625 = 625 m² beds; 625 / (0.75 × 20) = 41 beds. Verified the new arg flows through both popup display and the persisted `CropArea`.

### Files

- `apps/web/src/features/crops/marketGardenBundles.ts`
- `apps/web/src/features/crops/CropPanel.tsx`
- `apps/web/src/store/cropStore.ts`
- `apps/web/src/v3/components/DiagnoseMap.tsx`
- `apps/web/src/v3/components/FiltersBar.tsx`
- `apps/web/src/v3/components/overlays/SpotlightPulse.tsx`
- `apps/web/src/v3/components/rails/DiagnoseRail.tsx`
- `apps/web/src/v3/components/rails/HomeRail.tsx`
- `apps/web/src/v3/components/rails/OperateRail.tsx`
- `apps/web/src/v3/components/rails/ProveRail.tsx`
- `apps/web/src/v3/components/Sparkline.tsx`
