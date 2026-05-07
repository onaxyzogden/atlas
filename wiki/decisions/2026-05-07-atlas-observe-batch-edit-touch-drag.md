# 2026-05-07 — Atlas OBSERVE touch-first drag + multi-item batch edit + per-store undo specs

**Status:** Adopted
**Branch:** `feat/atlas-permaculture`
**Predecessor:** [2026-05-06 Atlas OBSERVE Selection Floater + Drag-Reposition + Vertex Edit + zundo Global Undo](2026-05-06-atlas-observe-selection-drag-undo.md)
**Related:** [2026-05-06 Atlas OBSERVE Edit/Delete Loop](2026-05-06-atlas-observe-edit-delete-undo.md), [2026-04-30 Site-Annotations 7-Namespace Consolidation](2026-04-30-site-annotations-store-scholar-aligned-namespaces.md)

## Context

The 2026-05-06 selection / drag / vertex-edit / zundo ADR closed Phases E–H of
the earlier plan and explicitly deferred three follow-up items to keep the
commit focused:

1. **Per-store vitest specs** — the temporal middleware was only verified
   on three of the seven OBSERVE namespace stores (humanContext, swot,
   soilSample). Each store has its own update-path shape, so per-store
   coverage will catch any temporal regression that hits a specific
   store's mutation surface.
2. **Touch-first drag** — `AnnotationDragHandler.tsx` registered
   `mousedown`/`mousemove`/`mouseup` only. On a touchscreen MapLibre fires
   `touchstart`/`touchmove`/`touchend` instead, so drag-reposition was
   desktop-only. Mobile stewards could long-press to select but could not
   drag.
3. **Multi-item batch edit** — `SelectionFloater.tsx` disabled Edit
   unless `selected.length === 1`. With three SoilSamples shift-selected
   the only batch operation was Delete; bulk edits required opening each
   record one at a time.

This ADR closes those three items.

## Decision

### 1. Per-store vitest specs ([temporal-undo.test.ts](../../apps/web/src/store/__tests__/temporal-undo.test.ts))

Four new `describe` blocks extend the existing test file (now 14 tests
total under `// @vitest-environment happy-dom`):

- **topography** — `addContour` → undo → empty; `addHighPoint` then
  `updateHighPoint(id, { label: 'Knoll' })` → undo reverts the title;
  `addDrainageLine` then `removeDrainageLine` → undo restores.
- **externalForces** — `addHazard` (`severity: 'med'`) then
  `updateHazard(id, { severity: 'high' })` → undo reverts severity;
  `addSector` → undo → empty.
- **waterSystems** — `addEarthwork` (LineString + `lengthM`) then
  `removeEarthwork` → undo restores; `addStorageInfra` (`center`,
  `capacityL: 2000`) then `updateStorageInfra(id, { capacityL: 5000 })` →
  undo reverts capacity; `addWatercourse` → undo → empty.
- **ecology** — `addObservation` then `updateObservation(id, { notes: …})` →
  undo reverts notes; `addEcologyZone` (Polygon) → undo → empty.

Each block uses `useStore.setState({ … })` in `beforeEach` to reset state,
followed by the same `clearTemporal()` helper used by the original three
specs. The cross-store coverage now stands at 14 tests (humanContext 2,
swot 1, soilSample 1, topography 3, externalForces 2, waterSystems 3,
ecology 2).

### 2. Touch-first drag ([AnnotationDragHandler.tsx](../../apps/web/src/v3/observe/components/draw/AnnotationDragHandler.tsx))

The mouse-only handlers were generalised into pointer-agnostic functions:

- **`onLayerPointerDown(e: MapMouseEvent | MapTouchEvent)`** — gates touch
  events by `e.originalEvent.touches.length === 1` so two-finger
  pinch-zoom never engages drag. Records the screen-space start position
  and arms the gesture; does not yet preventDefault or disable dragPan
  (so a pure tap still falls through to the click handler that owns
  selection).
- **`onPointerMove(e)`** — promotes from "armed" to "dragging" only after
  the pointer travels past `DRAG_MOVE_THRESHOLD_PX = 4` (squared
  distance compare, no sqrt). Crossing the threshold calls
  `engageDrag(e)`, which `e.preventDefault()`s, disables `dragPan`, and
  for touch events also calls `map.touchZoomRotate.disableRotation()` so
  finger drift can't double as a rotate-pinch.
- **`onPointerUp(e)`** — re-enables `dragPan` and `touchZoomRotate`,
  clears the preview, and only commits via `writePointPosition` if the
  drag actually crossed the threshold (`wasDragging === true`). A tap
  with no movement bails without writing.

Both event names are wired on every `POINT_LAYER_IDS` entry
(`mousedown` + `touchstart`) and on the global map (`mousemove` +
`touchmove`, `mouseup` + `touchend`). Cleanup mirrors the wire-up.

The fallback path called out in the plan (global `touchstart` +
`map.queryRenderedFeatures`) was not needed — MapLibre's per-layer
`touchstart` event populates `e.features` the same way `mousedown` does,
verified against the maplibre-gl `MapTouchEvent` typing.

### 3. Multi-item batch edit

Three coordinated edits land batch edit through the existing form host:

#### 3a. annotationFormStore Active shape ([annotationFormStore.ts](../../apps/web/src/store/annotationFormStore.ts))

