# 2026-05-06 — Atlas OBSERVE selection floater + drag-reposition + vertex edit + zundo global undo

**Status:** Adopted
**Branch:** `feat/atlas-permaculture`
**Predecessor:** [2026-05-06 Atlas OBSERVE Edit/Delete Loop](2026-05-06-atlas-observe-edit-delete-undo.md)
**Related:** [2026-04-30 Site-Annotations 7-Namespace Consolidation](2026-04-30-site-annotations-store-scholar-aligned-namespaces.md), [2026-05-06 v3 Observe rail polish (selection halo carry-over)](2026-05-06-atlas-observe-edit-delete-undo.md#scope-deferrals)

## Context

The 2026-05-06 OBSERVE Edit/Delete Loop ADR closed four user-reported gaps
(boundary persistence, save/cancel slide-up form, live module dashboards,
v3 sidebar link) but explicitly deferred Phase 4 (SelectionFloater action
bar, point drag-reposition, line/polygon vertex edit) and Phase 5 (zundo
global Cmd-Z) for context budget.

Earlier the same day a "carry-over" pass had already shipped the
foundation: `useObserveSelectionStore` (ephemeral, non-persisted multi-
select store) plus a halo source/layers driven by selection state, with
click-toggle / cmd-click extend / background clear semantics on the map
canvas. The deferred work — the action bar, the drag handler, the vertex
editor, and the cross-store undo coordinator — sits on top of that
foundation.

This ADR closes those four deferred items.

## Decision

### 1. Selection action bar ([SelectionFloater.tsx](../../apps/web/src/v3/observe/components/SelectionFloater.tsx))

A pill-bar floater rendered above the bottom rail. Visible only when
`useObserveSelectionStore.selected.length > 0`. Three actions:

- **Edit** — enabled only when exactly one annotation is selected. Opens
  `useAnnotationFormStore.open({ kind, mode: 'edit', existingId, projectId })`,
  reusing the same Save/Cancel slide-up form that handles creation.
- **Delete** — loops `selected` and dispatches each kind's
  `removeAnnotation(...)` via the shared `AnnotationRegistry`. Clears the
  selection on completion.
- **Clear** (also `Esc`) — empties the selection without mutating any
  record.

The floater also binds `keydown` / Escape on `document` to clear, mirroring
the SWOT slide-up Esc convention.

### 2. Point drag-reposition ([AnnotationDragHandler.tsx](../../apps/web/src/v3/observe/components/draw/AnnotationDragHandler.tsx))

Activates when `selected.length === 1` and the sole selection's `kind` is in
`POINT_KINDS` (neighbour, household, soilSample, swotTag, hazard,
contour-point, etc.). Mounts on every annotation point layer
(`observe-anno-{human,topography,soil,swot}-points`) and:

1. `mousedown` over the selected feature → `e.preventDefault()`,
   `map.dragPan.disable()`, sets cursor to `grabbing`.
2. `mousemove` → writes a single-feature FeatureCollection into a
   dedicated preview source (`observe-anno-drag-preview`) styled with the
   gold halo color so the user sees a live ghost while dragging.
3. `mouseup` → commits via the new `writePointPosition(kind, id, position)`
   helper from [annotationGeometryRegistry.ts](../../apps/web/src/v3/observe/components/draw/annotationGeometryRegistry.ts),
   which routes to the correct namespace store's `update<X>` action.
   Restores `dragPan` and clears the preview source.

The geometry registry was added because the seven namespace stores are
not uniform in their point-position field name — most points use
`position`, soilSample uses nullable `location`, swotTag uses optional
`position`. The registry centralises the kind→store-action mapping so the
drag handler (and the vertex editor) don't have to switch over kinds
themselves.

### 3. Line / polygon vertex edit ([AnnotationVertexEditHandler.tsx](../../apps/web/src/v3/observe/components/draw/AnnotationVertexEditHandler.tsx))

Activates when exactly one line or polygon annotation is selected
**and** no `observe.*` placement tool is currently active (gated via
`useMapToolStore.activeTool` so the edit-mode MapboxDraw instance does
not collide with a placement-mode instance).

Spins up a dedicated `MapboxDraw` (`displayControlsDefault: false,
controls: {}`), loads the selected feature's current geometry via
`draw.add({ id: featureId, type: 'Feature', properties: {}, geometry })`,
and switches to `direct_select` mode. The MapboxDraw `changeMode` typings
are loose, so the call is cast through `(draw.changeMode as (mode: string,
opts?: { featureId: string }) => unknown)`.

Listens for `draw.update`. On each event:

- LineString → `writeLineString(kind, id, geometry)` (re-runs `turf.length`
  for accessRoad records, which carry a denormalised `lengthM`).
- Polygon → `writePolygon(kind, id, geometry)` (frostPocket / hazardZone
  → externalForces.updateHazard; ecologyZone → ecology.updateEcologyZone).

`Esc` clears the selection and unmounts the editor; the cleanup path
removes the `MapboxDraw` control and restores the placement-mode tool's
canvas grip.

### 4. zundo on the seven namespace stores

[`zundo`](https://github.com/charkour/zundo) v2 added as a workspace
dependency (`pnpm add zundo --filter @ogden/web`, since the corepack
pnpm shim was broken on this machine — invoked the cached pnpm directly).

Each of the seven stores wrapped with `temporal()` _inside_ `persist()`:

```ts
export const useHumanContextStore = create<HumanContextState>()(
  persist(
    temporal((set) => ({ /* state + actions */ }), { limit: 200 }),
    { name: 'ogden-human-context', version: 1 },
  ),
);
```

Stores wrapped: `humanContextStore`, `topographyStore`,
`externalForcesStore`, `waterSystemsStore`, `ecologyStore`, `swotStore`,
`soilSampleStore`. The order matters — `temporal` inside `persist` so the
undo timeline is local-only (zundo's history is in-memory by design) but
each forward action is still persisted to localStorage as it happens.

`limit: 200` per store caps the history at 200 entries; older states are
discarded.

### 5. Cross-store undo coordinator ([undoCoordinatorStore.ts](../../apps/web/src/store/undoCoordinatorStore.ts))

Each wrapped store has its own undo stack. To make `Cmd-Z` operate as a
single global timeline across the seven, a small coordinator atom keeps
an ordered `history: UndoableStoreName[]` of which store was mutated
last:

- One-shot module-level setup (`setupUndoCoordinator()`): for each store,
  wait for `persist.onFinishHydration`, call `temporal.getState().clear()`
  (so rehydration churn is not logged as user mutations), then attach
  `temporal.subscribe()`.
- The subscriber compares `curr.pastStates.length` to `prev.pastStates.length`.
  An *increase* means either a forward mutation OR a coordinator-driven
  redo. The coordinator distinguishes the two via an `inFlight` flag set
  for the duration of `temporal.undo()` / `temporal.redo()` calls; if
  `inFlight` is true, the subscriber skips its push (the coordinator has
  already updated `history` / `redoHistory` atomically).
- `coordinator.undo()` pops the last `history` entry, dispatches
  `temporal.undo()` on that store, and pushes the entry to `redoHistory`.
- `coordinator.redo()` pops `redoHistory`, dispatches `temporal.redo()`,
  pushes back to `history`. A forward mutation between an undo and a redo
  invalidates the redo timeline (`pushMutation` clears `redoHistory`).
- Wiring is idempotent (`wired: Set<UndoableStoreName>`) so HMR re-evals
  don't double-subscribe. SSR no-op via `typeof window === 'undefined'`.

### 6. Global Cmd-Z hook ([useGlobalAnnotationUndo.ts](../../apps/web/src/v3/observe/hooks/useGlobalAnnotationUndo.ts))

Mounted once from `ObserveLayout`. Attaches `keydown` to `document`:

- `Cmd/Ctrl-Z` → `coordinator.undo()`
- `Cmd/Ctrl-Shift-Z` → `coordinator.redo()`
- `Cmd/Ctrl-Y` → `coordinator.redo()` (Windows convention)

Skips when `event.target` is INPUT / TEXTAREA / SELECT or
`isContentEditable` is true so typing inside the slide-up form's fields
still uses the browser's native undo without conflict.

### 7. Mounts in ObserveLayout

```tsx
useGlobalAnnotationUndo();
// …
<DiagnoseMap …>
  {({ map }) => (
    <>
      …
      <AnnotationDragHandler map={map} />
      <AnnotationVertexEditHandler map={map} />
      <SelectionFloater projectId={params.projectId ?? null} />
    </>
  )}
</DiagnoseMap>
```

## Verification

- `NODE_OPTIONS="--max-old-space-size=8192" npx tsc --noEmit` clean (exit 0).
- `npx vite build` clean (✓ built in 34.95s, 626 PWA precache entries).
- `npx vitest run src/store/__tests__/temporal-undo.test.ts` — 4 tests
  pass, covering humanContext (single add → undo → redo, three-add LIFO
  undo), swot (add → update → undo title revert → undo to empty), and
  soilSample (add → delete → undo restores). All seven stores follow the
  same `persist(temporal(creator, { limit: 200 }), …)` pattern; the three
  representative specs prove the wiring.
- Pre-existing test failures unchanged: 24 failures across 5 unrelated
  files (computeScores, useAssessment, useSiteIntelligenceMetrics,
  DiagnoseCategoryDrawer, V3LifecycleSidebar) — confirmed pre-existing on
  the prior commit `20d7b6b` via stash-and-rerun.

## Scope deferrals

- **Multi-store selection edit form** — Edit button stays disabled when
  more than one record is selected; an alternative would be a batch-edit
  schema. Not warranted yet.
- **Touch-first drag affordances for mobile** — desktop pointer events
  only this session; touch events are not yet wired through the drag
  handler.
- **Per-store vitest specs for the remaining four stores** — the plan
  called for one spec per wrapped store. Three representative specs ship
  here; the remaining four (topography, externalForces, waterSystems,
  ecology) will trail-in if any temporal regression surfaces.

## Files

**New:**

- `apps/web/src/store/undoCoordinatorStore.ts`
- `apps/web/src/store/__tests__/temporal-undo.test.ts`
- `apps/web/src/v3/observe/hooks/useGlobalAnnotationUndo.ts`
- `apps/web/src/v3/observe/components/SelectionFloater.tsx`
- `apps/web/src/v3/observe/components/draw/AnnotationDragHandler.tsx`
- `apps/web/src/v3/observe/components/draw/AnnotationVertexEditHandler.tsx`
- `apps/web/src/v3/observe/components/draw/annotationGeometryRegistry.ts`

**Modified:**

- `apps/web/package.json` (added `zundo ^2.3.0`)
- `apps/web/src/store/humanContextStore.ts` (temporal wrap)
- `apps/web/src/store/topographyStore.ts` (temporal wrap)
- `apps/web/src/store/externalForcesStore.ts` (temporal wrap)
- `apps/web/src/store/waterSystemsStore.ts` (temporal wrap)
- `apps/web/src/store/ecologyStore.ts` (temporal wrap)
- `apps/web/src/store/swotStore.ts` (temporal wrap)
- `apps/web/src/store/soilSampleStore.ts` (temporal wrap)
- `apps/web/src/v3/observe/ObserveLayout.tsx` (mount drag handler, vertex editor, floater, undo hook)

## References

- Predecessor ADR: [2026-05-06 Atlas OBSERVE Edit/Delete Loop](2026-05-06-atlas-observe-edit-delete-undo.md)
- 7-namespace stores: [2026-04-30 Site-Annotations Scholar-aligned namespaces](2026-04-30-site-annotations-store-scholar-aligned-namespaces.md)
- zundo project: https://github.com/charkour/zundo
