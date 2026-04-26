-- 013_project_templates.sql
-- 2026-04-22 — project_templates table for Section 1 Gap B.
--
-- Snapshot-from-project flow:
--   1. User picks a source project and a template name.
--   2. API snapshots the source's metadata, notes, boundary, and
--      project_type/country/units into `snapshot` jsonb (the full shape
--      is defined by @ogden/shared TemplateSnapshot).
--   3. Later, a call to /templates/:id/instantiate creates a brand-new
--      project seeded from that snapshot — new id, new owner (may differ
--      from template owner if the template is shared), empty files,
--      empty assessments.
--
-- source_project_id is nullable because a template may outlive its
-- source project (ON DELETE SET NULL). Snapshots are self-contained so
-- instantiation never needs the source row.

CREATE TABLE project_templates (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id          uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name              text NOT NULL CHECK (length(name) BETWEEN 1 AND 200),
  source_project_id uuid REFERENCES projects(id) ON DELETE SET NULL,
  snapshot          jsonb NOT NULL,
  created_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX project_templates_owner_idx
  ON project_templates (owner_id, created_at DESC);
