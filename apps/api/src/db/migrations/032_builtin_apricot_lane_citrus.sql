-- 032_builtin_apricot_lane_citrus.sql
-- 2026-05-21 — Phase E.1 builtin: "Apricot Lane Showcase" degraded-citrus → polyculture
--
-- Background:
--   The Apricot-Lane-class fixture promised by the Validation Protocol
--   (assumption A2 in C:\Users\MY OWN AXIS\Downloads\Validation Protocol_…).
--   Phase A–D verified against Three Streams Farm (migration 029) or
--   synthetic in-test fixtures; the protocol re-run + scorecard 4/4
--   claim in Phase E requires the canonical ~200-acre degraded-citrus
--   site this migration seeds.
--
--   The farm is fictional. The Moorpark / Ventura County substrate
--   underneath it is real, so the US adapter chain (USGS 3DEP + SSURGO
--   + USGS WBD + FEMA NFHL + NLCD + NOAA 1991–2020 Normals at the
--   Camarillo/Oxnard station family) returns truthful data end-to-end.
--   Attribution wording is binding:
--   "inspired by farms like Apricot Lane Farms and the rehabilitation
--   arc shown in The Biggest Little Farm; Apricot Lane Showcase is a
--   fictional Ventura County operation."
--
--   See:
--     - apps/api/src/db/migrations/029_builtin_three_streams_farm.sql  (template)
--     - C:\Users\MY OWN AXIS\.claude\plans\c-users-my-own-axis-downloads-validatio-quiet-simon.md
--
-- Mechanism:
--   Follows the 029 layout verbatim. Single migration covering project +
--   parcel + 6 layers + terrain + assessment + design features +
--   spiritual zones (faith-agnostic — non-Muslim showcase site, qibla
--   NULL) + relationships.
--
--   Idempotent: every INSERT uses ON CONFLICT ... DO NOTHING keyed on
--   pinned UUIDs / unique tuples. Re-running is a no-op.
--
-- Sentinel UUIDs (Apricot Lane family — a91c01 ≈ "apricot"):
--   SYSTEM_USER_ID                      = 00000000-0000-0000-0000-00000000a71a (reused)
--   APRICOT_LANE_PROJECT_ID             = 00000000-0000-0000-0000-000000a91c01
--   design_features family              = 00000000-0000-0000-0000-0000aef500NN
--   spiritual_zones family              = 00000000-0000-0000-0000-0000a195e0NN
--   project_relationships family        = 00000000-0000-0000-0000-0000a91ed0NN

