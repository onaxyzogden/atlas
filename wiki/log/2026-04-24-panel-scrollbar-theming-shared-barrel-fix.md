# 2026-04-24 — Panel scrollbar theming + shared barrel fix


**Symptom.** Runtime import error on Biodiversity Corridor overlay: `The requested module '/packages/shared/src/index.ts' does not provide an export named 'dijkstraLCP'`. Separately, the Site Intelligence panel's inner scroll container rendered the default Windows scrollbar instead of the themed 6 px gold variant used elsewhere in the dashboard.

**Fix 1 — barrel export.** `packages/shared/src/ecology/corridorLCP.ts` defined `dijkstraLCP` / `frictionForCell` / `pickCorridorAnchors` / `gridDims`, but the shared package barrel didn't re-export the module. Added `export * from './ecology/corridorLCP.js';` to [`packages/shared/src/index.ts`](packages/shared/src/index.ts). (Folded into `9101393 feat(soil-ecology): §7 pollinator close`.)

**Fix 2 — scrollbar theming.** The shared `.container` class in [`apps/web/src/styles/panel.module.css`](apps/web/src/styles/panel.module.css) owns the inner scroll (`overflow-y: auto; height: 100%`) for every right-panel component (including `SiteIntelligencePanel` via `p.container`). It had no `::-webkit-scrollbar` rules, so it fell back to the OS chrome while `DashboardView.content` — which scrolls one layer out — was themed. Added `scrollbar-width: thin` + `scrollbar-color` (Firefox) and `::-webkit-scrollbar{width:6px}` + track/thumb/hover rules matching the gold alpha used in `DashboardView.module.css`. Runtime-verified: `getComputedStyle(panel.container).scrollbarColor === 'rgba(180, 165, 140, 0.18) rgba(0, 0, 0, 0)'`.

### Deferred

- **Site Intelligence width.** `DashboardView` reserves a fixed 280 px right column for `DashboardMetrics`; the Site Intelligence panel fills the remaining `flex: 1` column and therefore never spans the full dashboard width. Not a bug per the current layout spec — flagged for follow-up if a full-width mode is wanted for specific sections.
