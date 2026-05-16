# 2026-05-16 — Recompute acreage when a parcel boundary is drawn inside v3 Land OS

**Status:** Accepted · `feat/atlas-permaculture`
**Scope:** [apps/web/src/lib/geo.ts](apps/web/src/lib/geo.ts) · [apps/web/src/v3/plan/PlanLayout.tsx](apps/web/src/v3/plan/PlanLayout.tsx) · [apps/web/src/v3/act/ActLayout.tsx](apps/web/src/v3/act/ActLayout.tsx) · [apps/web/src/v3/observe/ObserveLayout.tsx](apps/web/src/v3/observe/ObserveLayout.tsx) · [apps/web/src/features/project/wizard/StepNotes.tsx](apps/web/src/features/project/wizard/StepNotes.tsx)
**Closes deferred item from:** [[2026-05-16-atlas-wizard-v3-bridge-location-propagation]] ("Latent in-canvas acreage bug … a boundary drawn *inside* v3 leaves Report at 0 ha")

## Problem

The three v3 stage layouts each have their own boundary-persist handler —
`handleBoundaryDrawn` in PlanLayout/ActLayout, an inline `onBoundaryDrawn`
in ObserveLayout. All three persisted `parcelBoundaryGeojson` +
`hasParcelBoundary` but **omitted `acreage`** from the `updateProject`
patch. The v2→v3 adapter reads `location.acreage` straight from the
persisted `LocalProject.acreage` (`adaptLocalProject.ts` — `p.acreage ?? 0`);
it never derives area from the polygon. So a parcel drawn *inside* Land OS
left Report at **"0 ha"** even though the boundary itself rendered fine.
The new-project **wizard** path already computed acreage correctly
(`StepNotes.tsx` inline `turf.area` block) — the in-canvas draw path was
the only gap.

## Decision

**Helper + 3 handlers + wizard** (user-confirmed scope; explicitly *not*
the minimal handlers-only patch and *not* widening to legacy `MapView`).

- **`lib/geo.ts`** — new `parcelAcreage(geo, units)` beside the existing
  2026-05-12 extracted geo utilities (`haversineM`, `polygonCentroid`).
  Verbatim relocation of the wizard's math: `turf.area` → `÷10000` (ha) /
  `÷4046.86` (ac), `Math.round(x*100)/100` (2 dp), best-effort
  `try/catch → null`. First `import * as turf from '@turf/turf'` in the
  file. Arg type `GeoJSON.Geometry | Feature | FeatureCollection` covers
  both the handlers' raw `Polygon` and the wizard's `FeatureCollection`.
- **PlanLayout / ActLayout** — `acreage: parcelAcreage(polygon, project.units)`
  added to the existing patch (`project` already in scope).
- **ObserveLayout** — no `LocalProject` in scope; added a `units` store
  selector (`projects.find(... id|serverId ...)?.units ?? 'metric'`),
  then `acreage: parcelAcreage(polygon, units)` in the inline handler.
- **StepNotes.tsx** — inline ~12-line block replaced with
  `boundaryGeo ? parcelAcreage(boundaryGeo, project.units) : null`;
  now-unused `turf` import dropped.

## Why

- **Persist, not adapter-derive.** Deriving area inside
  `adaptLocalProjectToV3` would fix the v3 Report symptom but leave the
  persisted `LocalProject.acreage` stale for the many non-v3 consumers
  (financial `computeAssessmentScores`, AI context, dashboards,
  `siteIntelTemplate`, backend `syncService`). The fix must persist the
  same way the wizard does so every consumer stays consistent.
- **One helper, four call sites.** The canonical math lived only inline in
  the wizard; re-typing it into three handlers would create four
  divergent copies of unit-aware area math. `geo.ts` is the established
  home for exactly this de-duplication (its header documents the
  2026-05-12 four-implementation extraction).

## How to apply

Any future surface that persists a steward-drawn parcel boundary must
also send `acreage: parcelAcreage(polygon, units)` in the same
`updateProject` patch — do not rely on the adapter to backfill it. Read
the unit from the `LocalProject` (`project.units`) or, when no
`LocalProject` is in scope, a `units` store selector defaulting to
`'metric'`.

## Out of scope (deferred)

- **Legacy `MapView.tsx:260-268`** computes area but always in hectares,
  ignoring `units` — a separate latent legacy bug, untouched (legacy
  stays routable, not deleted).
- `BoundaryTool` / `AreaTool` live-display strings — display only.
- Backend `syncService` — already forwards whatever `acreage` the store
  holds; inherits the correct value once persistence is fixed.

## Verification

- `corepack pnpm --filter @ogden/web typecheck` — `tsc --noEmit` exit 0;
  the `Geometry | Feature | FeatureCollection` union satisfies all four
  call sites.
- **Math-equivalence (static):** verbatim relocation — identical
  divisors, 2-dp rounding, and `try/catch → null`; only `return` vs
  `acreage =` and param names differ. No-boundary path preserved by the
  `boundaryGeo ? … : null` call site. Empty-coords polygon returns `0`
  (turf returns 0, does not throw) — exactly the prior wizard behaviour,
  no regression.
- **Functional (offline, real Vite modules → real store → real adapter →
  real ReportPage):** exercised `parcelAcreage` for a parcel-sized square
  — ha `3.99` / ac `9.87` (correctly *not* inverted; a swap would give
  ratio ≈ 2.47, observed ≈ 0.40); identical result for raw `Polygon` and
  `FeatureCollection` args. The exact handler patch persisted through the
  real `useProjectStore`, surfaced by the real `adaptLocalProjectToV3` as
  `location.acreage = 3.99 ha` (metric) / `9.87 ac` (imperial),
  `not_zero_ha: true`. The live `V3ReportPage` rendered **"US · 3.99 ha"**
  and **"US · 9.87 ac"** (no "0 ha").
- **Regression:** MTC sentinel unaffected — builtin-project key filter
  (`parcelBoundaryGeojson`/`hasParcelBoundary`/`metadata` only) drops the
  extra `acreage` key, `mtc.acreage` stayed `null`. Re-draw updates not
  appends — `3.99 → 99.82` on a larger re-draw, FeatureCollection stays
  at exactly one feature.
- Verification was instrument-level DOM/store reads of the live rendered
  Report (strictly more precise than a screenshot for numeric
  assertions); the Report route has no MapLibre canvas, so the standing
  offline tile-less-WebGL screenshot limitation does not apply here.
  Stated explicitly per project convention rather than faking a capture.
