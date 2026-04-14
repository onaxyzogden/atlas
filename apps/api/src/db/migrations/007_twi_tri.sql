-- ────────────────────────────────────────────────────────────────────────────
-- 007: TWI (Topographic Wetness Index) and TRI (Terrain Ruggedness Index)
-- Adds wetness and ruggedness columns to the terrain_analysis table.
-- ────────────────────────────────────────────────────────────────────────────

ALTER TABLE terrain_analysis

  -- TWI (ln(catchment_area / tan(slope)))
  ADD COLUMN twi_mean           numeric(6, 2),
  ADD COLUMN twi_classification jsonb,           -- { very_dry_pct, dry_pct, moist_pct, wet_pct, very_wet_pct }
  ADD COLUMN twi_dominant_class text,            -- very_dry | dry | moist | wet | very_wet
  ADD COLUMN twi_geojson        jsonb,           -- classified zones FeatureCollection

  -- TRI (mean absolute elevation difference, Riley et al. 1999)
  ADD COLUMN tri_mean_m         numeric(8, 2),
  ADD COLUMN tri_classification jsonb,           -- { level_pct, nearly_level_pct, ... extremely_rugged_pct }
  ADD COLUMN tri_dominant_class text,            -- level | nearly_level | ... | extremely_rugged
  ADD COLUMN tri_geojson        jsonb            -- classified zones FeatureCollection
;
