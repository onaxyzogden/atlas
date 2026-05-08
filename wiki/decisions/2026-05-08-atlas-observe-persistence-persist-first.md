# Atlas — OBSERVE persist-first refactor: boundary + annotation persistence end-to-end

**Date:** 2026-05-08
**Status:** Adopted
**Scope:** Atlas web (`apps/web/src/v3/observe/**`, `apps/web/src/v3/components/DiagnoseMap.tsx`, `apps/web/src/store/projectStore.ts`)

## Context

A user-drawn parcel boundary and OBSERVE annotations (ecology zones, hazard
zones, neighbour pins, contour lines, soil samples, etc.) were not surviving
browser refresh (F5) or stage-switch (Observe ↔ Plan ↔ Observe) on a real
non-builtin project. Symptoms:

- **Bug A (boundary):** Boundary disappeared from the map after F5 even when
  it was technically in the store.
- **Bug B (annotations):** Polygon vanished immediately after double-click
  to close, no form appeared, and no record was persisted.

The user's directive was unambiguous: *"the drawing and design tools in the
PLAN stage page persist. Let this proposed plan copy that working
function/method."* PLAN's `useDesignElementDrawTool` writes the element
synchronously to its persisted store on `draw.create`, with no form gate;
`<DesignElementLayers>` reads the same store and re-renders. PLAN's pattern
is the reference — OBSERVE drifted into a form-bridge architecture that
introduced a polygon-loss window between MapboxDraw's `deleteAll()` and the
form's save.

This decision captures the multi-addendum debugging arc (ADDENDA 1–7 of the
"hidden truffle" plan) that closed both bugs end-to-end.

## Decision

### 1. `parcelBoundaryGeojson` is persisted directly in localStorage

Stop stripping `parcelBoundaryGeojson` in `projectStore.partialize`; drop the
parallel `geodataCache.put('boundary:<id>', ...)` IndexedDB write; collapse
the two `onFinishHydration` callbacks (boundary-restore-from-IDB + builtin
hydration) into a single `void hydrateBuiltins()`. Parcel FCs are small
(~1–10 KB); the IDB carve-out was over-engineered and introduced a hydration
race against `applyBuiltinsToStore`'s API merge that could overwrite the
user-drawn boundary with the builtin canonical.

Source-of-truth for boundary geometry is now zustand persist → localStorage,
mirroring `designElementsStore`'s working pattern.

### 2. OBSERVE draw tools follow the persist-first pattern

Every OBSERVE draw tool (`NeighbourPin`, `Household`, `AccessRoad`, `FrostPocket`,
`HazardZone`, `ContourLine`, `HighPoint`, `DrainageLine`, `Watercourse`,
`SoilSample`, `EcologyZone`, `SwotTag`) calls
`createWithDefaults(schema, { projectId, geometry })` synchronously inside
the `useMapboxDrawTool.onComplete` callback to write a record with schema
defaults to its namespace store, then opens the form in **edit** mode
(`mode: 'edit', existingId: newId`) for refinement.

The PLAN-pattern guarantee: even if the form bridge silently fails (CSS
z-index, store-write race, user dismissal), the polygon survives because
the namespace-store record was already written and `<ObserveAnnotationLayers>`
re-renders from the store. Cancel keeps the default record.

Implementation: `createWithDefaults` helper in `annotationFieldSchemas.ts`
plus `ctx.newId` plumbing in every schema's `save()` create branch.

### 3. `useMapboxDrawTool.onCreate` reads features from the event payload

H-B1 hardening: switch from `draw.getAll().features[features.length-1]` to
the `e.features[0]` form, which is the documented MapboxDraw contract on
`draw.create`. Defensive `getAll()` fallback retained for mocked harnesses.
Removes ambiguity from stale features lingering in the draw control.

### 4. `<AnnotationFormSlideUp>` always clears the active tool on Save

The post-draw flow is now create-defaults-then-edit-existing, so saving from
edit mode is the normal "finish a fresh draw" exit path. Clearing
`useMapToolStore.setActiveTool(null)` on Save is now unconditional (no-op
for dashboard-initiated edits).

### 5. MapLibre-compatible MapboxDraw styles

