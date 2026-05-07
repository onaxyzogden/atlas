# ADR — AnnotationDragHandler Crash Fix · Stage Rail Refactor · Map/Data Improvements

**Date:** 2026-05-07
**Branch:** `feat/atlas-permaculture`
**Commit:** `88b6556`
**Status:** implemented

---

## 1 — AnnotationDragHandler Crash Fix (complete)

### Problem
Navigating from Observe to Plan via `LevelNavigatorBar` threw:
```
Cannot read properties of undefined (reading 'getLayer')
```
The prior commit fixed `ObserveAnnotationLayers.tsx` cleanup but the crash persisted.

### Root cause
`DiagnoseMap`'s cleanup calls `setMap(null); m.remove()`. MapLibre destroys `map.style` synchronously inside `m.remove()`. React then processes the `setMap(null)` state change, which re-renders children with `map = null` — but React fires the *old* cleanup effects (which still hold a stale reference to the destroyed map) with `map` still pointing to the destroyed instance. Any MapLibre API call inside those cleanups that reads `this.style` throws.

`AnnotationDragHandler.tsx` had two cleanup effects with unguarded MapLibre API calls:
- First cleanup (deps `[map, selected]`): `map.off()`, `map.dragPan.enable()`, `map.touchZoomRotate.enableRotation()`, `map.getCanvas()`
- Second cleanup (deps `[map]`): `map.getLayer()`, `map.getSource()`

### Fix
Both cleanup blocks wrapped in `try { … } catch { /* map already removed — nothing to clean up */ }`. The `setPreview(null)` call at the end of the first cleanup (which accesses the preview GeoJSON source) was already gated by `map.getSource()`, but moved inside the try/catch for safety.

### Pattern
Every component rendered inside `DiagnoseMap` that attaches cleanup effects calling MapLibre APIs must wrap those calls in try/catch. Confirmed safe: `MapToolbar` (store-setter only, no map API), `ObserveAnnotationLayers` (fixed prior commit), `AnnotationDragHandler` (fixed this commit), `AnnotationVertexEditHandler` (already had try/catch around `map.removeControl(draw)`).

---

## 2 — Stage Right-Rail Ownership Refactor

### Decision
Self-railed stages (Design / Prove / Operate) own their right rail directly via `StageShell.rightRail` instead of routing through `V3ProjectLayout → DecisionRail → {Design|Prove|Operate}Rail`.

### What was built

**`apps/web/src/features/land-os/LandOsShell.tsx`**
- `rail` prop made optional (`rail?: ReactNode`)
- When `undefined`/`null`, the rail column + drag handle are omitted entirely from the grid (`gridTemplateColumns` drops the last two tracks)

**`apps/web/src/v3/V3ProjectLayout.tsx`**
- `SELF_RAILED_STAGES = new Set<RailStage>(["design", "prove", "operate"])`
- Passes `rail={undefined}` for those stages; `DecisionRail` for all others

**`apps/web/src/v3/components/DecisionRail.tsx`**
- Short-circuits with `return null` for self-railed stages (belt-and-suspenders guard against stale `rail` prop reaching the shell)

**`apps/web/src/v3/pages/DesignPage.tsx`**
- Toolbox moved from an `<aside>` inside the canvas to `StageShell.rightRail`; imports `DesignRail`

**`apps/web/src/v3/pages/OperatePage.tsx`**
- `<OperateRail project={project} />` passed to `StageShell.rightRail`

**`apps/web/src/v3/pages/ProvePage.tsx`**
- `<ProveRail project={project} />` passed to `StageShell.rightRail`

---

## 3 — DiagnoseMap Parcel Boundary Casing

### Decision
Replace the single `#7a6a3f` line layer with a two-pass casing → main stroke pattern.

### What was built
New `BOUNDARY_LINE_CASING_LAYER` (`diagnose-parcel-boundary-line-casing`) rendered below the main line:
- Casing: `#1f1a14`, 6px, 60% opacity — dark shadow for legibility on satellite/bright basemaps
- Main: `#e6c34a`, 3px, 95% opacity — warm gold branded stroke

This is standard MapLibre cartography (cf. street casings in topo/roads styles).

---

## 4 — siteDataStore: Smart Parcel-Move Detection

