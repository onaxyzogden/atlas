# 2026-05-08 — Atlas OBSERVE persist-first refactor: boundary + annotation persistence end-to-end


### Completed

Closed Bugs A (boundary disappears on F5/stage-switch) and B (OBSERVE
annotation polygon vanishes on double-click, no form, no record), plus a
newly-discovered render-path-A bug (boundary FC persisting in
localStorage but not painting on the map after F5 due to a `style.load`
event-timing race).

User directive: *"the drawing and design tools in the PLAN stage page
persist. Let this proposed plan copy that working function/method."*
PLAN's `useDesignElementDrawTool` writes to its persisted store
synchronously on `draw.create` with no form gate — that is the reference
pattern OBSERVE now follows.

Decision points (full ADR:
[`wiki/decisions/2026-05-08-atlas-observe-persistence-persist-first.md`](decisions/2026-05-08-atlas-observe-persistence-persist-first.md)):

1. **`parcelBoundaryGeojson` persisted directly in localStorage.**
   Dropped `partialize` strip + IDB carve-out + `restoreBoundariesFromIdb`
   in `projectStore.ts`; collapsed dual `onFinishHydration` callbacks into
   a single `void hydrateBuiltins()`. Eliminates the API-merge-vs-IDB-restore
   hydration race.
2. **OBSERVE persist-first via `createWithDefaults`.** All 12 draw tools
   (NeighbourPin, Household, AccessRoad, FrostPocket, HazardZone,
   ContourLine, HighPoint, DrainageLine, Watercourse, SoilSample,
   EcologyZone, SwotTag) call `createWithDefaults(schema, { projectId,
   geometry })` synchronously inside `useMapboxDrawTool.onComplete`, then
   open the form in **edit** mode. Polygon survives even if the form bridge
   silently fails.
3. **`useMapboxDrawTool.onCreate` reads from `e.features[0]`** (H-B1
   hardening). Documented MapboxDraw contract; `getAll()` retained as
   defensive fallback for mocked harnesses.
4. **`AnnotationFormSlideUp` always clears active tool on Save.** Post-draw
   flow is now create-defaults-then-edit-existing, so saving from edit
   mode is the normal "finish a fresh draw" exit path.
5. **`MAPLIBRE_DRAW_STYLES`** — new shared module replacing
   mapbox-gl-draw 1.4.4's defaults that fail MapLibre's post-1.x style
   validator (`gl-draw-lines.cold.paint.line-dasharray[2][0]`). Applied at
   all 6 `MapboxDraw` instantiation sites.
6. **`DiagnoseMap` boundary effect listens to `styledata`** with idempotent
   `ensureAndMaybeFit` and a one-shot `didInitialFit` guard. Replaces the
   one-shot styledata + style.load pair that left app-added layers wiped
   when style.load failed to fire on F5/setStyle interleavings.

### Verification

Live end-to-end on the "Testing new 3 phase" non-builtin project at
`http://localhost:5200/v3/project/942bc0a8-8335-44a6-914c-d15e59f0009b/observe`:
boundary FC in `localStorage["ogden-projects"]` after draw ✓, survives F5 ✓,
gold rectangle visible after F5 with all 3 layers (`fill`, `line`,
`line-casing`) and `layerCount: 20` ✓, survives Observe ↔ Plan ↔ Observe ✓,
EcologyZone draw auto-creates record with `dominantStage: 'mid'` ✓,
EcologyZone survives F5 + stage-switch ✓, no
`gl-draw-lines.cold.paint.line-dasharray` console errors ✓,
`pnpm --filter "@ogden/web" typecheck` introduces no new errors ✓.

### Files

`apps/web/src/store/projectStore.ts`,
`apps/web/src/v3/components/DiagnoseMap.tsx`,
`apps/web/src/v3/observe/components/draw/{annotationFieldSchemas,useMapboxDrawTool,AnnotationFormSlideUp,AnnotationVertexEditHandler}.{ts,tsx}`,
12 OBSERVE `*Tool.tsx` files, 4 measure tools (Boundary/Area/Distance/Elevation),
new `mapboxDrawStyles.ts`.

### Deferred

- `/plan` route crash at `PlanChecklistAside.tsx:148` (`livestock` module
  guidance dictionary missing) — separate task.
- Pre-existing `elementCatalog.ts:32` import-path TS error.
- `ObserveModuleBar` button-in-button `validateDOMNesting` warning.
- `/api/v1/projects/builtins` 500 (dev API endpoint).
- Migrating IDB-stored boundary blobs from existing user installs
  (acceptable one-time loss for this dev-mode pre-launch product).

### Recommended next session

- Fix the `/plan` route crash by adding a `livestock` entry to the Plan
  module guidance dictionary (`PlanChecklistAside.tsx:148`).
