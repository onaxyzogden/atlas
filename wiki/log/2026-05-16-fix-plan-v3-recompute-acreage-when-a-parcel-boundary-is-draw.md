# 2026-05-16 — fix(plan/v3): recompute acreage when a parcel boundary is drawn inside Land OS


Closes the deferred follow-up recorded at the end of the preceding
wizard→v3 bridge entry. The three v3 boundary-persist handlers —
`handleBoundaryDrawn` in PlanLayout/ActLayout, the inline
`onBoundaryDrawn` in ObserveLayout — persisted `parcelBoundaryGeojson`
+ `hasParcelBoundary` but omitted `acreage`. `adaptLocalProjectToV3`
reads `LocalProject.acreage` straight (`p.acreage ?? 0`) and never
derives area from the polygon, so a parcel drawn *inside* v3 left
Report at "0 ha". The new-project wizard already computed acreage
correctly inline (`turf.area`); the in-canvas draw path was the only
gap.

Scope (user-confirmed): **helper + 3 handlers + wizard** — explicitly
not the minimal handlers-only patch, and not widening to legacy
`MapView`. New `lib/geo.ts` `parcelAcreage(geo, units)` beside the
2026-05-12 extracted geo utilities: a verbatim relocation of the
wizard's math (`turf.area` → `÷10000` ha / `÷4046.86` ac,
`Math.round(x*100)/100`, best-effort `try/catch → null`); first
`import * as turf` in the file; arg type
`GeoJSON.Geometry | Feature | FeatureCollection` covers the handlers'
raw `Polygon` and the wizard's `FeatureCollection`. PlanLayout/ActLayout
add `acreage: parcelAcreage(polygon, project.units)` to the existing
patch (`project` already in scope); ObserveLayout has no `LocalProject`
in scope so a `units` store selector was added
(`projects.find(... id|serverId ...)?.units ?? 'metric'`). StepNotes.tsx
collapses its ~12-line inline block to
`boundaryGeo ? parcelAcreage(boundaryGeo, project.units) : null` and
drops the now-unused `turf` import. Four call sites, one source of
truth. Persist (not adapter-derive) was chosen so the many non-v3
consumers of `LocalProject.acreage` (financial `computeAssessmentScores`,
AI context, dashboards, `siteIntelTemplate`, backend `syncService`)
stay consistent.

**Verification.** `corepack pnpm --filter @ogden/web typecheck` —
`tsc --noEmit` exit 0; the union arg type satisfies all four call
sites. Math-equivalence is a static verbatim check (same divisors,
rounding, null semantics); the empty-coords case returns `0` because
`turf.area` returns 0 without throwing — exactly the prior wizard
behaviour, not a regression. Functional, offline, exercising the real
Vite-served modules → real `useProjectStore` → real
`adaptLocalProjectToV3` → real `V3ReportPage`: `parcelAcreage` gave
ha `3.99` / ac `9.87` (correctly not inverted — a swap would give the
≈2.47 ratio, observed ≈0.40), identical for `Polygon` and
`FeatureCollection` args; the exact handler patch persisted and
surfaced as `location.acreage = 3.99 ha` / `9.87 ac`,
`not_zero_ha: true`; the live Report rendered "US · 3.99 ha" and
"US · 9.87 ac" (no "0 ha"). Regression: MTC sentinel unaffected
(builtin-project key filter drops the extra `acreage` key, stayed
`null`); re-draw updates not appends (`3.99 → 99.82`, one feature).
The Report route has no MapLibre canvas, so the standing offline
tile-less-WebGL screenshot limitation does not apply here — asserts
were instrument-level DOM/store reads (strictly more precise for
numeric claims), stated explicitly rather than faking a capture. Test
projects seeded for verification were deleted from the dev store.

ADR: `wiki/decisions/2026-05-16-atlas-v3-in-canvas-acreage-recompute.md`.

**Not committed:** the same concurrent in-progress working-tree files
(livestock cards / zones / concentric / autoDesign / zonesOverlay /
zoneSizeGuide / graphify-out) remain uncommitted — only the 5 task
files + these 3 wiki pages were staged this session.
