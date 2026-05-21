# 2026-05-21 — Observe annotations gain vertex edit + click-to-delete

**Status.** Decided + shipped (`14db482f`, `bcd5e0ad`).

## Context

Drawn Observe annotations supported drag-to-move (whole-feature) and
delete-and-redraw, but not per-vertex refinement after the initial
draw. Two natural follow-ups: (1) expose vertex handles on saved
features, (2) allow click-on-vertex to remove it.

## Decisions

1. **Vertex-edit entry is a button in the detail panel**, not a
   per-tool mode or a long-press gesture. The detail panel is where
   a steward lands when they re-engage a saved feature, so the
   refinement gesture lives where the intent surfaces.

2. **All geometry-bearing annotations gain the affordance** —
   polygon kinds (Conventional Crop, Pasture, Vegetation, Hazard,
   …) and linestring kinds (Access Road, Contour Line, …). Point
   kinds and sector arcs are excluded — points have no vertices,
   sector has its own arc handles.

3. **Click-to-delete is gated by a pixel-delta heuristic**, not by
   MapboxDraw's `state.dragMoving` flag. Threshold = 4 px between
   mousedown and mouseup screen-point. Below threshold = click =
   delete; above = drag = stock move behaviour. `state.dragMoving`
   was rejected because it flips true on sub-pixel pointer jitter,
   which would convert a sloppy click into a no-op delete.

4. **Min-vertex refusal is silent.** No toast, no flash, no
   announcement. Polygon ring must have > 4 entries (triangle is
   4 with closing vertex) before a delete is allowed; line must
   have > 2 coordinates. Below those, the click does nothing.

5. **The custom mode lives next to `SharedVertexEditHandler`**, not
   inside MapboxDraw's mode registry globally. It is mounted on
   the per-mount `MapboxDraw` instance created inside the handler;
   non-vertex-edit flows (drawing a fresh polygon) still use stock
   `draw_polygon`. Scope of behavioural change = vertex-edit mode
   only.

6. **Persistence reuses `draw.update`**, not a new event or a
   direct store call from the mode. After `feature.removeCoordinate`,
   the mode fires `this.map.fire('draw.update', { features:
   [feature.toGeoJSON()] })` through the public event surface — the
   same path stock vertex drag uses — so
   `SharedVertexEditHandler.onUpdate` patches the owning store
   without code changes there.

## Alternatives considered

- **Right-click delete vertex**: discoverable on desktop but absent
  on touch; click-on-vertex is uniform across both.
- **Delete button in a per-vertex floating menu**: more chrome,
  more state, larger surface area for visual regressions; click
  gesture wins on simplicity.
- **Use `feature.changeCoordinates` to rewrite the full ring** in
  the mode: equivalent in outcome but `removeCoordinate(path)` is
  the documented MapboxDraw idiom and keeps the diff narrow.
- **Wheel/keyboard navigation between vertices**: out of scope;
  accessibility pass will revisit.

## Consequences

- Plan-stage `PlanVertexEditHandler` inherits click-delete for
  zones / paddocks / crops with no additional wiring, because it
  composes `SharedVertexEditHandler`.
- Future polygon kinds need only register `read*`/`write*` cases
  in `annotationGeometryRegistry` to get the full vertex-edit +
  click-delete affordance.
- Cmd-Z restores deleted vertices through the store's `temporal()`
  middleware — the deletion is a normal `update*({ geometry })`
  call from the existing `draw.update` path.

## Out of scope

Bulk vertex delete; toast on min-vertex refusal; plain-click delete
on points; sector arc click-delete; keyboard / touch-long-press
alternative gestures.
