# 2026-05-21 — Observe vertex edit + click-to-delete

**Branch.** `feat/atlas-permaculture`. Two commits — round 1 `14db482f`
(vertex-edit entry), round 2 `bcd5e0ad` (click-to-delete vertex). ADR:
[2026-05-21 vertex edit + click-delete](../decisions/2026-05-21-atlas-observe-vertex-edit-and-click-delete.md).

**The gap.** Drawn Observe annotations (polygon kinds like Conventional
Crop, Pasture, Vegetation, Hazard; linestring kinds like Access Road,
Contour Line) could be repositioned via drag and re-shaped from scratch
via redraw, but a steward returning to a saved feature had no way to
nudge an individual vertex without deleting and re-drawing the whole
thing. Click-to-delete was the natural refinement gesture on top — a
stray vertex should disappear in one click, not via "drag onto a
neighbour to collapse."

**What changed — round 1 (vertex-edit entry).**

- [apps/web/src/v3/observe/components/AnnotationDetailPanel.tsx](../../apps/web/src/v3/observe/components/AnnotationDetailPanel.tsx):
  Added an **Edit vertices** button (lucide `Move` icon) to the detail
  panel footer, gated on `POLYGON_KINDS.has(kind) ||
  LINESTRING_KINDS.has(kind)`. Handler calls
  `observeSelectionStore.set([{ kind, id }])` + `setMoveMode(true)`,
  then dismisses the panel via `closeStore()` (NOT the local `close`
  wrapper, which also clears the selection — we want the selection to
  carry into vertex-edit). Point-kind annotations and sector arcs are
  excluded — sector has its own `AnnotationSectorHandles`, points have
  no vertices.
- [apps/web/src/v3/observe/components/draw/annotationGeometryRegistry.ts](../../apps/web/src/v3/observe/components/draw/annotationGeometryRegistry.ts):
  Registered `conventionalCrop` and `pasture` in `POLYGON_KINDS` and
  added their `readPolygon` + `writePolygon` cases routing through
  `useConventionalCropStore.updateConventionalCrop({ geometry })` and
  `usePastureStore.updatePasture({ geometry })`. Existing
  `SharedVertexEditHandler` + `AnnotationVertexEditHandler` pipeline
  picked up the new kinds with zero handler changes.

**What changed — round 2 (click-to-delete).**

- NEW [apps/web/src/v3/builtEnvironment/handlers/clickDeleteDirectSelect.ts](../../apps/web/src/v3/builtEnvironment/handlers/clickDeleteDirectSelect.ts):
  Custom MapboxDraw mode that spreads `MapboxDraw.modes.direct_select`
  and overrides four lifecycle methods. `onMouseDown` stashes the
  screen-point of the cursor; `onVertex` captures the `coord_path` of
  the vertex the gesture landed on; `onMidpoint` clears that capture
  (midpoint click *adds* a vertex — stock behaviour, must not delete
  the newly-added vertex); `onMouseUp` arbitrates click-vs-drag via
  `Math.hypot(dx, dy) > CLICK_PIXEL_THRESHOLD` (4 px). On a true click
  with a vertex captured, calls `feature.removeCoordinate(coordPath)`
  + fires `draw.update` on the public event surface, which
  `SharedVertexEditHandler.onUpdate` already consumes — no persistence
  changes needed.
- Min-vertex guard `canRemoveCoordinate(feature, coordPath)`:
  polygons require `ring.length > 4` before delete (closed-ring,
  triangle = 4 entries; below 4 leaves a degenerate polygon); lines
  require `coords.length > 2`. Silent refusal per user choice — no
  toast.
- [apps/web/src/v3/builtEnvironment/handlers/SharedVertexEditHandler.tsx](../../apps/web/src/v3/builtEnvironment/handlers/SharedVertexEditHandler.tsx):
  Registered the mode on the per-mount `MapboxDraw` instance via
  `modes: { ...MapboxDraw.modes, [CLICK_DELETE_DIRECT_SELECT]: clickDeleteDirectSelect }`,
  and switched `changeMode` from `'direct_select'` to the new mode
  name. Both Plan-stage `PlanVertexEditHandler` and Observe-stage
  `AnnotationVertexEditHandler` compose this handler and inherit the
  behaviour with no further changes.

**Behavioural consequence.**

While in vertex-edit mode on a polygon or line:
- Click a vertex (no drag) → vertex removed; `draw.update` fires;
  owning store patched; layer re-renders; Cmd-Z undoes through the
  store's `temporal()` history.
- Click + drag a vertex → moves the vertex (unchanged).
- Click a midpoint handle → adds a new vertex (unchanged).
- Click a vertex on a triangle / 2-vertex line → nothing (silently
  gated).
- Esc → exits vertex-edit (unchanged).

Drawing a *new* polygon (`draw_polygon` mode) is unaffected — the
custom mode is only mounted during vertex-edit.

**Verification.**

- `pnpm --filter @ogden/web typecheck`: only three pre-existing
  unrelated errors (`StepBoundary.tsx:365`, two `__tests__/HostUnion…`)
  — none in touched files.
- Interactive smoke test was **not run** — API at `localhost:3001` was
  offline (ECONNREFUSED) during this session, blocking login on the
  Vite preview. Flagged transparently per project CLAUDE.md "say so
  rather than assuming success." Next session with a live API should
  walk the plan's smoke checklist (polygon click-delete, line variant,
  triangle min-vertex guard, midpoint-add survival, Ctrl-Z restore).

**Out of scope.**

- Bulk vertex delete (shift-click multiple, then delete) — MapboxDraw's
  selection model is single-vertex by default; multi-select is a much
  larger surface area.
- Toast / hint when min-vertex guard kicks in — user chose silent
  refusal.
- Plain-click delete on point-kind annotations — points have no
  vertices; they reposition by drag (`AnnotationDragHandler`).
- Sector arc handles — `sector` uses `AnnotationSectorHandles`, not
  vertex-edit; intentionally excluded from `canEditVertices`.

**Behavioural memory.** [[feedback-commit-immediately-on-rebased-branches]]
— both slices committed the moment typecheck cleared, before any
external rebase window. [[project-branch-rebase]] — fetched + verified
no divergence prior to commit.

**Smoke walk — deferred (second pass).** A scheduled smoke walk against
a live API was attempted later in the day. Steps 1–3 cleared via
programmatic store seeding (`addConventionalCrop` → `open({kind, id})`
→ click "Edit vertices"); selection store correctly held
`{ moveMode: true, selected: [...] }` with `activeTool: null`. But the
MapboxDraw control never mounted — zero `gl-draw-*` layers, no
`mapbox-gl-draw` sources. Could be (a) the programmatic seed path
bypassing a React subscription the handler depends on, (b) HMR stale
state, or (c) interaction with concurrent uncommitted WIP that
broadened `readPolygon` / `writePolygon` to MultiPolygon for
`vegetation` and `pasture`. The walk was halted to avoid mixing
verification with in-flight work; a follow-up was filed to re-run on
a clean tree (a real draw-then-click flow rather than programmatic
seeding).