`AnnotationFormActive.mode` widens from `'create' | 'edit'` to
`'create' | 'edit' | 'edit-batch'`. Single-item edit continues to use
`existingId: string`; batch edit uses `existingIds: string[]` (two or
more ids of the **same** kind).

#### 3b. AnnotationFormSlideUp ([AnnotationFormSlideUp.tsx](../../apps/web/src/v3/observe/components/draw/AnnotationFormSlideUp.tsx))

- Computes a `seedId = active.existingIds?.[0] ?? active.existingId` and
  passes it through to `FormBody`, which seeds values from
  `schema.loadDefaults(seedId, '')` for both `'edit'` and `'edit-batch'`.
- On Save, when `mode === 'edit-batch'`, loops the schema's `save()` once
  per id with the same `values`. Each call dispatches the kind's
  `update<X>(id, patch)` from inside the schema. Single-item save path is
  unchanged.
- Eyebrow renders `Edit ${n} ${KIND_LABEL}s` (lowercased label, naïve `s`
  suffix for plural — sufficient for the OBSERVE kind labels which are
  English nouns) when batch, otherwise the existing
  `'Edit annotation'` / `'New annotation'` / `S · SWOT tag` text.

#### 3c. SelectionFloater Edit gate ([SelectionFloater.tsx](../../apps/web/src/v3/observe/components/SelectionFloater.tsx))

The `disabled={!single || !projectId}` gate widens to enable Edit when
`selected.length > 1` **and** every item shares the first item's `kind`
(via `selected.every((s) => s.kind === first.kind)`). The button's
`title` attribute reads:

- `'Select a project to edit'` when `projectId === null`
- `'Edit selected'` for single-item
- `'Edit ${n} items together'` for same-kind batch
- `'Select items of one kind to edit together'` for mixed-kind selection

`onEdit` branches: a single-item selection opens the form in `mode:
'edit'`; a same-kind batch opens it in `mode: 'edit-batch'` with
`existingIds: selected.map((s) => s.id)`.

### 4. v1 undo behaviour for batch edits

A batch edit of N items records N entries in the relevant store's
zundo `pastStates` (one per `update<X>` call). Cmd-Z therefore reverts
the LAST item, then the previous, etc. — a steward who saved a 3-item
batch must press Cmd-Z three times to fully undo.

Future refinement (deferred): wrap the batch-save loop in
`temporal.pause()` / `temporal.resume()` so the whole batch lands as one
undo entry. Skipped this turn because the primary use is bulk-notes
edits where N-step undo is acceptable.

## Verification

- `NODE_OPTIONS="--max-old-space-size=8192" npx tsc --noEmit` clean (exit 0).
- `npx vite build` clean (✓ built in 29.37s, 626 PWA precache entries).
- `npx vitest run src/store/__tests__/temporal-undo.test.ts` — 14 tests
  pass (4 new test cases on top of yesterday's 4; 10 new test bodies
  spanning topography / externalForces / waterSystems / ecology, plus
  the 4 representative ones from yesterday's specs unchanged).
- Pre-existing test failures unchanged: 24 failures across 5 unrelated
  files (computeScores, useAssessment, useSiteIntelligenceMetrics,
  DiagnoseCategoryDrawer, V3LifecycleSidebar) — confirmed pre-existing
  on commit `852515c` via the prior session's stash-and-rerun.

## Scope deferrals

- **Single-undo for batch edits** — N undo entries today; will require
  `temporal.pause()`/`resume()` framing in `AnnotationFormSlideUp.onSave`
  when the batch path runs.
- **"(Mixed)" indicator** — when batch-selected items differ on a field
  (e.g. one SoilSample has `notes: 'a'`, another has `notes: 'b'`), the
  form prefills from the first item's value. A future indicator could
  surface the divergence so the steward knows the save will overwrite
  both.
- **Touch path for line/polygon vertex edit** — `AnnotationVertexEditHandler`
  uses MapboxDraw's built-in touch handling, which already supports
  finger drags on vertices; no edit needed this turn. Verified by code
  review only (no manual mobile preview).

## Files

**Modified:**

- `apps/web/src/store/__tests__/temporal-undo.test.ts` (4 new describe blocks, 10 new tests)
- `apps/web/src/v3/observe/components/draw/AnnotationDragHandler.tsx` (touch + mouse, 4-px threshold, single-finger gate, touchZoomRotate suspension)
- `apps/web/src/store/annotationFormStore.ts` (`'edit-batch'` mode, `existingIds?: string[]`)
- `apps/web/src/v3/observe/components/draw/AnnotationFormSlideUp.tsx` (batch save loop, eyebrow override, seed-from-first-id)
- `apps/web/src/v3/observe/components/SelectionFloater.tsx` (same-kind multi-select Edit gate)

## References

- Predecessor ADR: [2026-05-06 Atlas OBSERVE Selection Floater + Drag-Reposition + Vertex Edit + zundo Global Undo](2026-05-06-atlas-observe-selection-drag-undo.md)
- 7-namespace stores: [2026-04-30 Site-Annotations Scholar-aligned namespaces](2026-04-30-site-annotations-store-scholar-aligned-namespaces.md)
- zundo project: https://github.com/charkour/zundo
