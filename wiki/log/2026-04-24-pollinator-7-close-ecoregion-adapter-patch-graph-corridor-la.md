# 2026-04-24 — Pollinator §7 close: ecoregion adapter + patch-graph corridor layer


Flipped `featureManifest` §7 `native-pollinator-biodiversity` from
`partial` → `done`. Shipped:

- `packages/shared/src/ecology/ecoregion.ts` — CEC Level III lookup
  (bbox → nearest-centroid, 400 km fallback) across 7 eastern-NA
  ecoregions covering Milton ON through mid-Atlantic. Plant lists
  (~150 curated species) ship as JSON.
- `packages/shared/src/ecology/pollinatorHabitat.ts` — heuristic accepts
  `ecoregionId` + `corridorReadiness`; output adds `ecoregion`,
  `ecoregionPlants`, `connectivityBand`. Weights exported for server re-use.
- `apps/api/src/services/terrain/PollinatorOpportunityProcessor.ts` —
  5×5 synthesized patch grid, Mulberry32-seeded deterministic cover-class
  assignment, 4-neighbor patch-graph connectivity, `corridorReadiness`
  index. Wires in after `SoilRegenerationProcessor` in the soil-regen
  worker; failures are non-fatal.
- `apps/web/src/features/map/PollinatorHabitatOverlay.tsx` — now reads
  the new `pollinator_opportunity` layer directly. Fill = habitat quality,
  stroke weight/colour = connectivity role.
- `apps/web/src/features/dashboard/pages/EcologicalDashboard.tsx` —
  Corridor Connectivity metric, CEC ecoregion strip, recommended native
  species cards (species/habit/bloom window).

### Verification
- `packages/shared` + `apps/api` tsc: clean.
- `apps/web` tsc: only pre-existing errors in `PlantingToolDashboard.tsx`
  and `src/tests/financial/*.test.ts` (unrelated).
- `verify-scoring-parity.ts`: byte-identical scores across two runs.
  Pollinator layer is read-side only — `computeScores.ts` untouched.

### Honest scoping (caveats surfaced in layer + dashboard)
- Patch grid is synthesized from aggregate land-cover %, not polygonized
  land cover. For rigorous corridor analysis a polygonized land-cover
  source + raster LCP is required (deferred).
- Ecoregion lookup uses bbox + nearest-centroid — points near ecoregion
  boundaries will misclassify. Documented in output.

### Decision
[`wiki/decisions/2026-04-24-atlas-pollinator-ecoregion-corridor.md`](decisions/2026-04-24-atlas-pollinator-ecoregion-corridor.md)
