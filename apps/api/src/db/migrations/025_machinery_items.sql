-- 025_machinery_items.sql
-- Backend persistence for the Plan-stage Machinery & Equipment module.
-- Mirrors the design_features table shape (001_initial.sql:182).
-- Local source-of-truth lives in the web zustand store
-- (apps/web/src/store/machineryInventoryStore.ts); this table makes
-- inventory survive a localStorage wipe and unlocks Phase C lifecycle math.

CREATE TABLE machinery_items (
  id                       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id               uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name                     text NOT NULL,
  kind                     text NOT NULL,    -- tractor | implement | mower | hand-tool | other
  purpose                  text NOT NULL DEFAULT '',
  frequency                text NOT NULL,    -- daily | weekly | seasonal | standby
  fuel_type                text NOT NULL,    -- diesel | petrol | electric | human-powered | other
  required_width_m         numeric,
  required_turn_radius_m   numeric,
  housing_element_id       uuid,             -- soft FK to design_features (nullable, no enforced FK)
  acquisition_year         integer,          -- Phase C lifecycle math
  lifecycle_years_estimate integer,          -- Phase C lifecycle math
  created_at               timestamptz NOT NULL DEFAULT now(),
  updated_at               timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_machinery_items_project ON machinery_items(project_id);
