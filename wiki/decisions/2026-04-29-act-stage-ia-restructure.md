# ADR: ACT Stage — IA Restructure (Act Hub + 13 Spec-Module Surfaces)
**Date:** 2026-04-29
**Status:** accepted
**Branch:** `feat/atlas-permaculture`
**Plan:** `~/.claude/plans/few-concerns-shiny-quokka.md`
**Predecessors:** `2026-04-29-observe-stage-ia-restructure.md` (Stage 1 of 3),
`2026-04-29-plan-stage-ia-restructure.md` (Stage 2 of 3)

## Context
Atlas already tags 11 NavItems with `stage3: 'act'` today
(`herd-rotation`, `livestock-inventory`, `nursery-ledger`,
`investor-summary`, `reporting`, `portal`, `educational`, `moontrance`,
`templates`, `fieldwork`, `history`) but they have no Hub landing surface,
no spec-aligned grouping, and the **ACT** spec at
`~/Downloads/Regenerative Design Act Stage.md` calls for **5 modules**
that are only thinly covered by existing dashboards:

| Spec module | Existing coverage | Real gap |
|---|---|---|
| §2 Phased Implementation & Budgeting | `phaseStore.tasks` + `PhasingDashboard` + `financialStore` (estimates only) | 5-year Gantt visualisation, actuals-vs-estimate ledger, small-and-slow piloting tracker |
| §3 Maintenance & Operations | None | Maintenance frequency scheduler, irrigation transition manager, waste-vector run checklist |
| §4 Ecological Monitoring & Yield | `SwotJournalCard` (single-shot, OBSERVE) | Continuous SWOT log, harvest/yield ledger, multi-year succession tracker |
| §5 Social Permaculture | `memberStore` (project ACL) | External-network CRM (vendors / consultants / community), community-events planner |
| §6 Disaster Preparedness | `siteAnnotationsStore.hazards` (OBSERVE log) | Hazard action plans (mitigation steps + linked features), appropriate-tech log |

This ADR captures **Stage 3 of 3** of the IA restructure, mirroring the
OBSERVE/PLAN precedents.

## Decision

### Act Hub (landing surface)
- New `apps/web/src/features/act/ActHub.tsx` — 5 module cards in a 2-col
  grid summarising state read from the relevant stores. Each card lists
  the child surfaces reachable in one click via
  `uiStore.setActiveDashboardSection`.
- Violet-bronze theme (`linear-gradient(135deg, #221530 0%, #14101c 50%,
  #261a18 100%)`) distinguishes ACT from OBSERVE forest-green and PLAN
  bronze-amber.
- Registered as `dashboard-act-hub`, pinned first under the ACT accordion.

### Sidebar regrouping
The ACT accordion (already populated with 11 dashboards from prior work)
is now ordered: Act Hub → 13 new dashboard-only surfaces grouped by spec
module → existing dashboards. No items retired.

### New surfaces (13)
All client-only React surfaces wired as `dashboardOnly: true` NavItems and
lazy-loaded via `DashboardRouter`. All follow subscribe-then-derive
selector discipline (raw `state.x` selectors + `useMemo`) per ADR
`2026-04-26-zustand-selector-stability.md`.

| # | Section ID | Card | Module |
|---|---|---|---|
| 1 | `act-build-gantt` | `BuildGanttCard` | §2 Phasing |
| 2 | `act-budget-actuals` | `BudgetActualsCard` | §2 Phasing |
| 3 | `act-pilot-plots` | `PilotPlotsCard` | §2 Phasing |
| 4 | `act-maintenance-schedule` | `MaintenanceScheduleCard` | §3 Maintenance |
| 5 | `act-irrigation-manager` | `IrrigationManagerCard` | §3 Maintenance |
| 6 | `act-waste-routing` | `WasteRoutingChecklistCard` | §3 Maintenance |
| 7 | `act-ongoing-swot` | `OngoingSwotCard` | §4 Monitoring |
| 8 | `act-harvest-log` | `HarvestLogCard` | §4 Monitoring |
| 9 | `act-succession-tracker` | `SuccessionTrackerCard` | §4 Monitoring |
| 10 | `act-network-crm` | `NetworkCrmCard` | §5 Social |
| 11 | `act-community-events` | `CommunityEventCard` | §5 Social |
| 12 | `act-hazard-plans` | `HazardPlansCard` | §6 Resilience |
| 13 | `act-appropriate-tech` | `AppropriateTechLogCard` | §6 Resilience |

### Stores
**8 new stores**, all Zustand `persist` keyed `ogden-act-<slug>`, all v1:

- `actualsStore.ts` — `byProject: Record<projectId, Record<phaseTaskId, TaskActual>>`. Joins against `phaseStore.BuildPhase.tasks` for est-vs-actual ledger. **Orphans by design** when a `PhaseTask` is deleted in PLAN; `BudgetActualsCard` lists orphans at the bottom with an explicit remove affordance — no auto-cascade so the audit trail stays intact.
- `pilotPlotStore.ts` — `pilots: PilotPlot[]` with status (`running` / `success` / `fail` / `inconclusive`) and free-text learnings.
- `maintenanceStore.ts` — `tasks: MaintenanceTask[]` with cadence (daily / weekly / monthly / quarterly / annual), optional season, optional `linkedFeatureId`. The link is intentionally a free string so we don't couple to any specific store; the card resolves labels by checking zones / crops / structures / paths.
- `harvestLogStore.ts` — `entries: HarvestEntry[]` with `cropAreaId`, `quantity`, `unit` (kg / lb / count / L), optional quality (A / B / C). No auto unit conversion.
- `successionStore.ts` — `milestones: SuccessionMilestone[]` per zone (or site-wide), with year + phase (pioneer / mid / climax) + observation + optional inline data-URL photo.
- `networkStore.ts` — `contacts: NetworkContact[]` with role (vendor / consultant / tradesperson / nursery / community). **Distinct from `memberStore`** (which is project ACL); the two never merge.
- `communityEventStore.ts` — `events: CommunityEvent[]` with type (work_day / meetup / harvest_share / tour) and `attendees?: string[]` referencing `networkStore` ids.
- `appropriateTechStore.ts` — `items: AppropriateTechItem[]` grouped by `system` (water / power / heat / comms / food_storage), status (planned / installed / tested / failed).

