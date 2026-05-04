-- Migration 023 — groundwater_wells_global
--
-- Per ADR 2026-05-04-igrac-global-groundwater-fallback (Phase 8.2-A.1).
-- Local PostGIS table for the IGRAC Global Groundwater Information System
-- (GGIS) well-record dump. Populated by the quarterly ingest job; queried
-- by IgracGroundwaterAdapter for parcels falling outside US (NWIS) and
-- Ontario (PGMN) coverage. Storing the dump locally keeps the request path
-- inside Atlas's own infra and avoids coupling diagnosis SLA to GGIS portal
-- availability.
--
-- The `source` column is fixed to 'IGRAC GGIS' for now; the column exists
-- (rather than a constant in adapter code) so a future per-country adapter
-- expansion can populate the same table with `source = 'BGS' | 'BoM' | …`
-- without a schema migration.
--
-- Vintage stamp is required so diagnosis-report copy can surface staleness
-- honestly per the ADR ("national-agency-paced; may lag current conditions
-- by 1-3 years").

CREATE TABLE IF NOT EXISTS groundwater_wells_global (
  station_id        TEXT NOT NULL,
  source            TEXT NOT NULL DEFAULT 'IGRAC GGIS',
  geom              geometry(Point, 4326) NOT NULL,
  depth_m           NUMERIC(8, 2),                      -- groundwater depth below surface, m
  last_observation  TIMESTAMPTZ,                        -- per upstream record, may be NULL
  ingest_vintage    TEXT NOT NULL,                      -- e.g. '2026-Q2'
  raw_attributes    JSONB NOT NULL DEFAULT '{}'::jsonb, -- pass-through for upstream fields not normalised
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (source, station_id)
);

-- Spatial index for parcel-bbox lookups (adapter selects wells within a
-- bounding-box around the parcel before refining to nearest-N).
CREATE INDEX IF NOT EXISTS groundwater_wells_global_geom_idx
  ON groundwater_wells_global USING GIST (geom);

-- Vintage filter for refresh-job swap-in: ingest job loads new vintage
-- alongside the live one, then flips reads via a constant on the adapter
-- side. Index supports the `WHERE ingest_vintage = $1` filter the adapter
-- uses to scope reads to the active vintage during the cut-over window.
CREATE INDEX IF NOT EXISTS groundwater_wells_global_vintage_idx
  ON groundwater_wells_global (ingest_vintage);
