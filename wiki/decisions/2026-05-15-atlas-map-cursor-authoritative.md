# ADR: `useMapCursor` is the authoritative map-cursor owner

**Date:** 2026-05-15
**Status:** Accepted
**Area:** apps/web — MapLibre map cursor (Observe / Plan / Vision / Diagnose)

## Context

The map cursor never changed — it was permanently MapLibre's open-hand
`grab` on every stage and basemap. Two distinct defects, both isolated to
the shared single-source hook `apps/web/src/v3/plan/canvas/useMapCursor.ts`:

1. **Hover dead in pan mode.** The hover probe ran only when
   `mode === 'select'`. In the default `pan` mode `compute()` could only
   ever yield `grab`/`grabbing`, so the universal "this feature is
   clickable → `pointer`" affordance never fired anywhere.

2. **Clobbered `!important`, no re-assertion.** `useMapCursor` pins
   `canvas.style.setProperty('cursor', c, 'important')` but only re-ran it
   on map `mousemove` (+ canvas `mousedown` / window `mouseup`).
   mapbox-gl-draw and the Observe draw/drag tools
   (`AdoptBasemapBuildingTool`, `SunWindWedgeTool`,
   `AnnotationDragHandler`, `AnnotationSectorHandles`,
   `useDimensionDrawTool`) write `map.getCanvas().style.cursor = ''` (or
   bare values) on click / dblclick / mouseup / keydown / cleanup —
   events with no following `mousemove`. Setting `''` removes the inline
   `!important` declaration entirely, so the canvas falls back to
   MapLibre's container `.maplibregl-canvas-container.maplibregl-interactive
   { cursor: grab }` and stays there until the next mouse move ("flashes
   the correct cursor then reverts to the open hand while drawing").

There are two competing cursor systems: the authoritative
`useMapCursor` (`!important`, mousemove-driven) and ~30 ad-hoc
`map.getCanvas().style.cursor = X` writers (no `!important`,
event-driven) across `PlanDataLayers`, `PlanScheduledMovesOverlay`, and
the draw/drag tools.

## Decision

`useMapCursor` is the single authoritative owner of the canvas cursor.

- Probe hover whenever it can change the outcome (`!drawArmed &&
  !externalHovering`), and in the `pan` branch return `pointer` when
  hovering an interactive feature and not dragging.
- Add a `MutationObserver` on the canvas `style` attribute that re-runs
  `apply()` whenever any external writer changes the cursor away from the
  computed value — independent of which DOM/map event caused it. An
  equality guard (`getPropertyValue('cursor') !== c`) makes the hook's
  own write a no-op for the observer, so there is no feedback loop. The
  observer is disconnected in effect cleanup.

The ~30 ad-hoc writers are left in place: with the observer they are
redundant and harmless. Ripping them out is deferred follow-up, not
required to resolve the bug, and touching feature-specific drag/draw
code is out of scope here.

## Consequences

- **Positive:** Cursor is correct and immediate on every stage/basemap
  and survives draw-tool / drag-handler / mapbox-gl-draw cursor writes.
  One owner; new call sites need no per-layer cursor wiring.
- **Trade-off:** While a draw tool is armed the observer re-asserts
  `crosshair` over any cursor the draw lib sets (e.g. mapbox-gl-draw
  vertex `move`/`pointer`) — consistent with the hook's documented
  top-priority `drawArmed → crosshair` rule and its prior mousemove
  behaviour. Brief hover affordances like `AnnotationSectorHandles`
  `move` are similarly overridden; acceptable versus a stuck cursor.
- **Follow-up (deferred):** Remove or convert the ~30 redundant ad-hoc
  `map.getCanvas().style.cursor` writers so the codebase has exactly one
  cursor authority.

## Verification

`pnpm --filter web typecheck` exit 0. Live on
`/v3/project/mtc/observe`: pan rest `grab !important`; arm Watercourse
draw `crosshair !important`; simulated draw-tool `= ''` clobber reverts
to container `grab`; observer restores `crosshair !important` within
~80 ms; bare `move` write likewise re-asserted. No cursor /
MutationObserver / recursion console errors.
