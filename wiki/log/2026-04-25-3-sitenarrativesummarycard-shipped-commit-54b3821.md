# 2026-04-25 — §3 SiteNarrativeSummaryCard shipped (commit `54b3821`)


Feature → Risks / Opportunities / Limitations narrative trio mounted on
`SiteAssessmentPanel` between the existing "Site Flags" list and the
data-sources notice. The flag list above the new card is metadata-driven
(acreage, climate region, parcel boundary). This card walks every
project store (zones, structures, paddocks, utilities, paths, crops) and
produces a plain-language read-back of the design state — the kind of
sentences a steward would otherwise have to assemble manually before a
client review.

**Files:**
- `apps/web/src/features/assessment/SiteNarrativeSummaryCard.tsx` (~350 lines)
- `apps/web/src/features/assessment/SiteNarrativeSummaryCard.module.css` (~140 lines)
- `apps/web/src/features/assessment/SiteAssessmentPanel.tsx` — import + mount
- `packages/shared/src/featureManifest.ts` — `risk-opportunity-limitation-summaries`
  (§3, P1) `partial` → `done`

**Logic:**
- **Opportunities:** multi-phase plan (≥ 2 structure phases),
  water-retention zones drawn (acreage roll-up), conservation acreage,
  diverse program (≥ 5 zone categories), crop polyculture (≥ 4 species),
  paddock rotation possible (≥ 2 paddocks).
- **Risks:** overstocked paddocks (> 14 head/ha, named inline), no water
  utility despite structures placed, bare-stage erosion zones, high
  invasive-pressure zones, habitable structures > 250 m from nearest
  water utility (named with distance), no buffer / setback zone drawn.
- **Limitations:** parcel < 5 acres, parcel boundary not captured, fewer
  than 3 zones drawn, no paths drawn, single-phase build plan.
- Each item: short title + italic plain-language body. Tone-coded bucket
  cards (green / red / lavender) and a header badge showing OPP / RISK /
  LIM counts.

**Type-check:** clean (`tsc --noEmit` exit 0). One JSX parse error along
the way — a literal `>` inside the footnote text was reading as a tag
opener; fixed with `&gt;`.

**Pure presentation.** Reads zoneStore + structureStore + livestockStore
+ utilityStore + pathStore + cropStore. No new shared math, no map
writes, no entity changes.
