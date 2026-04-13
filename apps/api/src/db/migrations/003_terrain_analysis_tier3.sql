-- ────────────────────────────────────────────────────────────────────────────
-- 003: Tier 3 Terrain Analysis columns
-- Adds curvature, viewshed, frost pocket, cold air drainage, and TPI
-- columns to the existing terrain_analysis table.
-- ────────────────────────────────────────────────────────────────────────────

ALTER TABLE terrain_analysis

  -- Curvature (profile + plan, Zevenbergen-Thorne)
  ADD COLUMN curvature_profile_mean   numeric(8, 4),
  ADD COLUMN curvature_plan_mean      numeric(8, 4),
  ADD COLUMN curvature_classification jsonb,          -- { ridgeline_pct, valley_pct, saddle_pct, planar_pct }
  ADD COLUMN curvature_geojson        jsonb,          -- classified zones FeatureCollection

  -- Viewshed (from observer point)
  ADD COLUMN viewshed_visible_pct     numeric(5, 2),
  ADD COLUMN viewshed_observer_point  geometry(Point, 4326),
  ADD COLUMN viewshed_geojson         jsonb,          -- visible/not-visible mask FeatureCollection

  -- Frost pocket probability (cold air accumulation)
  ADD COLUMN frost_pocket_area_pct    numeric(5, 2),
  ADD COLUMN frost_pocket_severity    text,            -- high | medium | low | none
  ADD COLUMN frost_pocket_geojson     jsonb,           -- frost pocket zones FeatureCollection

  -- Cold air drainage (downslope flow paths)
  ADD COLUMN cold_air_drainage_paths  jsonb,           -- LineString FeatureCollection of flow paths
  ADD COLUMN cold_air_pooling_zones   jsonb,           -- Polygon FeatureCollection of pooling areas
  ADD COLUMN cold_air_risk_rating     text,            -- high | medium | low | none

  -- Terrain Position Index (TPI)
  ADD COLUMN tpi_classification       jsonb,           -- { ridge_pct, upper_slope_pct, mid_slope_pct, flat_pct, lower_slope_pct, valley_pct }
  ADD COLUMN tpi_dominant_class       text,            -- ridge | upper_slope | mid_slope | flat | lower_slope | valley
  ADD COLUMN tpi_geojson              jsonb,           -- classified zones FeatureCollection

  -- Provenance metadata
  ADD COLUMN source_api               text,            -- usgs_3dep | nrcan_hrdem
  ADD COLUMN confidence               text,            -- high | medium | low
  ADD COLUMN data_sources             text[];          -- provenance array for WithConfidence
;

CREATE INDEX IF NOT EXISTS idx_terrain_analysis_project ON terrain_analysis (project_id);
