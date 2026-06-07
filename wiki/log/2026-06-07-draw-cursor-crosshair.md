# 2026-06-07 — Draw tools show a crosshair, not a grab hand (MapLibre)

**Closed.** Operator: "drawing tool must be a crosshair and not a hand."
Activating any map drawing tool (fence line, paddock, zone, crop area,
boundary, measure-area, etc.) showed MapLibre's default **grab "hand"** cursor
instead of a **crosshair**, so it was not obvious the map had entered a
click-to-place drawing state.

## Root cause — MapLibre vs mapbox-gl-draw cursor mismatch

The app renders with **MapLibre GL** (DOM classes `.maplibregl-*`), but
`@mapbox/mapbox-gl-draw` (v1.5.1) ships its draw-cursor CSS keyed on the
**`.mapboxgl-*`** prefix (e.g. `.mapboxgl-map.mouse-add
.mapboxgl-canvas-container.mapboxgl-interactive { cursor: crosshair }`). Under
MapLibre those selectors never match, and the library's draw CSS is not imported
in `apps/web/src` anyway. So the only cursor in effect during a draw was
MapLibre's own `.maplibregl-canvas-container.maplibregl-interactive { cursor:
grab }` — the hand.

A CSS fix keyed on the library's `mode-<name>` **container** classes was tried
first and **rejected after a runtime DOM probe**: mapbox-gl-draw *queues* its
`mode-*`/`mouse-*` classes and only flushes them inside its **render** handler,
which under MapLibre does not fire until the first mouse-move. So with a tool
freshly activated and the pointer still, no `mode-*` class is present on
`.maplibregl-map` at all (confirmed live: an active `draw_polygon` tool with
`data-active="true"` produced zero `mode-*` classes and a `grab` cursor). A CSS
rule keyed on those classes therefore cannot hold the crosshair from mode-start.

## Fix — direct canvas cursor (WizardDrawRectangleTool precedent)

Set `map.getCanvas().style.cursor = 'crosshair'` for the whole draw session and
restore the previous value on teardown — the exact pattern
`WizardDrawRectangleTool` already uses successfully under MapLibre (inline style
beats the `.maplibregl-interactive` CSS). Applied at the **three direct MapboxDraw
mount sites** (commit `142e5dbe`, `feat/structured-capture-forms` [switched
out-of-band], **not pushed**):

- **`useMapboxDrawTool.ts`** — covers every hook-based tool (all dedicated Plan
  line/polygon/point tools, Observe draw, Wizard polygon, snap variants). Cursor
  set after `addControl`, restored in the teardown try-block.
- **`AreaTool.tsx`** — direct MapboxDraw `draw_polygon`; always crosshair.
- **`BoundaryTool.tsx`** — crosshair **only** when drawing a fresh boundary
  (`draw_polygon`). When seeded with an existing parcel it opens in
  `direct_select` (vertex editing), which intentionally keeps the default
  move/grab cursor (`drawingFresh` guard).

The earlier (uncommitted) CSS rule in `apps/web/src/app/index.css` was removed;
its removal netted a zero diff since it had never been committed.

## Verification

- `tsc --noEmit` (apps/web, 8 GB heap) — clean, exit 0.
- Bounded vitest (`--pool=forks --testTimeout=20000`) over draw + measure —
  **20/20** green (no cursor-specific tests; regression guard).
- **Live DOM proof** on the mounted map (fresh reload, no HMR residue): idle =
  inline `(empty)` / computed `grab`; active draw tool = inline + computed
  `crosshair`; toggled off = clean restore to `grab`.

direct_select / vertex-edit cursors and the idle map are unchanged. No push;
foreign WIP and prior uncommitted wiki edits left untouched.

Entity: [[entities/act-tier-shell]] (draw tooling).
