-- ────────────────────────────────────────────────────────────────────────────
-- 014: Widen terrain_analysis numeric columns for high-resolution (1m) DEMs
--
-- On 1m HRDEM (Canada) single-pixel RUSLE values can exceed numeric(8,2)
-- (max 999 999.99). The US 3DEP grid is coarser (~10m) so the Rodale run
-- never tripped the overflow, but Milton/HRDEM does immediately.
--
-- Widen erosion/TWI/TRI/curvature means to accommodate 1m-resolution
-- derivatives without clamping information loss. Physical sanity is
-- enforced by the algorithm classifiers, not by Postgres column width.
-- ────────────────────────────────────────────────────────────────────────────

ALTER TABLE terrain_analysis
  ALTER COLUMN erosion_mean_t_ha_yr     TYPE numeric(14, 2),
  ALTER COLUMN erosion_max_t_ha_yr      TYPE numeric(14, 2),
  ALTER COLUMN twi_mean                 TYPE numeric(10, 2),
  ALTER COLUMN tri_mean_m               TYPE numeric(12, 2),
  ALTER COLUMN curvature_profile_mean   TYPE numeric(14, 6),
  ALTER COLUMN curvature_plan_mean      TYPE numeric(14, 6);
