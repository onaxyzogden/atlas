# 2026-05-16 — feat(plan/v3): new-project wizard → v3 bridge + adapter-seam location propagation


A simulated regen-farm UX walkthrough
(`docs/ux-walkthrough-regen-farm.md`) found two coupled defects in the
project-creation path:

1. **Wrong destination.** The new-project wizard's "Create Project"
   navigated to the legacy `/project/{id}` page, not the active
   v3 / Land OS flow — new projects landed in a deprecated surface.
2. **Location dropped on the floor.** The wizard captures
   `metadata.centerLat/centerLng` (per the 2026-04-27 intake-centering
   ADR) but the v2→v3 adapter never read them, and all three v3
   layouts passed a hardcoded `FALLBACK_CENTROID = [-78.2, 44.5]` (an
   Ontario lake) to `DiagnoseMap`. A project created anywhere else
   opened Observe on the wrong continent; that single root cause
   cascaded into ~5 downstream degradations (Weather gate, Report
   acreage, Plan ring-seeding anchored wrong). Drawn-boundary projects
   already propagated (`firstPolygon` → `fitBounds`); the gap was
   specifically the coords-only / no-boundary case.

Rec #1 (1 line): `StepNotes.tsx` "Create Project" now navigates to
`/v3/project/$projectId/observe`. Fire-and-forget backend sync
untouched; legacy page stays URL-routable (no deletion).

Rec #2 (single adapter seam, not per-layout duplication):
`v3/types.ts` `ProjectLocation` gains `center?: [number, number]`
(documented `[lng, lat]`; precedence `boundary → center → fallback`).
`adaptLocalProject.ts` new `metadataCenter(p)` reads
`metadata.centerLng/centerLat`, returns `[lng, lat]` only when both
are finite, spread into `location` alongside `boundary`.
ObserveLayout / PlanLayout (3 sinks: `VisionLayoutCanvas`,
`DiagnoseMap`, `PlanSunPathOverlay`) / ActLayout (added `useV3Project`
import) each compute
`fallbackCenter = v3Project?.location.center ?? FALLBACK_CENTROID` and
feed `DiagnoseMap`. The pre-existing `boundary ? fitBounds : centroid`
branch in `DiagnoseMap` is unchanged — `center` is consumed only as
the centroid when no boundary exists. Closes the 2026-04-27 deferred
item ("consume `metadata.centerLat/Lng` on already-existing project
map open paths").

**Verification.** `corepack pnpm --filter @ogden/web typecheck` —
`tsc --noEmit` exit 0 (shared `Project` type change ripples cleanly
through adapter + 3 layouts). Case B (coords only): wizard → US
lat/lng → skip drawing → Create; live MapLibre read showed route
`= /v3/project/{id}/observe` and `getCenter() = {lng:-86.7816,
lat:36.1627}` — exactly the entered coords, correct lng/lat order,
not `[-78.2, 44.5]`. Case A (boundary): store-seeded the exact
`parcelBoundaryGeojson` + `acreage` shape the wizard writes with
`metadata.center` deliberately set to Europe; map fit the polygon
centroid `[-105.27, 40.015]`, ignoring the Europe metadata — proves
`center` does not override an existing `boundary`. MTC regression:
`/v3/project/mtc/observe` still centers `[-78.2, 44.5]` (no `center`
field → fallthrough), unchanged.

ADR: `wiki/decisions/2026-05-16-atlas-wizard-v3-bridge-location-propagation.md`.

**Deferred.** Latent in-canvas acreage bug: `handleBoundaryDrawn` /
`onBoundaryDrawn` in all three v3 layouts persist
`parcelBoundaryGeojson` but never recompute `acreage`, so a boundary
drawn *inside* v3 leaves Report at "0 ha" (the wizard path itself
*does* compute acreage via `turf.area`). Unrelated to creation-flow
propagation; recorded as a follow-up. No-boundary acreage stays `0`
(cannot compute area without a polygon — expected, not a regression).
Screenshot proof unavailable on every offline map route — the
MapLibre WebGL canvas never settles without basemap tiles
(`map.loaded() === false`), so route + coordinate assertions were
verified by reading the live map instance instead (strictly more
precise than a tile-less grey-canvas capture). The concurrent
in-progress working-tree files (zone-generator / basemap /
ZonePolygonTool / zoneSizeGuide) were **not** committed in this
session — only the 6 task files + these wiki pages.
