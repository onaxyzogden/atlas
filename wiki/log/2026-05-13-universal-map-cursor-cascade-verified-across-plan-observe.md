# 2026-05-13 — Universal map cursor cascade verified across Plan + Observe


**Why.** User reported the canvas cursor never changed: same arrow whether
Pan / Select / draw-armed, and no `pointer` affordance when hovering a
drawn feature. The ad-hoc cursor writes in `DesignToolRail` and
`BeV2GenericLayer` lost a race against MapLibre`s internal dragPan
handler, which rewrites `canvas.style.cursor` on every mousemove.

**What.** `useMapCursor` (`apps/web/src/v3/plan/canvas/useMapCursor.ts`)
centralises the cascade: drawArmed → `crosshair`; select+hover →
`pointer`; select → `crosshair`; pan+down → `grabbing`; pan → `grab`.
Wins the race two ways — `canvas.style.setProperty(`cursor`, c,
`important`)` pins our value, and re-application on `map.on(`mousemove`)`
covers any frame MapLibre slips through. Hover is detected internally
via `queryRenderedFeatures` against the layer-id prefixes
`design-el-`, `plan-data-`, `observe-annot-`, `obs-annot-`, `be-v2-`,
so every interactive layer gets the pointer without per-layer wiring.
The shared `MapCursorHost` mounts inside the `DiagnoseMap` render-prop
on Plan Current, VisionLayoutCanvas, and ObserveLayout — single source
of truth across all three stages. `PlanSelectionFloater` also mounted
in `ObserveLayout` so plan-data feature selection surfaces the
universal floater there too.

**Verified.** Live in `/v3/project/mtc/plan`: pan idle → `grab`
(priority `important`); arm Storage → `crosshair`; disarm → `grab`;
Select mode idle → `crosshair`. The `priority` field flipping from
empty to `important` was the smoking gun confirming the new path runs.
