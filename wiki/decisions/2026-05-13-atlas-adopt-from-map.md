---
name: Adopt-from-map — basemap-hide pipeline + projectId-mismatch fix
date: 2026-05-13
status: shipped
---

# 2026-05-13 — Atlas "Adopt from map" v2: basemap-hide pipeline + ObserveLayout projectId normalisation

## Context

The Observe-stage "Adopt from map" tool lets a steward click a basemap
building (OpenMapTiles `building` source-layer) and persist it as a
project Built-Environment entity with `state: 'existing'`. The original
v1 implementation created the entity but left the basemap's own
extrusion painting underneath the project's `DesignElementExtrusionLayer`,
producing visible z-fight and the user-perceived "Save did nothing"
symptom.

Two distinct bugs were addressed in this session:

1. **Basemap-hide pipeline missing.** The adopted entity had no
   recorded link back to the underlying tile feature, so the basemap
   couldn't suppress it.
2. **ObserveLayout projectId normalisation missing.** Sample-project
   route had no `$projectId` URL param; raw `undefined` threaded down
   to `ObserveDrawHost` → `AdoptBasemapBuildingTool` short-circuited
   the create-entity guard, so on the sample route the entity was
   never persisted at all. Every other v3 layout (`PlanLayout`,
   `ActLayout`, the 30 BE dashboards) normalises with
   `params.projectId ?? 'mtc'`; `ObserveLayout` was the only outlier.

## Decision

### Bug 1 — basemap-hide pipeline

Schema (`packages/shared/src/builtEnvironment.ts`):

- `ExistingMetadata` gained optional `adoptedFromBasemapId: string | number`.

Write path (`AdoptBasemapBuildingTool.tsx`):

- Resolves `rawId = hit.id ?? properties.osm_id ?? properties.id` at click
  time and records it onto `existing.adoptedFromBasemapId` on the new
  entity. Shows an info toast when no id is resolvable so the user knows
  the hide will be a no-op but the adoption itself succeeded.

Sync module (`apps/web/src/features/map/adoptedBasemapBuildings.ts`, new):

- `findBuildingLayerIds(map)` — enumerates every style layer whose
  `source-layer === 'building'` (both 2D fills and 3D fill-extrusions).
- `getAdoptedBasemapIds(projectId)` — reads the V2 store, returns the
  set of `adoptedFromBasemapId` values for `kind: 'building'`,
  `state: 'existing'` entities under the project.
- `syncAdoptedHidings(map, projectId)` — splices a property-based filter
  clause `['!', ['in', ['get', 'osm_id'], ['literal', ids]]]` onto every
  building layer's existing filter, caching each layer's pre-adoption
  baseline in a `WeakMap<MaplibreMap, Map<layerId, FilterSpec>>`.
  Idempotent; safe on every `style.load` and every store change.
- Coerces ids to both string and number variants defensively, since
  tile pipelines occasionally promote integer ids to strings.

### Why property-filter, not `setFeatureState` + `promoteId`

The MapTiler OpenMapTiles source ships without `promoteId`. The earlier
v2.1 attempt was to inject `promoteId: { building: 'osm_id' }` post
`style.load` by `removeSource` + `addSource`. MapLibre's `removeSource`
**throws when layers reference the source** — the silent `try/catch`
swallowed the error, leaving the source removed and the basemap
building still rendering. Property-based filter via `['get', 'osm_id']`
needs no source mutation and works regardless of `promoteId` state.

### Mount points

- `apps/web/src/features/map/MapCanvas.tsx` (legacy) — direct
  `useEffect` calls `syncAdoptedHidings` on mount + `style.load` +
  every BE V2 store change.
- `apps/web/src/v3/builtEnvironment/layers/AdoptedBuildingsSync.tsx`
  (new) — same effect, packaged as a render-prop-free component.
  Mounted in v3 `ObserveLayout` and `VisionLayoutCanvas`.

### Bug 2 — ObserveLayout projectId normalisation

`apps/web/src/v3/observe/ObserveLayout.tsx`:

```ts
const id = params.projectId ?? 'mtc';
```

added after the params destructure. Every store-aware child swapped
from `params.projectId ?? null` / `params.projectId ?? ''` to `id`:
`MapToolbar`, `DesignToolRail`, `ObserveAnnotationLayers`, the BE-layer
block (`AdoptedBuildingsSync`, `DesignElementExtrusionLayer`,
`DesignElementScenegraphLayer`, `BeV2GenericLayer` — guard dropped,
mounted unconditionally), `ObserveDrawHost`, `AnnotationSectorHandles`,
`SelectionFloater`, `ExportButton`, `ImportSiteIntelButton`,
`AnnotationDetailPanel`. Navigation guards and `useV3Project` continue
to read raw `params.projectId` (URL-presence semantics, not entity-key
semantics).

### Auxiliary

- `DesignElementExtrusionLayer.tsx` now prefers `proposed.heightM` when
  set and adds click-to-inline-edit so adopted buildings remain
  selectable at pitched camera angles where the extrusion intercepts
  the click before the 2D fill underneath. Adopted buildings save the
  basemap's `render_height` onto `proposed.heightM` for correct extrusion.
- `elementHeights.ts` — registered `building` with `mode: 'extrusion'`
  fallback (6 m / single-storey) so the polygon kind has a height spec
  for kinds-without-GLB.

## Verification

- HMR clean across all touched files on dev server.
- Sample route (no URL projectId) — adopt-from-map → entity persists
  under `'mtc'`, basemap building hides, appears in BE dashboard's
  placed-features list.
- Real-project route — regression check, same behaviour.

## Files

- `packages/shared/src/builtEnvironment.ts`
- `apps/web/src/features/map/adoptedBasemapBuildings.ts` (new)
- `apps/web/src/features/map/MapCanvas.tsx`
- `apps/web/src/v3/builtEnvironment/layers/AdoptedBuildingsSync.tsx` (new)
- `apps/web/src/v3/builtEnvironment/layers/DesignElementExtrusionLayer.tsx`
- `apps/web/src/v3/builtEnvironment/layers/index.ts`
- `apps/web/src/v3/observe/ObserveLayout.tsx`
- `apps/web/src/v3/observe/components/draw/AdoptBasemapBuildingTool.tsx`
- `apps/web/src/v3/plan/canvas/VisionLayoutCanvas.tsx`
- `apps/web/src/v3/plan/canvas/elementHeights.ts`
