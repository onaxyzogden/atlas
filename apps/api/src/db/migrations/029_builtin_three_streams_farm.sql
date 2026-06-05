-- 029_builtin_three_streams_farm.sql
-- 2026-05-20 — Phase 2 builtin: "Three Streams Farm" showcase project
--
-- Background:
--   Phase 1 of the Apricot-Lane-inspired OLOS showcase program ratified
--   the Three Streams Farm canon at wiki/entities/three-streams-farm.md.
--   This migration instantiates the canon as a server-side builtin project
--   so every authenticated user sees a fully-populated reference farm at
--   the complexity level the OLOS positioning page (north-star) names.
--
--   The farm is fictional. The Halton-region parcel underneath it is real,
--   so the OLOS adapter chain (CH + OMAFRA + OHN + AAFC + NRCan + ECCC)
--   returns truthful data end-to-end. Attribution wording is binding:
--   "inspired by farms like Apricot Lane Farms and the rehabilitation arc
--   shown in The Biggest Little Farm; Three Streams Farm is a fictional
--   Ontario operation."
--
--   See:
--     - wiki/entities/three-streams-farm.md  (canon — source of truth)
--     - wiki/log/2026-05-20-atlas-phase-1-three-streams-canon.md
--     - apps/api/src/db/migrations/017_builtin_sample_project.sql  (template)
--
-- Mechanism:
--   Follows the 017 "351 House — Atlas Sample" pattern verbatim. Single
--   migration covering: project + parcel + 6 layers + terrain + assessment
--   + design features + spiritual zones + relationships. The 24-month
--   MDPI-cadence regeneration trajectory is in a sibling migration
--   (030_three_streams_regeneration_trajectory.sql).
--
--   Idempotent: every INSERT uses ON CONFLICT ... DO NOTHING keyed on
--   pinned UUIDs / unique tuples. Re-running is a no-op.
--
-- Sentinel UUIDs (Three Streams family — 357320 = ASCII-like "3S"):
--   SYSTEM_USER_ID                      = 00000000-0000-0000-0000-00000000a71a (reused)
--   THREE_STREAMS_PROJECT_ID            = 00000000-0000-0000-0000-000000357320
--   design_features family              = 00000000-0000-0000-0000-0000df3500NN
--   spiritual_zones family              = 00000000-0000-0000-0000-00000352e0NN
--   project_relationships family        = 00000000-0000-0000-0000-0000ed3500NN

-- ────────────────────────────────────────────────────────────────────────
-- A. Project — Three Streams Farm (rural NE Milton, ~180 acres)
-- ────────────────────────────────────────────────────────────────────────
--
-- Boundary is a ~180-acre rectangle on the canon bbox
--   [-79.9145, 43.5560] → [-79.9055, 43.5640]
-- ~830 m E-W × ~890 m N-S in EPSG:4326 (WGS84). The lot sits on the
-- Sixteen Mile Creek headwaters; three small tributaries thread the
-- parcel and give the farm its name. Acreage is recomputed via the
-- WGS84 spheroid (::geography) for location-independent value.

