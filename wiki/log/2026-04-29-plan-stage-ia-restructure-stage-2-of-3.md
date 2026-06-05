# 2026-04-29 — PLAN Stage IA restructure (Stage 2 of 3)


Plan: `~/.claude/plans/few-concerns-shiny-quokka.md`
ADR: `wiki/decisions/2026-04-29-plan-stage-ia-restructure.md`

Stage 2 mirrors the OBSERVE precedent. Built the Plan Hub landing surface
plus 16 dashboard-only spec-module surfaces under
`apps/web/src/features/plan/`, all reachable from both the hub and the
PLAN sidebar accordion:

- **Module 1 — Layering:** `PermanenceScalesCard` (9-scale rollup of
  Yeomans permanence with feature counts).
- **Module 2 — Water:** `RunoffCalculatorCard` (UI on shared
  `hydrologyMetrics.runoffVolumeL`, auto-pulls `annualPrecipMm`),
  `SwaleDrainTool`, `StorageInfraTool` (cisterns/ponds/rain_gardens).
- **Module 3 — Zone & Circulation:** `ZoneLevelLayer` (Z0–Z5 picker on
  existing zones), `PathFrequencyEditor` (daily/weekly/occasional/rare).
- **Module 4 — Plant Systems:** `PlantDatabaseCard` (filterable browser
  over ~37-species starter DB), `GuildBuilderCard` (anchor + 7-layer
  members), `CanopySimulatorCard` (Year 1–50 SVG scrubber).
- **Module 5 — Soil Fertility:** `SoilFertilityDesignerCard`
  (composter / hugelkultur / biochar / worm_bin), `WasteVectorTool`
  (kitchen→chickens→orchard directed edges).
- **Module 6 — Cross-section + Solar:** `TransectVerticalEditorCard`
  with integrated solstice solar overlay (latitude derived from
  `Transect.pointA[1]`, altitude = `90 - lat ± 23.44`).
- **Module 7 — Phasing:** `PhasingMatrixCard` (phase × season grid),
  `SeasonalTaskCard` (per-phase task editor on
  `BuildPhase.tasks?: PhaseTask[]`), `LaborBudgetSummaryCard`
  (totals / per-phase / per-season rollup).
- **Module 8 — Principles:** `HolmgrenChecklistCard` (12 principles ×
  justification + linked-feature multi-pick + status pill).

**Store extensions (additive, no API changes):**
- `siteAnnotationsStore` v1→v2 with backfill migration. Added 5 new
  families (`earthworks`, `storageInfra`, `fertilityInfra`, `guilds`,
  `wasteVectors`, `species`); extended `Transect` with
  `verticalElements?`. The store now holds 11 families — flagged in the
  ADR as approaching god-store.
- `zoneStore.LandZone.permacultureZone?: 0|1|2|3|4|5` (additive).
- `pathStore.DesignPath.usageFrequency?: 'daily'|'weekly'|'occasional'|'rare'`.
- `phaseStore.BuildPhase.tasks?: PhaseTask[]` (new exported `PhaseTask`).
- New `principleCheckStore.ts` (zustand persist, key
  `ogden-principle-checks`).
- `structureStore` was deliberately NOT extended — the 7 new structure
  types attempted in scratch broke ~15 `Record<StructureType, T>` lookup
  tables; we kept the buildings registry pure and put the new families
  in `siteAnnotationsStore` instead.

**Data assets:** `data/plantDatabase.ts` (~37 species, layered) and
`data/holmgrenPrinciples.ts` (12 principles, stable ids `p1`–`p12`).

**Routing:** 17 new dashboardOnly NavItems registered in
`features/navigation/taxonomy.ts` (one per surface plus
`plan-solar-overlay` aliasing `plan-transect-vertical`); 16 lazy imports
+ 17 case branches added to `DashboardRouter.tsx`.

**Selector discipline:** every new card uses subscribe-then-derive
(`wiki/decisions/2026-04-26-zustand-selector-stability.md`); no inline
`.filter()`/`.map()` in selector callbacks.

**Verification:** `tsc --noEmit` clean, `vite build` green (22.25 s,
533 PWA precache entries). All 16 new sections reachable from Plan Hub
and the PLAN sidebar accordion. DiagnosisReportExport still mounts
cleanly under the extended stores.
