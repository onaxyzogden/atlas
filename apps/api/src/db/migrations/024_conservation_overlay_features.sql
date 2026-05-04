-- Migration 024 — conservation_overlay_features
--
-- Per ADR 2026-05-04-tiered-conservation-overlay (Phase 8.2-B.1).
-- One physical table, three logical sources (WDPA / NCED / ECCC_ESG)
-- distinguished by the `source` column. Each ingest job populates the
-- table with `source = 'WDPA' | 'NCED' | 'ECCC_ESG'`; the conservation
-- overlay endpoint queries by parcel bbox and surfaces per-feature
-- provenance to the diagnosis report.
--
-- The ADR locks the data shape: every feature carries `source`,
-- `designation_type`, `last_updated`, and geometry. `vintage` is the
-- ingest-side stamp (WDPA monthly, NCED quarterly, ECCC ESG static
-- 2023) so diagnosis reports can render staleness honestly. Per-record
-- `attribution` is needed for NCED (the aggregator cites underlying
-- land-trust records).
--
-- Geometry is `geometry(Geometry, 4326)` not `Polygon` — WDPA mixes
-- Polygon and MultiPolygon, NCED is mostly Polygon, ECCC ESG is
-- MultiPolygon. Storing the union saves the ingest jobs from a forced
-- ST_Multi cast and keeps the overlay endpoint simple.

CREATE TABLE IF NOT EXISTS conservation_overlay_features (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source            text NOT NULL,
  source_record_id  text NOT NULL,                       -- upstream stable id (WDPA WDPAID, NCED feature_id, ECCC ESG record id)
  designation_type  text NOT NULL,                       -- e.g. 'IUCN_II', 'Conservation Easement', 'Ecological Gift'
  designation_name  text,                                -- human-readable name, may be NULL upstream
  attribution       text,                                -- per-record attribution (NCED uses this for the originating land trust)
  last_updated      date,                                -- per upstream record; differs from ingest_vintage
  ingest_vintage    text NOT NULL,                       -- e.g. '2026-05', '2026-Q2', or '2023-static' for ECCC ESG
  geom              geometry(Geometry, 4326) NOT NULL,
  raw_attributes    jsonb NOT NULL DEFAULT '{}'::jsonb,  -- pass-through for upstream fields not normalised
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT conservation_overlay_source_ck
    CHECK (source IN ('WDPA', 'NCED', 'ECCC_ESG')),
  -- (source, source_record_id) is the upstream stable key. UPSERT
  -- target for every refresh job so a vintage swap-over doesn't
  -- duplicate features.
  CONSTRAINT conservation_overlay_upstream_uq
    UNIQUE (source, source_record_id)
);

-- Spatial index for parcel-bbox lookups; the overlay endpoint hits
-- this on every diagnosis run.
CREATE INDEX IF NOT EXISTS conservation_overlay_features_geom_idx
  ON conservation_overlay_features USING GIST (geom);

-- Source filter: diagnosis report can render WDPA-only or layered
-- views; this index lets the overlay endpoint scope by source cheaply.
CREATE INDEX IF NOT EXISTS conservation_overlay_features_source_idx
  ON conservation_overlay_features (source);

-- Vintage filter for refresh-job swap-in (mirrors the pattern in
-- migration 023 for groundwater_wells_global): ingest job loads new
-- vintage alongside the live one, then flips reads via a constant on
-- the adapter side.
CREATE INDEX IF NOT EXISTS conservation_overlay_features_vintage_idx
  ON conservation_overlay_features (source, ingest_vintage);

CREATE TRIGGER set_updated_at_conservation_overlay BEFORE UPDATE ON conservation_overlay_features
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();
