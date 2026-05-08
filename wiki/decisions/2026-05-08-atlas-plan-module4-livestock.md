---
title: Atlas Plan — Module 4 Livestock & Subdivision, map-first conversion
date: 2026-05-08
status: accepted
tags: [atlas, plan, map-first, livestock, paddock, yeomans-9]
---

# Module 4 Livestock & Subdivision — map-first conversion

## Context

Fifth Plan-stage map-first conversion (Water + Zones beachhead → Plants →
Soil → Livestock). `livestockStore.Paddock` already carries the full
`GeoJSON.Polygon` + `species: LivestockSpecies[]` + `fencing: FenceType` +
`stockingDensity: number | null`, so the schema fits a draw tool without
backfill.

Yeomans rank 9 (Animals). Holmgren P3 *Obtain a yield* on the map.

## Decision

Add a single **Paddock** polygon tool to the Plan rail under Module 4.
The popover captures four essential fields:

- `name`
- `species` (single-select, primary species; multi-species authoring stays
  in the slide-up to keep the popover ≤ 4 fields)
- `fencing` (electric / post-wire / post-rail / woven-wire / temporary /
  none)
- `stockingDensity` (head per ha, free-text, parsed to `number | null`)

Persist-first lifecycle:

- `draw.create` → `addPaddock(skeleton)` with `species: ['sheep']`,
  `fencing: 'electric'`, `stockingDensity: null`, sensible defaults for
  the rest of the schema (no `grazingCellGroup`, empty water/shelter
  notes, `phase: 'Phase 1'`).
- popover Save → `updatePaddock(id, patch)`.
- popover Cancel / ESC → `deletePaddock(id)`.

Render: paddocks join the shared `plan-data-poly` source with the same
fill/line layers used by zones and crops. Per-feature colour keyed to
*primary* species (9-entry palette: ruminants on warm clay tones,
mono-gastrics on cool greys, poultry / waterfowl on amber, bees on
gold).

## Why one tool, not "paddock + grazing cell + fence segment"

- `Paddock` is the canonical record. `grazingCellGroup` is a string
  pointer that the slide-up's Paddock-cell design card already
  authors — surfacing it on the rail would require a paddock-id
  dropdown that the popover isn't built for.
- Fences are an attribute of the paddock (`fencing: FenceType`), not
  a standalone geometry. A future fence-line line tool can be added
  if stewards ask for explicit fence drawings, but `Paddock.fencing`
  answers the rank-9 readout.

## Files touched

- `apps/web/src/v3/observe/components/measure/useMapToolStore.ts` — add
  `'plan.livestock.paddock'` to the `MapToolId` union.
- `apps/web/src/v3/plan/draw/tools/PaddockTool.tsx` — new tool.
- `apps/web/src/v3/plan/draw/PlanDrawHost.tsx` — switch case.
- `apps/web/src/v3/plan/layers/PlanDataLayers.tsx` — paddock polygons on
  shared `plan-data-poly`.
- `apps/web/src/v3/plan/PlanTools.tsx` — `Fence` icon entry under
  `livestock` in `TOOL_GROUPS`.

## Status of the rail

After this conversion: 5 of 9 modules map-first (Water, Zones, Plants,
Soil, Livestock); 4 on the "Open module" fallback (Human Context,
Dynamic Layering [overlay-lens future, see
`2026-05-08-atlas-plan-module1-overlay-not-draw.md`], Cross-Section,
Phasing, Principles).

## Out of scope

- Multi-species paddock authoring (Manitoba Schedule A
  `scheduleASubcategoryBySpecies` per species). The slide-up's
  multi-species planner remains the home for this richer authoring;
  the popover captures the *primary* species only.
- Grazing-cell group assignment on draw — slide-up only.
- Fence-line linear features — deferred until stewards ask.