INSERT INTO projects (
  id,
  owner_id,
  is_builtin,
  name,
  description,
  status,
  project_type,
  parcel_boundary,
  centroid,
  acreage,
  address,
  parcel_id,
  country,
  province_state,
  conservation_auth_id,
  timezone,
  units,
  owner_notes,
  zoning_notes,
  access_notes,
  water_rights_notes,
  climate_region,
  bioregion,
  restrictions_covenants,
  data_completeness_score,
  metadata
)
SELECT
  '00000000-0000-0000-0000-000000357320'::uuid,
  '00000000-0000-0000-0000-00000000a71a'::uuid,
  true,
  'Three Streams Farm — Apricot-Lane Showcase',
  'A fictional ~180-acre rural Milton (Halton Region) farm on the Sixteen Mile Creek headwaters — three small tributaries thread the lot. Purchased 2024 as eroded continuous-corn ground; in Year 2 (2026) of an 8-year rehabilitation arc inspired by farms like Apricot Lane Farms and the rehabilitation narrative shown in The Biggest Little Farm. The data substrate underneath is real (Conservation Halton + OMAFRA + OHN + AAFC + NRCan + ECCC adapters); the farm itself is a showcase canon, not an operating business.',
  'active',
  'regenerative_farm',
  ST_Multi(ST_GeomFromGeoJSON(
    '{"type":"Polygon","coordinates":[[[-79.9145,43.5560],[-79.9055,43.5560],[-79.9055,43.5640],[-79.9145,43.5640],[-79.9145,43.5560]]]}'
  )),
  ST_SetSRID(ST_MakePoint(-79.9100, 43.5600), 4326),
  ST_Area(
    ST_GeomFromGeoJSON('{"type":"Polygon","coordinates":[[[-79.9145,43.5560],[-79.9055,43.5560],[-79.9055,43.5640],[-79.9145,43.5640],[-79.9145,43.5560]]]}')::geography
  ) / 4046.86,
  'Lot 14, Concession 6 (geographic Trafalgar / now Town of Milton), Halton Region, ON',
  '24-09-090-000-14600',
  'CA',
  'ON',
  'CH',
  'America/Toronto',
  'metric',
  'Fictional showcase farm — purchased 2024 (Y0) as 180 acres of eroded continuous-corn rural Milton ground at the toe of the Niagara Escarpment. Y2 (2026) loadable state: keyline swales + riparian buffers in (Y1), first cow-calf herd landing (~80 head Black Angus / Devon-cross on 3-day rotational moves), mobile poultry (~200-bird layer flock + seasonal broiler shifts) following at 3-day lag, first 3-acre orchard block (apple + pear + plum) on the south-facing bench, pole barn + egg-pack room at the access node.',
  'A2 (Rural) zone under Town of Milton Zoning By-law 144-2003. Permits primary dwelling, accessory farm structures, on-farm sales of produce/eggs from the parcel, and livestock at standard nutrient management densities. Conservation Halton regulated area (O.Reg. 162/06) applies along all three creek tributaries — 30 m setback restriction on diversion/grading. Niagara Escarpment Plan transition zone applies to the western escarpment-edge strip.',
  'Single municipal road frontage on the south boundary (rural concession road). Gravel farm lane runs north from the road to the homestead node at the geographic centre, branching to the pole barn and egg-pack room. Internal grass tracks follow the paddock subdivision laid out Y2 onward.',
  'Conservation Halton (CH) regulated area covers a ~30 m corridor along each of the three Sixteen Mile Creek tributaries crossing the lot — surface-water diversion not permitted within the setback. Two dug wells (homestead + livestock paddock cluster), tested annually. No municipal water connection. PGMN groundwater coverage confirms a stable upper-overburden aquifer at ~14 m depth.',
  'Niagara Escarpment edge — Carolinian / Mixedwood Plains transition',
  'Mixedwood Plains (Ontario)',
  'Conservation Halton regulated area on all three tributary corridors (O.Reg. 162/06). Niagara Escarpment Plan transition designation on the western strip. No registered conservation easements on the working land.',
  78.0,
  jsonb_build_object(
    'climateRegion', 'Niagara Escarpment edge — Carolinian / Mixedwood Plains transition',
    'bioregion', 'Mixedwood Plains (Ontario)',
    'county', 'Halton Region',
    'municipality', 'Town of Milton',
    'legalDescription', 'PT LT 14 CON 6 TRAFALGAR; TOWN OF MILTON',
    'fieldObservations', 'Three small Sixteen Mile Creek tributaries thread the lot (the farm namesake). Y0 baseline: depleted topsoil under 14-year continuous-corn rotation, plow pan at ~18 cm, organic matter 1.4–1.9% on cropped portions, ephemeral cut gully on the south slope, single ageing windbreak along the north edge, no riparian buffer on any of the three tributaries. Y2 trajectory: keyline swales + buffers installed Y1, first cow-calf + mobile poultry landing Y2.',
    'restrictionsCovenants', 'Conservation Halton regulated area on the three creek corridors (O.Reg. 162/06). Niagara Escarpment Plan transition designation on the western strip.',
    'mapProjection', 'EPSG:4326 (WGS84) for storage; UTM 17N (EPSG:26917) for area calc',
    'soilNotes', jsonb_build_object(
      'ph', '6.6 (pasture half, 2025-09 lab test); 6.9 (former crop half, 2025-09 lab test)',
      'organicMatter', '1.4–1.9% baseline (Y0, 2024 row-crop ground); 2.1–2.6% Y2 trajectory on pasture half',
      'compaction', 'Plow pan documented at 18 cm depth across the row-crop half (Y0). Subsoiled along contour where Y1 swales were cut; remainder addressed via cover-crop tap-root + livestock impact Y2 onward.',
      'biologicalActivity', 'Earthworm casts negligible at Y0 on row-crop half (counts 0–2/m²); rising in Y1 cover-crop blocks (4–6/m² post-rye+clover); pasture half holds 8–12/m² steady.'
    ),
    'centerLat', 43.5600,
    'centerLng', -79.9100,
    'showcaseProgram', jsonb_build_object(
      'program', 'Apricot-Lane-inspired OLOS showcase',
      'attribution', 'inspired by farms like Apricot Lane Farms and the rehabilitation arc shown in The Biggest Little Farm; Three Streams Farm is a fictional Ontario operation',
      'yearOfShowcase', 'Y2 (2026) — primary loadable demo state',
      'forwardScenes', ARRAY['Y5 (2029)', 'Y8 (2032)'],
      'canonWikiPath', 'wiki/entities/three-streams-farm.md'
    )
  )
ON CONFLICT (id) DO NOTHING;

