# 2026-05-07 — Atlas Plan Stage Map Layout + Assessment Scores Slide-Up


**Branch:** `feat/atlas-permaculture` · **Type:** feature / crash-fix

Two related deliverables in one session:

**1 — Plan stage map layout.** Replaced the PlanHub dashboard (`V3PlanPage`) in `/v3/project/:id/plan` with `PlanLayout` — a full 3-column map-centric workspace mirroring ObserveLayout. Left rail: `PlanTools` (8 module sections). Center: `DiagnoseMap` + `MapToolbar` + `ObserveAnnotationLayers`. Right rail: `PlanChecklistAside` (8 permaculture guidance cards). Bottom: `PlanModuleBar` (8 tiles: Layers · Water · Zones · Plants · Soil · Cross-section · Phasing · Principles). Overlay: `PlanModuleSlideUp` with all 16 plan cards lazy-loaded, multi-card modules show a tab row. New `types.ts` exports `PlanModule`, `MODULE_CARDS`, label maps. `V3PlanPage` kept for potential reuse.

**2 — Observe → Plan crash fix.** Navigating from Observe to Plan fired `Cannot read properties of undefined (reading 'getLayer')`. Root cause: MapLibre's `map.remove()` calls `style.destroy()` synchronously, but React's cleanup effects for `ObserveAnnotationLayers` fire afterward with a stale map reference. Fixed by wrapping both cleanup blocks (layer/source removal and event-listener `map.off()` calls) in `try { … } catch { /* map removed */ }`.

**3 — Assessment Scores Slide-Up.** The `LevelNavigatorBar` center element (showing stage name + subtitle) converts to a `<button>` on project routes. Clicking opens `LandAssessmentSlideUp` — a full-screen slide-up sheet showing the 13-axis `computeAssessmentScores()` output. Each score row expands to a per-indicator breakdown with icon, human-readable description, value/max, and status badge. `scoreComponentMeta.ts` provides `SCORE_COMPONENT_DESCRIPTIONS` (~120 entries) and `SCORE_COMPONENT_ICONS` (Lucide icon per indicator) keyed on `ScoreComponent.name`. On non-project routes the center stays a passive `<div>`. ADR: [2026-05-07 Atlas Plan Layout + Assessment Slide-Up](decisions/2026-05-07-atlas-plan-layout-and-assessment-slideup.md).
