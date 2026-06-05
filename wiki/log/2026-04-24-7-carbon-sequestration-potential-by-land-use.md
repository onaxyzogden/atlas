# 2026-04-24 — §7 carbon sequestration potential by land use


Closes `carbon-sequestration-potential` (featureManifest §7 Soil, Ecology
& Regeneration / P2). Complements the existing modeled-SOC card on the
EcologicalDashboard with a *land-use potential* estimate driven by the
zones the steward has actually drawn — answering "what can my design
plausibly sequester per year?" rather than "how much carbon is in the
soil today?".

### Context
The EcologicalDashboard already shows a SOC card backed by the scoring
engine (totalCurrentSOC_tC / totalPotentialSOC_tC / totalAnnualSeq_tCyr)
sourced from SoilGrids/SSURGO modeled data. That number is parcel-level
and ignores land use. The §7 spec calls for a per-land-use estimate, so
this card aggregates by `zone.category` (with a successionStage tag
multiplier when present) using literature-default sequestration rates.

### Changes
- `apps/web/src/features/zones/CarbonByLandUseCard.tsx` (NEW, ~225 lines)
  — pure-presentation card. Local lookup tables `BASE_RATE_TC_PER_AC_YR`
  (ZoneCategory → tC/ac/yr midpoint) and `STAGE_MULTIPLIER`
  (SuccessionStage → 0.3×/1.0×/1.2×/0.4×). Renders three header stats
  (annual tC/yr + tCO₂e, 20-year cumulative, average rate per acre +
  zone count + total acres), a tC-weighted stacked bar by category with
  legend, and an inline assumptions footer (literature midpoint sources,
  stage multiplier explanation, CO₂e molar conversion 1 tC = 3.667 tCO₂e,
  explicit scoping note that this is order-of-magnitude not LCA).
- `apps/web/src/features/zones/CarbonByLandUseCard.module.css` (NEW,
  ~155 lines) — visual language mirrors `ZoneEcologyRollup.module.css`
  so the §7 cards read as siblings. Reuses `var(--color-status-good-rgb)`
  for the stat-card tint, matching the existing `.carbonMetric` style.
- `apps/web/src/features/dashboard/pages/EcologicalDashboard.tsx` —
  imported and mounted `<CarbonByLandUseCard projectId={project.id} />`
  in both the env-data-loading skeleton path and the full dashboard,
  positioned after `<ZoneEcologyRollup>` and before `<SoilSamplesCard>`.
- `packages/shared/src/featureManifest.ts` — line 214 status
  `planned → done`.

### Rate sources (heuristic midpoints, surfaced inline in the card)
- food_production: 0.15 tC/ac/yr (Six et al. 2002, lower bound for annual
  cropping; food-forest / silvopasture would be higher but the category
  alone can't tell us the steward intends that)
- livestock: 0.6 (Conant et al. 2017 grazing-land meta-analysis midpoint)
- wetland / water_retention: 1.5 (Mitsch & Gosselink wetland accumulation)
- conservation: 0.8 (Pan et al. 2011 forest-sink midpoint)
- buffer / hedgerow: 0.7 (Falloon et al. 2004 linear plantings)
- spiritual / commons / education / retreat: 0.3-0.4 (mixed-use proxies)
- habitation / infrastructure / access / future_expansion: 0 (no biotic
  sink; embodied-carbon discussion is out of scope)

Stage multipliers (when zone.successionStage is set): bare 0.3×, pioneer
1.0× (baseline), mid 1.2× (peak biomass-accumulation phase), climax 0.4×
(near steady-state).

### Rationale
Pure presentation — no shared-package math, no new store, no new entity.
The card pairs cleanly with the existing modeled-SOC card: one reads
*soil pool*, this one estimates *vegetation potential*. The footer makes
the assumption set transparent so the steward can sanity-check rather
than trust the number blindly. CO₂e is shown alongside tC because most
audiences read in CO₂e units.

### Not in scope
- No spatial sequestration map (that would require pixel-level rates
  and a render-to-canvas overlay — distinct future item).
- No carbon-credit valuation or LCA.
- No editable rate table; the literature defaults are baked in.
- No species-specific rates; that's a §10 item.

### Verification
- `cd atlas/apps/web && NODE_OPTIONS=--max-old-space-size=8192 npx tsc --noEmit`
  → exit 0, clean.
- Preview verification deferred (user-driven smoke test).
