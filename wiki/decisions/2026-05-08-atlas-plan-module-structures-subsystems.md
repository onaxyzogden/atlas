# Plan Module — Structures & Subsystems (Yeomans rank 5+6)

**Date:** 2026-05-08
**Branch:** feat/atlas-permaculture
**Status:** Implemented

## Decision

Add a 10th Plan module — `structures-subsystems` — covering Yeomans rank 5
(Structures) and rank 6 (Subsystems). One module, not two. The module
exposes a single `Structure` point tool on the rail; the 20-type
`StructureType` union from `structureStore` lives in the popover's `type`
select, not as 20 separate rail buttons.

## Why one module

`structureStore` already mixes dwelling, civic, agricultural, and utility
types in a single `StructureType` union (cabin, yurt, earthship,
greenhouse, barn, prayer_space, solar_array, well, water_tank,
compost_station, water_pump_house, …). Splitting the store to honour
a module split would be out of proportion to the gain. The Yeomans lens
still distinguishes ranks via per-feature `yeomansRank` — a v2 finer
split has no schema barrier.

## Why one rail button + 20-option select

The Module 4 Paddock precedent: one button + species enum in popover, not
9 species buttons. A 20-button toolbar would dwarf every other Plan
module's surface area.

## Footprint expansion

Steward drops a point. `createFootprintPolygon(center, widthM, depthM,
rotationDeg)` from `features/structures/footprints.ts` expands it into a
GeoJSON polygon using the type's default dimensions. Save recomputes the
polygon from the current type's template — switching `type` in the
popover updates the footprint live.

## Schema fields seeded

`type: 'cabin'` (default), `costEstimate: midCost(type)`,
`infrastructureReqs: [...tpl.infrastructureReqs]`, `phase: 'Phase 1'`,
`rotationDeg: 0`. Other `Structure` fields (height, stories, occupants,
water/kWh demand, isTemporary, seasonalMonths) stay deferred to the
slide-up card.

## Rail position

Slotted between `zone-circulation` and `livestock` to honour Yeomans
order on the rail (rank 4 → 5/6 → 9 → 8 → 7).

## Out of scope (follow-ups)

- Slide-up cards for the new module (placeholder sectionIds:
  `plan-structures-overview`, `plan-subsystems-overview`).
- Per-type icons inside the popover preview.
- Lifting rank-6 subsystems into their own module.
- Rotation via on-map drag handles.
- Migrating existing un-placed structures onto the map.

## Files

- Created `apps/web/src/v3/plan/draw/tools/StructureTool.tsx`
- Edited `apps/web/src/v3/observe/components/measure/useMapToolStore.ts`
- Edited `apps/web/src/v3/plan/types.ts`,
  `PlanTools.tsx`, `PlanTools.module.css`,
  `PlanModuleBar.tsx`, `PlanModuleBar.module.css`,
  `PlanChecklistAside.tsx`,
  `draw/PlanDrawHost.tsx`,
  `layers/PlanDataLayers.tsx`