**1 store extension** (additive, no migration):
- `cropStore.ts` — added `irrigationMode?: 'active' | 'transitioning' | 'passive'` and `transitionStartDate?: string` to `CropArea`. Legacy crop areas treated as `active` by `IrrigationManagerCard`.

**1 store v3 migration** on `siteAnnotationsStore.ts`:
- Added `mitigationSteps?: string[]` and `linkedFeatureIds?: string[]` to `HazardEvent` (additive, optional). Edited via `HazardPlansCard`.
- New family `wasteVectorRuns: WasteVectorRun[]` for the `WasteRoutingChecklistCard` cycle log: `{ id; projectId; vectorId; runDate; notes? }`.
- v2 → v3 migration backfills `wasteVectorRuns: []`. v1 → v2 path (PLAN-stage families) preserved.

### Selector discipline
Every new card follows the rule that bit `DiagnosisReportExport` once and
must not bite again:
```ts
// ❌ never
const items = useStore((s) => s.things.filter((t) => t.projectId === id));
// ✅ always
const all = useStore((s) => s.things);
const items = useMemo(() => all.filter((t) => t.projectId === id), [all, id]);
```

## Consequences
**Positive**
- Atlas now has spec-aligned coverage of all five Act-stage modules with a
  Hub landing surface that mirrors OBSERVE / PLAN.
- 13 new client-only surfaces, all reachable via the Act Hub and the ACT
  accordion in the sidebar.
- 6 new persisted families surface previously-unstructured stewardship
  knowledge (actuals, pilots, maintenance, harvests, succession,
  appropriate-tech, network, community events).
- No backend schema changes; no new API endpoints; no breaking changes to
  existing OBSERVE/PLAN surfaces.

**Risks accepted**
- `siteAnnotationsStore` now holds **12+ families** (after `wasteVectorRuns`
  + extended `hazards`). The "god-store" risk flagged in the PLAN ADR is
  now real. Follow-up plan: extract per-family files in a separate ADR
  after ACT lands.
- `actualsStore` orphans on PhaseTask deletion. `BudgetActualsCard`
  surfaces orphans explicitly so the steward owns cleanup; no automatic
  cascade.
- Build-Gantt SVG is read-only (5-year horizon hardcoded). Future ADR if
  10y horizons or drag-resize editing become necessary.
- `OngoingSwotCard` reuses `siteAnnotationsStore.swot` rather than splitting
  per stage. Acceptable — SWOT is inherently continuous; the ACT card just
  offers a different lens on the same data, tagged with `tags: ['act']`.

## Verification
- `NODE_OPTIONS=--max-old-space-size=8192 npx tsc --noEmit` — zero new errors.
- `npx vite build` — clean (24.15 s, 558 PWA precache entries).
- 13 new surfaces all reachable from Act Hub + sidebar.
- Manual walkthrough: Hub renders on empty project with zero-state copy;
  every card renders without console errors.

## Files touched
**New (16):**
- `apps/web/src/features/act/ActHub.tsx`, `ActHub.module.css`,
  `actCard.module.css`, `index.ts`
- `apps/web/src/features/act/BuildGanttCard.tsx`,
  `BudgetActualsCard.tsx`, `PilotPlotsCard.tsx`,
  `MaintenanceScheduleCard.tsx`, `IrrigationManagerCard.tsx`,
  `WasteRoutingChecklistCard.tsx`, `OngoingSwotCard.tsx`,
  `HarvestLogCard.tsx`, `SuccessionTrackerCard.tsx`,
  `NetworkCrmCard.tsx`, `CommunityEventCard.tsx`,
  `HazardPlansCard.tsx`, `AppropriateTechLogCard.tsx`
- `apps/web/src/store/actualsStore.ts`, `pilotPlotStore.ts`,
  `maintenanceStore.ts`, `harvestLogStore.ts`, `successionStore.ts`,
  `networkStore.ts`, `communityEventStore.ts`, `appropriateTechStore.ts`

**Modified:**
- `apps/web/src/store/cropStore.ts` — added `irrigationMode` +
  `transitionStartDate` (additive, no migration).
- `apps/web/src/store/siteAnnotationsStore.ts` — bumped to v3, added
  `wasteVectorRuns` family + `HazardEvent.mitigationSteps` /
  `linkedFeatureIds`.
- `apps/web/src/features/navigation/taxonomy.ts` — registered 14 new
  NavItems (1 hub + 13 cards) with `stage3: 'act'` + `dashboardOnly: true`.
- `apps/web/src/features/dashboard/DashboardRouter.tsx` — 14 lazy imports
  + 14 case branches.
