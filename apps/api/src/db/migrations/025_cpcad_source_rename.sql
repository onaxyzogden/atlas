-- Migration 025 — conservation_overlay_features: rename ECCC_ESG → CPCAD
--
-- Per schema correction 2026-05-04: the CA-tier source for the
-- conservation-overlay layer is the Canadian Protected and Conserved
-- Areas Database (CPCAD), not just the ECCC Ecological Gifts Program
-- subset that the 8.2-B ADR originally specified. CPCAD:
--   - Contains all 22,438 legally-protected areas + OECMs in Canada
--   - OGL-Canada 2.0 licence (same as AAFC ACI)
--   - Annual refresh cadence (first available vintage: 2025)
--   - Geometry: Canada Albers Equal Area Conic → ingest job reprojects to EPSG:4326
--   - Authoritative source: https://open.canada.ca/data/en/dataset/
--     6c343726-1e92-451a-876a-76e17d398a1c
--
-- Migration 024 committed the original CHECK constraint with 'ECCC_ESG'.
-- This migration drops and recreates it with 'CPCAD'. Migration 024 has
-- not been applied to any live database at time of writing (development
-- branch only), so this is a corrective rename rather than a data migration.
--
-- Future: a CPCAD feature with PA_OECM_DF=2 (OECM) vs 1 (PA) should be
-- surfaced differently in the diagnosis report; that distinction rides on
-- raw_attributes.pa_oecm_df and does not require a schema change here.

ALTER TABLE conservation_overlay_features
  DROP CONSTRAINT conservation_overlay_source_ck;

ALTER TABLE conservation_overlay_features
  ADD CONSTRAINT conservation_overlay_source_ck
    CHECK (source IN ('WDPA', 'NCED', 'CPCAD'));
