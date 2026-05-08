---
title: Atlas Plan — Module 1 Dynamic Layering, Yeomans overlay lens
date: 2026-05-08
status: accepted
tags: [atlas, plan, map-first, dynamic-layering, yeomans, overlay-lens]
---

# Module 1 Dynamic Layering — Yeomans overlay lens

## Context

The earlier ADR `2026-05-08-atlas-plan-module1-overlay-not-draw.md` ruled
that Module 1 is meta-analytical (no native geometry of its own; reads
across the 9 Yeomans ranks from 9 stores) and therefore stays on the
"Open module" fallback. It also flagged that the *map-first* answer is a
**colour lens** that recolours existing `plan-data-*` features by their
Yeomans rank, deferred until ranks 5/6/8/9 have map geometry.

After the Module 5/6/4 conversions landed (crops · rank 8, fertility infra
· rank 7, paddocks · rank 9), the lens is unblocked. Path/zone (rank 4)
were already on the map from the beachhead. Rank 3 (Water) is partially
covered (catchment/storage/swale/sink) — its features carry no geometry
yet, so the lens shades whatever is on the map and silently waits for
WaterNode geometry to arrive.

## Decision

Add a Yeomans-rank overlay lens to the Plan stage's `plan-data-*` map
sources. When the lens is **off** (default), every feature renders with
its per-tool palette colour (zone palette, crop-type palette, paddock
species palette, fertility-infra palette). When the lens is **on**, every
feature is recoloured by its Yeomans rank via a MapLibre `match`
expression on a per-feature `yeomansRank` property:

| Rank | Layer                            | Colour    |
|------|----------------------------------|-----------|
| 1    | Climate                          | `#6a7280` |
| 2    | Landform                         | `#8a8270` |
| 3    | Water                            | `#3a8fb7` |
| 4    | Access (paths · zones)           | `#b07c4a` |
| 5    | Structures                       | `#a06b48` |
| 6    | Subsystems                       | `#8a6a3a` |
| 7    | Soil (fertility infra)           | `#6a4a28` |
| 8    | Vegetation (crops)               | `#3d8a3d` |
| 9    | Fauna (paddocks)                 | `#d4a25a` |

State + palette live in `apps/web/src/store/layeringLensStore.ts` —
single zustand boolean, persisted under `atlas.v3.plan.layeringLens`.

UI: a **Yeomans lens** toggle button replaces the "Open module" fallback
inside the Plan rail's Dynamic Layering section. Pressed state mirrors
`enabled`; the button uses `Layers` glyph + ON suffix.

Render: `PlanDataLayers`'s feature builders now stamp `yeomansRank` onto
every feature (zone=4, path=4, crop=8, paddock=9, fertility=7). The
`apply()` effect in `PlanDataLayers` reads `lensEnabled` from the store
and:

1. Builds a `colorExpr = lensEnabled ? rankMatch : ['get','color']`
2. Passes it to `ensureLayer` for first-mount and
3. `setPaintProperty` on the four affected layers
   (`poly-fill / poly-line / line / point`) so the toggle takes effect
   on already-mounted layers without recreating them.

The effect dependency on `lensEnabled` re-runs `apply()` whenever the
store toggles.

## Why a lens, not a separate set of "rank" layers

- Doubles the layer count for no readability gain — features map 1:1 to
  ranks, so a colour swap is enough.
- Keeps `plan-data-poly`, `plan-data-line`, `plan-data-point` as the
  single canonical sources for click-handlers, click-targets, and the
  future selection layer.
- A colour swap is reversible without restyling the basemap.

## Why a button on the rail, not a Map Overlays Legend toggle

- `MapOverlaysLegend` is a **shared** Observe/Plan/Act component; adding
  a Plan-only lens toggle there would leak Plan concepts into Observe
  and Act.
- The lens belongs conceptually to *Module 1 Dynamic Layering*, so its
  toggle sits under that module's section in the rail. The rail already
  scopes per-stage tools.
- The "Open module" fallback was the natural home — Module 1 has no
  draw tools, so the slot is free. Clicking the section header still
  opens the slide-up where the rank-by-rank Permanence Ladder lives;
  the rail button is the at-a-glance map affordance.

## Files touched

- `apps/web/src/store/layeringLensStore.ts` — new (zustand store +
  rank palette).
- `apps/web/src/v3/plan/layers/PlanDataLayers.tsx` — stamp
  `yeomansRank` per feature; `colorExpr` toggle + `setPaintProperty`
  rebroadcast.
- `apps/web/src/v3/plan/PlanTools.tsx` — special-case
  `dynamic-layering` section to render a Yeomans-lens toggle button
  (Layers glyph) instead of the generic "Open module" fallback.

## Verified (preview)

- Lens OFF: `getPaintProperty('plan-data-poly-fill', 'fill-color')` →
  `['get','color']`.
- Lens ON: same getter → `['match', ['get','yeomansRank'], 1, '#6a7280',
  …, ['get','color']]`.
- Button DOM reflects state: `aria-pressed` flips, label flips between
  "Yeomans lens" and "Yeomans lens · ON".
- localStorage persists `enabled`.

## Out of scope

- On-map legend showing rank ↔ colour. The Permanence Ladder slide-up
  already lists the 9 ranks; for v1 the rail button is enough.
- Water-node rendering (rank 3): WaterNode does not yet carry geometry
  on the schema. The lens already supports rank 3 in the palette; once
  WaterNode adds geometry the lens will pick it up automatically.
- Rank-ordering warning overlays on the map (e.g. red pulse around a
  paddock placed before a path). PermanenceLadderCard's slide-up is the
  place for ordering-violation lint until/unless the steward asks.

## Status of the rail

- 5 of 9 modules with draw tools (Water, Zones, Plants, Soil, Livestock)
- 1 module with overlay-lens tool (Dynamic Layering — this ADR)
- 3 modules on "Open module" fallback (Cross-Section, Phasing,
  Principles) — all correctly meta-analytical with no draw geometry to
  add.