-- ────────────────────────────────────────────────────────────────────────
-- A. Project — Apricot Lane Showcase (Moorpark, Ventura County, ~200 acres)
-- ────────────────────────────────────────────────────────────────────────
--
-- Boundary is a ~200-acre rectangle on bbox
--   [-118.952, 34.290] → [-118.942, 34.298]
-- ~920 m E-W × ~887 m N-S in EPSG:4326 (WGS84). The lot sits in the
-- Calleguas Creek headwaters (Arroyo Simi tributaries); two seasonal
-- arroyos cross the parcel. Acreage is recomputed via the WGS84
-- spheroid (::geography) for location-independent value (~200 acres).

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
  '00000000-0000-0000-0000-000000a91c01'::uuid,
  '00000000-0000-0000-0000-00000000a71a'::uuid,
  true,
  'Apricot Lane Showcase — Degraded Citrus → Polyculture',
  'A fictional ~200-acre rural Moorpark (Ventura County) showcase project on the Calleguas Creek headwaters — two seasonal arroyos thread the lot. Inherited 2024 as 14-year continuous-citrus ground after the citrus block went uneconomic following a HLB (citrus greening) advance + chronic groundwater drawdown. Y0 baseline: cleared but unrooted citrus blocks, plow pan + irrigation-line scars, low SOM (~1.2 %), summer-drought hydrology, south-southwest exposure dominant. Inspired by farms like Apricot Lane Farms and the rehabilitation arc shown in The Biggest Little Farm; Apricot Lane Showcase is a fictional Ventura County operation. The data substrate underneath is real (USGS 3DEP + SSURGO + USGS WBD + FEMA NFHL + NLCD + NOAA Normals adapters).',
  'active',
  'regenerative_farm',
  ST_Multi(ST_GeomFromGeoJSON(
    '{"type":"Polygon","coordinates":[[[-118.952,34.290],[-118.942,34.290],[-118.942,34.298],[-118.952,34.298],[-118.952,34.290]]]}'
  )),
  ST_SetSRID(ST_MakePoint(-118.9470, 34.2940), 4326),
  ST_Area(
    ST_GeomFromGeoJSON('{"type":"Polygon","coordinates":[[[-118.952,34.290],[-118.942,34.290],[-118.942,34.298],[-118.952,34.298],[-118.952,34.290]]]}')::geography
  ) / 4046.86,
  'Rural Moorpark, Ventura County, CA',
  '500-0-180-035',
  'US',
  'CA',
  NULL,
  'America/Los_Angeles',
  'metric',
  'Fictional showcase farm — inherited 2024 (Y0) as ~200 acres of cleared-citrus rural Moorpark ground at the eastern edge of the Oxnard Plain transition. Y2 (2026) loadable state: keyline swales + winter cover crops in (Y1), first cow-calf cohort landing (~40 head Black Angus / Devon-cross on 3-day rotational moves), mobile layer flock (~200-bird) following at 3-day lag, first 1.2-ha polyculture orchard (drought-tolerant Mediterranean stone-fruit + nut block) on the south-facing bench, pole barn + compost yard at the access node.',
  'A-E (Agricultural Exclusive) zone under Ventura County Non-Coastal Zoning Ordinance. Permits primary dwelling + accessory farm structures + on-farm sales of produce/eggs from the parcel + livestock at standard nutrient management densities. Calleguas Creek Watershed Plan applies along the two arroyo corridors — riparian setback per Ventura County RMA guidance. Williamson Act contract on the working land portion (10-year renewable preferential-assessment).',
  'Single rural-road frontage on the south boundary (Stockton Road / Broadway corridor). Gravel farm lane runs north from the road to the homestead node, branching to the pole barn and compost yard. Internal grass tracks follow the paddock subdivision laid out Y2 onward.',
  'Two seasonal arroyos cross the lot — riparian setback applies per Ventura County RMA (no diversion in the corridor). One ag well (depth ~120 m) under the Fox Canyon GMA groundwater allocation; metered annually. No municipal water connection. Groundwater drawdown documented (~1.5 m/decade over the last 30 years) — pressure on long-horizon irrigation.',
  'Mediterranean (Csa) — Oxnard Plain transition / coastal-influenced Ventura interior',
  'California Floristic Province — South Coast / Transverse Ranges interior',
  'Williamson Act preferential-assessment contract (10-yr renewable). Fox Canyon GMA groundwater allocation. Ventura County RMA riparian setback on both arroyo corridors. No registered conservation easements on the working land.',
  74.0,
  jsonb_build_object(
    'climateRegion', 'Mediterranean (Csa) — Oxnard Plain transition / coastal-influenced Ventura interior',
    'bioregion', 'California Floristic Province — South Coast / Transverse Ranges interior',
    'county', 'Ventura County',
    'municipality', 'Rural Moorpark',
    'legalDescription', 'PT NW1/4 SEC 35, T2N R19W SBM; VENTURA COUNTY',
    'fieldObservations', 'Two seasonal arroyos cross the lot (south-flowing tributaries of Arroyo Simi). Y0 baseline: cleared continuous-citrus ground under 14-year citrus monoculture, plow pan + drip-line scars, organic matter ~1.2% on cropped portions, gully erosion on the south-southwest slope, single ageing eucalyptus windbreak along the east edge, no riparian buffer on either arroyo. Y2 trajectory: keyline swales + cover crops Y1, first cow-calf + mobile poultry landing Y2.',
    'restrictionsCovenants', 'Williamson Act contract on working land. Fox Canyon GMA groundwater allocation. Ventura County RMA riparian setback on both arroyo corridors.',
    'mapProjection', 'EPSG:4326 (WGS84) for storage; UTM 11N (EPSG:26911) for area calc',
    'soilNotes', jsonb_build_object(
      'ph', '7.6 (citrus half, 2025-09 lab test); 7.4 (former pasture strip, 2025-09 lab test)',
      'organicMatter', '1.0–1.4% baseline (Y0, 2024 citrus ground); 1.8–2.2% Y2 trajectory on cover-crop blocks',
      'compaction', 'Plow pan documented at 22 cm depth across the citrus half (Y0). Subsoiled along contour where Y1 swales were cut; remainder addressed via deep-rooted cover crop + livestock impact Y2 onward.',
      'biologicalActivity', 'Earthworm casts negligible at Y0 on citrus half (counts 0–1/m²); rising in Y1 cover-crop blocks (3–5/m² post bell-bean + oats); legacy pasture strip holds 6–9/m² steady.'
    ),
    'centerLat', 34.2940,
    'centerLng', -118.9470,
    'showcaseProgram', jsonb_build_object(
      'program', 'Apricot-Lane-inspired OLOS showcase',
      'attribution', 'inspired by farms like Apricot Lane Farms and the rehabilitation arc shown in The Biggest Little Farm; Apricot Lane Showcase is a fictional Ventura County operation',
      'yearOfShowcase', 'Y2 (2026) — primary loadable demo state',
      'forwardScenes', ARRAY['Y5 (2029)', 'Y8 (2032)'],
      'protocolGate', 'Validation Protocol assumption A2 — 200-acre degraded-citrus fixture'
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
  ('00000000-0000-0000-0000-000000a91c01', 'elevation', 'usgs_3dep', 'complete', 'high', '2024-07-20',
    'USGS — 3D Elevation Program (3DEP), 1 m LiDAR, Ventura County mosaic 2024.',
    '{"min_elevation_m": 142.3, "max_elevation_m": 218.7, "mean_elevation_m": 178.4, "mean_slope_deg": 7.1, "max_slope_deg": 14.2, "predominant_aspect": "SSW"}'::jsonb,
    '{"resolutionM": 1, "datum": "NAVD88", "tileCount": 9, "arroyoCutDepthM": 3.6}'::jsonb,
    now() - interval '7 days'),
  ('00000000-0000-0000-0000-000000a91c01', 'soils', 'usda_ssurgo', 'complete', 'medium', '2023-10-15',
    'USDA NRCS — SSURGO Soil Survey of Ventura Area, California (CA672).',
    '{"dominantSeries": "Mocho silty clay loam + Sorrento loam complex", "drainage": "Well drained to moderately well drained", "agCapability": "USDA Class III (irrigation-dependent on the citrus half); Class II on the legacy pasture strip", "depthToBedrockM": 1.8}'::jsonb,
    '{"polygonCount": 4, "primaryComponent": "MoC", "primaryPct": 61, "secondaryComponent": "ScA", "secondaryPct": 29, "faoClassification": "S2 (moderately suitable, dry-summer irrigation-limited)"}'::jsonb,
    now() - interval '7 days'),
  ('00000000-0000-0000-0000-000000a91c01', 'watershed', 'usgs_wbd', 'complete', 'high', '2024-03-22',
    'USGS — Watershed Boundary Dataset (WBD), HUC-12 Arroyo Simi Headwaters (180701030101).',
    '{"watershedName": "Calleguas Creek — Arroyo Simi Headwaters", "subWatershed": "South-flowing tributaries (2 branches on-lot)", "streamOrder": 1, "tributaryCount": 2, "onLotChannelLengthM": 920}'::jsonb,
    '{"creekIntermittent": true, "regulatedAreaPct": 14, "branchNames": ["west arroyo", "east arroyo"]}'::jsonb,
    now() - interval '7 days'),
  ('00000000-0000-0000-0000-000000a91c01', 'wetlands_flood', 'fema_nfhl', 'complete', 'high', '2024-03-22',
    'FEMA — National Flood Hazard Layer (NFHL), Ventura County effective 2024.',
    '{"floodplainAreaHa": 1.4, "wetlandPresent": false, "regulatedSetbackM": 15, "regulatedCorridors": 2}'::jsonb,
    '{"femaZone": "X (shaded — 0.2% annual chance, on the two arroyo corridors only)", "permitRequiredFor": ["grading within 15 m of either arroyo centreline", "channel modification of any kind", "structure placement within the arroyo corridor"]}'::jsonb,
    now() - interval '7 days'),
  ('00000000-0000-0000-0000-000000a91c01', 'land_cover', 'nlcd', 'complete', 'high', '2024-09-30',
    'USGS / MRLC — National Land Cover Database (NLCD) 2021, 30 m raster (latest released 2024).',
    '{"forestPct": 4, "pasturePct": 8, "cultivatedCropsPct": 78, "shrubPct": 6, "builtPct": 2, "waterPct": 0, "barePct": 2}'::jsonb,
    '{"resolutionM": 30, "yearsAnalyzed": [2019, 2021], "baselineSignature": "continuous citrus monoculture (14 of 14 years showing Cultivated Crops class 82 on dominant cropped polygon)"}'::jsonb,
    now() - interval '7 days'),
  ('00000000-0000-0000-0000-000000a91c01', 'climate', 'noaa_normals', 'complete', 'high', '2021-12-31',
    'NOAA NCEI — 1991–2020 Climate Normals, Camarillo / Oxnard station family (closest representative).',
    '{"annual_precip_mm": 378, "growing_season_days": 330, "growing_degree_days": 5180, "hardiness_zone": "10a", "annual_temp_mean_c": 16.2, "koppen_classification": "Csa", "first_frost_date": "2025-12-15", "last_frost_date": "2025-02-20"}'::jsonb,
    '{"stationId": "USW00093110", "stationName": "Camarillo Airport", "distanceKm": 14.8}'::jsonb,
    now() - interval '7 days')
ON CONFLICT (project_id, layer_type) DO NOTHING;

-- ────────────────────────────────────────────────────────────────────────
-- C. Terrain analysis (Tier 3) — single row per project (UNIQUE).
--    Rolling Calleguas Creek headwaters: 3–12% mean slope band, south-
--    southwest dominant aspect (mixed E/W secondary), arroyo valleys cut
--    to ~3–4 m.
-- ────────────────────────────────────────────────────────────────────────

INSERT INTO terrain_analysis (project_id, elevation_min_m, elevation_max_m, elevation_mean_m, slope_min_deg, slope_max_deg, slope_mean_deg, aspect_dominant)
VALUES (
  '00000000-0000-0000-0000-000000a91c01',
  142.3, 218.7, 178.4,
  0.5, 14.2, 7.1,
  'SSW'
)
ON CONFLICT (project_id) DO NOTHING;

-- ────────────────────────────────────────────────────────────────────────
-- D. Site assessment (current version) — Y2 recovering-but-still-degraded
--    state. Lower water-resilience reflects summer-drought hydrology +
--    Fox Canyon GMA groundwater allocation pressure; soil scores reflect
--    Y0 baseline (~1.2% OM) still anchoring most readings; ag potential
--    constrained by irrigation dependence but climatically excellent
--    (Mediterranean, 5180 GDD, hardiness 10a).
-- ────────────────────────────────────────────────────────────────────────

INSERT INTO site_assessments (
  project_id, version, is_current, confidence,
  overall_score,
  score_breakdown, flags, needs_site_visit, data_sources_used
)
SELECT
  '00000000-0000-0000-0000-000000a91c01'::uuid,
  1,
  true,
  'medium',
  62.0,
  '{"suitability": {"slope": 72, "soilDrainage": 70, "frostRisk": 95, "solarAccess": 94, "faoClassification": "S2", "usdaCapabilityClass": "Class III"}, "buildability": {"roadAccess": 84, "powerProximity": 68, "septicSuitability": 70, "buildableAreaPct": 76}, "waterResilience": {"baseflow": 38, "regulatoryConstraint": 52, "storagePotential": 68, "summerDroughtPenalty": -18}, "agPotential": {"capability": 76, "om": 36, "growingDegreeDays": 94, "irrigationDependence": "high"}}'::jsonb,
  '[{"flag": "baseline_om_critical", "severity": "critical", "message": "Soil organic matter ~1.2% on Y0 citrus half — at the bottom of the productive band for Mediterranean orchards. Y1+Y2 cover-crop + rotation showing recovery into 1.8–2.2% band on cover-crop blocks."}, {"flag": "summer_drought_hydrology", "severity": "warning", "message": "378 mm annual precip with the entire dry season May–Oct. Fox Canyon GMA groundwater allocation + documented drawdown (~1.5 m/decade) constrain long-horizon irrigation. Y1 swales + cover-crop infiltration trajectory is the primary mitigation."}, {"flag": "slope_erosion_risk", "severity": "warning", "message": "South-southwest 7–14% slopes with low Y0 OM = elevated gully-erosion risk on the legacy citrus rows. Keyline swales + cover crops Y1 onward shifted the dominant flow path off the rows."}, {"flag": "riparian_restoration_opportunity", "severity": "info", "message": "Both arroyo corridors lack riparian buffer at Y0. Ventura County RMA setback (15 m) gives the planting envelope; restoration is a high-leverage opportunity for surface-water + sediment retention."}]'::jsonb,
  false,
  ARRAY['elevation', 'soils', 'watershed', 'wetlands_flood', 'land_cover', 'climate']
WHERE NOT EXISTS (
  SELECT 1 FROM site_assessments
  WHERE project_id = '00000000-0000-0000-0000-000000a91c01' AND is_current = true
);

-- ────────────────────────────────────────────────────────────────────────
-- E. Design features — Y0 anchors (cleared citrus blocks + irrigation
--    scars), Y1 (water + cover crops), Y2 (livestock + first orchard +
--    farmstead structures), Y3+ planned (paddock densification + second
--    orchard block + silvopasture). Geometry is offset relative to
--    parcel centroid + bbox.
-- ────────────────────────────────────────────────────────────────────────

INSERT INTO design_features (id, project_id, feature_type, subtype, geometry, label, properties, phase_tag, sort_order)
VALUES
  -- Y0 anchors: cleared citrus blocks + legacy eucalyptus windbreak
  ('00000000-0000-0000-0000-0000aef5e001', '00000000-0000-0000-0000-000000a91c01', 'zone', 'zone_baseline_west_citrus',
    ST_GeomFromGeoJSON('{"type":"Polygon","coordinates":[[[-118.9520,34.2900],[-118.9475,34.2900],[-118.9475,34.2945],[-118.9520,34.2945],[-118.9520,34.2900]]]}'),
    'West Citrus Block — Y0 baseline (cleared, drip scars)', '{"baselineCondition":"depleted topsoil, plow pan 22 cm, OM 1.0-1.4%, abandoned drip lines","cropHistory":"14-year continuous citrus (Valencia + navel)"}', 'p1', 0),
  ('00000000-0000-0000-0000-0000aef5e002', '00000000-0000-0000-0000-000000a91c01', 'zone', 'zone_baseline_east_citrus',
    ST_GeomFromGeoJSON('{"type":"Polygon","coordinates":[[[-118.9465,34.2900],[-118.9420,34.2900],[-118.9420,34.2945],[-118.9465,34.2945],[-118.9465,34.2900]]]}'),
    'East Citrus Block — Y0 baseline (cleared, drip scars)', '{"baselineCondition":"depleted topsoil, plow pan 22 cm, OM 1.0-1.4%, abandoned drip lines","cropHistory":"14-year continuous citrus (Valencia + navel)"}', 'p1', 1),
  ('00000000-0000-0000-0000-0000aef5e003', '00000000-0000-0000-0000-000000a91c01', 'structure', 'windbreak',
    ST_GeomFromGeoJSON('{"type":"LineString","coordinates":[[-118.9422,34.2900],[-118.9422,34.2980]]}'),
    'Legacy East Eucalyptus Windbreak (Y0 inherited)', '{"rows":1,"species":["blue gum eucalyptus"],"establishedYear":1992,"condition":"mature, partially senescing"}', 'p1', 2),

  -- Y1 (2025) — water + cover. Two riparian buffers along the arroyos; keyline swales on the two sub-watersheds; winter cover-crop blocks.
  ('00000000-0000-0000-0000-0000aef5e004', '00000000-0000-0000-0000-000000a91c01', 'path', 'riparian_buffer',
    ST_GeomFromGeoJSON('{"type":"LineString","coordinates":[[-118.9510,34.2980],[-118.9505,34.2945],[-118.9500,34.2905]]}'),
    'West-arroyo riparian buffer (Y1)', '{"setbackM":15,"speciesMix":["coast live oak","western sycamore","mulefat","sandbar willow","arroyo lupine understorey"],"establishedYear":2025,"channelLengthM":420}', 'p1', 3),
  ('00000000-0000-0000-0000-0000aef5e005', '00000000-0000-0000-0000-000000a91c01', 'path', 'riparian_buffer',
    ST_GeomFromGeoJSON('{"type":"LineString","coordinates":[[-118.9440,34.2980],[-118.9442,34.2945],[-118.9445,34.2905]]}'),
    'East-arroyo riparian buffer (Y1)', '{"setbackM":15,"speciesMix":["coast live oak","western sycamore","mulefat","sandbar willow","yarrow understorey"],"establishedYear":2025,"channelLengthM":400}', 'p1', 4),

  ('00000000-0000-0000-0000-0000aef5e006', '00000000-0000-0000-0000-000000a91c01', 'path', 'swale',
    ST_GeomFromGeoJSON('{"type":"LineString","coordinates":[[-118.9518,34.2925],[-118.9478,34.2928]]}'),
    'West keyline swale (Y1)', '{"lengthM":370,"slopePct":1.0,"plantedWith":"comfrey + tagasaste","subsoiledDepthCm":40}', 'p1', 5),
  ('00000000-0000-0000-0000-0000aef5e007', '00000000-0000-0000-0000-000000a91c01', 'path', 'swale',
    ST_GeomFromGeoJSON('{"type":"LineString","coordinates":[[-118.9463,34.2928],[-118.9423,34.2930]]}'),
    'East keyline swale (Y1)', '{"lengthM":370,"slopePct":1.1,"plantedWith":"comfrey + carob","subsoiledDepthCm":40}', 'p1', 6),
  ('00000000-0000-0000-0000-0000aef5e008', '00000000-0000-0000-0000-000000a91c01', 'zone', 'zone_cover_crop_bell_bean_oats',
    ST_GeomFromGeoJSON('{"type":"Polygon","coordinates":[[[-118.9515,34.2905],[-118.9480,34.2905],[-118.9480,34.2940],[-118.9515,34.2940],[-118.9515,34.2905]]]}'),
    'Y1 Cover Crop — Bell Bean + Oats + Vetch (West)', '{"speciesMix":["bell bean","oats","common vetch","mustard"],"seedingDate":"2025-11-12","areaHa":3.5}', 'p1', 7),
  ('00000000-0000-0000-0000-0000aef5e009', '00000000-0000-0000-0000-000000a91c01', 'zone', 'zone_cover_crop_rye_phacelia',
    ST_GeomFromGeoJSON('{"type":"Polygon","coordinates":[[[-118.9460,34.2905],[-118.9425,34.2905],[-118.9425,34.2940],[-118.9460,34.2940],[-118.9460,34.2905]]]}'),
    'Y1 Cover Crop — Cereal Rye + Phacelia + Crimson Clover (East)', '{"speciesMix":["cereal rye","phacelia","crimson clover","daikon radish"],"seedingDate":"2025-11-20","areaHa":3.2}', 'p1', 8),

  -- Y2 (2026) — livestock + perennial start + farmstead structures.
  ('00000000-0000-0000-0000-0000aef5e00a', '00000000-0000-0000-0000-000000a91c01', 'zone', 'zone_orchard_block_1',
    ST_GeomFromGeoJSON('{"type":"Polygon","coordinates":[[[-118.9485,34.2910],[-118.9465,34.2910],[-118.9465,34.2925],[-118.9485,34.2925],[-118.9485,34.2910]]]}'),
    'Y2 Polyculture Orchard Block 1 — Stone fruit + nut + Mediterranean (south bench)', '{"trees":72,"varieties":["santa rosa plum","blenheim apricot","pomegranate","fuyu persimmon","carob","drought-tolerant olive","feijoa"],"areaHa":1.2,"establishedYear":2026,"understorey":"comfrey + alfalfa + bunchgrass"}', 'p2', 9),
  ('00000000-0000-0000-0000-0000aef5e00b', '00000000-0000-0000-0000-000000a91c01', 'zone', 'zone_pasture_cowcalf',
    ST_GeomFromGeoJSON('{"type":"Polygon","coordinates":[[[-118.9515,34.2950],[-118.9425,34.2950],[-118.9425,34.2975],[-118.9515,34.2975],[-118.9515,34.2950]]]}'),
    'Y2 Cow-Calf Rotation Pasture (north strip)', '{"speciesMix":"perennial ryegrass + Mediterranean fescue + sub-clover + chicory","initialHerd":"40 head Black Angus / Devon-cross","rotationDays":3,"paddockCellsY2":10,"summerSlowdown":"mob density drops to maintain residue cover through dry season"}', 'p2', 10),
  ('00000000-0000-0000-0000-0000aef5e00c', '00000000-0000-0000-0000-000000a91c01', 'zone', 'zone_poultry_follow',
    ST_GeomFromGeoJSON('{"type":"Polygon","coordinates":[[[-118.9515,34.2950],[-118.9425,34.2950],[-118.9425,34.2975],[-118.9515,34.2975],[-118.9515,34.2950]]]}'),
    'Y2 Mobile Poultry Follow (3-day lag)', '{"flockSize":"200 layers + seasonal broiler shifts","followLagDays":3,"shelter":"mobile coop + electric netting"}', 'p2', 11),
  ('00000000-0000-0000-0000-0000aef5e00d', '00000000-0000-0000-0000-000000a91c01', 'zone', 'zone_nursery_propagation',
    ST_GeomFromGeoJSON('{"type":"Polygon","coordinates":[[[-118.9476,34.2938],[-118.9468,34.2938],[-118.9468,34.2944],[-118.9476,34.2944],[-118.9476,34.2938]]]}'),
    'Y2 Nursery + Propagation Area', '{"beds":8,"propagationTunnels":1,"focus":["native-shrub whips for riparian fill","cover-crop seed increase","Mediterranean tree starts (olive, carob, pomegranate)"]}', 'p2', 12),
  ('00000000-0000-0000-0000-0000aef5e00e', '00000000-0000-0000-0000-000000a91c01', 'zone', 'zone_kitchen_garden',
    ST_GeomFromGeoJSON('{"type":"Polygon","coordinates":[[[-118.9472,34.2938],[-118.9466,34.2938],[-118.9466,34.2944],[-118.9472,34.2944],[-118.9472,34.2938]]]}'),
    'Y2 Kitchen Garden + Herb Spiral', '{"beds":14,"speciesCount":48,"watering":"drip + greywater polish"}', 'p2', 13),
  ('00000000-0000-0000-0000-0000aef5e00f', '00000000-0000-0000-0000-000000a91c01', 'structure', 'pole_barn',
    ST_GeomFromGeoJSON('{"type":"Polygon","coordinates":[[[-118.9470,34.2940],[-118.9465,34.2940],[-118.9465,34.2944],[-118.9470,34.2944],[-118.9470,34.2940]]]}'),
    'Y2 Pole Barn (livestock shelter + hay)', '{"footprintM2":280,"use":["dry-season cow-calf shelter","hay storage","equipment"],"builtYear":2026}', 'p2', 14),
  ('00000000-0000-0000-0000-0000aef5e010', '00000000-0000-0000-0000-000000a91c01', 'structure', 'compost_yard',
    ST_GeomFromGeoJSON('{"type":"Polygon","coordinates":[[[-118.9465,34.2940],[-118.9462,34.2940],[-118.9462,34.2943],[-118.9465,34.2943],[-118.9465,34.2940]]]}'),
    'Y2 Compost Yard + Bays', '{"footprintM2":54,"throughputTpY":120,"use":["livestock-bedding composting","green-waste import-windrow"],"builtYear":2026}', 'p2', 15),
  ('00000000-0000-0000-0000-0000aef5e011', '00000000-0000-0000-0000-000000a91c01', 'structure', 'rainwater_cistern',
    ST_GeomFromGeoJSON('{"type":"Polygon","coordinates":[[[-118.9469,34.2942],[-118.9468,34.2942],[-118.9468,34.2943],[-118.9469,34.2943],[-118.9469,34.2942]]]}'),
    'Y2 Rainwater Cistern (pole barn roof)', '{"capacityLitres":34000,"catchmentRoofM2":280,"use":["livestock water backup","nursery irrigation"],"note":"sized larger than 029 — winter-only collection window forces a bigger buffer"}', 'p2', 16),
  ('00000000-0000-0000-0000-0000aef5e012', '00000000-0000-0000-0000-000000a91c01', 'structure', 'farm_pond',
    ST_GeomFromGeoJSON('{"type":"Polygon","coordinates":[[[-118.9485,34.2935],[-118.9478,34.2935],[-118.9478,34.2940],[-118.9485,34.2940],[-118.9485,34.2935]]]}'),
    'Y2 Farm Pond (keyline-fed catchment)', '{"capacityM3":1800,"catchmentHa":12,"linerType":"clay-puddled","use":["livestock water","orchard winter top-up","habitat node"],"builtYear":2026}', 'p2', 17),
  ('00000000-0000-0000-0000-0000aef5e013', '00000000-0000-0000-0000-000000a91c01', 'path', 'farm_lane',
    ST_GeomFromGeoJSON('{"type":"LineString","coordinates":[[-118.9470,34.2900],[-118.9470,34.2942]]}'),
    'Primary Farm Lane (gravel)', '{"surface":"gravel","widthM":4.0,"lengthM":466}', 'p1', 18),
  ('00000000-0000-0000-0000-0000aef5e014', '00000000-0000-0000-0000-000000a91c01', 'path', 'farm_lane',
    ST_GeomFromGeoJSON('{"type":"LineString","coordinates":[[-118.9470,34.2945],[-118.9508,34.2950],[-118.9508,34.2972]]}'),
    'Pasture Rotation Access Lane', '{"surface":"grass","widthM":3.0,"lengthM":390,"use":"livestock + ATV"}', 'p2', 19),
  ('00000000-0000-0000-0000-0000aef5e015', '00000000-0000-0000-0000-000000a91c01', 'zone', 'zone_hedgerow_north',
    ST_GeomFromGeoJSON('{"type":"Polygon","coordinates":[[[-118.9520,34.2978],[-118.9420,34.2978],[-118.9420,34.2980],[-118.9520,34.2980],[-118.9520,34.2978]]]}'),
    'Y2 North Boundary Hedgerow Plant (new)', '{"species":["toyon","ceanothus","coyote brush","elderberry","coffeeberry","manzanita"],"establishedYear":2026,"lengthM":920,"note":"native California chaparral mix for pollinator + bird habitat"}', 'p2', 20),

  -- Y3+ planned: paddock densification + second orchard block + silvopasture.
  ('00000000-0000-0000-0000-0000aef5e016', '00000000-0000-0000-0000-000000a91c01', 'zone', 'zone_orchard_block_2_planned',
    ST_GeomFromGeoJSON('{"type":"Polygon","coordinates":[[[-118.9460,34.2910],[-118.9440,34.2910],[-118.9440,34.2925],[-118.9460,34.2925],[-118.9460,34.2910]]]}'),
    'Y3 Planned Orchard Block 2 — Citrus revival + avocado polyculture', '{"plannedSpecies":["mandarin (low-water cv.)","tango mandarin","reed avocado","hass avocado","loquat"],"plannedYear":2027,"areaHa":1.2,"note":"citrus returns under polyculture + cover-crop understorey, not monoculture"}', 'p3', 21),
  ('00000000-0000-0000-0000-0000aef5e017', '00000000-0000-0000-0000-000000a91c01', 'zone', 'zone_silvopasture_planned',
    ST_GeomFromGeoJSON('{"type":"Polygon","coordinates":[[[-118.9510,34.2950],[-118.9430,34.2950],[-118.9430,34.2960],[-118.9510,34.2960],[-118.9510,34.2950]]]}'),
    'Y3+ Planned Silvopasture Strip', '{"plannedSpecies":["honeylocust","mesquite","carob","valley oak"],"plannedYear":2027,"densityTreesPerHa":75,"overstoryClosurePctTarget":30,"note":"shade for livestock through May–Oct dry season"}', 'p3', 22)
ON CONFLICT (id) DO NOTHING;

-- ────────────────────────────────────────────────────────────────────────
-- F. Spiritual zones — faith-agnostic showcase site (non-Muslim
--    operation). Qibla bearing NULL on both — this demonstrates the
--    spiritual_zones schema works for non-Muslim sites without forcing
--    Islamic framing. (Three Streams sets a real qibla on its musalla;
--    this fixture deliberately doesn't, per Phase E plan.)
-- ────────────────────────────────────────────────────────────────────────

INSERT INTO spiritual_zones (id, project_id, zone_type, geometry, name, notes, qibla_bearing)
VALUES
  ('00000000-0000-0000-0000-0000a195e001', '00000000-0000-0000-0000-000000a91c01', 'quiet_zone',
    ST_GeomFromGeoJSON('{"type":"Polygon","coordinates":[[[-118.9482,34.2940],[-118.9478,34.2940],[-118.9478,34.2944],[-118.9482,34.2944],[-118.9482,34.2940]]]}'),
    'Meditation Grove — central oak cluster',
    'Quiet 16 m² flat-ground sitting area at the centre of a Y2-planted cluster of coast live oaks. Used by farm stewards for daily reflection and seasonal community contemplation. Faith-agnostic — no qibla orientation set (this is a non-Muslim showcase site; the schema demonstrably accommodates either framing).',
    NULL),
  ('00000000-0000-0000-0000-0000a195e002', '00000000-0000-0000-0000-000000a91c01', 'gathering_circle',
    ST_GeomFromGeoJSON('{"type":"Point","coordinates":[-118.9468,34.2942]}'),
    'Community Hearth (homestead grove)',
    'Stone seat ring around a fire-safe hearth under a Y2-planted cluster of valley oaks near the pole barn. Used for seasonal harvest gatherings, the annual sponsor-and-allies welcome circle, and apprenticeship-cohort closing rituals. No-build / no-cut perimeter.',
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
  -- Cow-calf manure → orchard nutrient uptake
  ('00000000-0000-0000-0000-0000a91ed001', '00000000-0000-0000-0000-000000a91c01', '00000000-0000-0000-0000-00000000a71a',
    '00000000-0000-0000-0000-0000aef5e00b', 'manure',         '00000000-0000-0000-0000-0000aef5e00a', 'nutrient_uptake', 0.85),
  -- Mobile poultry pest-predation service → cow-calf pasture
  ('00000000-0000-0000-0000-0000a91ed002', '00000000-0000-0000-0000-000000a91c01', '00000000-0000-0000-0000-00000000a71a',
    '00000000-0000-0000-0000-0000aef5e00c', 'pest_predation', '00000000-0000-0000-0000-0000aef5e00b', 'pest_predation',  0.65),
  -- Hedgerow forage (flowers/nectar) → pollination on orchard
  ('00000000-0000-0000-0000-0000a91ed003', '00000000-0000-0000-0000-000000a91c01', '00000000-0000-0000-0000-00000000a71a',
    '00000000-0000-0000-0000-0000aef5e015', 'forage',         '00000000-0000-0000-0000-0000aef5e00a', 'pollination',     0.72),
  -- West-arroyo riparian buffer surface water → cow-calf pasture surface water
  ('00000000-0000-0000-0000-0000a91ed004', '00000000-0000-0000-0000-000000a91c01', '00000000-0000-0000-0000-00000000a71a',
    '00000000-0000-0000-0000-0000aef5e004', 'surface_water',  '00000000-0000-0000-0000-0000aef5e00b', 'surface_water',   0.55),
  -- Cover crop mulch → west citrus baseline surface water (infiltration / runoff slowing)
  ('00000000-0000-0000-0000-0000a91ed005', '00000000-0000-0000-0000-000000a91c01', '00000000-0000-0000-0000-00000000a71a',
    '00000000-0000-0000-0000-0000aef5e008', 'mulch',          '00000000-0000-0000-0000-0000aef5e001', 'surface_water',   0.50),
  -- Compost yard → west citrus baseline nutrient uptake
  ('00000000-0000-0000-0000-0000a91ed006', '00000000-0000-0000-0000-000000a91c01', '00000000-0000-0000-0000-00000000a71a',
    '00000000-0000-0000-0000-0000aef5e010', 'compost',        '00000000-0000-0000-0000-0000aef5e001', 'nutrient_uptake', 0.70),
  -- Nursery seed → north hedgerow biomass establishment
  ('00000000-0000-0000-0000-0000a91ed007', '00000000-0000-0000-0000-000000a91c01', '00000000-0000-0000-0000-00000000a71a',
    '00000000-0000-0000-0000-0000aef5e00d', 'seed',           '00000000-0000-0000-0000-0000aef5e015', 'biomass',         0.78),
  -- Farm pond surface water → cow-calf pasture surface water (dry-season buffer)
  ('00000000-0000-0000-0000-0000a91ed008', '00000000-0000-0000-0000-000000a91c01', '00000000-0000-0000-0000-00000000a71a',
    '00000000-0000-0000-0000-0000aef5e012', 'surface_water',  '00000000-0000-0000-0000-0000aef5e00b', 'surface_water',   0.55)
ON CONFLICT (project_id, from_id, from_output, to_id, to_input) DO NOTHING;