-- ────────────────────────────────────────────────────────────────────────
-- B. Tier-1 data layers (6 rows: elevation, soils, watershed, wetlands,
--    land cover, climate). Elevation + climate use canonical snake_case
--    keys per migration 018; other layers follow 017 camelCase precedent.
-- ────────────────────────────────────────────────────────────────────────

INSERT INTO project_layers (project_id, layer_type, source_api, fetch_status, confidence, data_date, attribution_text, summary_data, metadata, fetched_at)
VALUES
  ('00000000-0000-0000-0000-000000357320', 'elevation', 'nrcan_hrdem', 'complete', 'high', '2024-08-15',
    'Natural Resources Canada — High Resolution Digital Elevation Model (HRDEM), 1 m LiDAR, Halton mosaic 2024.',
    '{"min_elevation_m": 218.4, "max_elevation_m": 262.7, "mean_elevation_m": 238.6, "mean_slope_deg": 5.8, "max_slope_deg": 13.4, "predominant_aspect": "S"}'::jsonb,
    '{"resolutionM": 1, "datum": "CGVD2013", "tileCount": 9, "creekCutDepthM": 4.2}'::jsonb,
    now() - interval '7 days'),
  ('00000000-0000-0000-0000-000000357320', 'soils', 'omafra_cansis', 'complete', 'medium', '2023-11-01',
    'OMAFRA / CanSIS — Soil Survey of Halton County (SLC v3.2).',
    '{"dominantSeries": "Chinguacousy clay loam + Oneida loam complex", "drainage": "Imperfectly to moderately well drained", "agCapability": "Class 2 (mechanical limitation: stoniness on escarpment edge) / Class 3 (drainage limitation in tributary swales)", "depthToBedrockM": 1.4}'::jsonb,
    '{"polygonCount": 5, "primaryComponent": "CHG", "primaryPct": 58, "secondaryComponent": "ONE", "secondaryPct": 27}'::jsonb,
    now() - interval '7 days'),
  ('00000000-0000-0000-0000-000000357320', 'watershed', 'ontario_hydro_network', 'complete', 'high', '2024-04-10',
    'Ontario Hydro Network (OHN) — Conservation Halton sub-watershed layer.',
    '{"watershedName": "Sixteen Mile Creek — Upper / Headwaters", "subWatershed": "Trafalgar Tributaries (3 branches on-lot)", "streamOrder": 1, "tributaryCount": 3, "onLotChannelLengthM": 1180}'::jsonb,
    '{"creekIntermittent": true, "regulatedAreaPct": 18, "branchNames": ["west branch", "central branch", "east branch"]}'::jsonb,
    now() - interval '7 days'),
  ('00000000-0000-0000-0000-000000357320', 'wetlands_flood', 'conservation_authority', 'complete', 'high', '2024-04-10',
    'Conservation Halton — Regulated Areas Layer (Ontario Regulation 162/06).',
    '{"floodplainAreaHa": 2.1, "wetlandPresent": false, "regulatedSetbackM": 30, "regulatedCorridors": 3}'::jsonb,
    '{"regulationCode": "O.Reg.162/06", "permitRequiredFor": ["grading within 30 m of any tributary centreline", "channel modification of any kind", "structure placement within the regulated corridor"]}'::jsonb,
    now() - interval '7 days'),
  ('00000000-0000-0000-0000-000000357320', 'land_cover', 'aafc_annual_crop', 'complete', 'high', '2024-09-30',
    'AAFC Annual Crop Inventory 2024 — 30 m raster.',
    '{"forestPct": 9, "pasturePct": 14, "cornPct": 62, "soyPct": 8, "builtPct": 2, "waterPct": 1, "barePct": 4}'::jsonb,
    '{"resolutionM": 30, "yearsAnalyzed": [2020, 2021, 2022, 2023, 2024], "baselineSignature": "continuous corn-soy rotation (14 of 14 years showing corn or soy on dominant cropped polygon)"}'::jsonb,
    now() - interval '7 days'),
  ('00000000-0000-0000-0000-000000357320', 'climate', 'eccc_normals', 'complete', 'high', '2021-12-31',
    'Environment and Climate Change Canada — 1991–2020 Climate Normals, Georgetown WWTP station (closest representative).',
    '{"annual_precip_mm": 885, "growing_season_days": 152, "growing_degree_days": 2780, "hardiness_zone": "5b", "annual_temp_mean_c": 7.4, "koppen_classification": "Dfb", "first_frost_date": "2025-10-12", "last_frost_date": "2025-05-08"}'::jsonb,
    '{"stationId": "6152695", "stationName": "Georgetown WWTP", "distanceKm": 11.2}'::jsonb,
    now() - interval '7 days')
ON CONFLICT (project_id, layer_type) DO NOTHING;

