-- 017_builtin_sample_project.sql
-- 2026-05-01 — builtin "sample project" available to every account
--
-- Background:
--   New users currently land on an empty project list. The frontend ships a
--   client-side "351 House" seed (apps/web/src/store/projectStore.ts) but it
--   only fires for unauthenticated visitors and never persists. This
--   migration promotes that sample to first-class server state so every
--   authenticated user sees a fully-populated reference project alongside
--   their own — without the seed being copied per-user.
--
--   See plan: ~/.claude/plans/sample-builtin-project.md
--
-- Mechanism:
--   - Adds projects.is_builtin boolean. The list and detail routes union
--     `is_builtin = true` rows with the caller's owned/shared rows.
--   - Inserts a single system user (sentinel UUID, see
--     packages/shared/src/constants/system.ts) that owns builtin rows.
--   - Inserts the sample project at SYSTEM_SAMPLE_PROJECT_ID with full
--     metadata, parcel boundary, layers, terrain, assessment, design
--     features, spiritual zones, regen events, and relationships.
--   - RBAC plugin short-circuits is_builtin → 'viewer' so no one can mutate
--     it; mutating routes also emit defensive 403s on builtins.
--
--   Idempotent: every INSERT uses ON CONFLICT ... DO NOTHING keyed on the
--   pinned UUIDs / unique tuples. Re-running is a no-op so the migration
--   harness can replay safely.
--
-- Sentinel UUIDs (also exported from @ogden/shared):
--   SYSTEM_USER_ID            = 00000000-0000-0000-0000-00000000a71a
--   SYSTEM_SAMPLE_PROJECT_ID  = 00000000-0000-0000-0000-0000005a3791

-- ────────────────────────────────────────────────────────────────────────
-- A. Schema additions
-- ────────────────────────────────────────────────────────────────────────

ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS is_builtin boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_projects_is_builtin
  ON projects (is_builtin)
  WHERE is_builtin = true;

-- System user — owns every builtin row. Never logs in.
INSERT INTO users (id, email, display_name, auth_provider, preferred_locale)
VALUES (
  '00000000-0000-0000-0000-00000000a71a'::uuid,
  'system@atlas.ogden.ag',
  'Atlas (system)',
  'system',
  'en'
)
ON CONFLICT (id) DO NOTHING;

