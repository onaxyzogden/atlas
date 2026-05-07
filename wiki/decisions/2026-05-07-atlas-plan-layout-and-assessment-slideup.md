# ADR — Atlas Plan Stage Map Layout + Assessment Scores Slide-Up

**Date:** 2026-05-07
**Branch:** `feat/atlas-permaculture`
**Status:** implemented

---

## Plan Stage Map Layout (`PlanLayout`)

### Decision
Replace the PlanHub dashboard page (`V3PlanPage`) in the `/v3/project/:id/plan` route with a `PlanLayout` that mirrors ObserveLayout's 3-column structure: left tools rail · center map · right checklist + bottom module bar + slide-up overlay.

### Rationale
The user's intent for the Plan stage is a map-centric workspace where stewards plan interventions directly on the land, not a dashboard of summary cards. The Observe stage already established this pattern; Plan should follow it consistently.

### What was built
- `apps/web/src/v3/plan/PlanLayout.tsx` — Route component. Reuses `DiagnoseMap`, `MapToolbar`, `ObserveAnnotationLayers`. Three-column CSS grid via `PlanLayout.module.css`.
- `apps/web/src/v3/plan/PlanTools.tsx` + `PlanTools.module.css` — Left rail: 8 module sections with colored dots and placeholder tool content.
- `apps/web/src/v3/plan/PlanChecklistAside.tsx` + `PlanChecklistAside.module.css` — Right rail: 8 guidance cards with WHY/HOW permaculture content. Click to select module; active module click toggles slide-up.
- `apps/web/src/v3/plan/PlanModuleBar.tsx` + `PlanModuleBar.module.css` — Bottom 8-tile module bar (Layers · Water · Zones · Plants · Soil · Cross-section · Phasing · Principles). Click: inactive → select; active+closed → open slide-up; active+open → close.
- `apps/web/src/v3/plan/PlanModuleSlideUp.tsx` + `PlanModuleSlideUp.module.css` — Full-screen slide-up overlay rendering all 16 plan cards (lazy-loaded). Multi-card modules show a tab row.
- `apps/web/src/v3/plan/types.ts` — `PlanModule` union type, `MODULE_CARDS`, `PLAN_MODULE_LABEL`, `PLAN_MODULE_FULL_LABEL` lookups.

### Crash fix
`ObserveAnnotationLayers.tsx` cleanup effects wrapped in `try { … } catch { /* map removed */ }` to handle the timing race where `DiagnoseMap` calls `map.remove()` before React fires cleanup effects. MapLibre destroys `style` synchronously inside `remove()`, making subsequent `getLayer()` / `map.off()` calls throw. The try/catch makes cleanup best-effort.

### V3PlanPage kept
`V3PlanPage.tsx` retained (not deleted) for potential reuse in Act/Report stages.

---

## Assessment Scores Slide-Up (`LandAssessmentSlideUp`)

### Decision
Convert the `LevelNavigatorBar` center element from a passive `<div>` into a `<button>` (when on a project route) that opens a full-screen slide-up pane showing the 13-axis land assessment scores with expandable per-indicator breakdowns.

### Rationale
The assessment scores are the most actionable intelligence Atlas produces. Surfacing them one click away from the stage navigator — without navigating away from the current stage — makes them available contextually throughout the Observe → Plan → Act workflow.

### What was built

**`apps/web/src/components/LevelNavigator/LevelNavigatorBar.tsx`**
- Adds `useParams({ strict: false })` to detect if on a project route
- Renders a `<button className="fln-bar__center--clickable">` when `projectId` is non-null; falls back to the original `<div aria-live="polite">` on non-project routes
- Mounts `<LandAssessmentSlideUp>` below the nav bar

**`apps/web/src/components/LevelNavigator/LandAssessmentSlideUp.tsx`**
Data pipeline:
```
useSiteData(projectId)           → SiteData | null (layers)
useProjectStore((s) => s.projects) → LocalProject (acreage, country)
computeAssessmentScores(layers, acreage, country) → ScoredResult[]
```
Renders 13 score rows. Each row expands to show `ScoreComponent[]` breakdown with:
- Lucide icon (from `SCORE_COMPONENT_ICONS`)
- Human-readable description (from `SCORE_COMPONENT_DESCRIPTIONS`)
- `value / maxPossible` score
- Status badge (High / Moderate / Low / Penalty / Clear)

ESC key and backdrop-click close the sheet.

**`apps/web/src/data/scoreComponentMeta.ts`**
Two lookup maps keyed on `ScoreComponent.name` (snake_case):
- `SCORE_COMPONENT_DESCRIPTIONS: Record<string, string>` — ~120 indicators across all 13 score categories
- `SCORE_COMPONENT_ICONS: Record<string, LucideIcon>` — Lucide icon per indicator

### Design pattern
Follows the established `ModuleSlideUp` / `PlanModuleSlideUp` pattern: fixed scrim `top: 48px; z-index: 100`, sheet with `slideUp 280ms` animation, same header/close/body structure.

---

## Files changed (this ADR)

| File | Action |
|---|---|
| `apps/web/src/v3/plan/types.ts` | created |
| `apps/web/src/v3/plan/PlanLayout.tsx` | created |
| `apps/web/src/v3/plan/PlanLayout.module.css` | created |
| `apps/web/src/v3/plan/PlanTools.tsx` | created |
| `apps/web/src/v3/plan/PlanTools.module.css` | created |
| `apps/web/src/v3/plan/PlanChecklistAside.tsx` | created |
| `apps/web/src/v3/plan/PlanChecklistAside.module.css` | created |
| `apps/web/src/v3/plan/PlanModuleBar.tsx` | created |
| `apps/web/src/v3/plan/PlanModuleBar.module.css` | created |
| `apps/web/src/v3/plan/PlanModuleSlideUp.tsx` | created |
| `apps/web/src/v3/plan/PlanModuleSlideUp.module.css` | created |
| `apps/web/src/v3/plan/V3PlanPage.tsx` | units/attachments fix |
| `apps/web/src/v3/plan/PlanLayout.tsx` | units/attachments fix |
| `apps/web/src/v3/observe/components/layers/ObserveAnnotationLayers.tsx` | try/catch crash fix |
| `apps/web/src/routes/index.tsx` | route updated to PlanLayout |
| `apps/web/src/components/LevelNavigator/LevelNavigatorBar.tsx` | button + slide-up |
| `apps/web/src/components/LevelNavigator/LevelNavigatorBar.css` | clickable center styles |
| `apps/web/src/components/LevelNavigator/LandAssessmentSlideUp.tsx` | created |
| `apps/web/src/components/LevelNavigator/LandAssessmentSlideUp.module.css` | created |
| `apps/web/src/data/scoreComponentMeta.ts` | created |