### Problem
When a user re-drew a project's boundary into a different area (different country, or centroid shift >1km), the store optimistically held the prior jurisdiction's data while the new fetch ran — displaying Ontario scores against a Michigan parcel, or vice versa.

### Decision
Track `lastCenter: [number, number]` and `lastCountry: string` on each project's `SiteData` entry. On `refreshProject`, compare against the incoming centroid/country:
- **Different country OR centroid shift >1km** → clear `layers`, `isLive`, `liveCount`, `fetchedAt`, `enrichment` so the panel shows an honest empty/loading state while the new fetch runs
- **Same area** → keep layers visible during refresh (no flicker)

Haversine distance helper `lngLatDistanceKm` added inline (no external dep).

---

## 5 — projectStore: Stable Local UUID + Boundary Preservation Across Re-Seed

### Problem
`applyBuiltinsToStore` previously called `crypto.randomUUID()` unconditionally on every re-seed. This broke `boundary:<id>` IndexedDB entries (stale key after new UUID) and overwrote user-customized parcel geometries with the canonical builtin shape.

### Decision
Snapshot `existingByServerId: Map<string, LocalProject>` before re-seeding:
- **Local UUID**: reuse `existing.id` when a project with matching `serverId` exists; mint a fresh UUID only for first-seen builtins
- **User-drawn boundary**: detect customization via `JSON.stringify` inequality against the API's canonical `FeatureCollection`; preserve the user's geometry when detected, otherwise use the API shape
- **`createdAt`**: preserve `existing.createdAt` so project age is not reset on every reload

---

## 6 — SiteIntelligencePanel: Country Re-Inference on Refresh

### Problem
If a user re-drew the boundary inside a different country than the project's `country` field (e.g. builtin MTC is `country='CA'`, user re-drew into northern Michigan), `handleRefresh` called the Canadian endpoints from a US centroid.

### Decision
`inferCountryFromLngLat(lng, lat)` uses generous continental bounding boxes + a `lat > 49` disambiguation rule to classify US/CA. If the centroid clearly falls in a different country than `project.country`, use the inferred value for the refresh call. Falls back to `project.country` when the point is outside both bounding boxes (Alaska, Hawaii, international).

---

## 7 — TypeScript Strict Fixes

`noUncheckedIndexedAccess` additions:
- `SeasonalEcologyStrip.tsx` — `counts[m]!++`, `counts[i]!`, `counts[i]! > 0`
- `derivations.ts` — `dirs[idx]!` in `bearingLabel`
- `derivations.test.ts` — `kpis[n]!.value`, `kpis[n]!.note`; `notes: null → ''` in `makeSample` fixture to match updated `SoilSample` type

---

## Files Changed

| File | Action |
|---|---|
| `apps/web/src/v3/observe/components/draw/AnnotationDragHandler.tsx` | try/catch crash fix |
| `apps/web/src/features/land-os/LandOsShell.tsx` | optional `rail` prop, conditional column |
| `apps/web/src/v3/V3ProjectLayout.tsx` | SELF_RAILED_STAGES, conditional rail |
| `apps/web/src/v3/components/DecisionRail.tsx` | short-circuit for self-railed stages |
| `apps/web/src/v3/pages/DesignPage.tsx` | toolbox → StageShell.rightRail via DesignRail |
| `apps/web/src/v3/pages/OperatePage.tsx` | OperateRail → StageShell.rightRail |
| `apps/web/src/v3/pages/ProvePage.tsx` | ProveRail → StageShell.rightRail |
| `apps/web/src/v3/components/DiagnoseMap.tsx` | two-pass parcel boundary casing |
| `apps/web/src/store/siteDataStore.ts` | lastCenter/lastCountry, parcel-move detection |
| `apps/web/src/store/projectStore.ts` | stable UUID + boundary preservation on re-seed |
| `apps/web/src/components/panels/SiteIntelligencePanel.tsx` | inferCountryFromLngLat on refresh |
| `apps/web/src/v3/observe/modules/earth-water-ecology/SeasonalEcologyStrip.tsx` | TS strict fixes |
| `apps/web/src/v3/observe/modules/sectors-zones/derivations.ts` | TS strict fix |
| `apps/web/src/v3/observe/modules/earth-water-ecology/__tests__/derivations.test.ts` | TS strict fixes + fixture |
