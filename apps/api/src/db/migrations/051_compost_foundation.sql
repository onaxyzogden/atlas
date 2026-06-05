-- Migration 051 — Thermophilic composting foundation (Site × Pile × Reading)
--
-- Backing tables for the composting vertical: a distinct lightweight batch
-- instrument that reuses OLOS's Plan / Act / Observe language but NOT the
-- land-use project taxonomy (no ProjectTypeId, no objective catalogue, no
-- 7 strata, no parcel polygons). A pile is a batch, not a parcel.
--
-- Three tables, modelled on the conventions in 043_olos_foundation.sql:
--
--   compost_sites      — a pinned location (Point geo), org-scoped + owned
--   compost_piles      — one batch + its Plan payload (recipe/checklist/objectives)
--   compost_readings   — the time-series (modelled on olos_proof_records)
--
-- Ownership/sharing reuses the existing organizations + RBAC model — no new
-- auth surface here. Remote-sensor device auth + a compost_devices table land
-- in a later migration (Phase 4); compost_readings.device_id is provisioned
-- now (nullable, no FK yet) so sensor ingestion can populate it without a
-- schema change to this table.
--
-- Enum CHECK constraints mirror the Zod enums in
-- packages/shared/src/schemas/compost/*.schema.ts character-for-character.
-- Keep both in sync when adding statuses or kinds.
--
-- Temperatures are canonical Celsius. Geometry: WGS84 (SRID 4326), Point.

-- ─────────────────────────────────────────────────────────────────────────
-- SITES
-- ─────────────────────────────────────────────────────────────────────────

CREATE TABLE compost_sites (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id          uuid NOT NULL REFERENCES organizations ON DELETE CASCADE,
  owner_id        uuid REFERENCES users ON DELETE SET NULL,

  name            text NOT NULL,
  label           text,
  location        geometry(Point, 4326),
  address         text,

  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_compost_sites_org      ON compost_sites (org_id);
CREATE INDEX idx_compost_sites_owner    ON compost_sites (owner_id) WHERE owner_id IS NOT NULL;
CREATE INDEX idx_compost_sites_location ON compost_sites USING GIST (location);

CREATE TRIGGER set_updated_at_compost_site BEFORE UPDATE ON compost_sites
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- ─────────────────────────────────────────────────────────────────────────
-- PILES (batches)
-- ─────────────────────────────────────────────────────────────────────────

CREATE TABLE compost_piles (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id             uuid NOT NULL REFERENCES compost_sites ON DELETE CASCADE,
  org_id              uuid NOT NULL REFERENCES organizations ON DELETE CASCADE,
  owner_id            uuid REFERENCES users ON DELETE SET NULL,

  name                text NOT NULL,
  cycle_label         text,
  status              text NOT NULL DEFAULT 'planning',

  length_ft           numeric(8, 2),
  width_ft            numeric(8, 2),
  height_ft           numeric(8, 2),
  target_cn_ratio     numeric(8, 2),
  target_moisture_pct numeric(5, 2),
  target_temp_min_c   numeric(6, 2),
  target_temp_max_c   numeric(6, 2),

  recipe_layers       jsonb NOT NULL DEFAULT '[]'::jsonb,
  build_checklist     jsonb NOT NULL DEFAULT '[]'::jsonb,
  objectives          jsonb NOT NULL DEFAULT '[]'::jsonb,

  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT compost_piles_status_ck
    CHECK (status IN ('planning', 'building', 'active', 'curing', 'complete'))
);

CREATE INDEX idx_compost_piles_site       ON compost_piles (site_id);
CREATE INDEX idx_compost_piles_org_status ON compost_piles (org_id, status);
CREATE INDEX idx_compost_piles_owner      ON compost_piles (owner_id) WHERE owner_id IS NOT NULL;

CREATE TRIGGER set_updated_at_compost_pile BEFORE UPDATE ON compost_piles
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- ─────────────────────────────────────────────────────────────────────────
-- READINGS (time-series — modelled on olos_proof_records)
-- ─────────────────────────────────────────────────────────────────────────

CREATE TABLE compost_readings (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pile_id         uuid NOT NULL REFERENCES compost_piles ON DELETE CASCADE,

  temp_c          numeric(6, 2) NOT NULL,
  moisture_pct    numeric(5, 2),
  turned          boolean NOT NULL DEFAULT false,
  note            text,
  source          text NOT NULL DEFAULT 'manual',
  device_id       uuid,          -- nullable; FK to compost_devices added in Phase 4
  proof_photo_uri text,
  captured_at     timestamptz NOT NULL DEFAULT now(),
  recorded_by     uuid REFERENCES users ON DELETE SET NULL,

  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT compost_readings_source_ck
    CHECK (source IN ('manual', 'sensor'))
);

-- Primary access pattern: a pile's readings in chronological order (the curve).
CREATE INDEX idx_compost_readings_pile_time
  ON compost_readings (pile_id, captured_at);
CREATE INDEX idx_compost_readings_device
  ON compost_readings (device_id) WHERE device_id IS NOT NULL;

CREATE TRIGGER set_updated_at_compost_reading BEFORE UPDATE ON compost_readings
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

COMMENT ON TABLE compost_sites    IS 'Compost vertical: a pinned location (Point geo) hosting one or more piles. Org-scoped + owned for RBAC sharing.';
COMMENT ON TABLE compost_piles    IS 'Compost vertical: one batch + its Plan payload (dimensions, targets, recipe layers, build checklist, objectives).';
COMMENT ON TABLE compost_readings IS 'Compost vertical: time-stamped probe readings (temp/moisture/turned). Heart of Act + Observe. source=manual|sensor.';
