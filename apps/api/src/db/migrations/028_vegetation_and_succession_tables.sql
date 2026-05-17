-- 028_vegetation_and_succession_tables.sql
-- Phase 3 of the durable P0-1 fix (Full syncService Coverage): the two
-- project-scoped stores the server should actually reason about/query move
-- off the opaque versioned-blob transport onto real typed tables.
--
--   * vegetation_patches   ← apps/web/src/store/vegetationStore.ts
--                            (ogden-vegetation; current land cover, auto-
--                            design affinity, dashboard rollups)
--   * succession_milestones← apps/web/src/store/successionStore.ts
--                            (ogden-act-succession; per-zone / per-year
--                            ecological-monitoring timeline)
--
-- Mirrors the machinery_items shape (025): client-supplied id so the local
-- zustand store keeps one id from creation through later updates without a
-- roundtrip swap. id is TEXT (not uuid): vegetation ids are UUIDs but
-- succession ids are `sm-<ts>-<rand>` — both are opaque client strings.
-- successionStage / groundCover are web-store-owned enum vocabularies
-- stored as opaque text (no DB-enforced value set — avoids a migration
-- every time the web enum grows). geometry is jsonb verbatim (the store
-- holds GeoJSON; Phase 3 needs no spatial query).
--
-- Geometry-bearing DESIGN elements still never travel here — they stay on
-- design_features; the syncManifest coverage guard enforces that.

CREATE TABLE IF NOT EXISTS vegetation_patches (
  id               text        PRIMARY KEY,
  project_id       uuid        NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  geometry         jsonb       NOT NULL,
  succession_stage text        NOT NULL,
  ground_cover     text        NOT NULL,
  label            text,
  notes            text,
  created_by       uuid        REFERENCES users(id) ON DELETE SET NULL,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_vegetation_patches_project
  ON vegetation_patches(project_id);

CREATE TABLE IF NOT EXISTS succession_milestones (
  id             text        PRIMARY KEY,
  project_id     uuid        NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  zone_id        text,
  year           integer     NOT NULL,
  phase          text        NOT NULL,
  observation    text        NOT NULL DEFAULT '',
  photo_data_url text,
  created_by     uuid        REFERENCES users(id) ON DELETE SET NULL,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_succession_milestones_project
  ON succession_milestones(project_id);

COMMENT ON TABLE vegetation_patches IS
  'Typed-table sync for ogden-vegetation (Full syncService Coverage Phase 3, migration 028). Client-supplied text id mirrors machinery_items.';
COMMENT ON TABLE succession_milestones IS
  'Typed-table sync for ogden-act-succession (Full syncService Coverage Phase 3, migration 028). id is the opaque sm-<ts>-<rand> client string.';
