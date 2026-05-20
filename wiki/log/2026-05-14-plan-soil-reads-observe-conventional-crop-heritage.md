# 2026-05-14 — Plan-Soil reads Observe conventional-crop heritage


Closes the loop opened by the same-day `conventionalCrop` Observe
annotation. Plan-stage Soil-fertility cards now read practice history
from `conventionalCropStore` and surface it alongside live soil
diagnosis. New pure helper `conventionalCropHeritage.ts` co-located
with the Soil-fertility cards: `deriveHeritageHints(c)` maps
compaction / inputs / tillage / irrigation enum values to
severity-tagged restoration moves (Keyline subsoiling for severe
compaction; biology rebuild + 2–3 yr transition for synthetic-input
legacy; no-till transition + 3–5 yr SOM rebound for intensive tillage;
drip retrofit for flood / sprinkler irrigation). Two consumer
surfaces: `SoilBaselineCard` grows a "Conventional-crop heritage (from
Observe) — N" section between Saved readings and Reading details with
per-polygon practice line + severity-coloured hint list;
`SoilBuildingPlanCard` gains a "0 · Inherited practice (from Observe)"
prelude before step 1 (Diagnose now), framing yesterday's causes
feeding into today's limiting factors. Empty-state predicate updated
to include heritage. Read-only — Observe still owns polygon authoring;
stage separation per 2026-05-08 ADR preserved. tsc clean (8 GB heap),
`npm run lint` exit 0, preview-verified end-to-end at
`/v3/project/mtc/plan` against a seeded `cc-test-*` polygon
(annual-row · severe compaction · synthetic · intensive tillage ·
sprinkler) — all four hints render on both tabs, section hides when
no polygons exist, no console errors.

Files: [apps/web/src/v3/plan/cards/soil-fertility/conventionalCropHeritage.ts](../apps/web/src/v3/plan/cards/soil-fertility/conventionalCropHeritage.ts),
[SoilBaselineCard.tsx](../apps/web/src/v3/plan/cards/soil-fertility/SoilBaselineCard.tsx),
[SoilBuildingPlanCard.tsx](../apps/web/src/v3/plan/cards/soil-fertility/SoilBuildingPlanCard.tsx).
Decision: [decisions/2026-05-14-atlas-plan-soil-conventional-crop-heritage.md](decisions/2026-05-14-atlas-plan-soil-conventional-crop-heritage.md).
