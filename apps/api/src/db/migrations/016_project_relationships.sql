-- 016_project_relationships.sql
-- 2026-04-28 — Needs & Yields dependency graph: Phase 3 persistence
--
-- Background:
--   Phases 1 and 2 of the Needs & Yields rollout shipped a shared-package
--   data model (`@ogden/shared/relationships`) and a canvas socket/edge UI
--   gated by FEATURE_RELATIONSHIPS. Edges have lived in localStorage since.
--
--   Phase 3 promotes edges to first-class server state so a project's
--   integration graph survives device changes, drives the integration
--   score that just lifted from weight 0 → 0.10, and can later anchor
--   server-side analytics (cycle detection, orphan-output reports).
--
--   See ADR wiki/decisions/2026-04-28-needs-yields-dependency-graph.md.
--
-- Vocabulary mirrors @ogden/shared/relationships/types.ts:
--   resource_type      ↔ ResourceType (13-value enum)
--   from_id / to_id    are the placed-entity ids; entities are stored in
--                      separate per-domain tables (structures, utilities,
--                      crop_areas, paddocks). We do NOT enforce FK to any
--                      one of those — paddock multi-species ids carry a
--                      "::species" suffix that no single FK can express,
--                      and entity deletion in those tables already cascades
--                      via project_id. Stale edges are pruned at read time
--                      by the application layer.
--
-- Constraints:
--   - UNIQUE on (project_id, from_id, from_output, to_id, to_input):
--     dedup matches the EdgeSchema dedup rule in relationshipsStore.
--   - CHECK on resource enum (kept in lockstep with Zod ResourceTypeSchema
--     via the shared test suite).

CREATE TABLE project_relationships (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id    uuid NOT NULL REFERENCES projects ON DELETE CASCADE,
  created_by    uuid REFERENCES users ON DELETE SET NULL,

  from_id       text NOT NULL,
  from_output   text NOT NULL,
  to_id         text NOT NULL,
  to_input      text NOT NULL,
  ratio         numeric(3, 2),

  created_at    timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT project_relationships_unique_edge
    UNIQUE (project_id, from_id, from_output, to_id, to_input),

  CONSTRAINT project_relationships_ratio_ck
    CHECK (ratio IS NULL OR (ratio >= 0 AND ratio <= 1)),

  CONSTRAINT project_relationships_no_self_loop
    CHECK (from_id <> to_id),

  CONSTRAINT project_relationships_resource_ck
    CHECK (
      from_output IN (
        'manure', 'greywater', 'compost', 'biomass', 'seed', 'forage',
        'mulch', 'heat', 'shade', 'pollination', 'pest_predation',
        'nutrient_uptake', 'surface_water'
      )
      AND to_input IN (
        'manure', 'greywater', 'compost', 'biomass', 'seed', 'forage',
        'mulch', 'heat', 'shade', 'pollination', 'pest_predation',
        'nutrient_uptake', 'surface_water'
      )
    )
);

CREATE INDEX idx_project_relationships_project
  ON project_relationships (project_id);
