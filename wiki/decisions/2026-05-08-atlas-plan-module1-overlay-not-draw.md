# 2026-05-08 — Plan Module 1 (Dynamic Layering) is an overlay lens, not a draw tool

## Context

After the Plan map-first tools beachhead landed
([2026-05-08-atlas-plan-map-first-tools.md](2026-05-08-atlas-plan-map-first-tools.md)),
the next candidate for the same conversion was Module 1 — Dynamic
Layering & Permanence. Reading the existing slide-up
([PermanenceLadderCard.tsx](../../apps/web/src/v3/plan/cards/dynamic-layering/PermanenceLadderCard.tsx))
revealed that Module 1 is structurally different from Modules 2–3.

## Decision

**Module 1 keeps the "Open module" fallback in the rail.** It is not
converted to a draw tool, because it has no native geometry to draw.

Module 1 is a *meta-analytical* module: it reads element counts and
weights from 9 Zustand stores across the 9 Yeomans ranks (Climate,
Landform, Water, Access, Structures, Subsystems, Soil, Vegetation,
Fauna) and surfaces (a) rank counts, (b) Keyline-ordering violations,
(c) a prerequisite-arrow graph (Holmgren P8 — *Integrate rather than
segregate*). Every rank's elements are authored in *other* modules:
Water in Module 2, Access in Module 3, Soil / Vegetation / Fauna in
Modules 5–7. Inventing a Module-1 draw schema would either duplicate
those modules' geometry or fabricate fictional records.

The map-first interpretation that fits the module's intent is an
**overlay lens** — a toggle that recolors existing plan-data map
features by Yeomans rank so the steward can visually scan ordering on
the map. Deferred until more ranks have map geometry: as of today only
rank 4 (Access paths) and rank 7 (Soil / food-production zones) render
on the map; ranks 1, 5, 6, 8, 9 do not. Building the lens before the
features it would re-tint exist would mostly recolor empty space.

## Out of scope (deferred)

- The Permanence Overlay lens itself — revisit once Modules 5–7
  populate the map with crop / guild / structure / fertility geometry.
- Adding `rank` as a derived field on each plan store's records (so the
  lens can compute color in O(1) without re-deriving `category →
  rank` per render).

## Next step

Proceed to **Module 5 — Plant Systems & Polyculture** as the next
map-first conversion. It has native geometry (crop polygons, guild
points), feeds rank 8 of the Permanence ladder, and follows the same
draw-tool + popover pattern proven in Modules 2–3.
