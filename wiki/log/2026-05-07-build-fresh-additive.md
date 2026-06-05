# 2026-05-07 — BUILD_FRESH (additive)


**Branch:** `feat/atlas-permaculture` · **Type:** feature · iteration step 3/8

Third module in the Plan-stage Permaculture Scholar adjudication loop.
Scholar (NotebookLM `5aa3dcf3-…`) ruled Atlas's Z0–Z5 ladder
*permaculturally orthodox* (Mollison) and OGDEN's land-use categories
"miss the entire point of zoning." OGDEN's paddock-rotation page is
properly Yeomans step 5 (Subdivision) and was excluded — to be
revisited in a future Subdivision/Livestock module. OGDEN's
movement-frequency heatmap relies on sensor data Atlas doesn't have
and was excluded.

What Scholar mandated and Atlas lacked: **spatial visualisation**.
"A list-only view is entirely insufficient … a steward cannot make a
sound decision without seeing these relationships mapped over their
specific topography." Minimum bar: base-map + Z0–Z5 polygons + traced
frequency-tagged paths + visual verification that high-frequency paths
intersect Z1/Z2 zones.

Atlas's `ZoneLevelLayer.tsx` and `PathFrequencyEditor.tsx` (both list
editors) are kept verbatim. New card added: `apps/web/src/v3/plan/
cards/zone-circulation/ZoneCirculationOverviewCard.tsx` — projects
zone polygons + path lines from `zoneStore` / `pathStore` (already
GeoJSON) into a normalised SVG mini-map; Z-fill from a 6-step
warm-to-cool ramp; path stroke-width scaled by usage frequency;
validation panel flags daily/weekly paths whose bbox doesn't intersect
any Z1/Z2 zone bbox (conservative — no false-passes). Sub-tabs in
Module 3 expanded 2 → 3: Zone level layer, Path frequency, Overview &
validation. `PlanChecklistAside` WHY/HOW rewritten to cite Mollison +
Yeomans Scale of Permanence. Verification: typecheck clean; production
build clean. Decision recorded in
[2026-05-07-atlas-plan-zones-scholar-build-fresh.md](decisions/2026-05-07-atlas-plan-zones-scholar-build-fresh.md).
