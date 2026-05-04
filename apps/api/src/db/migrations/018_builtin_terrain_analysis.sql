-- 018_builtin_terrain_analysis.sql
-- Seeds a terrain_analysis row for the 351 House — Halton, ON demo project.
-- Derived from NRCan HRDEM 1m data for the Halton Region parcel:
--   12 ac parcel, gentle Carolinian mid-slopes, SE-facing, east gully drainage.
-- Idempotent — skipped if a row already exists for this project.

INSERT INTO terrain_analysis (
  project_id,
  -- Base elevation
  elevation_min_m,
  elevation_max_m,
  elevation_mean_m,
  -- Slope
  slope_min_deg,
  slope_max_deg,
  slope_mean_deg,
  -- Aspect
  aspect_dominant,
  -- Curvature (Zevenbergen-Thorne, after migration 014 widening)
  curvature_profile_mean,
  curvature_plan_mean,
  curvature_classification,
  -- Viewshed
  viewshed_visible_pct,
  -- Frost pockets
  frost_pocket_area_pct,
  frost_pocket_severity,
  -- Cold air drainage
  cold_air_risk_rating,
  -- TPI
  tpi_dominant_class,
  tpi_classification,
  -- TWI
  twi_mean,
  twi_dominant_class,
  twi_classification,
  -- TRI
  tri_mean_m,
  tri_dominant_class,
  -- RUSLE erosion
  erosion_mean_t_ha_yr,
  erosion_max_t_ha_yr,
  erosion_dominant_class,
  erosion_confidence,
  -- Provenance
  source_api,
  confidence,
  data_sources,
  computed_at
)
SELECT
  '00000000-0000-0000-0000-0000005a3791',
  240.4,
  268.1,
  253.8,
  0.3,
  22.1,
  4.2,
  'SE',
  -0.183420,   -- slight concave profile — mid-slope drainage favourable
  0.076810,    -- slight convex plan — water disperses laterally
  '{"ridgeline_pct": 11, "valley_pct": 16, "saddle_pct": 7, "planar_pct": 66}'::jsonb,
  68.5,
  14.2,
  'low',
  'low',
  'mid_slope',
  '{"ridge_pct": 11, "upper_slope_pct": 21, "mid_slope_pct": 49, "flat_pct": 9, "lower_slope_pct": 6, "valley_pct": 4}'::jsonb,
  9.84,
  'moist',
  '{"very_dry_pct": 5, "dry_pct": 22, "moist_pct": 54, "wet_pct": 16, "very_wet_pct": 3}'::jsonb,
  1.82,
  'nearly_level',
  0.31,
  1.87,
  'very_low',
  'medium',                                      -- erosion_confidence
  'nrcan_hrdem',                                 -- source_api
  'medium',                                      -- confidence
  ARRAY['nrcan_hrdem', 'ontario_hydro_network'], -- data_sources
  '2026-05-01 09:00:00+00'                       -- computed_at
WHERE NOT EXISTS (
  SELECT 1 FROM terrain_analysis
  WHERE project_id = '00000000-0000-0000-0000-0000005a3791'
);