`@mapbox/mapbox-gl-draw@1.4.4`'s default styles use older expression forms
that MapLibre's post-1.x style validator rejects (`gl-draw-lines.cold.paint
.line-dasharray[2][0]: Expression name must be a string`). Replace with the
hand-authored `MAPLIBRE_DRAW_STYLES` constant in `mapboxDrawStyles.ts`,
copied from the working legacy surface (`features/map/hooks/useMaplibre.ts`).
Apply at all 6 `MapboxDraw` instantiation sites: `BoundaryTool`, `AreaTool`,
`DistanceTool`, `ElevationTool`, `useMapboxDrawTool`, `AnnotationVertexEditHandler`.

### 6. `DiagnoseMap` boundary effect listens to `styledata`

Render-path-A fix: the previous design attached a one-shot `styledata`
listener for first paint and a separate `style.load` listener for basemap
swaps, but in some F5/setStyle interleavings `style.load` does not fire and
the initial-paint listener has already self-`off`d, leaving app-added layers
wiped without re-entry. Switch to a single `styledata` listener that calls
an idempotent `ensureAndMaybeFit` (guarded by `getSource`/`getLayer` checks);
`fitBounds` runs exactly once per mount/boundary-change so the user's pan is
never stolen.

## Verification

Live end-to-end on the "Testing new 3 phase" non-builtin project at
`http://localhost:5200/v3/project/942bc0a8-8335-44a6-914c-d15e59f0009b/observe`:

| Check | Result |
|---|---|
| Boundary FC in `localStorage["ogden-projects"]` after draw | ✓ pointCount 5, updatedAt now |
| Boundary FC survives F5 in localStorage | ✓ identical bytes, identical updatedAt |
| Gold rectangle visible on map after F5 (post `styledata` fix) | ✓ all 3 layers present (`fill`, `line`, `line-casing`), `styleLoaded: true`, `layerCount: 20` |
| Boundary survives Observe → Plan → Observe stage-switch | ✓ |
| EcologyZone draw → record auto-created with `dominantStage: 'mid'` | ✓ count 6 → 7, geometry persisted |
| EcologyZone survives F5 + stage-switch | ✓ |
| Console — no `gl-draw-lines.cold.paint.line-dasharray` errors | ✓ |
| `corepack pnpm --filter "@ogden/web" typecheck` | ✓ no new errors |

## Files

| Path | Change |
|---|---|
| `apps/web/src/store/projectStore.ts` | Drop IDB carve-out; persist FC in localStorage directly |
| `apps/web/src/v3/components/DiagnoseMap.tsx` | Switch boundary effect to `styledata` listener with one-shot fit |
| `apps/web/src/v3/observe/components/draw/annotationFieldSchemas.ts` | `createWithDefaults` helper + `ctx.newId` plumbing per schema |
| `apps/web/src/v3/observe/components/draw/useMapboxDrawTool.ts` | Read feature from `e.features[0]` |
| `apps/web/src/v3/observe/components/draw/AnnotationFormSlideUp.tsx` | Always clear active tool on Save |
| `apps/web/src/v3/observe/components/draw/AnnotationVertexEditHandler.tsx` | Apply `MAPLIBRE_DRAW_STYLES` |
| `apps/web/src/v3/observe/components/draw/mapboxDrawStyles.ts` | NEW — shared MapLibre-compatible styles |
| `apps/web/src/v3/observe/components/draw/{12 Tool files}.tsx` | Persist-first refactor |
| `apps/web/src/v3/observe/components/measure/{Boundary,Area,Distance,Elevation}Tool.tsx` | Apply `MAPLIBRE_DRAW_STYLES` |

## Out of scope

- `/plan` route crash at `PlanChecklistAside.tsx:148` (`livestock` module
  guidance dictionary missing) — separate task.
- Pre-existing `elementCatalog.ts:32` import-path TS error.
- `ObserveModuleBar` button-in-button `validateDOMNesting` warning.
- `/api/v1/projects/builtins` 500 (dev API endpoint).

## References

- Plan file: `C:\Users\MY OWN AXIS\.claude\plans\develop-a-version-of-hidden-truffle.md`
  (ADDENDA 1–7).
- PLAN reference pattern:
  `apps/web/src/v3/plan/canvas/draw/useDesignElementDrawTool.ts` +
  `apps/web/src/store/designElementsStore.ts` +
  `apps/web/src/v3/plan/canvas/layers/DesignElementLayers.tsx`.
