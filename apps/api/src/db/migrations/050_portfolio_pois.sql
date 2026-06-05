-- 050_portfolio_pois.sql
-- 2026-05-31 — Portfolio Home: resource POIs + POI↔project material flows
--
-- Background:
--   The Portfolio Map lets a steward place resource POINTS OF INTEREST (POIs)
--   that are NOT themselves projects — a regional composting depot, a shared
--   water source, a feed store, an aggregation point. POIs connect to whole
--   projects via material FLOWS, modelling inter-project resource exchange
--   where one operation's waste output becomes another's input ("one man's
--   trash is another man's treasure"). Like cross-project relationships
--   (migration 049), POIs are DISPLAY / AWARENESS METADATA ONLY — they have no
--   effect on Plan, Act, or Observe data logic.
--
--   This EXTENDS the within-project MaterialFlow model UPWARD: it reuses the
--   material vocabulary + monthly quantities, but one end is a POI and the
--   other a whole project, collapsed into a `direction` relative to the POI.
--
-- Model:
--   portfolio_pois     a steward-owned resource node with lng/lat (plain
--                      double precision — no PostGIS) and a category.
--   poi_project_flows  a directional material flow between a POI and a project.
--                      material_kind + direction + optional monthly quantities.
--
-- Constraints:
--   - poi_kind / material_kind / direction CHECKs are kept in LOCKSTEP with the
--     Zod enums in packages/shared/src/schemas/portfolioPoi.schema.ts.
--   - lng/lat bounds CHECKs mirror the Zod input bounds.
--   - UNIQUE (poi_id, project_id, material_kind, direction): one flow row per
--     (POI, project, material, direction) tuple; a pair may carry several
--     distinct material/direction combinations.

CREATE TABLE portfolio_pois (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id    uuid NOT NULL REFERENCES users ON DELETE CASCADE,
  name        text NOT NULL,
  poi_kind    text NOT NULL,
  lng         double precision NOT NULL,
  lat         double precision NOT NULL,
  notes       text,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT portfolio_pois_kind_ck
    CHECK (poi_kind IN (
      'compost_hub', 'water_source', 'feed_store', 'energy_node',
      'aggregation_point', 'market', 'other'
    )),

  CONSTRAINT portfolio_pois_lng_ck CHECK (lng BETWEEN -180 AND 180),
  CONSTRAINT portfolio_pois_lat_ck CHECK (lat BETWEEN -90 AND 90)
);

CREATE INDEX idx_portfolio_pois_owner ON portfolio_pois (owner_id);

CREATE TABLE poi_project_flows (
  id                       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  poi_id                   uuid NOT NULL REFERENCES portfolio_pois ON DELETE CASCADE,
  project_id               uuid NOT NULL REFERENCES projects ON DELETE CASCADE,
  material_kind            text NOT NULL,
  direction                text NOT NULL,
  label                    text,
  mass_kg_per_month        double precision,
  volume_l_per_month       double precision,
  energy_kwh_per_month     double precision,
  nutrient_n_kg_per_month  double precision,
  nutrient_p_kg_per_month  double precision,
  nutrient_k_kg_per_month  double precision,
  notes                    text,
  created_at               timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT poi_project_flows_material_ck
    CHECK (material_kind IN (
      'compost', 'manure', 'mulch', 'water', 'grain', 'energy',
      'other', 'organic_matter', 'greywater'
    )),

  CONSTRAINT poi_project_flows_direction_ck
    CHECK (direction IN ('input', 'output', 'bidirectional')),

  CONSTRAINT poi_project_flows_unique
    UNIQUE (poi_id, project_id, material_kind, direction)
);

CREATE INDEX idx_poi_project_flows_poi ON poi_project_flows (poi_id);
CREATE INDEX idx_poi_project_flows_project ON poi_project_flows (project_id);
