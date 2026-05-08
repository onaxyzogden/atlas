---
title: Atlas Plan — Module 6 Soil Fertility & Closed-Loop, map-first conversion
date: 2026-05-08
status: accepted
tags: [atlas, plan, map-first, soil, closed-loop, yeomans-7]
---

# Module 6 Soil Fertility & Closed-Loop — map-first conversion

## Context

Continuing the Plan-stage map-first conversion sequence
(`2026-05-08-atlas-plan-map-first-tools.md` beachhead → Module 5 Plant
Systems on `2026-05-08-atlas-plan-module5-plant-systems.md`). Module 6
covers fertility infrastructure that closes nutrient/biomass loops on the
parcel. Yeomans rank 7 (Soil). Holmgren P6 (*Produce no waste*).

`closedLoopStore.FertilityInfra` already carries a `center: [lng, lat]`
point and a `type` enum spanning 8 practices in two families:

- **Structural** (engineered units): `composter`, `hugelkultur`, `biochar`,
  `worm_bin`
- **Biological** (living-system practices): `cover_crop`, `chop_and_drop`,
  `dynamic_accumulator`, `rotational_grazing`

Schema fits a draw-tool drop-in directly — no backfill needed.

## Decision

Add a single **Fertility unit** point tool to the Plan rail under Module 6
"Soil Fertility & Closed-Loop". The 8 practices share point geometry, so
splitting into 8 toolbar buttons (the way Water did with 4 distinct
geometries) would crowd the rail without clarifying intent. Instead the
tool drops a point and the inline popover exposes a single `Type` select
ordered structural-then-biological — mirrors the Zone tool's
category-select pattern.

Persist-first lifecycle:

- `draw.create` → `addFertilityInfra(skeleton)` with default `type:
  'composter'`
- popover Save → `updateFertilityInfra(id, patch)`
- popover Cancel / ESC → `removeFertilityInfra(id)` (true rollback)

Render: `PlanDataLayers` adds each fertility infra as a circle on
`plan-data-point` with a 16-entry palette (8 colours × {fill, label}).
Earth tones for structural practices (`#8a6a3a → #a07050`), greens for
biological practices (`#7aae3c → #a8c97f`). One label per feature.

## Why a single tool, not eight

- All 8 share point geometry. A toolbar button per practice would require
  the user to remember which family a practice belongs to before clicking.
  An in-popover select with explicit *Structural / Biological* ordering
  surfaces that taxonomy at the moment of choice, where it's actionable.
- Mirrors Observe's existing one-tool-many-categories pattern (e.g.
  permaculture-zone, sun/wind sectors expose `kind` in the form, not on
  the rail).
- Keeps the Plan rail compact (still 9 module sections) and lets future
  additions (e.g. liquid-feeding stations, biostack columns) extend the
  enum without rail churn.

## Files touched

- `apps/web/src/v3/observe/components/measure/useMapToolStore.ts` — add
  `'plan.soil-fertility.fertility-unit'` to the `MapToolId` union.
- `apps/web/src/v3/plan/draw/tools/FertilityInfraTool.tsx` — new tool.
- `apps/web/src/v3/plan/draw/PlanDrawHost.tsx` — switch case.
- `apps/web/src/v3/plan/layers/PlanDataLayers.tsx` — render fertility infra
  as points with 8-entry colour + label palettes.
- `apps/web/src/v3/plan/PlanTools.tsx` — `Recycle` icon entry under
  `'soil-fertility'` in `TOOL_GROUPS`.

## Status of the rail

After this conversion: 4 of 9 modules map-first (Water, Zones, Plants,
Soil); 5 on the "Open module" fallback (Human Context, Dynamic Layering
[meta-analytical, no native geometry — see
`2026-05-08-atlas-plan-module1-overlay-not-draw.md`], Livestock,
Cross-Section, Phasing, Principles).

## Out of scope

- Bed polygons inside a fertility unit (e.g. drawing chop-and-drop strips
  per cover crop). Deferred until the steward asks for sub-unit detail —
  the current `center` + `type` + `scaleNote` answers the rank-7 readout.
- Recipe / feedstock fields (carbon-nitrogen ratio, batch size) — the
  fertility-unit slide-up card remains the home for the full report.
