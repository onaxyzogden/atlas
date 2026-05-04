# ADR: PLAN Stage — IA Restructure (Plan Hub + 16 Spec-Module Surfaces)
**Date:** 2026-04-29
**Status:** accepted
**Branch:** `feat/atlas-permaculture`
**Plan:** `~/.claude/plans/few-concerns-shiny-quokka.md`
**Predecessor:** `2026-04-29-observe-stage-ia-restructure.md` (Stage 1 of 3)

## Context
Atlas already exposes ~22 NavItems tagged `stage3: 'plan'` (paddock-design,
zones, planting-tool, forest-hub, hydrology-dashboard, timeline-phasing,
economics, scenarios, energy-offgrid, etc.) but without a landing surface,
spec-aligned grouping, or coverage of the Regenerative-Design **Planning
Stage** spec's eight modules. The PLAN spec
(`~/Downloads/Regenerative Design Planning Stage.md`) calls for surfaces
that are only partially present in code: editable phasing matrix, plant
database + guild builder + canopy simulator, soil fertility designer,
waste-to-resource vectors, vertical element placement on transects, solar
overlay, Holmgren 12-principle checklist.

This ADR captures **Stage 2 of 3** of the IA restructure, mirroring the
OBSERVE Stage 1 precedent.

## Decision

### Plan Hub (landing surface)
- New `apps/web/src/features/plan/PlanHub.tsx` — 8 module cards in a 2-col
  grid summarising state read from the relevant stores. Each card lists the
  child surfaces (existing dashboards + new gap surfaces) reachable in one
  click via `uiStore.setActiveDashboardSection`.
- Bronze-amber theme (`linear-gradient(135deg, #2a1f10 0%, #1a130a 50%,
  #2a1d12 100%)`) distinguishes PLAN from OBSERVE forest-green.
- Registered as `dashboard-plan-hub`, pinned first under the PLAN accordion.

### Sidebar regrouping
The PLAN accordion (already populated with 22 dashboards from prior work)
is now ordered: Plan Hub → existing dashboards in spec order → 16 new
dashboard-only surfaces grouped by spec module. No items retired.

### New surfaces (16)
All client-only React surfaces wired as `dashboardOnly: true` NavItems and
lazy-loaded in `DashboardRouter`. Section-id naming convention `plan-<slug>`:

| Module | Surface | Section id |
|---|---|---|
| 1 — Layering | `PermanenceScalesCard` | `plan-permanence-scales` |
| 2 — Water | `RunoffCalculatorCard` | `plan-runoff-calculator` |
| 2 — Water | `SwaleDrainTool` | `plan-swale-drain` |
| 2 — Water | `StorageInfraTool` | `plan-storage-infra` |
| 3 — Zone & Circulation | `ZoneLevelLayer` | `plan-zone-level` |
| 3 — Zone & Circulation | `PathFrequencyEditor` | `plan-path-frequency` |
| 4 — Plant Systems | `PlantDatabaseCard` | `plan-plant-database` |
| 4 — Plant Systems | `GuildBuilderCard` | `plan-guild-builder` |
| 4 — Plant Systems | `CanopySimulatorCard` | `plan-canopy-simulator` |
| 5 — Soil Fertility | `SoilFertilityDesignerCard` | `plan-soil-fertility` |
| 5 — Soil Fertility | `WasteVectorTool` | `plan-waste-vectors` |
| 6 — Cross-section + Solar | `TransectVerticalEditorCard` (solar overlay integrated) | `plan-transect-vertical` / `plan-solar-overlay` |
| 7 — Phasing | `PhasingMatrixCard` | `plan-phasing-matrix` |
| 7 — Phasing | `SeasonalTaskCard` | `plan-seasonal-tasks` |
| 7 — Phasing | `LaborBudgetSummaryCard` | `plan-labor-budget` |
| 8 — Principles | `HolmgrenChecklistCard` | `plan-holmgren-checklist` |

