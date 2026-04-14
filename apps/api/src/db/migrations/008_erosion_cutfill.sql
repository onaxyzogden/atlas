-- ────────────────────────────────────────────────────────────────────────────
-- 008: Erosion Hazard (RUSLE) columns
-- Cut/fill is on-demand per design feature, so no columns needed for it.
-- ────────────────────────────────────────────────────────────────────────────

ALTER TABLE terrain_analysis

  -- RUSLE erosion hazard (A = R × K × LS × C × P, t/ha/yr)
  ADD COLUMN erosion_mean_t_ha_yr    numeric(8, 2),
  ADD COLUMN erosion_max_t_ha_yr     numeric(8, 2),
  ADD COLUMN erosion_classification  jsonb,           -- { very_low_pct, low_pct, moderate_pct, high_pct, very_high_pct, severe_pct }
  ADD COLUMN erosion_dominant_class  text,            -- very_low | low | moderate | high | very_high | severe
  ADD COLUMN erosion_geojson         jsonb,           -- classified zones FeatureCollection
  ADD COLUMN erosion_confidence      text             -- high | medium | low (depends on which RUSLE factors were provided vs. defaulted)
;
