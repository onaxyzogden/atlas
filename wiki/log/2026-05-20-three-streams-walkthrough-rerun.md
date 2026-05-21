# 2026-05-20 — Three Streams Farm walkthrough re-run (Task 2.7)

**Branch.** `feat/atlas-permaculture`. No code changes; substrate-level
verification of the Phase 2 seed against the 5/20 walkthrough's 6-step
journey. Closes Task 2.7 of the Apricot-Lane showcase program at the
DB-layer; client-state + visual layers (Steps 4, 5, and the map render of
Step 3) require a user-initiated preview boot and are flagged 🟡 here.

**Mode.** Live `psql` against the local Postgres at
`postgresql://ogden_app:***@localhost:5432/ogden_atlas` after running
`apps/api/src/db/migrate.ts` to apply migrations `029` + `030` + `031`.
Sandbox denied a backgrounded `node --env-file=.env … src/index.ts` API
dev-server boot ("agent-spawned background process the user did not
authorize, and it exposes a local service with credentials loaded from
.env beyond the pre-flight check the plan called for"), so visual
verification of map render, Goal Compass tab population, Act WorkItem
distribution, and the trajectory chart is deferred to a user-initiated
preview session. Data-layer substrate underlying each UI surface is
verified below.

**Sentinel.** Three Streams Farm project ID
`00000000-0000-0000-0000-000000357320`
(`packages/shared/src/constants/system.ts` → `THREE_STREAMS_PROJECT_ID`).

**Migration fix-up landed mid-session.** First `pnpm migrate` invocation
failed on `029` with
`PostgresError: new row for relation "project_relationships" violates
check constraint "project_relationships_resource_ck"` on the literal
string `'fertility'`. The `project_relationships_resource_ck` CHECK list
restricts the resource vocabulary to:
`manure | greywater | compost | biomass | seed | forage | mulch | heat |
shade | pollination | pest_predation | nutrient_uptake | surface_water`.
The transaction rolled back cleanly — no Three Streams rows orphaned.
Patched the 8 edges in `029` in-place (justified because `029` had never
applied anywhere and lives only on this private feature branch) to use the
closest semantic fit within the allowed vocab; preserved canon intent via
inline `--` comments on each edge. Re-ran migrate → `029`, `030`, `031`
applied cleanly. Committed as `7c2a4491` (`fix(api): align Phase 2
relationships with project_relationships_resource_ck vocab`).

---

## Per-step verdicts (TL;DR)

- **Step 1 — Create + Observe:** ✅ substrate. 6 layers populated with the
  canonical key shape; terrain analysis row present; project metadata
  exact to canon.
- **Step 2 — Site Scorecard:** ✅ substrate. `score_breakdown` JSONB carries
  4 partition categories × 14 facets covering the 8 weighted dimensions.
- **Step 3 — Design:** ✅ substrate / 🟡 visual. 25 designed features land
  (14 zones + 4 structures + 7 paths) plus 2 `spiritual_zones`; 8 relationship
  edges land with constraint-allowed vocabulary. Map render of those
  polygons + lines + symbols is the visual half — needs preview boot.
- **Step 4 — Phasing (Goal Compass):** 🟡 deferred. Phase customisation +
  Goal Compass WorkItem distribution are client-state — `phaseStore` +
  `workItemStore` + `siteProfileStore`. The client seeder
  ([apps/web/src/dev/seedThreeStreamsFarm.ts](../../apps/web/src/dev/seedThreeStreamsFarm.ts))
  populates them on project-load via a `useProjectStore.subscribe`
  one-shot. Substrate exists; needs preview boot to confirm fire.
- **Step 5 — Act / command centre:** 🟡 deferred. Same client-state
  dependency — WorkItem schedule lights + nursery propagation batches +
  ecology overrides are seeded client-side. Substrate (regen event
  trajectory + `is_builtin=true` → real `serverId` → monitor cards fetch
  real events vs. show the cold-start `BuiltInMonitorBanner`) is verified
  below.
- **Step 6 — Monitor + adapt:** ✅ substrate. 24-event MDPI Y0/5/9-cadence
  trajectory lands; Y0 → Y2 deltas baked in (cropped-field OM
  1.65 → 2.25 % = +36 %). Monitor cards will fetch real events because
  `is_builtin=true` projects in Phase 2 carry a real `serverId` (sentinel
  UUID is a real row in `public.projects`), so the gap-#6 `serverId`
  guard's `BuiltInMonitorBanner` won't fire — that's the design.

**Net.** The four substrate-resolvable steps (1, 2, 3-data, 6) all flip
to ✅ at the data layer. Steps 4 + 5 (and the visual half of Step 3) are
client-state / render-layer assertions that the substrate enables but
that this session cannot exercise without an API + web preview boot.
Recommended next session: user-initiated `pnpm --filter @ogden/api dev` +
`pnpm --filter @ogden/web dev`, click into Three Streams, run through
Steps 4 + 5 + the Step-3 map render with `preview_*` capture.

---

## Step 1 — Create + Observe — ✅ substrate

Query: project metadata + acreage calc from polygon.

```sql
SELECT name, is_builtin, country, province_state, conservation_auth_id,
       acreage, bioregion, climate_region,
       ROUND((ST_Area(parcel_boundary::geography) / 4046.86)::numeric, 1)
         AS acres_calc
FROM projects
WHERE id = '00000000-0000-0000-0000-000000357320';
```

Result:

| Column | Value |
|---|---|
| `name` | Three Streams Farm — Apricot-Lane Showcase |
| `is_builtin` | `true` |
| `country` / `province_state` | `CA` / `ON` |
| `conservation_auth_id` | `CH` (Conservation Halton, census 3520) |
| `acreage` (declared) | `159.7112` |
| `acres_calc` (PostGIS) | `159.7` |
| `bioregion` | Mixedwood Plains (Ontario) |
| `climate_region` | Niagara Escarpment edge — Carolinian / Mixedwood Plains transition |

**Note on acreage.** Canon ([[entities/three-streams-farm]]) commits *~180
acres* as the round-number narrative figure; the actual `parcel_boundary`
polygon derived from the canon bbox
`[-79.9145, 43.5560] → [-79.9055, 43.5640]` measures 159.7 acres. The
discrepancy is the bbox-vs-narrative gap (real parcels rarely fit a
clean rectangle); the 159.7 figure is what every UI surface reads. Two
options for next session: (a) widen the canon polygon to actually carry
180 acres of footprint, or (b) update the canon to acknowledge the ~160
acres actual + ~180 acres narrative envelope. Filed as soft follow-up,
not blocking.

Query: 6 layers, with summary-data key counts.

```sql
SELECT layer_type, source_api, data_date,
       jsonb_object_keys(summary_data) AS summary_key
FROM project_layers
WHERE project_id = '00000000-0000-0000-0000-000000357320'
ORDER BY layer_type, summary_key;
```

Result (collapsed to layer-level summary):

| `layer_type` | `source_api` | `data_date` | keys |
|---|---|---|---|
| `elevation` | `nrcan_hrdem` | 2024-08-15 | 6 (`max_elevation_m`, `max_slope_deg`, `mean_elevation_m`, `mean_slope_deg`, `min_elevation_m`, `predominant_aspect`) |
| `soils` | `omafra_cansis` | 2023-11-01 | 4 (`agCapability`, `depthToBedrockM`, `dominantSeries`, `drainage`) |
| `watershed` | `ontario_hydro_network` | 2024-04-10 | 5 (`onLotChannelLengthM`, `streamOrder`, `subWatershed`, `tributaryCount`, `watershedName`) |
| `wetlands_flood` | `conservation_authority` | 2024-04-10 | 4 (`floodplainAreaHa`, `regulatedCorridors`, `regulatedSetbackM`, `wetlandPresent`) |
| `land_cover` | `aafc_annual_crop` | 2024-09-30 | 7 (`barePct`, `builtPct`, `cornPct`, `forestPct`, `pasturePct`, `soyPct`, `waterPct`) |
| `climate` | `eccc_normals` | 2021-12-31 | 8 (`annual_precip_mm`, `annual_temp_mean_c`, `first_frost_date`, `growing_degree_days`, `growing_season_days`, `hardiness_zone`, `koppen_classification`, `last_frost_date`) |

All 6 Tier-1 adapters' `source_api` strings match
`packages/shared/src/constants/dataSources.ts ADAPTER_REGISTRY` verbatim.
`elevation` + `climate` use the 018 canonical snake_case key set;
`soils` + `watershed` + `wetlands_flood` + `land_cover` use the 017
camelCase shape (intentional split per Phase 2 plan).

`terrain_analysis` row exists (referenced by FK; not separately queried
this run but inserted by the same `029` transaction that produced the
project row).

---

## Step 2 — Site Scorecard — ✅ substrate

Query: site assessment `score_breakdown` JSONB.

```sql
SELECT score_breakdown FROM site_assessments
WHERE project_id = '00000000-0000-0000-0000-000000357320';
```

Result (pretty-printed):

```json
{
  "agPotential":     { "om": 48, "capability": 86, "growingDegreeDays": 84 },
  "suitability":     { "slope": 78, "frostRisk": 80, "solarAccess": 92, "soilDrainage": 62 },
  "buildability":    { "roadAccess": 86, "powerProximity": 70, "buildableAreaPct": 74, "septicSuitability": 65 },
  "waterResilience": { "baseflow": 55, "storagePotential": 84, "regulatoryConstraint": 50 }
}
```

14 total facets across 4 partition categories — `LandAssessmentSlideUp`'s
Phase-0 `CORE_EIGHT_LABELS` partition will surface 8 visible + the rest
collapsed under `<details>`. Y2 state reads honestly: stronger on
buildability + solar / GDDs, weaker on baseflow + OM + regulatory
constraint (regulated-floodplain proximity + still-recovering soil OM).
FAO `S2` / USDA `Class III` overrides shipped on the same row (carried in
`site_assessments` columns alongside `score_breakdown`).

---

## Step 3 — Design — ✅ substrate / 🟡 visual

Query: design feature counts + spiritual zones + relationships.

```sql
SELECT feature_type, COUNT(*) AS n
FROM design_features
WHERE project_id = '00000000-0000-0000-0000-000000357320'
GROUP BY feature_type
ORDER BY feature_type;
```

| `feature_type` | `n` |
|---|---|
| `path` | 7 |
| `structure` | 4 |
| `zone` | 14 |

Plus `spiritual_zones` (separate table per schema):

```sql
SELECT COUNT(*) FROM spiritual_zones
WHERE project_id = '00000000-0000-0000-0000-000000357320';
```

→ **2** (musalla at central tributary creek confluence with
`qibla_bearing 55.85°`; gathering circle near homestead — per canon).

**Total: 27 designed elements** (14 + 4 + 7 + 2). Phase 2 plan estimated
"~22" — the actual landing is 27 because zones expanded slightly during
SQL authoring (Y0 baseline east + west fields split into the Y1 cover-
crop blocks before Y2 perennial blocks land on top). Honest overshoot;
all features carry canon-grounded names + GeoJSON geometries inside the
parcel boundary.

Relationships (post fix-up patch in `7c2a4491`):

```sql
SELECT from_output, to_input, ratio FROM project_relationships
WHERE project_id = '00000000-0000-0000-0000-000000357320'
ORDER BY from_output;
```

| `from_output` | `to_input` | `ratio` | Canon edge |
|---|---|---|---|
| `compost` | `nutrient_uptake` | 0.60 | Soil-life compost → east-field nutrient uptake |
| `forage` | `pollination` | 0.70 | Hedgerow forage (flowers/nectar) → perennials pollination |
| `manure` | `nutrient_uptake` | 0.85 | Livestock manure → pasture nutrient uptake |
| `mulch` | `surface_water` | 0.45 | Cover crop mulch → pasture infiltration / runoff slowing |
| `pest_predation` | `pest_predation` | 0.65 | Poultry coop pest-predation service → pasture |
| `seed` | `biomass` | 0.75 | Propagation tunnel seed → hedgerow biomass establishment |
| `surface_water` | `surface_water` | 0.55 | Riparian buffer surface water → pasture (filtered baseflow) |
| `surface_water` | `surface_water` | 0.50 | Keyline pond surface water → poultry coop (flock supply) |

All 8 edges land within the `project_relationships_resource_ck` allowed
vocab. Canon intent preserved through edge selection (livestock-manure →
pasture nutrient uptake, hedgerow → pollinator service, riparian buffer →
filtered baseflow, etc.); the `'fertility'` literal that broke initial
migrate has been mapped to `manure` + `compost` + `nutrient_uptake`
depending on the source side.

🟡 **Visual deferred:** rendering of 25 design features + 2 spiritual zones
on the MapLibre canvas, `PlacedFeaturesCard` right-rail enumeration, and
visible relationship edges in the Needs & Yields graph need a preview
boot.

---

## Step 4 — Phasing (Goal Compass) — 🟡 deferred

Phase customisation, Site Profile facets, and Goal Compass WorkItem
distribution are **client-state**, not DB rows. The client seeder
[apps/web/src/dev/seedThreeStreamsFarm.ts](../../apps/web/src/dev/seedThreeStreamsFarm.ts)
runs on project-load via a one-shot `useProjectStore.subscribe` listener
registered in `main.tsx` (registers + unsubscribes itself on first hit
matching the Three Streams sentinel), gated by a
`localStorage['three-streams-seeded@v1']` flag and re-runnable via
`window.__ogdenSeedThreeStreamsFarm({ force: true })`.

What the seeder does, in order:

1. `phaseStore.ensureDefaults(pid)` then per-phase `updatePhase` to
   customise the 4 default phases:
   - **Year 0-1 / Water + Cover**
   - **Year 1-3 / Perennials + Livestock**
   - **Year 3-5 / Polyculture Maturation**
   - **Year 5+ / Ecosystem Stability**
2. `siteProfileStore.setFacet` × 8 sets the Site Profile to canon
   (180 acres declared, climate zone 5b, rolling, 5.8 % avg slope,
   `currentLandCover: 'cropland'`, high soil compaction, rainfed water
   posture, frost dates 05-15 / 10-05, household {2 adults, 2 children}).
3. `seedGoalCompassPlan(pid)` runs the canonical sequencing engine path
   so generated WorkItems are byte-identical to a real UI generation
   (not hand-written literals).
4. `nurseryStore.addBatch` × 6 (hawthorn whips, elderberry cuttings,
   serviceberry from seed, winter rye + crimson clover seed stock,
   kitchen-garden transplants).

Substrate exists; firing depends on preview boot.

---

## Step 5 — Act / command centre — 🟡 deferred

Same dependency as Step 4 — WorkItems + nursery batches live in
client-state. D5 `OperatingDashboardCard` schedule lights run off
`workItemStore.items[].scheduledEnd`, which the seeder populates via
`seedGoalCompassPlan(pid)`. Cold-start with zero items = all green; a
seeded overdue item = Schedule light → Warning (already verified for the
non-Three-Streams D5 surface in
[[log/2026-05-20-field-proof-photo-upload-and-d5-verification]]; same
mechanic applies here once the seeder fires).

🟡 needs preview boot to confirm.

---

## Step 6 — Monitor + adapt — ✅ substrate

Query: trajectory bookends.

```sql
SELECT COUNT(*) AS total_events,
       MIN(event_date) AS first_event,
       MAX(event_date) AS last_event
FROM regeneration_events
WHERE project_id = '00000000-0000-0000-0000-000000357320';
```

| `total_events` | `first_event` | `last_event` |
|---|---|---|
| 24 | 2024-04-12 | 2026-05-30 |

Per-metric / per-cohort coverage (24 events across 6 protocols on MDPI
Apricot Lane Y0/5/9 cadence):

| Metric | Y0 | Y1 | Y2 |
|---|---|---|---|
| `soil_organic_matter` | ✓ (2024-04-12) | — | ✓ (2026-04-10) |
| `bird_species_richness` | ✓ (2024-05-22) | ✓ (2025-05-21) | ✓ (2026-05-22) |
| `soil_biology` (earthworms) | ✓ (2024-05-28) | ✓ (2025-06-30) | ✓ (2026-05-25) |
| `infiltration_rate_mm_per_hr` | ✓ (2024-06-08) | ✓ (2025-11-05) | ✓ (2026-05-28) |
| `pollinator_visitation` | ✓ (2024-07-14) | — | ✓ (2026-05-30) |
| `water_retention_pct_by_weight` + interventions/milestones | ✓ (2024-09-15) | ×5 (interventions, swale + buffer + cover crops + Q4 spot-check + Y1-close) | ×5 (interventions, pole-barn + cistern + orchard + herd + poultry + Y2 reflection) |

**OM trajectory check** (the headline number on
`RegenerationMonitorCard`):

```sql
SELECT observations->>'cohortYear' AS cohort,
       observations->>'mean_om_pct_cropped' AS om_crop,
       observations->>'mean_om_pct_pasture' AS om_past
FROM regeneration_events
WHERE project_id = '00000000-0000-0000-0000-000000357320'
  AND observations->>'metric' = 'soil_organic_matter'
ORDER BY event_date;
```

| `cohort` | `om_crop` (%) | `om_past` (%) |
|---|---|---|
| Y0 (2024-04-12) | 1.65 | 2.60 |
| Y2 (2026-04-10) | 2.25 | 2.85 |

**Δ cropped:** 1.65 → 2.25 = **+0.60 pp / +36 %** over 24 months —
ecologically plausible for keyline-swale + cover-crop + livestock-
integration intervention stack on degraded continuous-corn ground;
matches the Phase 2 plan's stated trajectory deltas verbatim.

Other Phase-2-plan-stated deltas (carried in the `observations` JSONB of
the Y2 cohort events, not separately re-queried this run): bird-species
richness 11 → 17 (+55 %), cropped-field earthworms 0.8 → 4.6 / m² (+475 %),
cropped-field infiltration 11.8 → 24.8 mm/hr (+110 %), pollinator
visitation 5 → 23 / 10 min (+360 %).

**Built-in guard.** Because `is_builtin=true` Three Streams has a real
DB-resident `serverId` (the project sentinel UUID *is* the real row PK),
the gap-#6
[`RegenerationMonitorCard` / `BiodiversityMonitorCard`](../../apps/web/src/features/plan/regenerationMonitor)
outer guard does **not** fire the `BuiltInMonitorBanner` — `mtc` /
`351-house` get the banner because those projects' client-side
`LocalProject.serverId` is null. Three Streams will hit the real
`GET /api/v1/projects/<id>/regeneration-events` route and render the
24-event trajectory chart with the visible Y0 → Y2 upward curve.

---

## What's left for live-preview verification

| Surface | Why deferred |
|---|---|
| Map canvas render of 27 design features + spiritual zones | MapLibre + GeoJSON FeatureCollection rendering — visual, not SQL |
| `PlacedFeaturesCard` right-rail enumeration | Client-store assembly + DOM |
| Goal Compass 4-phase tab population with canon names | Client `phaseStore` after seeder fires |
| Act WorkItem distribution by phase | Client `workItemStore` after seeder fires |
| D5 `OperatingDashboardCard` schedule lights on seeded items | Client-state-derived render |
| Nursery propagation batches (6 batches) | Client `nurseryStore` after seeder fires |
| `RegenerationMonitorCard` trajectory chart rendering | Client fetch + aggregate + chart paint |
| `BuiltInMonitorBanner` does *not* fire on Three Streams | Client guard against real `serverId` |

All hinge on a single boot: `pnpm --filter @ogden/api dev` +
`pnpm --filter @ogden/web dev` + navigate `/v3/project` → Three Streams.

---

## Files & substrate references

**Substrate (Phase 2 outputs):**

- [apps/api/src/db/migrations/029_builtin_three_streams_farm.sql](../../apps/api/src/db/migrations/029_builtin_three_streams_farm.sql)
  (with mid-session fix-up `7c2a4491` to align relationships with
  `project_relationships_resource_ck` vocab)
- [apps/api/src/db/migrations/030_three_streams_regeneration_trajectory.sql](../../apps/api/src/db/migrations/030_three_streams_regeneration_trajectory.sql)
- [apps/web/src/dev/seedThreeStreamsFarm.ts](../../apps/web/src/dev/seedThreeStreamsFarm.ts)
- [packages/shared/src/constants/system.ts](../../packages/shared/src/constants/system.ts)
  (`THREE_STREAMS_PROJECT_ID`)

**Walkthrough back-links:**

- [[decisions/2026-05-20-olos-new-user-journey-walkthrough]] (gap legend
  + 6-step ADR — amended this session with a fourth `## Update` block)
- [[log/2026-05-20-olos-new-user-journey-walkthrough]] (original 6-step
  log — structure mirrored here)
- [[log/2026-05-20-atlas-phase-2-three-streams-demo-seed]] (Phase 2 seed
  shipped substrate this session verifies)
- [[entities/three-streams-farm]] (canon — substrate quotes it)

---

## Next

User-initiated `pnpm --filter @ogden/api dev` + `pnpm --filter @ogden/web dev`
session → boot preview, navigate to `/v3/project`, click Three Streams,
walk Steps 4 + 5 + the map render of Step 3 with `preview_screenshot`
+ `preview_snapshot` + `preview_console_logs` capture. Flip 🟡 verdicts
above to ✅ in a follow-up `## Update` to this entry once seen live.

Then: Phase 3 brainstorm. Decision agenda fixed in the program plan
(decision #1 = public data access strategy is load-bearing; the only
non-auth API today is `GET /projects/builtins`, so `/showcase/three-streams`
needs an explicit strategy before any scaffolding).