The solar overlay is integrated inline with the transect vertical editor
rather than split into its own component (per plan: "share existing
CrossSection panel"). Both `plan-solar-overlay` and `plan-transect-vertical`
section ids resolve to the same surface.

### Store extensions (additive, no migration)
- `siteAnnotationsStore` (v1 → **v2**, with migration that backfills empty
  arrays) — added 5 new annotation families:
  - `earthworks: Earthwork[]` — swale / diversion / french_drain line features
  - `storageInfra: StorageInfra[]` — cistern / pond / rain_garden points
  - `fertilityInfra: FertilityInfra[]` — composter / hugelkultur / biochar / worm_bin
  - `guilds: Guild[]` — anchor + 7-layer member composition
  - `wasteVectors: WasteVector[]` — directed feature→feature edges
  - `species: SpeciesPick[]` — project-pinned plant DB picks
  - Extended `Transect` with `verticalElements?: VerticalElement[]`.
- `zoneStore` — added `permacultureZone?: 0|1|2|3|4|5` to `LandZone`.
- `pathStore` — added `usageFrequency?: 'daily'|'weekly'|'occasional'|'rare'` to `DesignPath`.
- `phaseStore` — added `tasks?: PhaseTask[]` to `BuildPhase`. New exported
  `PhaseTask { id, season, title, laborHrs, costUSD, notes? }`.
- **New** `principleCheckStore.ts` — Zustand `persist`, key
  `ogden-principle-checks`. Shape:
  `byProject: Record<projectId, Record<principleId, PrincipleCheck>>`.

`structureStore` was **not** extended; cisterns/ponds/composters/etc. live
in their own siteAnnotationsStore families to avoid a 15-callsite cascade
on the `Record<StructureType, T>` lookup tables that key off the existing
StructureType enum.

### Data assets (client-only)
- `data/plantDatabase.ts` — ~37 starter species across 7 forest-garden
  layers, each with `latinName, commonName, layer, matureHeightM,
  matureWidthM, hardinessZones, lightNeeds, waterNeeds, rootDepthM,
  rootPattern, ecologicalFunction[]`. Stable ids `pl-001`–`pl-604`.
- `data/holmgrenPrinciples.ts` — Holmgren's twelve principles with
  prompt + example copy, stable ids `p1`–`p12`.

### Selector discipline
Every new card follows subscribe-then-derive
(`wiki/decisions/2026-04-26-zustand-selector-stability.md`): selectors
return raw store fields; per-project / filtered / sorted slices are
computed in `useMemo`. No inline `.filter()` / `.map()` / `.sort()` in
selector callbacks.

## Consequences

### Positive
- All 8 PLAN-spec modules now have a tangible UI surface, reachable from
  Plan Hub and the sidebar.
- The bronze-amber Plan Hub gives the steward a visual anchor that is
  unambiguously "design / planning" vs. OBSERVE green (data-gathering)
  or ACT (operations).
- All new state is additive and persisted client-side; no API/DB schema
  changes; OBSERVE and ACT accordions are untouched.
- Phasing matrix is now editable (was read-only AI suggestion before),
  unblocking real sprint planning.

### Negative / risks
- `siteAnnotationsStore` now holds 11 annotation families; the file is
  ~600 LOC and approaching god-store territory. Mitigation: documented in
  `wiki/entities/site-annotations-store.md`; extraction is a future ADR if
  it crosses ~12.
- Plant DB ~37 species is thin for serious design. Surface copy flags this
  as "v1 starter — community-extensible"; a PFAF/NCPDB import is its own
  future plan.
- Canopy simulator uses linear age→size interpolation, not real growth
  curves. Documented as a v1 assumption.
- Holmgren checklist + phasing matrix do not yet feed the Diagnosis Report
  exporter; deferred until both stabilise.

## Verification
- `NODE_OPTIONS=--max-old-space-size=8192 npx tsc --noEmit` — clean.
- `npx vite build` — clean (22.25s, 533 precache entries).
- All 16 new surfaces reachable from Plan Hub + PLAN sidebar accordion.
- DiagnosisReportExport still mounts cleanly under the extended PLAN stores.

## Out of scope / deferred
- ACT-stage internal restructure (Stage 3 of 3) — pending its spec doc.
- External plant DB import (PFAF, NCPDB).
- Animated canopy growth curves (log/Gompertz).
- Drag-snap of swales to contour lines.
- Multi-user collaboration on guilds / phasing / principles.
- Export of Holmgren checklist + phasing matrix into the Diagnosis Report.
- Full Gantt for phasing (current `PhasingMatrixCard` is a 5×4 read-only grid).

## References
- Plan: `~/.claude/plans/few-concerns-shiny-quokka.md`
- Predecessor ADR: `2026-04-29-observe-stage-ia-restructure.md`
- Selector discipline ADR: `2026-04-26-zustand-selector-stability.md`
- Spec: `~/Downloads/Regenerative Design Planning Stage.md`
