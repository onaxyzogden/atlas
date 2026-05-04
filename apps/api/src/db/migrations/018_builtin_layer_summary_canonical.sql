-- 018_builtin_layer_summary_canonical.sql
--
-- Migration 017 seeded the builtin "351 House — Atlas Sample" project's
-- project_layers.summary_data using camelCase keys (annualPrecipMm,
-- hardinessZone, minM/maxM/meanM). The canonical LayerSummaryMap in
-- packages/shared/src/scoring/layerSummary.ts and every runtime consumer
-- (apps/web/src/lib/layerFetcher.ts, mockLayerData.ts, getLayerSummaryText)
-- are snake_case. Re-key the two layers ObserveHub + DiagnosisReportExport
-- read by typed key (climate + elevation) to match canonical shape, and
-- backfill mean_slope_deg / max_slope_deg / predominant_aspect from
-- migration 017's terrain_analysis row so the frontend has everything
-- without a second join.
--
-- Sister layers (soils, watershed, wetlands_flood, land_cover) keep their
-- existing camelCase blobs for now — no consumer reads them by typed key
-- yet, so they aren't blocking. Tracked as a follow-up.

UPDATE project_layers
SET summary_data = '{
  "min_elevation_m": 240.1,
  "max_elevation_m": 268.4,
  "mean_elevation_m": 254.7,
  "mean_slope_deg":   4.2,
  "max_slope_deg":   11.6,
  "predominant_aspect": "SW"
}'::jsonb
WHERE project_id = '00000000-0000-0000-0000-0000005a3791'::uuid
  AND layer_type = 'elevation';

UPDATE project_layers
SET summary_data = '{
  "annual_precip_mm":      870,
  "growing_season_days":   156,
  "growing_degree_days":  2860,
  "hardiness_zone":       "5b",
  "annual_temp_mean_c":    7.8,
  "koppen_classification": "Dfb",
  "first_frost_date":     "2025-10-15",
  "last_frost_date":      "2025-05-05"
}'::jsonb
WHERE project_id = '00000000-0000-0000-0000-0000005a3791'::uuid
  AND layer_type = 'climate';
