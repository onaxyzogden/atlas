-- 019_builtin_layer_summary_remaining.sql
--
-- Migration 018 re-keyed the two layers consumers read by typed key
-- today (climate + elevation) to canonical snake_case. The remaining
-- four migration-017 layers (soils, watershed, wetlands_flood,
-- land_cover) still hold the original camelCase blobs. No frontend
-- reader hits them typed today, but the inconsistency blocks the
-- Phase-2 work to un-camelCase the authenticated /layers/project/:id
-- endpoint — once that endpoint stops recursing toCamelCase into
-- summary_data, the canonical snake_case shape from
-- packages/shared/src/scoring/layerSummary.ts is what the frontend
-- will receive, so the DB shape needs to match.
--
-- Mapping (best effort against canonical SoilsSummary / WatershedSummary
-- / WetlandsFloodSummary / LandCoverSummary):
--
--   soils:
--     dominantSeries  -> soil_name
--     drainage        -> drainage_class
--     agCapability    -> farmland_class
--
--   watershed:
--     watershedName   -> watershed_name
--     subWatershed    -> dropped (no canonical field; preserved in
--                        metadata jsonb if needed later)
--     streamOrder     -> stream_order
--
--   wetlands_flood:
--     floodplainAreaHa  -> dropped (no canonical field; setback below
--                          captures the regulatory signal)
--     wetlandPresent    -> has_significant_wetland (boolean) +
--                          wetland_pct (0 when absent)
--     regulatedSetbackM -> riparian_buffer_m (canonical numeric metres)
--                          + conservation_authority text
--
--   land_cover:
--     forestPct  -> tree_canopy_pct
--     pasturePct -> cropland_pct (AAFC Annual Crop Inventory groups
--                   pasture under cropland)
--     builtPct   -> urban_pct
--     waterPct   -> water_pct
--     barePct    -> retained inside `classes` jsonb (no canonical
--                   bare-ground field; impervious_pct is not the
--                   right home for it)
--
-- Idempotent — overwrites the row regardless of prior shape.

UPDATE project_layers
SET summary_data = '{
  "soil_name":      "Chinguacousy clay loam",
  "drainage_class": "Imperfectly drained",
  "farmland_class": "Class 2 (mechanical limitation: stoniness)"
}'::jsonb
WHERE project_id = '00000000-0000-0000-0000-0000005a3791'::uuid
  AND layer_type = 'soils';

UPDATE project_layers
SET summary_data = '{
  "watershed_name": "Sixteen Mile Creek — Middle",
  "stream_order":   2
}'::jsonb
WHERE project_id = '00000000-0000-0000-0000-0000005a3791'::uuid
  AND layer_type = 'watershed';

UPDATE project_layers
SET summary_data = '{
  "wetland_pct":              0,
  "has_significant_wetland":  false,
  "riparian_buffer_m":        30,
  "conservation_authority":   "Conservation Halton",
  "regulated_area_pct":       33
}'::jsonb
WHERE project_id = '00000000-0000-0000-0000-0000005a3791'::uuid
  AND layer_type = 'wetlands_flood';

UPDATE project_layers
SET summary_data = '{
  "tree_canopy_pct": 38,
  "cropland_pct":    42,
  "urban_pct":       6,
  "water_pct":       1,
  "classes": {
    "forest":   38,
    "pasture":  42,
    "built":    6,
    "water":    1,
    "bare":    13
  }
}'::jsonb
WHERE project_id = '00000000-0000-0000-0000-0000005a3791'::uuid
  AND layer_type = 'land_cover';