-- ────────────────────────────────────────────────────────────────────────
-- C. Terrain analysis (Tier 3) — single row per project (UNIQUE).
--    Rolling Sixteen Mile Creek headwaters: 4–8% mean slope band, mixed
--    aspect (overall south-tending), tributary valleys cut to ~4 m.
-- ────────────────────────────────────────────────────────────────────────

INSERT INTO terrain_analysis (project_id, elevation_min_m, elevation_max_m, elevation_mean_m, slope_min_deg, slope_max_deg, slope_mean_deg, aspect_dominant)
VALUES (
  '00000000-0000-0000-0000-000000357320',
  218.4, 262.7, 238.6,
  0.3, 13.4, 5.8,
  'S'
)
ON CONFLICT (project_id) DO NOTHING;

-- ────────────────────────────────────────────────────────────────────────
-- D. Site assessment (current version) — Y2 recovering-but-still-degraded
--    state. Lower water-resilience + soil scores reflect baseline still
--    anchoring most readings; buildability mid-range (rural concession +
--    new pole barn); ag potential strong (Class 2 soils, southern
--    aspect, adequate GDD).
-- ────────────────────────────────────────────────────────────────────────

INSERT INTO site_assessments (
  project_id, version, is_current, confidence,
  overall_score,
  score_breakdown, flags, needs_site_visit, data_sources_used
)
SELECT
  '00000000-0000-0000-0000-000000357320'::uuid,
  1,
  true,
  'medium',
  68.0,
  '{"suitability": {"slope": 78, "soilDrainage": 62, "frostRisk": 80, "solarAccess": 92}, "buildability": {"roadAccess": 86, "powerProximity": 70, "septicSuitability": 65, "buildableAreaPct": 74}, "waterResilience": {"baseflow": 55, "regulatoryConstraint": 50, "storagePotential": 84}, "agPotential": {"capability": 86, "om": 48, "growingDegreeDays": 84}}'::jsonb,
  '[{"flag": "regulated_creek_corridors", "severity": "info", "message": "Conservation Halton regulated area (O.Reg.162/06) on all three tributary corridors. 30 m setback restricts grading, structure placement, and diversion."}, {"flag": "baseline_om_low", "severity": "warning", "message": "Soil organic matter 1.4–1.9% on Y0 row-crop half. Y1+Y2 cover-crop + livestock rotation showing recovery into 2.1–2.6% band on pasture half."}, {"flag": "compaction_plow_pan", "severity": "info", "message": "Plow pan documented at 18 cm depth across the row-crop half (Y0). Addressed by Y1 keyline subsoiling along contour swales; pasture half resolved Y2 via root structure + livestock impact."}, {"flag": "niagara_escarpment_transition", "severity": "info", "message": "Western strip in Niagara Escarpment Plan transition designation. Structure setbacks + tree-cutting rules apply on the escarpment-edge slope."}]'::jsonb,
  false,
  ARRAY['elevation', 'soils', 'watershed', 'wetlands_flood', 'land_cover', 'climate']
WHERE NOT EXISTS (
  SELECT 1 FROM site_assessments
  WHERE project_id = '00000000-0000-0000-0000-000000357320' AND is_current = true
);

-- ────────────────────────────────────────────────────────────────────────
-- E. Design features — Y0 anchors (existing degraded ground), Y1 (water +
--    cover crops + riparian buffers), Y2 (livestock + first orchard +
--    farmstead structures), Y3+ planned (paddock subdivision, additional
--    orchards). Geometry is offset relative to canon centroid + bbox.
-- ────────────────────────────────────────────────────────────────────────