-- ────────────────────────────────────────────────────────────────────────
-- B. Sample project — "351 House" (12-acre Niagara Escarpment homestead)
-- ────────────────────────────────────────────────────────────────────────
--
-- Boundary is a hand-rolled ~12-acre rectangle centred on the Glenashton
-- address in Oakville, ON. Numbers are in EPSG:4326 (WGS84). Acreage is
-- recomputed via ST_Transform → EPSG:26917 (UTM 17N, Ontario) so the row
-- carries the same value the boundary endpoint would produce.

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
  '00000000-0000-0000-0000-0000005a3791'::uuid,
  '00000000-0000-0000-0000-00000000a71a'::uuid,
  true,
  '351 House — Atlas Sample',
  'A 12-acre Halton Hills homestead on the Niagara Escarpment edge. Mixed Carolinian forest, agricultural fields, a seasonal creek, and a south-facing slope used as the working reference for every Atlas detail surface — boundary, layers, design features, spiritual zones, regeneration timeline, and integration graph.',
  'active',
  'homestead',
  ST_Multi(ST_GeomFromGeoJSON(
    '{"type":"Polygon","coordinates":[[[-79.70636,43.50401],[-79.70364,43.50401],[-79.70364,43.50599],[-79.70636,43.50599],[-79.70636,43.50401]]]}'
  )),
  ST_SetSRID(ST_MakePoint(-79.70500, 43.50500), 4326),
  ST_Area(ST_Transform(
    ST_GeomFromGeoJSON('{"type":"Polygon","coordinates":[[[-79.70636,43.50401],[-79.70364,43.50401],[-79.70364,43.50599],[-79.70636,43.50599],[-79.70636,43.50401]]]}'),
    26917
  )) / 4046.86,
  '351 Glenashton Dr, Halton Hills, ON',
  '24-15-040-001-04100',
  'CA',
  'ON',
  'CH',
  'America/Toronto',
  'metric',
  'Family property since 2019. Active homestead with kitchen garden, four laying hens, two beehives, and a young apple-pear orchard planted spring 2024. Goal: walkable food-producing landscape that doubles as outdoor classroom for family halaqa and seasonal community gatherings.',
  'A (Agricultural) zone under Halton Hills bylaw. Permits primary dwelling, accessory farm structures up to 100 m² without further approval, and on-farm sales of produce grown on the parcel. No livestock above 1 nutrient unit/acre without nutrient management plan.',
  'Single access from Glenashton Dr via gravel drive. Drive is municipally maintained to the property line; private from there. Emergency vehicle turnaround is at the Zone 1 forecourt; clearance verified with Halton Hills FD 2024-09.',
  'Conservation Halton (CH) regulated area covers the eastern third of the parcel along the seasonal creek. Surface-water diversion not permitted within 30 m of the creek centreline. Dug well at the dwelling, 38 m deep, tested annually — last bacteriological clean 2026-03. No municipal water connection.',
  'Niagara Escarpment — Carolinian forest belt',
  'Mixedwood Plains (Ontario)',
  'Niagara Escarpment Plan applies to the eastern strip (creek corridor). Heritage tree designation on a single ~140-year-old white oak south-east of the dwelling. No registered easements.',
  92.0,
  jsonb_build_object(
    'climateRegion', 'Niagara Escarpment — Carolinian forest belt',
    'bioregion', 'Mixedwood Plains (Ontario)',
    'county', 'Halton Region',
    'legalDescription', 'PT LT 12 CON 4 ESQUESING; HALTON HILLS',
    'fieldObservations', 'Seasonal creek runs spring-late June; dries by mid-July. Spring ephemerals (trout lily, trillium) carpet the woodlot edge. Mature white oak, sugar maple, and shagbark hickory dominate the canopy. South-facing slope (avg 4%) drains well, frost-free ~mid-May to mid-October.',
    'restrictionsCovenants', 'Niagara Escarpment Plan — Escarpment Rural Area designation on east third. Heritage tree designation on white oak (south-east of dwelling).',
    'mapProjection', 'EPSG:4326 (WGS84) for storage; UTM 17N (EPSG:26917) for area calc',
    'soilNotes', jsonb_build_object(
      'ph', '6.4 (kitchen garden topsoil, 2025-04 lab test); 5.9 (woodlot floor)',
      'organicMatter', '4.2% (kitchen garden); 7.8% (woodlot)',
      'compaction', 'Moderate compaction along the south access path; alleviated with broadfork plus tillage radish 2025 fall.',
      'biologicalActivity', 'Earthworm casts visible across kitchen garden; mycorrhizal fans through the orchard root zone confirmed by spade test.'
    ),
    'centerLat', 43.50500,
    'centerLng', -79.70500
  )
ON CONFLICT (id) DO NOTHING;

-- ────────────────────────────────────────────────────────────────────────
-- C. Tier-1 data layers (6 rows: elevation, slope, soils, watershed,
--    land cover, climate). Each carries a realistic source + status so
--    the data catalog tab renders fully populated.
-- ────────────────────────────────────────────────────────────────────────

