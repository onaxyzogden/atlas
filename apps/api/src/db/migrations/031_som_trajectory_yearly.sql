-- 031_som_trajectory_yearly.sql
-- Phase D.2 — Soil-organic-matter trajectory per year for the Apricot-Lane
-- J-curve. Stores the modelled (or, later, observed) carbon-stock series
-- that underwrites the "natural-capital appreciation" line on the Capital
-- Partner Summary and the secondary y-axis of `<JCurveChart>` (D.4).
--
-- Why a new table instead of appending to 015 regeneration_events or 028
-- succession_milestones:
--   * 015 is an event log (a single dated observation per row), not a
--     year-indexed time series. Aggregating events into per-year stocks
--     every render is expensive.
--   * 028 succession_milestones is a steward-authored phase-by-year log
--     scoped to vegetation succession, not soil-carbon math.
-- This table is the canonical per-year trajectory keyed on
-- (project_id, zone_id, year) so the D.3 recompute path can upsert
-- idempotently and the D.4 chart can query a single ORDER BY year.
--
-- zone_id is TEXT (matches `succession_milestones.zone_id` in 028 and the
-- client-side functional-zone id type) and is NULLABLE — whole-project
-- rows use NULL. No FK because functional zones live in the client
-- zoneStore, not a server table (only `spiritual_zones` has a server
-- table today).
--
-- `source` distinguishes modelled rows (the D.3 recompute path emits
-- 'modeled') from later observed-monitoring rows ('observed'). Default is
-- 'modeled'.
--
-- Covenant: appreciation of stewarded land value, not investor yield.
-- See [[fiqh-csra-erased-2026-05-04]]. The trajectory drives the
-- Capital Partner Summary's natural-capital line — a non-revenue,
-- non-distributable estimate.

CREATE TABLE IF NOT EXISTS som_trajectory_yearly (
  id                   uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id           uuid          NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  zone_id              text,
  year                 integer       NOT NULL,
  som_stock_tc         numeric(12,3) NOT NULL,
  sequestration_tcyr   numeric(12,3) NOT NULL,
  j_curve_stage        text          NOT NULL
    CHECK (j_curve_stage IN ('establishment', 'build-up', 'maturation')),
  source               text          NOT NULL DEFAULT 'modeled'
    CHECK (source IN ('modeled', 'observed')),
  created_at           timestamptz   NOT NULL DEFAULT now(),
  UNIQUE (project_id, zone_id, year)
);

CREATE INDEX IF NOT EXISTS idx_som_traj_project_year
  ON som_trajectory_yearly(project_id, year);

COMMENT ON TABLE som_trajectory_yearly IS
  'Per-year soil-organic-matter stock + sequestration trajectory (Phase D.2, migration 031). Drives the J-curve secondary axis and the Capital Partner Summary natural-capital appreciation line. (project_id, zone_id, year) is the upsert key; zone_id NULL = whole-project row.';

COMMENT ON COLUMN som_trajectory_yearly.som_stock_tc IS
  'Tonnes carbon per hectare (stock at end of `year`).';
COMMENT ON COLUMN som_trajectory_yearly.sequestration_tcyr IS
  'Annualised sequestration rate for `year` (tC/ha/yr).';
COMMENT ON COLUMN som_trajectory_yearly.j_curve_stage IS
  'establishment | build-up | maturation — mirrors TransitionPhase in features/financial/engine/transitionBudget.ts (D.1).';
COMMENT ON COLUMN som_trajectory_yearly.source IS
  'modeled = produced by projectSomTrajectory (D.3); observed = later steward-authored monitoring data.';
