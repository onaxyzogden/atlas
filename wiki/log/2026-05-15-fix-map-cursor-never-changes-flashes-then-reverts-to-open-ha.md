# 2026-05-15 — fix(map): cursor never changes / "flashes then reverts to open hand"


**Bug.** Map cursor permanently the MapLibre open-hand `grab` on every
stage/basemap; after a partial fix it would flash the right shape then
revert to the open hand while drawing a feature.

**Two root causes (both in the single source of truth
`apps/web/src/v3/plan/canvas/useMapCursor.ts`):**
1. Hover was probed only in `select` mode, so in the default `pan` mode
   `compute()` could never return `pointer` — the "clickable feature"
   affordance was dead by construction on every stage. Fix: probe hover
   when `!drawArmed && !externalHovering`; pan branch returns `pointer`
   when hovering an interactive feature and not dragging.
2. `useMapCursor` only re-applied its `cursor:…!important` on map
   `mousemove` (+down/up). mapbox-gl-draw and the Observe draw/drag
   tools (AdoptBasemapBuildingTool, SunWindWedgeTool,
   AnnotationDragHandler, AnnotationSectorHandles, useDimensionDrawTool)
   write `canvas.style.cursor = ''` on click/dblclick/mouseup/keydown/
   cleanup — events with no following `mousemove`. `= ''` strips the
   `!important` declaration → canvas inherits the container `grab` and
   stays there. Fix: a `MutationObserver` on the canvas `style`
   attribute re-asserts the computed cursor after any external clobber,
   with an equality guard so our own write is a no-op (no feedback loop).

**Verification.** `pnpm --filter web typecheck` exit 0. Live in Observe
(`/v3/project/mtc/observe`): pan rest = `grab !important`; arm
Watercourse draw = `crosshair !important`; simulated draw-tool `= ''`
clobber reverts to container `grab`; observer restores
`crosshair !important` within ~80 ms; bare `move` write likewise
re-asserted. No cursor/MutationObserver/recursion console errors.

**Deferred.** ~30 ad-hoc `map.getCanvas().style.cursor = …` writers in
PlanDataLayers/PlanScheduledMovesOverlay and the draw/drag tools are now
redundant (the observer makes `useMapCursor` authoritative). Left in
place — out of scope; harmless. See ADR
`decisions/2026-05-15-atlas-map-cursor-authoritative.md`.