INSERT INTO project_layers (project_id, layer_type, source_api, fetch_status, confidence, data_date, attribution_text, summary_data, metadata, fetched_at)
VALUES
  ('00000000-0000-0000-0000-0000005a3791', 'elevation', 'nrcan_hrdem', 'complete', 'high', '2024-08-15',
    'Natural Resources Canada — High Resolution Digital Elevation Model (HRDEM), 1 m LiDAR, Halton mosaic 2024.',
    '{"minM": 240.1, "maxM": 268.4, "meanM": 254.7, "rangeM": 28.3}'::jsonb,
    '{"resolutionM": 1, "datum": "CGVD2013", "tileCount": 4}'::jsonb,
    now() - interval '7 days'),
  ('00000000-0000-0000-0000-0000005a3791', 'soils', 'omafra_cansis', 'complete', 'medium', '2023-11-01',
    'OMAFRA / CanSIS — Soil Survey of Halton County (SLC v3.2).',
    '{"dominantSeries": "Chinguacousy clay loam", "drainage": "Imperfectly drained", "agCapability": "Class 2 (mechanical limitation: stoniness)"}'::jsonb,
    '{"polygonCount": 3, "primaryComponent": "CHG", "primaryPct": 70}'::jsonb,
    now() - interval '7 days'),
  ('00000000-0000-0000-0000-0000005a3791', 'watershed', 'ontario_hydro_network', 'complete', 'high', '2024-04-10',
    'Ontario Hydro Network (OHN) — Conservation Halton sub-watershed layer.',
    '{"watershedName": "Sixteen Mile Creek — Middle", "subWatershed": "Glenashton tributary", "streamOrder": 2}'::jsonb,
    '{"creekIntermittent": true, "regulatedAreaPct": 33}'::jsonb,
    now() - interval '7 days'),
  ('00000000-0000-0000-0000-0000005a3791', 'wetlands_flood', 'conservation_authority', 'complete', 'high', '2024-04-10',
    'Conservation Halton — Regulated Areas Layer (Ontario Regulation 162/06).',
    '{"floodplainAreaHa": 0.4, "wetlandPresent": false, "regulatedSetbackM": 30}'::jsonb,
    '{"regulationCode": "O.Reg.162/06"}'::jsonb,
    now() - interval '7 days'),
  ('00000000-0000-0000-0000-0000005a3791', 'land_cover', 'aafc_annual_crop', 'complete', 'medium', '2024-09-30',
    'AAFC Annual Crop Inventory 2024 — 30 m raster.',
    '{"forestPct": 38, "pasturePct": 42, "builtPct": 6, "waterPct": 1, "barePct": 13}'::jsonb,
    '{"resolutionM": 30, "yearsAnalyzed": [2020, 2021, 2022, 2023, 2024]}'::jsonb,
    now() - interval '7 days'),
  ('00000000-0000-0000-0000-0000005a3791', 'climate', 'eccc_normals', 'complete', 'high', '2021-12-31',
    'Environment and Climate Change Canada — 1991–2020 Climate Normals, Georgetown WWTP station.',
    '{"annualPrecipMm": 870, "growingDegreeDays": 2860, "frostFreeDays": 156, "hardinessZone": "5b"}'::jsonb,
    '{"stationId": "6152695", "stationName": "Georgetown WWTP"}'::jsonb,
    now() - interval '7 days')
ON CONFLICT (project_id, layer_type) DO NOTHING;

-- ────────────────────────────────────────────────────────────────────────
-- D. Terrain analysis (Tier 3) — single row per project (UNIQUE).
-- ────────────────────────────────────────────────────────────────────────

INSERT INTO terrain_analysis (project_id, elevation_min_m, elevation_max_m, elevation_mean_m, slope_min_deg, slope_max_deg, slope_mean_deg, aspect_dominant)
VALUES (
  '00000000-0000-0000-0000-0000005a3791',
  240.1, 268.4, 254.7,
  0.4, 12.8, 4.2,
  'S'
)
ON CONFLICT (project_id) DO NOTHING;

-- ────────────────────────────────────────────────────────────────────────
-- E. Site assessment (current version).
-- ────────────────────────────────────────────────────────────────────────

-- Migration 009 dropped the per-axis legacy columns (suitability_score,
-- buildability_score, water_resilience_score, ag_potential_score) — those
-- breakdowns now live inside score_breakdown jsonb. Insert only the columns
-- that survived 009.
INSERT INTO site_assessments (
  project_id, version, is_current, confidence,
  overall_score,
  score_breakdown, flags, needs_site_visit, data_sources_used
)
SELECT
  '00000000-0000-0000-0000-0000005a3791'::uuid,
  1,
  true,
  'high',
  84.0,
  '{"suitability": {"slope": 90, "soilDrainage": 80, "frostRisk": 88, "solarAccess": 95}, "buildability": {"roadAccess": 92, "powerProximity": 80, "septicSuitability": 70, "buildableAreaPct": 86}, "waterResilience": {"baseflow": 70, "regulatoryConstraint": 60, "storagePotential": 90}, "agPotential": {"capability": 90, "om": 88, "growingDegreeDays": 92}}'::jsonb,
  '[{"flag": "regulated_creek_corridor", "severity": "info", "message": "East third of parcel is within Conservation Halton regulated area (O.Reg.162/06). Diversion within 30 m setback is restricted."}, {"flag": "heritage_tree", "severity": "info", "message": "Heritage-designated white oak SE of dwelling. Avoid grade changes within drip line."}]'::jsonb,
  false,
  ARRAY['elevation', 'soils', 'watershed', 'land_cover', 'climate']
