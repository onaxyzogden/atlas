# 2026-05-09 — Plan stage: drag-time undo coalescing (1 entry per drag)


Wrapped the five MapLibre drag-to-translate handlers in
`PlanDataLayers.tsx` with a new `beginDragUndoWindow(store)` helper at
`apps/web/src/v3/plan/layers/dragUndo.ts`. Pauses the underlying zundo
`temporal()` middleware on first 4 px threshold cross, then on mouseup
silently rewinds to pre-drag state, resumes, and applies the final
state — collapsing the prior 30–60 undo entries per drag down to one.
Covers Guild, Structure, polygon (zone / crop / paddock /
water_catchment), line/curve (path / utility / water_swale), and
center-point (fertility / water_storage / water_sink) handlers.
Decision recorded in
[decisions/2026-05-09-atlas-plan-drag-undo-coalescing.md](decisions/2026-05-09-atlas-plan-drag-undo-coalescing.md).

Static gates clean: `tsc --noEmit` green; `vite build` green (53.6s,
667 PWA precache entries). Dev server live at :5200; interactive smoke
pass (drag → single Cmd-Z) deferred to user verification — programmatic
drag synthesis on a WebGL map canvas is unreliable for the threshold
and timing semantics this change hinges on.
