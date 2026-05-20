# 2026-05-12 — Per-view design-element editability verification pass


**Motive.** User reported "Paddocks drawn in Vision Layout not editable."
The per-view design-element pipeline (selection routing, vertex-edit
dispatch, per-view origin filter, `view`/`hiddenInViews` schema) had
already shipped in commit `83073fa4` two days prior. This session
re-confirmed the wiring end-to-end and attempted preview verification.

**Findings.**

- Static review of [PlanSelectionFloater.tsx](../apps/web/src/v3/plan/PlanSelectionFloater.tsx),
  [PlanVertexEditHandler.tsx](../apps/web/src/v3/plan/layers/PlanVertexEditHandler.tsx),
  [DesignToolRail.tsx](../apps/web/src/v3/plan/canvas/DesignToolRail.tsx),
  [DesignElementLayers.tsx](../apps/web/src/v3/plan/canvas/layers/DesignElementLayers.tsx),
  and [useDesignElementDrawTool.ts](../apps/web/src/v3/plan/canvas/draw/useDesignElementDrawTool.ts)
  confirms: select-mode in `DesignToolRail` mirrors editable picks into
  `planSelectionStore`; floater handles the `'design-element'` kind for
  label/polygon-check/delete; vertex handler cross-project lookup
  recomputes acreage on write; draw stamps `view: currentView`; layer
  filter applies the Current-vs-non-Current origin rule with
  `hiddenInViews` override.
- Preview verification was partial: harness lost the renderer to
  `chrome-error://chromewebdata/` mid-session and `preview_screenshot`
  timed out. Console errors prior to the renderer crash were all
  pre-existing (ObserveModuleBar nested-button warnings, the cleared
  Plan3DSelectionHandler HMR failure). No new runtime errors attributable
  to the design-element changes.

**Status.** Code paths verified by inspection; manual browser smoke
recommended (Vision: draw paddock → click select → confirm
`PlanSelectionFloater` bottom pill bar with **Edit vertices** and
**Delete**; vertex drag persists; switch to Phase-1 → Vision paddock
hidden, Current-origin paddock visible).