WHERE NOT EXISTS (
  SELECT 1 FROM site_assessments
  WHERE project_id = '00000000-0000-0000-0000-0000005a3791' AND is_current = true
);

-- ────────────────────────────────────────────────────────────────────────
-- F. Design features — zones, structures, paths, key sites.
--    Geometry uses pinned ids so re-runs are no-ops.
-- ────────────────────────────────────────────────────────────────────────

INSERT INTO design_features (id, project_id, feature_type, subtype, geometry, label, properties, phase_tag, sort_order)
VALUES
  ('00000000-0000-0000-0000-0000df000001', '00000000-0000-0000-0000-0000005a3791', 'zone', 'zone_0_dwelling',
    ST_GeomFromGeoJSON('{"type":"Polygon","coordinates":[[[-79.70520,43.50490],[-79.70480,43.50490],[-79.70480,43.50515],[-79.70520,43.50515],[-79.70520,43.50490]]]}'),
    'Zone 0 — Dwelling', '{"function":"primary residence + family halaqa room"}', 'p1', 0),
  ('00000000-0000-0000-0000-0000df000002', '00000000-0000-0000-0000-0000005a3791', 'zone', 'zone_1_kitchen_garden',
    ST_GeomFromGeoJSON('{"type":"Polygon","coordinates":[[[-79.70478,43.50490],[-79.70450,43.50490],[-79.70450,43.50515],[-79.70478,43.50515],[-79.70478,43.50490]]]}'),
    'Zone 1 — Kitchen Garden', '{"beds":12,"speciesCount":34,"watering":"daily drip"}', 'p1', 1),
  ('00000000-0000-0000-0000-0000df000003', '00000000-0000-0000-0000-0000005a3791', 'zone', 'zone_2_orchard',
    ST_GeomFromGeoJSON('{"type":"Polygon","coordinates":[[[-79.70522,43.50515],[-79.70450,43.50515],[-79.70450,43.50555],[-79.70522,43.50555],[-79.70522,43.50515]]]}'),
    'Zone 2 — Orchard + Chicken Paddock', '{"trees":42,"varieties":["apple","pear","plum","sea buckthorn"],"chickens":4}', 'p1', 2),
  ('00000000-0000-0000-0000-0000df000004', '00000000-0000-0000-0000-0000005a3791', 'zone', 'zone_3_pasture',
    ST_GeomFromGeoJSON('{"type":"Polygon","coordinates":[[[-79.70600,43.50420],[-79.70520,43.50420],[-79.70520,43.50490],[-79.70600,43.50490],[-79.70600,43.50420]]]}'),
    'Zone 3 — South Pasture', '{"speciesMix":"clover/fescue/chicory","rotationDays":21}', 'p2', 3),
  ('00000000-0000-0000-0000-0000df000005', '00000000-0000-0000-0000-0000005a3791', 'zone', 'zone_4_woodlot_edge',
    ST_GeomFromGeoJSON('{"type":"Polygon","coordinates":[[[-79.70450,43.50420],[-79.70390,43.50420],[-79.70390,43.50515],[-79.70450,43.50515],[-79.70450,43.50420]]]}'),
    'Zone 4 — Woodlot Edge / Coppice', '{"species":["black locust","hazel","willow"],"managementCycle":"7-year coppice"}', 'p2', 4),
  ('00000000-0000-0000-0000-0000df000006', '00000000-0000-0000-0000-0000005a3791', 'zone', 'zone_5_escarpment_forest',
    ST_GeomFromGeoJSON('{"type":"Polygon","coordinates":[[[-79.70390,43.50420],[-79.70364,43.50420],[-79.70364,43.50599],[-79.70390,43.50599],[-79.70390,43.50420]]]}'),
    'Zone 5 — Escarpment Forest (no-take)', '{"protected":true,"creekCorridor":true}', 'p1', 5),
  ('00000000-0000-0000-0000-0000df000007', '00000000-0000-0000-0000-0000005a3791', 'structure', 'pond',
    ST_GeomFromGeoJSON('{"type":"Polygon","coordinates":[[[-79.70560,43.50535],[-79.70530,43.50535],[-79.70530,43.50555],[-79.70560,43.50555],[-79.70560,43.50535]]]}'),
    'Reflection Pond', '{"surfaceM2":600,"maxDepthM":2.5,"linerType":"clay+bentonite"}', 'p2', 6),
  ('00000000-0000-0000-0000-0000df000008', '00000000-0000-0000-0000-0000005a3791', 'path', 'swale',
    ST_GeomFromGeoJSON('{"type":"LineString","coordinates":[[-79.70600,43.50500],[-79.70450,43.50500]]}'),
    'Keyline Swale', '{"lengthM":121,"slopePct":1.2,"plantedWith":"comfrey + black locust"}', 'p2', 7),
  ('00000000-0000-0000-0000-0000df000009', '00000000-0000-0000-0000-0000005a3791', 'path', 'access_drive',
    ST_GeomFromGeoJSON('{"type":"LineString","coordinates":[[-79.70636,43.50500],[-79.70520,43.50500]]}'),
    'Gravel Access Drive', '{"surface":"gravel","widthM":3.5}', 'p1', 8),
  ('00000000-0000-0000-0000-0000df00000a', '00000000-0000-0000-0000-0000005a3791', 'structure', 'windbreak',
    ST_GeomFromGeoJSON('{"type":"LineString","coordinates":[[-79.70636,43.50420],[-79.70364,43.50420]]}'),
    'North Windbreak', '{"rows":3,"species":["white spruce","red osier dogwood","staghorn sumac"],"establishedYear":2024}', 'p1', 9)
