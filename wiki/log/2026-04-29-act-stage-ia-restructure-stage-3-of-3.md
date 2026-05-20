# 2026-04-29 — ACT-stage IA restructure (Stage 3 of 3)


### Done

Final stage of the OBSERVE/PLAN/ACT IA restructure. Adds an Act Hub landing surface and 13 spec-aligned client-only dashboard surfaces grouping the 11 already-tagged ACT NavItems under the 5 modules of the ACT spec (`~/Downloads/Regenerative Design Act Stage.md`): §2 Phasing & Budgeting, §3 Maintenance & Operations, §4 Monitoring & Yield, §5 Social Permaculture, §6 Disaster Preparedness.

**New (`apps/web/src/features/act/`):** `ActHub.tsx` (5-card violet-bronze grid) + 13 cards — `BuildGanttCard` (5y×4q SVG Gantt), `BudgetActualsCard` (est-vs-actual ledger w/ orphan handling), `PilotPlotsCard`, `MaintenanceScheduleCard` (5 cadence buckets), `IrrigationManagerCard` (active/transitioning/passive on `cropStore`), `WasteRoutingChecklistCard` (per-cycle log + 30d histogram), `OngoingSwotCard` (continuous SWOT, quarter-grouped), `HarvestLogCard` (per-area unit totals), `SuccessionTrackerCard` (zone × year × pioneer/mid/climax), `NetworkCrmCard`, `CommunityEventCard`, `HazardPlansCard` (mitigation steps + linked features overlaid on OBSERVE hazards), `AppropriateTechLogCard`. Shared `actCard.module.css` violet-bronze theme distinguishes ACT from OBSERVE forest-green / PLAN bronze-amber.

**8 new stores (Zustand persist, key `ogden-act-<slug>`, all v1):** `actualsStore`, `pilotPlotStore`, `maintenanceStore`, `harvestLogStore`, `successionStore`, `networkStore` (distinct from `memberStore` — external CRM, not project ACL), `communityEventStore`, `appropriateTechStore`.

**1 additive store extension:** `cropStore.CropArea` gained `irrigationMode?: 'active' | 'transitioning' | 'passive'` and `transitionStartDate?: string`. Legacy areas treated as `active` by `IrrigationManagerCard`.

**1 v3 migration on `siteAnnotationsStore`:** added `mitigationSteps?: string[]` + `linkedFeatureIds?: string[]` on `HazardEvent`, plus a new `wasteVectorRuns: WasteVectorRun[]` family. v2→v3 backfills `wasteVectorRuns: []`. v1→v2 path preserved.

**Wiring:** `taxonomy.ts` registered 14 new NavItems (`stage3: 'act'`, `dashboardOnly: true`, `phase: 'P3'`); `dashboard-act-hub` pinned first under ACT. `DashboardRouter` got 14 lazy imports + 14 case branches.

**Selector discipline:** every new card follows the subscribe-then-derive rule from ADR `2026-04-26-zustand-selector-stability` — raw `state.x` selectors + `useMemo` for filter/sort. No inline `.filter()` in selectors.

**Verification:** `NODE_OPTIONS=--max-old-space-size=8192 npx tsc --noEmit` clean (after fixing 4 TS2532 `noUncheckedIndexedAccess` regex-capture guards in `BuildGanttCard.parseTimeframe`); `npx vite build` clean (24.15 s, 558 PWA precache entries).

### Risks accepted
- `siteAnnotationsStore` now holds 12+ families (the "god-store" risk flagged in the PLAN ADR is now real). Follow-up plan: extract per-family files in a separate ADR after ACT lands.
- `actualsStore` orphans on PhaseTask deletion (intentional — audit trail). `BudgetActualsCard` surfaces orphans with explicit remove; no cascade.
- Build-Gantt SVG read-only, 5-year horizon hardcoded. Future ADR if 10y or drag-resize needed.

ADR: [`wiki/decisions/2026-04-29-act-stage-ia-restructure.md`](decisions/2026-04-29-act-stage-ia-restructure.md). Predecessors: OBSERVE + PLAN ADRs (same date).
