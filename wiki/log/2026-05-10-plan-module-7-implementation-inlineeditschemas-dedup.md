# 2026-05-10 — Plan Module 7 implementation + inlineEditSchemas dedup


Module 7 "Broiler Product Map" shipped per
[ADR](decisions/2026-05-10-atlas-plan-module7-broiler-product-map.md).
Three Point draw tools (`SlaughterPointTool`, `ColdChainUnitTool`,
`MarketNodeTool`) under `apps/web/src/v3/plan/draw/tools/`; new
`agribusinessStore.ts` with three slices + CRUD; three diagnostic
cards under `apps/web/src/features/agribusiness/` wired into
`PlanModuleSlideUp` for the new `broiler-product-map` module id.
`PlanTools`, `PlanDrawHost`, `PlanDataLayers`, `useMapToolStore`,
`types.ts`, `planModulePalette`, and `planModuleArtifactPresence`
extended to surface the new module at Yeomans rank 10 (between
`livestock` and `plant-systems`). `inlineEditSchemas.ts` gained
`buildBuriedUtilityEditSchema` / `buildFenceEditSchema` /
`buildGateEditSchema` / `buildDrivewayEditSchema` for BE V2 inline
edits from Plan, wired in `PlanObserveSelectionHandler`.

Mid-session a duplicate paste of those four V2 schemas
(`inlineEditSchemas.ts:1510–1712`) tripped esbuild with nine
"already declared" errors during preview boot. Deduplicated to the
canonical 207-line block; file now 1505 LOC, esbuild clean, Vite HMR
green on `http://localhost:5200/`. Note: an attempted PowerShell
truncation during the fix mangled UTF-8 em-dashes to `â€"`; restored
via `git checkout --` and the editor re-flushed the deduplicated
working copy. No data lost.