ON CONFLICT (id) DO NOTHING;

-- ────────────────────────────────────────────────────────────────────────
-- G. Spiritual zones — musalla + contemplation grove.
-- ────────────────────────────────────────────────────────────────────────

INSERT INTO spiritual_zones (id, project_id, zone_type, geometry, name, notes, qibla_bearing)
VALUES
  ('00000000-0000-0000-0000-00000052e000', '00000000-0000-0000-0000-0000005a3791', 'prayer_space',
    ST_GeomFromGeoJSON('{"type":"Polygon","coordinates":[[[-79.70510,43.50500],[-79.70500,43.50500],[-79.70500,43.50508],[-79.70510,43.50508],[-79.70510,43.50500]]]}'),
    'Musalla — east window prayer corner',
    'Quiet 8 m² corner inside the dwelling with a clear east-northeast view down the keyline. Used for daily salah and family halaqa Friday evenings. Qibla bearing computed from centroid; double-checked with compass on 2025-03-21.',
    55.81),
  ('00000000-0000-0000-0000-00000052e001', '00000000-0000-0000-0000-0000005a3791', 'gathering_circle',
    ST_GeomFromGeoJSON('{"type":"Point","coordinates":[-79.70380,43.50550]}'),
    'Contemplation Grove (Zone 5)',
    'Circle of seven white pines around a flat-stone seat ring on the woodlot edge. No-build / no-cut. Used for quiet du''a, dawn dhikr, and the annual community iftar in Ramadan.',
    NULL)
ON CONFLICT (id) DO NOTHING;

-- ────────────────────────────────────────────────────────────────────────
-- H. Regeneration events — 4 entries spanning 18 months.
-- ────────────────────────────────────────────────────────────────────────

