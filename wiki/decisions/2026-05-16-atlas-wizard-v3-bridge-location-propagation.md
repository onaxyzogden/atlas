# 2026-05-16 — New-project wizard → v3 bridge + location propagation through the adapter seam

**Status:** Accepted · `feat/atlas-permaculture`
**Scope:** [apps/web/src/features/project/wizard/StepNotes.tsx](apps/web/src/features/project/wizard/StepNotes.tsx) · [apps/web/src/v3/types.ts](apps/web/src/v3/types.ts) · [apps/web/src/v3/data/adaptLocalProject.ts](apps/web/src/v3/data/adaptLocalProject.ts) · [apps/web/src/v3/observe/ObserveLayout.tsx](apps/web/src/v3/observe/ObserveLayout.tsx) · [apps/web/src/v3/plan/PlanLayout.tsx](apps/web/src/v3/plan/PlanLayout.tsx) · [apps/web/src/v3/act/ActLayout.tsx](apps/web/src/v3/act/ActLayout.tsx)
**Closes deferred item from:** [[2026-04-27-project-intake-map-centering]] ("Updating already-existing project map open paths to consume `metadata.centerLat/Lng`")

## Problem

A simulated regen-farm UX walkthrough ([docs/ux-walkthrough-regen-farm.md](docs/ux-walkthrough-regen-farm.md)) found two coupled defects:

1. **Wrong destination.** The new-project wizard's "Create Project" navigated to the **legacy** `/project/{id}` page, not the active **v3 / Land OS** flow. New projects landed in a deprecated surface.
2. **Location dropped on the floor.** The wizard captures `metadata.centerLat/centerLng` (per [[2026-04-27-project-intake-map-centering]]), but the v2→v3 adapter never read them and all three v3 layouts passed a hardcoded `FALLBACK_CENTROID = [-78.2, 44.5]` (an Ontario lake) to `DiagnoseMap`. A project created anywhere else opened Observe on the wrong continent. That single root cause cascaded into ~5 downstream degradations (Weather gate, Report acreage, Plan ring-seeding anchored wrong, etc.).

Drawn-boundary projects already propagated correctly (`adaptLocalProject.firstPolygon` → `DiagnoseMap` `fitBounds`); the un-fixed gap was specifically the **coords-only / no-boundary** case.

## Decision

**Rec #1 — Bridge creation → v3 (1 line).** `StepNotes.tsx` "Create Project" now navigates to `/v3/project/$projectId/observe` instead of `/project/$projectId`. The fire-and-forget backend sync is untouched. The legacy page stays routable by direct URL (no deletion).

**Rec #2 — Propagate location through the adapter seam (the single long-term home, not per-layout duplication):**

- `v3/types.ts` — `ProjectLocation` gains `center?: [number, number]` (documented `[lng, lat]`; precedence `boundary → center → fallback`).
- `adaptLocalProject.ts` — new `metadataCenter(p)` reads `p.metadata.centerLng/centerLat`, returns `[lng, lat]` only when both are finite numbers, spread into `location` alongside `boundary`.
- `ObserveLayout` / `PlanLayout` (3 sinks: `VisionLayoutCanvas`, `DiagnoseMap`, `PlanSunPathOverlay`) / `ActLayout` (added `useV3Project` import) each compute `fallbackCenter = v3Project?.location.center ?? FALLBACK_CENTROID` and feed `DiagnoseMap`.

`DiagnoseMap`'s pre-existing `boundary ? fitBounds : centroid` branch is unchanged — `center` is consumed only as the centroid when no boundary exists, preserving the documented precedence.

## Why

- The adapter is the **single v2→v3 mapping seam**; deriving `center` once there means Observe/Plan/Act inherit it without three copies of the same metadata-reading logic drifting apart.
- Coordinate order is the obvious defect risk: MapLibre/`DiagnoseMap` centroid is `[lng, lat]` but wizard metadata is `centerLat`/`centerLng`. The adapter emits `[centerLng, centerLat]`; Case-B verification catches a swap immediately.
- Redirect (not a CTA on the legacy page) was the user-confirmed choice — the legacy flow is deprecated, not a parallel offering.

## How to apply

Any future v3 surface that opens a project map must read `v3Project.location.center` as its centroid fallback (after `boundary`, before any hardcoded constant). Do **not** re-derive from `LocalProject.metadata` in the layout — the adapter already provides the typed contract.

## Out of scope (deferred)

- **Latent in-canvas acreage bug:** `handleBoundaryDrawn` / `onBoundaryDrawn` in all three v3 layouts persist `parcelBoundaryGeojson` but never recompute `acreage`, so a boundary drawn *inside* v3 leaves Report at "0 ha". Unrelated to creation-flow propagation (the wizard path *does* compute acreage via `turf.area`). Recorded as a follow-up.
- No-boundary acreage stays `0` (cannot compute area without a polygon — expected, not a regression).

## Verification

- `corepack pnpm --filter @ogden/web typecheck` — `tsc --noEmit` exit 0 (shared `Project` type change ripples cleanly through adapter + 3 layouts).
- **Case B (coords only):** wizard → US lat/lng → skip drawing → Create. Live MapLibre instance read: route `= /v3/project/{id}/observe` (Rec #1); `getCenter() = {lng: -86.7816, lat: 36.1627}` — exactly the entered coords, correct lng/lat order, **not** `[-78.2, 44.5]` (Rec #2). Persisted store confirmed `hasBoundary:false, metadata:{centerLat,centerLng}, acreage:null`.
- **Case A (boundary):** store-seeded the exact `parcelBoundaryGeojson` FC + `acreage` shape the wizard writes, with `metadata.center` deliberately set to Europe. Map fit to the polygon centroid `[-105.27, 40.015]`, ignoring the Europe metadata — proves `center` does **not** override an existing `boundary`.
- **MTC regression:** `/v3/project/mtc/observe` still centers `[-78.2, 44.5]` (no `center` field → fallthrough), unchanged.
- Screenshot tool times out on every offline map route — the MapLibre WebGL canvas never settles without basemap tiles (`map.loaded() === false`). Stated explicitly per project convention rather than faked; route + coordinate assertions verified by reading the live map instance, which is strictly more precise for these claims than a tile-less grey-canvas capture. Case A used a store-seed because a mapbox-gl-draw drag on a tile-less canvas is infeasible through the preview harness and the draw gesture itself is pre-existing untouched UI.