INSERT INTO design_features (id, project_id, feature_type, subtype, geometry, label, properties, phase_tag, sort_order)
VALUES
  -- Y0 anchors: existing degraded cropland (east + west fields), single legacy windbreak
  ('00000000-0000-0000-0000-0000df35e001', '00000000-0000-0000-0000-000000357320', 'zone', 'zone_baseline_west_field',
    ST_GeomFromGeoJSON('{"type":"Polygon","coordinates":[[[-79.9145,43.5560],[-79.9105,43.5560],[-79.9105,43.5615],[-79.9145,43.5615],[-79.9145,43.5560]]]}'),
    'West Field — Y0 baseline (continuous-corn)', '{"baselineCondition":"depleted topsoil, plow pan 18 cm, OM 1.4-1.9%","cropHistory":"14-year corn-soy rotation"}', 'p1', 0),
  ('00000000-0000-0000-0000-0000df35e002', '00000000-0000-0000-0000-000000357320', 'zone', 'zone_baseline_east_field',
    ST_GeomFromGeoJSON('{"type":"Polygon","coordinates":[[[-79.9095,43.5560],[-79.9055,43.5560],[-79.9055,43.5615],[-79.9095,43.5615],[-79.9095,43.5560]]]}'),
    'East Field — Y0 baseline (continuous-corn)', '{"baselineCondition":"depleted topsoil, plow pan 18 cm, OM 1.4-1.9%","cropHistory":"14-year corn-soy rotation"}', 'p1', 1),
  ('00000000-0000-0000-0000-0000df35e003', '00000000-0000-0000-0000-000000357320', 'structure', 'windbreak',
    ST_GeomFromGeoJSON('{"type":"LineString","coordinates":[[-79.9145,43.5640],[-79.9055,43.5640]]}'),
    'Legacy North Windbreak (Y0 inherited)', '{"rows":1,"species":["norway spruce"],"establishedYear":1998,"condition":"ageing, gappy"}', 'p1', 2),

  -- Y1 (2025) — water + cover. Three riparian buffers along the tributaries; keyline swales on the two steeper sub-watersheds; cover-crop blocks.
  ('00000000-0000-0000-0000-0000df35e004', '00000000-0000-0000-0000-000000357320', 'path', 'riparian_buffer',
    ST_GeomFromGeoJSON('{"type":"LineString","coordinates":[[-79.9135,43.5635],[-79.9128,43.5605],[-79.9120,43.5570]]}'),
    'West-branch riparian buffer (Y1)', '{"setbackM":30,"speciesMix":["red-osier dogwood","nannyberry","crack willow","reed canary grass"],"establishedYear":2025,"channelLengthM":410}', 'p1', 3),
  ('00000000-0000-0000-0000-0000df35e005', '00000000-0000-0000-0000-000000357320', 'path', 'riparian_buffer',
    ST_GeomFromGeoJSON('{"type":"LineString","coordinates":[[-79.9100,43.5640],[-79.9100,43.5600],[-79.9100,43.5560]]}'),
    'Central-branch riparian buffer (Y1)', '{"setbackM":30,"speciesMix":["red-osier dogwood","elderberry","silver maple","sedge mix"],"establishedYear":2025,"channelLengthM":480}', 'p1', 4),
  ('00000000-0000-0000-0000-0000df35e006', '00000000-0000-0000-0000-000000357320', 'path', 'riparian_buffer',
    ST_GeomFromGeoJSON('{"type":"LineString","coordinates":[[-79.9075,43.5640],[-79.9070,43.5610],[-79.9065,43.5575]]}'),
    'East-branch riparian buffer (Y1)', '{"setbackM":30,"speciesMix":["red-osier dogwood","serviceberry","staghorn sumac","native grass mix"],"establishedYear":2025,"channelLengthM":290}', 'p1', 5),
  ('00000000-0000-0000-0000-0000df35e007', '00000000-0000-0000-0000-000000357320', 'path', 'swale',
    ST_GeomFromGeoJSON('{"type":"LineString","coordinates":[[-79.9143,43.5585],[-79.9108,43.5588]]}'),
    'West-branch keyline swale (Y1)', '{"lengthM":290,"slopePct":1.0,"plantedWith":"comfrey + black locust","subsoiledDepthCm":35}', 'p1', 6),
  ('00000000-0000-0000-0000-0000df35e008', '00000000-0000-0000-0000-000000357320', 'path', 'swale',
    ST_GeomFromGeoJSON('{"type":"LineString","coordinates":[[-79.9093,43.5588],[-79.9057,43.5590]]}'),
    'East-branch keyline swale (Y1)', '{"lengthM":300,"slopePct":1.1,"plantedWith":"comfrey + sea buckthorn","subsoiledDepthCm":35}', 'p1', 7),
  ('00000000-0000-0000-0000-0000df35e009', '00000000-0000-0000-0000-000000357320', 'zone', 'zone_cover_crop_winter_rye',
    ST_GeomFromGeoJSON('{"type":"Polygon","coordinates":[[[-79.9140,43.5565],[-79.9110,43.5565],[-79.9110,43.5595],[-79.9140,43.5595],[-79.9140,43.5565]]]}'),
    'Y1 Cover Crop — Winter Rye + Crimson Clover (West)', '{"speciesMix":["winter rye","crimson clover","hairy vetch"],"seedingDate":"2025-09-20","areaHa":3.2}', 'p1', 8),
  ('00000000-0000-0000-0000-0000df35e00a', '00000000-0000-0000-0000-000000357320', 'zone', 'zone_cover_crop_oats_radish',
    ST_GeomFromGeoJSON('{"type":"Polygon","coordinates":[[[-79.9090,43.5565],[-79.9060,43.5565],[-79.9060,43.5595],[-79.9090,43.5595],[-79.9090,43.5565]]]}'),
    'Y1 Cover Crop — Oats + Tillage Radish (East)', '{"speciesMix":["oats","tillage radish","field peas"],"seedingDate":"2025-08-10","areaHa":2.9}', 'p1', 9),

  -- Y2 (2026) — livestock + perennial start + farmstead structures.
  ('00000000-0000-0000-0000-0000df35e00b', '00000000-0000-0000-0000-000000357320', 'zone', 'zone_orchard_block_1',
    ST_GeomFromGeoJSON('{"type":"Polygon","coordinates":[[[-79.9115,43.5570],[-79.9095,43.5570],[-79.9095,43.5585],[-79.9115,43.5585],[-79.9115,43.5570]]]}'),
    'Y2 Orchard Block 1 — Apple + Pear + Plum (south bench)', '{"trees":68,"varieties":["liberty apple","goldrush apple","harrow sweet pear","superior plum"],"areaHa":1.2,"establishedYear":2026,"understorey":"comfrey + alfalfa"}', 'p2', 10),
  ('00000000-0000-0000-0000-0000df35e00c', '00000000-0000-0000-0000-000000357320', 'zone', 'zone_pasture_cowcalf',
    ST_GeomFromGeoJSON('{"type":"Polygon","coordinates":[[[-79.9140,43.5615],[-79.9060,43.5615],[-79.9060,43.5638],[-79.9140,43.5638],[-79.9140,43.5615]]]}'),
    'Y2 Cow-Calf Rotation Pasture (north strip)', '{"speciesMix":"orchardgrass + meadow fescue + red clover + chicory","initialHerd":"80 head Black Angus / Devon-cross","rotationDays":3,"paddockCellsY2":12}', 'p2', 11),
  ('00000000-0000-0000-0000-0000df35e00d', '00000000-0000-0000-0000-000000357320', 'zone', 'zone_poultry_follow',
    ST_GeomFromGeoJSON('{"type":"Polygon","coordinates":[[[-79.9140,43.5615],[-79.9060,43.5615],[-79.9060,43.5638],[-79.9140,43.5638],[-79.9140,43.5615]]]}'),
    'Y2 Mobile Poultry Follow (3-day lag)', '{"flockSize":"200 layers + seasonal broiler shifts","followLagDays":3,"shelter":"mobile coop + electric netting"}', 'p2', 12),
  ('00000000-0000-0000-0000-0000df35e00e', '00000000-0000-0000-0000-000000357320', 'zone', 'zone_nursery_propagation',
    ST_GeomFromGeoJSON('{"type":"Polygon","coordinates":[[[-79.9108,43.5598],[-79.9100,43.5598],[-79.9100,43.5604],[-79.9108,43.5604],[-79.9108,43.5598]]]}'),
    'Y2 Nursery + Propagation Area', '{"beds":8,"propagationTunnels":1,"focus":["hedgerow whips","cover-crop seed increase","kitchen garden transplants"]}', 'p2', 13),
  ('00000000-0000-0000-0000-0000df35e00f', '00000000-0000-0000-0000-000000357320', 'zone', 'zone_kitchen_garden',
    ST_GeomFromGeoJSON('{"type":"Polygon","coordinates":[[[-79.9105,43.5598],[-79.9098,43.5598],[-79.9098,43.5604],[-79.9105,43.5604],[-79.9105,43.5598]]]}'),
    'Y2 Kitchen Garden + Herb Spiral', '{"beds":14,"speciesCount":42,"watering":"drip + hand"}', 'p2', 14),
  ('00000000-0000-0000-0000-0000df35e010', '00000000-0000-0000-0000-000000357320', 'structure', 'pole_barn',
    ST_GeomFromGeoJSON('{"type":"Polygon","coordinates":[[[-79.9100,43.5600],[-79.9095,43.5600],[-79.9095,43.5604],[-79.9100,43.5604],[-79.9100,43.5600]]]}'),
    'Y2 Pole Barn (livestock shelter + hay)', '{"footprintM2":280,"use":["winter cow-calf shelter","hay storage","equipment"],"builtYear":2026}', 'p2', 15),
  ('00000000-0000-0000-0000-0000df35e011', '00000000-0000-0000-0000-000000357320', 'structure', 'egg_pack_room',
    ST_GeomFromGeoJSON('{"type":"Polygon","coordinates":[[[-79.9095,43.5600],[-79.9092,43.5600],[-79.9092,43.5603],[-79.9095,43.5603],[-79.9095,43.5600]]]}'),
    'Y2 Egg-Pack Room + Cold Storage', '{"footprintM2":48,"use":["egg wash + grade","cold storage for orchard + market crops"],"builtYear":2026}', 'p2', 16),
  ('00000000-0000-0000-0000-0000df35e012', '00000000-0000-0000-0000-000000357320', 'structure', 'rainwater_cistern',
    ST_GeomFromGeoJSON('{"type":"Polygon","coordinates":[[[-79.9099,43.5602],[-79.9098,43.5602],[-79.9098,43.5603],[-79.9099,43.5603],[-79.9099,43.5602]]]}'),
    'Y2 Rainwater Cistern (pole barn roof)', '{"capacityLitres":22000,"catchmentRoofM2":280,"use":["livestock water backup","nursery irrigation"]}', 'p2', 17),
  ('00000000-0000-0000-0000-0000df35e013', '00000000-0000-0000-0000-000000357320', 'path', 'farm_lane',
    ST_GeomFromGeoJSON('{"type":"LineString","coordinates":[[-79.9100,43.5560],[-79.9100,43.5600]]}'),
    'Primary Farm Lane (gravel)', '{"surface":"gravel","widthM":4.0,"lengthM":445}', 'p1', 18),
  ('00000000-0000-0000-0000-0000df35e014', '00000000-0000-0000-0000-000000357320', 'path', 'farm_lane',
    ST_GeomFromGeoJSON('{"type":"LineString","coordinates":[[-79.9100,43.5615],[-79.9135,43.5620],[-79.9135,43.5635]]}'),
    'Pasture Rotation Access Lane', '{"surface":"grass","widthM":3.0,"lengthM":420,"use":"livestock + ATV"}', 'p2', 19),
  ('00000000-0000-0000-0000-0000df35e015', '00000000-0000-0000-0000-000000357320', 'zone', 'zone_hedgerow_north',
    ST_GeomFromGeoJSON('{"type":"Polygon","coordinates":[[[-79.9145,43.5638],[-79.9055,43.5638],[-79.9055,43.5640],[-79.9145,43.5640],[-79.9145,43.5638]]]}'),
    'Y2 North Boundary Hedgerow Plant (renovation)', '{"species":["hawthorn","red-osier dogwood","serviceberry","elderberry","nannyberry","staghorn sumac"],"establishedYear":2026,"lengthM":830,"underlying":"adjacent to legacy windbreak"}', 'p2', 20),
  ('00000000-0000-0000-0000-0000df35e016', '00000000-0000-0000-0000-000000357320', 'zone', 'zone_hedgerow_west',
    ST_GeomFromGeoJSON('{"type":"Polygon","coordinates":[[[-79.9143,43.5560],[-79.9145,43.5560],[-79.9145,43.5640],[-79.9143,43.5640],[-79.9143,43.5560]]]}'),
    'Y2 West Boundary Hedgerow Plant (new)', '{"species":["hawthorn","serviceberry","red-osier dogwood","elderberry"],"establishedYear":2026,"lengthM":890}', 'p2', 21),

  -- Y3+ planned: paddock subdivision densification + additional orchard blocks + silvopasture.
  ('00000000-0000-0000-0000-0000df35e017', '00000000-0000-0000-0000-000000357320', 'zone', 'zone_orchard_block_2_planned',
    ST_GeomFromGeoJSON('{"type":"Polygon","coordinates":[[[-79.9090,43.5570],[-79.9070,43.5570],[-79.9070,43.5585],[-79.9090,43.5585],[-79.9090,43.5570]]]}'),
    'Y3 Planned Orchard Block 2 — Stone fruit + nut', '{"plannedSpecies":["sweet cherry","peach","seedling chestnut","hazelnut"],"plannedYear":2027,"areaHa":1.2}', 'p3', 22),
  ('00000000-0000-0000-0000-0000df35e018', '00000000-0000-0000-0000-000000357320', 'zone', 'zone_silvopasture_planned',
    ST_GeomFromGeoJSON('{"type":"Polygon","coordinates":[[[-79.9130,43.5615],[-79.9070,43.5615],[-79.9070,43.5625],[-79.9130,43.5625],[-79.9130,43.5615]]]}'),
    'Y3+ Planned Silvopasture Strip', '{"plannedSpecies":["black walnut","white oak","honeylocust"],"plannedYear":2027,"densityTreesPerHa":85,"overstoryClosurePctTarget":35}', 'p3', 23),
  ('00000000-0000-0000-0000-0000df35e019', '00000000-0000-0000-0000-000000357320', 'zone', 'zone_woodlot_extension_planned',
    ST_GeomFromGeoJSON('{"type":"Polygon","coordinates":[[[-79.9145,43.5560],[-79.9135,43.5560],[-79.9135,43.5615],[-79.9145,43.5615],[-79.9145,43.5560]]]}'),
    'Y5+ Planned Woodlot Extension (escarpment-edge)', '{"plannedSpecies":["white pine","sugar maple","shagbark hickory","white ash (EAB-resistant)"],"plannedYear":2029,"escarpmentTransition":true}', 'p4', 24)
