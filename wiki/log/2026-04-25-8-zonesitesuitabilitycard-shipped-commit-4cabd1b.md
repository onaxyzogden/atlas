# 2026-04-25 — §8 ZoneSiteSuitabilityCard shipped (commit `4cabd1b`)


Zone × site-data layer conflict audit, mounted on `ZonePanel` Analysis tab
immediately after `ZoneConflictDetector`. Where the existing detector
catches geometric overlap, incompatible adjacencies (livestock vs.
spiritual, etc.), and regulatory misfit against `permitted_uses`, it
stays silent on the *physical-site* conflicts: a habitation in a FEMA
flood zone, an annual-crop zone on hydrologic-group D soil, livestock on
a parcel with a significant wetland, an infrastructure zone on a 25°+
mean slope. This card runs each drawn zone against parcel-level signals
already loaded by the Hydrology / Decision panels and surfaces tone-coded
findings (good / fair / poor) per zone with a Basis line naming the
inputs each finding relied on.

**Inputs (parcel-level):** `wetlands_flood.flood_zone`, `wetlands_flood.has_significant_wetland`,
`elevation.mean_slope_deg`, `soils.hydrologic_group`. LAYERS x/4 badge
shows data completeness up front so the steward can tell when the audit
is genuinely silent vs. starved of inputs.

**Findings ruleset:**
  • Settlement-class zones (habitation/infrastructure/commons/retreat/etc.) in
    FEMA SFHA → poor; in 0.2%-annual zone → fair
  • Livestock or annual-crop zones on parcel with significant wetland → fair (E.coli / runoff)
  • Habitation/infrastructure/access zones on >25° slope → poor; 15–25° → fair
  • Annual-crop or habitation zones on hydrologic group D → poor; group C → fair

Pure presentation — no shared-package math, no zone-store writes, no
map overlay.

**Files (4):**
- `apps/web/src/features/zones/ZoneSiteSuitabilityCard.tsx` (new, 260 lines)
- `apps/web/src/features/zones/ZoneSiteSuitabilityCard.module.css` (new, 211 lines)
- `apps/web/src/features/zones/ZonePanel.tsx` (mount + import)
- `packages/shared/src/featureManifest.ts` (`zone-overlap-conflict-adjacency`
  §8 partial → done)

Type-check clean. Files were swept up in the parallel `4cabd1b` commit
alongside `feat(rules): safety buffer rules card`; that's why the commit
header reads `feat(rules)` — the §8 ship rode along with §11 Safety
Buffer's authoring window. Both ships are intact in HEAD.
