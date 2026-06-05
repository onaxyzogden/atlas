# 2026-05-14 — Freehand / Dimensions toggle across Plan + Observe annotation tools


Plan-side parametric draw primitives (`dimensionDrawStore`,
`useDimensionDrawTool`, `DimensionPanel`, `dimensionGeometry`) extended
to the 14 Observe annotation tools that produce a polygon or linestring.
Each tool now mounts `<DimensionPanel allowedShapes={...} />` inside its
popover, gates its existing `useMapboxDrawTool` on
`enabled: dimMode === 'freehand'`, and adds a parallel
`useDimensionDrawTool` for the dimensions path. Observe coverage: 6
polygon tools (Building, Septic, Pasture, FrostPocket, HazardZone,
EcologyZone) get Rect/Circle; 8 linestring tools (Fence, PowerLine,
BuriedUtility, AccessRoad, ContourLine, DrainageLine, Watercourse,
ExistingDriveway) get a single Line shape. The 7 point tools are
intentionally untouched.

Plan-side wiring (11 opting tools + the four new primitive files) was
also committed in this change — all of it had been built earlier but
remained uncommitted across the session boundary.

`tsc --noEmit` clean; 710/710 tests pass; preview-verified Building and
Fence popovers in Observe.

See: [2026-05-14-atlas-freehand-dimensions-toggle.md](decisions/2026-05-14-atlas-freehand-dimensions-toggle.md)
