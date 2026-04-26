# 2026-04-24 — Pollinator ecoregion adapter + patch-graph corridor layer

**Status:** Accepted · **Scope:** Atlas shared + API + web · **Flips:** `featureManifest` §7 `native-pollinator-biodiversity` partial → done

## Context

`packages/shared/src/featureManifest.ts` has shipped §7
`native-pollinator-biodiversity` as `status: 'partial'` for two sprints. The
existing client-side `computePollinatorHabitat` heuristic scored suitability
from land-cover + wetlands but produced the same generic hardcoded
`nativePlantCategories` list ("Native bee forage," "Monarch host plants",
etc.) for every site — Milton ON and Rodale PA received identical
recommendations. There was no connectivity signal at all: the feature spec
called out "biodiversity corridor planning" and we were shipping nothing for
it. The `PollinatorHabitatOverlay` re-painted `soil_regeneration` zone
centroids with a three-band colour derived from `primaryIntervention` — a
proxy for planting opportunity, not for habitat quality, and not a distinct
data product.

Two realistic upgrade paths:

- **Option A — coarse but honest.** Vector patch-graph connectivity over a
  synthesized NxN grid sampled deterministically from aggregate land-cover
  %, paired with CEC Level III ecoregion lookup and hand-curated plant
  lists for the 7 ecoregions covering the pilot footprint (Ontario
  escarpment through mid-Atlantic). Dedicated `pollinator_opportunity`
  layer. Fits one session. Accurate to the limit of aggregate land-cover
  data.
- **Option B — rigorous.** Polygonized land cover + raster least-cost-path
  on a habitat-friction surface. Full patch graph from real spatial patches.
  Requires a new raster ingestion pipeline. Sprint-scale.

We chose A. The caveat ("patch grid is synthesized; for rigorous corridor
analysis a polygonized land-cover source + raster LCP is required") is
surfaced verbatim in the dashboard and the layer summary.

## Decision

### 1. Ecoregion adapter (`packages/shared/src/ecology/ecoregion.ts`)

CEC Level III ecoregions (not EPA Omernik III) because the pilot covers
both Ontario and the US eastern seaboard — CEC codes (`8.1.1`, `8.3.1`, …)
are harmonized across the US/CA/MX border. 7 ecoregion records
(bbox + centroid) ship in-bundle. `lookupEcoregion(lat, lng)` does
bbox-containment → nearest-centroid fallback within 400 km. Plant lists
(~18–25 species per ecoregion, ~150 total) live in
`packages/shared/src/ecology/data/pollinatorPlantsByEcoregion.json` — each
record carries scientific + common name, habit, bloom window, and
pollinator guilds. Honest scoping: we ship bbox+centroid pairs, **not**
full CEC shapefiles, because the shapefiles are multi-MB. Points near
boundaries will misclassify, and the pollinator heuristic caveats say so.

### 2. Heuristic upgrade (`packages/shared/src/ecology/pollinatorHabitat.ts`)

`computePollinatorHabitat` input now accepts optional `ecoregionId` and
`corridorReadiness`. Output adds:

- `ecoregion: { id, name } | null`
- `ecoregionPlants: PollinatorPlant[]` — curated species for the resolved
  ecoregion, empty when unknown (callers fall back to hardcoded
  `nativePlantCategories`)
- `connectivityBand: 'connected' | 'fragmented' | 'isolated' | 'unknown'`
  derived from the patch-graph `corridorReadiness` (`≥0.6 connected`,
  `≥0.3 fragmented`, else `isolated`; `null → unknown`)

`POLLINATOR_SUPPORTIVE_WEIGHTS` / `POLLINATOR_LIMITING_WEIGHTS` are now
exported so the server-side grid builder doesn't duplicate the weights.

### 3. Server processor (`apps/api/src/services/terrain/PollinatorOpportunityProcessor.ts`)

New 5×5 synthesized patch grid over the project bbox. Each cell is
assigned a cover class via largest-remainder allocation against the
aggregate `land_cover.classes` distribution, shuffled with a Mulberry32
PRNG seeded from `projectId` so runs are byte-deterministic.
Classification:

- `habitatQuality ∈ {high, moderate, low, hostile}` from supportive weight
- `connectivityRole ∈ {core, stepping_stone, isolated, matrix}` from
  4-neighbor supportive adjacency
- `corridorReadiness = (core + 0.5*step) / supportive` in [0,1]

Writes `project_layers.pollinator_opportunity` (new `LayerType`, added to
`constants/dataSources.ts`; new `PollinatorOpportunitySummary` added to
`layerSummary.ts`). Runs in the existing soil-regen BullMQ worker,
invoked **after** `soilRegenerationProcessor.process(projectId)` inside
a defensive `try/catch` — **pollinator failure is non-fatal** to the
Tier-3 soil-regen job (pollinator is read-side only; not a scoring input).
Soft-skips when `land_cover` summary isn't ready.

### 4. Overlay rewrite (`apps/web/src/features/map/PollinatorHabitatOverlay.tsx`)

Now reads `pollinator_opportunity` directly (not derived from
`soil_regeneration`). Fill colour keyed on `habitatQuality` (sage → gold
→ muted brown → slate red). Stroke weight + colour keyed on
`connectivityRole` (gold 3px ring for core hubs, chrome 2px for stepping
stones, red 1.5px ring for isolated loners, faint 0.5px for matrix).
Canonical fetch-on-visible + `style.load` re-sync pattern.

### 5. Dashboard surfacing (`EcologicalDashboard.tsx`)

Reads the `pollinator_opportunity` layer summary, passes `ecoregionId` +
`corridorReadiness` into `computePollinatorHabitat`, and renders:

- "Corridor Connectivity" metric replacing "Wetland Bonus"
- "CEC Ecoregion" strip (gold left-border) showing resolved ecoregion +
  code
- "Recommended Native Species" list (first 8 entries) with scientific /
  common / habit / bloom window — replaces generic category strings when
  ecoregion is resolved; falls back to `nativePlantCategories` when not

### 6. Scoring parity

`computeScores.ts` is **not** touched. `pollinator_opportunity` is not a
scoring component. `verify-scoring-parity.ts` still prints "Two
consecutive calls produced byte-identical scores" — delta remains 0.000
by construction.

## Consequences

- Milton ON (lat 43.51, lng -79.88) resolves to `8.1.1 Eastern Great
  Lakes Lowlands`; Rodale PA (40.52, -75.78) resolves to
  `8.3.1 Northern Piedmont`. Dashboards now show ecoregion-appropriate
  native species, not the same generic categories.
- `featureManifest` §7 `native-pollinator-biodiversity` flips
  `partial` → `done`. Section overall status remains `partial`
  (invasive-succession mapping, manual soil test entry, carbon
  sequestration potential map remain `planned`).
- The 5×5 patch grid is a synthesized proxy. Corridor readiness for a
  100-acre parcel vs a 2-acre parcel will both report as a 5×5 grid with
  approximate per-cell area. For rigorous analysis a polygonized
  land-cover source + raster LCP is required — explicitly deferred.

## References

- Xerces Society — *Farming for Bees* guidance (USDA NRCS CP-42)
- CEC *North American Environmental Atlas Level III* ecoregion codes
- `packages/shared/src/ecology/ecoregion.ts` — lookup implementation
- `packages/shared/src/ecology/pollinatorHabitat.ts` — client-side heuristic
- `apps/api/src/services/terrain/PollinatorOpportunityProcessor.ts` — server
- `apps/api/src/services/pipeline/DataPipelineOrchestrator.ts` lines 211+398 — wiring