ON CONFLICT (id) DO NOTHING;

-- ────────────────────────────────────────────────────────────────────────
-- F. Spiritual zones — creek-confluence prayer space + gathering circle.
-- ────────────────────────────────────────────────────────────────────────

INSERT INTO spiritual_zones (id, project_id, zone_type, geometry, name, notes, qibla_bearing)
VALUES
  ('00000000-0000-0000-0000-00000352e001', '00000000-0000-0000-0000-000000357320', 'prayer_space',
    ST_GeomFromGeoJSON('{"type":"Polygon","coordinates":[[[-79.9100,43.5598],[-79.9098,43.5598],[-79.9098,43.5600],[-79.9100,43.5600],[-79.9100,43.5598]]]}'),
    'Musalla — central-branch confluence prayer corner',
    'Quiet 6 m² flat-stone prayer corner at the confluence of the central tributary and one of its small east-branch feeders. Used for daily salah by farm stewards and for the dawn Fajr after rotation moves. Qibla bearing computed from centroid; double-checked with compass on 2026-04-12.',
    55.85),
  ('00000000-0000-0000-0000-00000352e002', '00000000-0000-0000-0000-000000357320', 'gathering_circle',
    ST_GeomFromGeoJSON('{"type":"Point","coordinates":[-79.9098,43.5602]}'),
    'Gathering Circle (homestead grove)',
    'Stone seat ring under a Y2-planted cluster of white pines near the pole barn. Used for community iftars in Ramadan, seasonal harvest gatherings, and the annual sponsor-and-allies welcome circle. No-build / no-cut perimeter.',
    NULL)
