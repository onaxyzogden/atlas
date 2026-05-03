-- 020_builtin_climate_metadata.sql
-- Adds climate characterisation keys to the 351 House project metadata.
-- These are Tier 1 pipeline outputs (ECCC 1991-2020 normals) for Halton Region, ON.
-- Stored in the projects.metadata JSONB alongside existing fields.
-- Idempotent — COALESCE keeps any existing value.

UPDATE projects SET
  metadata = metadata || jsonb_build_object(
    'hardinessZone',       COALESCE(metadata->>'hardinessZone',       '5b'),
    'annualPrecipMm',      COALESCE((metadata->>'annualPrecipMm')::numeric, 870),
    'frostFreeDays',       COALESCE((metadata->>'frostFreeDays')::numeric,  155),
    'lastFrostAvg',        COALESCE(metadata->>'lastFrostAvg',        'May 3'),
    'firstFallFrostAvg',   COALESCE(metadata->>'firstFallFrostAvg',   'Oct 5'),
    'avgDailySolarKwhM2',  COALESCE((metadata->>'avgDailySolarKwhM2')::numeric, 4.2),
    'prevailingWindDir',   COALESCE(metadata->>'prevailingWindDir',   'W / SW'),
    'climateNormals',      COALESCE(metadata->>'climateNormals',      'ECCC 1991-2020 (Toronto/Pearson)')
  )
WHERE id = '00000000-0000-0000-0000-0000005a3791';
