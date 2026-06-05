# 2026-05-06 — OBSERVE selection floater + drag-reposition + vertex edit + zundo global undo


**Trigger.** Close the four items deferred from the same-day OBSERVE Edit/Delete ADR: SelectionFloater action bar, point drag-reposition, line/polygon vertex editor via MapboxDraw `direct_select`, and zundo global Cmd-Z across the seven OBSERVE namespace stores. The "carry-over" pass earlier in the day had already shipped `useObserveSelectionStore` + halo layers; this session sat the action bar / drag handler / vertex editor / undo coordinator on top.

### What landed

**1. SelectionFloater.** [apps/web/src/v3/observe/components/SelectionFloater.tsx](apps/web/src/v3/observe/components/SelectionFloater.tsx) — pill-bar above the bottom rail. Edit (one-selection only — opens `useAnnotationFormStore.open({ kind, mode: 'edit', existingId, projectId })`), Delete (loops `selected` → `AnnotationRegistry.removeAnnotation`), Clear (also Esc). Returns null when `selected.length === 0`.

**2. AnnotationDragHandler.** [apps/web/src/v3/observe/components/draw/AnnotationDragHandler.tsx](apps/web/src/v3/observe/components/draw/AnnotationDragHandler.tsx) — activates when one point annotation is selected. `mousedown` → `e.preventDefault()` + `map.dragPan.disable()`; `mousemove` writes a single-feature FC into a dedicated `observe-anno-drag-preview` source styled gold; `mouseup` commits via `writePointPosition(kind, id, position)` from the new geometry registry, then re-enables drag-pan.

**3. annotationGeometryRegistry.** [apps/web/src/v3/observe/components/draw/annotationGeometryRegistry.ts](apps/web/src/v3/observe/components/draw/annotationGeometryRegistry.ts) — POINT_KINDS / LINESTRING_KINDS / POLYGON_KINDS sets + `writePointPosition` / `writeLineString` / `writePolygon` helpers. Centralises the kind→store-action routing because the seven stores are not uniform on point-position field name (most use `position`; soilSample uses `location`; swotTag uses optional `position`). `writeLineString` recomputes `lengthM` via `turf.length` for accessRoad records.

**4. AnnotationVertexEditHandler.** [apps/web/src/v3/observe/components/draw/AnnotationVertexEditHandler.tsx](apps/web/src/v3/observe/components/draw/AnnotationVertexEditHandler.tsx) — activates when one line/polygon annotation is selected and no `observe.*` placement tool is active (gated via `useMapToolStore.activeTool` to avoid two-MapboxDraw collisions). Spins up a dedicated headless MapboxDraw, loads the feature via `draw.add(...)`, switches to `direct_select` (cast through `(draw.changeMode as ...)` because the typings are loose), and dispatches `draw.update` events back through `writeLineString` / `writePolygon`. Esc clears.

**5. zundo wraps the seven OBSERVE namespace stores.** `pnpm add zundo --filter @ogden/web` (corepack pnpm shim was broken on this machine; invoked the cached pnpm `~/AppData/Local/pnpm/.tools/pnpm/10.32.1/bin/pnpm` directly). Each of [humanContextStore](apps/web/src/store/humanContextStore.ts), [topographyStore](apps/web/src/store/topographyStore.ts), [externalForcesStore](apps/web/src/store/externalForcesStore.ts), [waterSystemsStore](apps/web/src/store/waterSystemsStore.ts), [ecologyStore](apps/web/src/store/ecologyStore.ts), [swotStore](apps/web/src/store/swotStore.ts), and [soilSampleStore](apps/web/src/store/soilSampleStore.ts) now reads `persist(temporal(creator, { limit: 200 }), persistOpts)` — the order matters so the undo timeline is in-memory only while every forward action still hits localStorage.

**6. undoCoordinatorStore.** [apps/web/src/store/undoCoordinatorStore.ts](apps/web/src/store/undoCoordinatorStore.ts) — global cross-store timeline. `setupUndoCoordinator()` (module-eval side effect, SSR-guarded) waits for each store's `persist.onFinishHydration`, calls `temporal.getState().clear()` so rehydration churn is not logged, then attaches `temporal.subscribe()`. The subscriber compares `pastStates.length` between snapshots — an increase means either a forward mutation OR a coordinator-driven redo. The coordinator's `inFlight` flag (set for the duration of `temporal.undo()` / `temporal.redo()` calls) lets the subscriber skip its push when the coordinator has already updated `history` / `redoHistory` itself. A forward mutation between an undo and a redo invalidates the redo timeline (`pushMutation` clears `redoHistory`).

**7. useGlobalAnnotationUndo.** [apps/web/src/v3/observe/hooks/useGlobalAnnotationUndo.ts](apps/web/src/v3/observe/hooks/useGlobalAnnotationUndo.ts) — Cmd/Ctrl-Z → undo, Cmd/Ctrl-Shift-Z → redo, Cmd/Ctrl-Y → redo (Windows convention). Skips when `event.target` is INPUT / TEXTAREA / SELECT or `isContentEditable`, so typing inside the slide-up form's fields keeps using the browser's native undo. Mounted once from [ObserveLayout](apps/web/src/v3/observe/ObserveLayout.tsx).

**8. Mounts in ObserveLayout.** Inside `<DiagnoseMap>` render-prop, after `<ObserveDrawHost>`: `<AnnotationDragHandler map={map} />`, `<AnnotationVertexEditHandler map={map} />`, `<SelectionFloater projectId={params.projectId ?? null} />`. Hook call `useGlobalAnnotationUndo();` after the slide-up state.

### Verification

- `NODE_OPTIONS="--max-old-space-size=8192" npx tsc --noEmit` clean (exit 0).
- `npx vite build` clean — ✓ built in 34.95s, 626 PWA precache entries (25,443.67 KiB), no errors.
- `npx vitest run src/store/__tests__/temporal-undo.test.ts` — **4 tests pass**: humanContext add → undo → redo, humanContext three-add LIFO undo, swot add → update → undo (title revert) → undo (record gone) → redo, soilSample add → delete → undo restores. Test file uses `// @vitest-environment happy-dom` so zustand `persist.rehydrate()` finds a real localStorage at module-load time.
- Pre-existing test failures unchanged: 24 failures across 5 unrelated files (computeScores 7, useAssessment 3, useSiteIntelligenceMetrics 5, DiagnoseCategoryDrawer 5, V3LifecycleSidebar plus a few). Verified pre-existing by `git stash` → vitest → `git stash pop` on commit `20d7b6b` — failure count and file set unchanged.

**ADR.** [`wiki/decisions/2026-05-06-atlas-observe-selection-drag-undo.md`](decisions/2026-05-06-atlas-observe-selection-drag-undo.md).

### Deferred

- Multi-store batch-edit form (Edit stays disabled when length > 1).
- Touch-first drag affordances for mobile (desktop pointer events only).
- Per-store vitest specs for the remaining four stores (topography, externalForces, waterSystems, ecology) — the three representative specs prove the uniform `persist(temporal(...))` pattern.

### Recommended next session

- Manual preview pass at `/v3/project/<id>/observe` exercising drag, vertex edit, multi-select, and Cmd-Z across kinds.
- Or pick up Plan-stage tool palette now that the OBSERVE edit loop is closed.
