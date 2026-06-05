# 2026-04-25 — §6 MicroclimateInsightsCard shipped (commit `5237c29`)


Derived microclimate advisories card mounted on `SolarClimateDashboard`
immediately above the existing MICROCLIMATE ZONES count strip. Cross-
references prevailing wind, dominant aspect, mean slope, elevation range,
annual precipitation, and parcel-centroid latitude — already loaded into
the dashboard for other cards — into a tone-coded advisory list:

  • Wind-exposed / wind-sheltered / side-flank slopes (vs. prevailing wind)
  • Solar gain bias from aspect × hemisphere (south-facing in NH, north in SH)
  • Frost-pocket risk on low-gradient terrain with measurable relief
  • Rain-shadow advisory on the leeward flank of significant elevation gain
  • Mildew-pressure warning on wet + cool-aspect slopes (precip > 1100 mm)

Each chip includes a Basis line naming the inputs it relied on, plus an
INPUTS x/4 badge showing data completeness so a steward can tell a
confident advisory from a heuristic one. Pure presentation — no shared-
package math, no map overlay, no writes.

**Files (4):**
- `apps/web/src/features/climate/MicroclimateInsightsCard.tsx` (new, 313 lines)
- `apps/web/src/features/climate/MicroclimateInsightsCard.module.css` (new, 170 lines)
- `apps/web/src/features/climate/SolarClimateDashboard.tsx` (mount + import)
- `packages/shared/src/featureManifest.ts` (`natural-shelter-solar-exposure`
  §4 partial → done)

Type-check clean (`tsc --noEmit` exit 0).