INSERT INTO regeneration_events (id, project_id, author_id, event_type, intervention_type, phase, progress, title, notes, event_date, area_ha, observations)
VALUES
  ('00000000-0000-0000-0000-0000ee000001', '00000000-0000-0000-0000-0000005a3791', '00000000-0000-0000-0000-00000000a71a',
    'intervention', 'cover_crop_candidate', 'build_organic_matter', 'completed',
    'Spring cover-crop drilled in Zone 3', 'Drilled 18 kg/ha of crimson clover + tillage radish across the south pasture after a light disc. Goal: rebuild OM after a wet 2023 hay season that left the southwest corner pugged. Counted 14 worm casts/m² eight weeks later — up from 6 pre-drilling.',
    '2024-04-21'::date, 1.6,
    '{"omPctBefore": 3.1, "omPctAfter": 4.0, "wormCastsPerM2Before": 6, "wormCastsPerM2After": 14}'::jsonb),
  ('00000000-0000-0000-0000-0000ee000002', '00000000-0000-0000-0000-0000005a3791', '00000000-0000-0000-0000-00000000a71a',
    'observation', NULL, NULL, 'observed',
    'Pollinator survey — orchard transect', '30-minute transect on a calm 24 °C morning. Recorded: 47 honey bees, 22 bumble bees (B. impatiens dominant), 11 mason bees, 4 hover flies. Flag — fewer mason bees than 2023; will mount additional cob blocks before next spring.',
    '2024-07-08'::date, 0.8,
    '{"speciesCounts": {"honey_bee": 47, "bumble_bee": 22, "mason_bee": 11, "hover_fly": 4}, "method": "30-min transect"}'::jsonb),
  ('00000000-0000-0000-0000-0000ee000003', '00000000-0000-0000-0000-0000005a3791', '00000000-0000-0000-0000-00000000a71a',
    'milestone', NULL, 'introduce_perennials', 'completed',
    'Autumn pruning workshop — 14 attendees', 'Hosted Halton Permaculture Guild for a half-day workshop. Pruned 12 young apple/pear trees + ran a grafting demo. Three attendees signed up for spring scion-wood swap.',
    '2024-10-19'::date, 0.4,
    '{"attendees": 14, "treesPruned": 12}'::jsonb),
  ('00000000-0000-0000-0000-0000ee000004', '00000000-0000-0000-0000-0000005a3791', '00000000-0000-0000-0000-00000000a71a',
    'observation', NULL, 'build_organic_matter', 'observed',
    'Winter soil test — kitchen garden', 'Lab results back from A&L Canada. pH 6.4 (target 6.5); OM 4.2% (up from 3.6% in 2023); CEC 18 meq/100g; P (Olsen) 32 ppm — adequate. Plan: fold 2 cm screened compost across all beds before April planting.',
    '2026-02-14'::date, 0.05,
    '{"ph": 6.4, "omPct": 4.2, "cec": 18, "phosphorusPpm": 32}'::jsonb)
ON CONFLICT (id) DO NOTHING;

-- ────────────────────────────────────────────────────────────────────────
-- I. Project relationships — Needs & Yields integration graph (6 edges).
-- ────────────────────────────────────────────────────────────────────────
--
-- from_id / to_id reference the design_feature ids inserted above. The
-- application layer treats these as opaque text — the graph is rendered
-- regardless of what concrete feature table the id lives in.

INSERT INTO project_relationships (id, project_id, created_by, from_id, from_output, to_id, to_input, ratio)
VALUES
  ('00000000-0000-0000-0000-0000ed000001', '00000000-0000-0000-0000-0000005a3791', '00000000-0000-0000-0000-00000000a71a',
    '00000000-0000-0000-0000-0000df000003', 'manure',  '00000000-0000-0000-0000-0000df000002', 'manure',  0.80),
  ('00000000-0000-0000-0000-0000ed000002', '00000000-0000-0000-0000-0000005a3791', '00000000-0000-0000-0000-00000000a71a',
    '00000000-0000-0000-0000-0000df000003', 'pest_predation', '00000000-0000-0000-0000-0000df000002', 'pest_predation', 0.50),
  ('00000000-0000-0000-0000-0000ed000003', '00000000-0000-0000-0000-0000005a3791', '00000000-0000-0000-0000-00000000a71a',
    '00000000-0000-0000-0000-0000df000005', 'biomass', '00000000-0000-0000-0000-0000df000002', 'mulch',   0.60),
  ('00000000-0000-0000-0000-0000ed000004', '00000000-0000-0000-0000-0000005a3791', '00000000-0000-0000-0000-00000000a71a',
    '00000000-0000-0000-0000-0000df000007', 'surface_water', '00000000-0000-0000-0000-0000df000002', 'surface_water', 0.40),
  ('00000000-0000-0000-0000-0000ed000005', '00000000-0000-0000-0000-0000005a3791', '00000000-0000-0000-0000-00000000a71a',
    '00000000-0000-0000-0000-0000df00000a', 'shade',   '00000000-0000-0000-0000-0000df000004', 'shade',   0.30),
  ('00000000-0000-0000-0000-0000ed000006', '00000000-0000-0000-0000-0000005a3791', '00000000-0000-0000-0000-00000000a71a',
    '00000000-0000-0000-0000-0000df000003', 'pollination', '00000000-0000-0000-0000-0000df000002', 'pollination', 0.70)
ON CONFLICT (project_id, from_id, from_output, to_id, to_input) DO NOTHING;
