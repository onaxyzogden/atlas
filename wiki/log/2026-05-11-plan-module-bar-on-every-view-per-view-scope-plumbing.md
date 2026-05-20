# 2026-05-11 — Plan module bar on every view + per-view scope plumbing


**Motive.** The 11-module Plan rail only rendered on the *Current
Land* tab — every other Plan view (Vision Layout, Year 1, Year 5,
3D Terrain) swapped in the floating-panel canvas and lost the bar.
User wanted the same 11 modules on every view, with content scoped
to the active year where data supports it.

**Change.**

- `PlanLayout.tsx` removed the `isVisionCanvas ? null :` guard on
  `<PlanModuleBar />` (formerly line 254) and wrapped the whole
  rendered tree in `<PlanViewProvider view={activeView}>`.
- New `apps/web/src/v3/plan/PlanViewContext.tsx` exposes
  `PlanViewProvider`, `usePlanView()`, and a `PLAN_MODULE_SCOPE`
  map classifying each of the 11 modules as `'phased'` or
  `'time-invariant'`.
- New `apps/web/src/v3/plan/usePhaseCappedEntities.ts` is a generic
  Yeomans-cap filter hook mirroring the
  `DesignElementScenegraphLayer` logic for cards whose stores carry
  `proposed.phase`.
- New `PlanViewBadge.tsx` renders a header chip in every Plan
  slide-up — year-coloured label for phased modules, muted
  "All years · time-invariant" for the four invariant modules.
- `_shared/moduleNav/ModuleSlideUp.tsx` gained an optional
  `headerExtra` prop; `PlanModuleSlideUp.tsx` injects
  `<PlanViewBadge />` there. Act and Observe wrappers untouched.

**Verification.** Preview probe on http://localhost:5200/v3/project/mtc/plan:
the rail appears on all 5 top-tab views (was previously hidden on
4 of them). Opening Water on Year 1 shows "YEAR 1 · CAPPED AT
WATER" chip; opening Zones on Year 1 shows the muted
"ALL YEARS · TIME-INVARIANT" chip. Screenshot captured of Zone &
Circulation slide-up with the time-invariant chip.

**Deferred — Phase B (per-card filtering).** The chip on Year 1 /
Year 5 currently advertises a cap that card data does not yet
honour. Each phased module needs a per-store translator before
`usePhaseCappedEntities` can apply: `WaterNode.phase` is a
`phaseStore` id (not Yeomans), and `livestockStore` /
`machineryInventoryStore` / `polycultureStore` have no phase axis
at all. Only `builtEnvironmentStoreV2` and `designElementsStore`
carry `proposed.phase` in the Yeomans sense — they are the natural
starting point for the follow-up session.

**Decision record.** `wiki/decisions/2026-05-11-plan-module-bar-all-views.md`.