ON CONFLICT (id) DO NOTHING;

-- ────────────────────────────────────────────────────────────────────────
-- G. Project relationships — Needs & Yields integration graph.
--    Edges connect design_feature ids inserted above. The application
--    layer treats from_id / to_id as opaque text — the graph is rendered
--    regardless of which concrete feature table the id lives in.
-- ────────────────────────────────────────────────────────────────────────

-- Resource vocab restricted to the project_relationships_resource_ck CHECK
-- list: manure | greywater | compost | biomass | seed | forage | mulch |
-- heat | shade | pollination | pest_predation | nutrient_uptake |
-- surface_water. Edges below remap canon Needs/Yields to the closest
-- semantic fit within that vocab.
INSERT INTO project_relationships (id, project_id, created_by, from_id, from_output, to_id, to_input, ratio)
VALUES
  -- Livestock manure → pasture nutrient uptake
  ('00000000-0000-0000-0000-0000ed350001', '00000000-0000-0000-0000-000000357320', '00000000-0000-0000-0000-00000000a71a',
    '00000000-0000-0000-0000-0000df35e00c', 'manure',         '00000000-0000-0000-0000-0000df35e00b', 'nutrient_uptake', 0.85),
  -- Poultry coop pest-predation service → pasture
  ('00000000-0000-0000-0000-0000ed350002', '00000000-0000-0000-0000-000000357320', '00000000-0000-0000-0000-00000000a71a',
    '00000000-0000-0000-0000-0000df35e00d', 'pest_predation', '00000000-0000-0000-0000-0000df35e00c', 'pest_predation',  0.65),
  -- Hedgerow forage (flowers/nectar) → pollination service on perennials
  ('00000000-0000-0000-0000-0000ed350003', '00000000-0000-0000-0000-000000357320', '00000000-0000-0000-0000-00000000a71a',
    '00000000-0000-0000-0000-0000df35e015', 'forage',         '00000000-0000-0000-0000-0000df35e00b', 'pollination',     0.70),
  -- Riparian buffer surface water → pasture surface water (filtered baseflow)
  ('00000000-0000-0000-0000-0000ed350004', '00000000-0000-0000-0000-000000357320', '00000000-0000-0000-0000-00000000a71a',
    '00000000-0000-0000-0000-0000df35e005', 'surface_water',  '00000000-0000-0000-0000-0000df35e00c', 'surface_water',   0.55),
  -- Cover crop mulch → pasture surface water (infiltration / runoff slowing)
  ('00000000-0000-0000-0000-0000ed350005', '00000000-0000-0000-0000-000000357320', '00000000-0000-0000-0000-00000000a71a',
    '00000000-0000-0000-0000-0000df35e007', 'mulch',          '00000000-0000-0000-0000-0000df35e00c', 'surface_water',   0.45),
  -- Soil-life compost outputs → east-field nutrient uptake
  ('00000000-0000-0000-0000-0000ed350006', '00000000-0000-0000-0000-000000357320', '00000000-0000-0000-0000-00000000a71a',
    '00000000-0000-0000-0000-0000df35e009', 'compost',        '00000000-0000-0000-0000-0000df35e001', 'nutrient_uptake', 0.60),
  -- Propagation tunnel seed → hedgerow biomass establishment
  ('00000000-0000-0000-0000-0000ed350007', '00000000-0000-0000-0000-000000357320', '00000000-0000-0000-0000-00000000a71a',
    '00000000-0000-0000-0000-0000df35e00e', 'seed',           '00000000-0000-0000-0000-0000df35e015', 'biomass',         0.75),
  -- Keyline pond surface water → poultry coop surface water (flock supply)
  ('00000000-0000-0000-0000-0000ed350008', '00000000-0000-0000-0000-000000357320', '00000000-0000-0000-0000-00000000a71a',
    '00000000-0000-0000-0000-0000df35e012', 'surface_water',  '00000000-0000-0000-0000-0000df35e00d', 'surface_water',   0.50)
ON CONFLICT (project_id, from_id, from_output, to_id, to_input) DO NOTHING;
