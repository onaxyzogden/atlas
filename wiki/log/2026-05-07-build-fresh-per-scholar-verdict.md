# 2026-05-07 — BUILD_FRESH per Scholar verdict


**Branch:** `feat/atlas-permaculture` · **Type:** feature · iteration step 2/8

Second module in the Plan-stage Permaculture Scholar adjudication loop.
Scholar (NotebookLM `5aa3dcf3-…`) rejected both options: Atlas is
"too abstract and non-spatial" (form-based logs and disconnected
calculators), OGDEN is "over-engineered" (hydrographs, Q10 discharge,
RUSLE soil-loss tables). Architectural insight delivered verbatim: a
*directed graph of water nodes* (Roofs → Tanks → Swales → Ponds) where
every node calculates volume `V = C × P × A` and passes excess capacity
along its overflow edge. Validation rule: every non-sink node MUST
declare an overflow target (Mollison ch.7; Holmgren P2).

User chose scope option (b) — scaled v1 BUILD_FRESH: keep the directed
graph + mandatory overflow as the irreplaceable insight; defer
map-draw integration and topographic raster overlay to follow-ups.

Schema extension to `waterSystemsStore`: new `WaterNode` type +
`waterNodes` collection, mandatory `overflowToNodeId` (`string |
'offsite' | null`), persist v2 → v3 with backfill migration. Files
created (4): `apps/web/src/v3/plan/cards/water-management/`
`waterMath.ts`, `WaterCatchmentsCard.tsx`, `WaterStorageCard.tsx`,
`WaterNetworkCard.tsx`. Files modified (3): `types.ts` (3 sectionIds
swapped), `PlanModuleSlideUp.tsx` (3 lazy imports + switch cases
re-routed), `PlanChecklistAside.tsx` (water-management WHY/HOW
rewritten around the directed graph).

Atlas legacy `features/plan/RunoffCalculatorCard.tsx`,
`SwaleDrainTool.tsx`, `StorageInfraTool.tsx` retained — still
imported by `V3PlanPage.tsx` + `DashboardRouter.tsx`. Legacy
`earthworks` and `storageInfra` collections in the store also
retained; new `waterNodes` is independent. Consolidation follow-up.
Verification: `npm run typecheck` clean; production build clean
(`NODE_OPTIONS=--max-old-space-size=8192`). Decision recorded in
[2026-05-07-atlas-plan-water-scholar-build-fresh.md](decisions/2026-05-07-atlas-plan-water-scholar-build-fresh.md).
