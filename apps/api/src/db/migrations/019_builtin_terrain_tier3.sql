-- 019_builtin_terrain_tier3.sql
-- Backfills Tier 3 terrain columns for the 351 House builtin project.
-- Migration 018 seeded a fresh row, but the project already had a base row
-- (elevation/slope/aspect from NRCan HRDEM) with Tier 3 columns null.
-- This UPDATE fills the derived columns; idempotent where already set.

UPDATE terrain_analysis SET
  curvature_profile_mean   = COALESCE(curvature_profile_mean,  -0.183420),
  curvature_plan_mean      = COALESCE(curvature_plan_mean,      0.076810),
  curvature_classification = COALESCE(curvature_classification,
    '{"ridgeline_pct": 11, "valley_pct": 16, "saddle_pct": 7, "planar_pct": 66}'::jsonb),
  viewshed_visible_pct     = COALESCE(viewshed_visible_pct,  68.5),
  frost_pocket_area_pct    = COALESCE(frost_pocket_area_pct, 14.2),
  frost_pocket_severity    = COALESCE(frost_pocket_severity, 'low'),
  cold_air_risk_rating     = COALESCE(cold_air_risk_rating,  'low'),
  tpi_dominant_class       = COALESCE(tpi_dominant_class, 'mid_slope'),
  tpi_classification       = COALESCE(tpi_classification,
    '{"ridge_pct": 11, "upper_slope_pct": 21, "mid_slope_pct": 49, "flat_pct": 9, "lower_slope_pct": 6, "valley_pct": 4}'::jsonb),
  twi_mean                 = COALESCE(twi_mean, 9.84),
  twi_dominant_class       = COALESCE(twi_dominant_class, 'moist'),
  twi_classification       = COALESCE(twi_classification,
    '{"very_dry_pct": 5, "dry_pct": 22, "moist_pct": 54, "wet_pct": 16, "very_wet_pct": 3}'::jsonb),
  tri_mean_m               = COALESCE(tri_mean_m, 1.82),
  tri_dominant_class       = COALESCE(tri_dominant_class, 'nearly_level'),
  erosion_mean_t_ha_yr     = COALESCE(erosion_mean_t_ha_yr, 0.31),
  erosion_max_t_ha_yr      = COALESCE(erosion_max_t_ha_yr,  1.87),
  erosion_dominant_class   = COALESCE(erosion_dominant_class, 'very_low'),
  erosion_confidence       = COALESCE(erosion_confidence, 'medium'),
  source_api               = COALESCE(source_api, 'nrcan_hrdem'),
  confidence               = COALESCE(confidence, 'medium'),
  data_sources             = COALESCE(data_sources, ARRAY['nrcan_hrdem', 'ontario_hydro_network'])
WHERE project_id = '00000000-0000-0000-0000-0000005a3791';
