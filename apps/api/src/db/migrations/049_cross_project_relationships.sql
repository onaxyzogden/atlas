-- 049_cross_project_relationships.sql
-- 2026-05-31 — Portfolio Home: cross-project relationships (Spec §5)
--
-- Background:
--   The Portfolio Home surface lets a steward with 2+ projects record how
--   their properties relate spatially, ecologically, or operationally. These
--   relationships drive the §2.7 relationship lines on the Portfolio Map and
--   (later) filtering in the Portfolio Dashboard. They are DISPLAY / AWARENESS
--   METADATA ONLY — they have no effect on Plan, Act, or Observe data logic
--   (Spec §5.1, §9.4).
--
--   NOTE: This is distinct from `project_relationships` (migration 016), which
--   is the WITHIN-project Needs & Yields resource-flow graph. Different concept,
--   different table — do not conflate.
--
-- Model (Spec §5.2):
--   relationship_type  five-value enum (kept in lockstep with the Zod
--                      CrossRelationshipType in
--                      packages/shared/src/schemas/crossRelationship.schema.ts)
--   project_a_id /     the two related projects. Relationships are SYMMETRIC
--   project_b_id       (§5.3): stored once in canonical order (a < b) so the
--                      pair {A,B} and {B,A} cannot both exist. Reads match
--                      either column.
--
-- Constraints:
--   - CHECK on the relationship_type enum (lockstep with the shared Zod enum).
--   - CHECK (project_a_id <> project_b_id): no self-relationship.
--   - CHECK (project_a_id < project_b_id): canonical ordering ⇒ a symmetric
--     pair is deduped by the UNIQUE constraint regardless of insert direction.
--     The route normalises (a, b) before insert.
--   - UNIQUE (project_a_id, project_b_id, relationship_type): one row per
--     pair per type; a pair may carry several distinct types.

CREATE TABLE cross_project_relationships (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_a_id      uuid NOT NULL REFERENCES projects ON DELETE CASCADE,
  project_b_id      uuid NOT NULL REFERENCES projects ON DELETE CASCADE,
  relationship_type text NOT NULL,
  notes             text,
  created_by        uuid REFERENCES users ON DELETE SET NULL,
  created_at        timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT cross_project_relationships_type_ck
    CHECK (relationship_type IN (
      'shared_watershed', 'adjacent_boundary', 'habitat_corridor',
      'same_management_unit', 'shared_infrastructure'
    )),

  CONSTRAINT cross_project_relationships_no_self_loop
    CHECK (project_a_id <> project_b_id),

  CONSTRAINT cross_project_relationships_canonical_order
    CHECK (project_a_id < project_b_id),

  CONSTRAINT cross_project_relationships_unique_pair_type
    UNIQUE (project_a_id, project_b_id, relationship_type)
);

CREATE INDEX idx_cross_project_relationships_a
  ON cross_project_relationships (project_a_id);

CREATE INDEX idx_cross_project_relationships_b
  ON cross_project_relationships (project_b_id);
