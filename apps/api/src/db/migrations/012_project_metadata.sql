-- 012_project_metadata.sql
-- 2026-04-22 — project metadata jsonb lift
--
-- Background:
--   Section 1 of the feature manifest (Project Creation & Property Intake)
--   calls for long-tail property metadata the wizard already wants to capture
--   but the typed schema doesn't cover: climate region, bioregion, county,
--   legal description, field observations, restrictions/covenants, and map
--   projection. Rather than spawn a column per field (and a migration per
--   future addition), we lift this into a single jsonb blob validated by
--   ProjectMetadata in @ogden/shared.
--
-- Shape is enforced at the application boundary (Zod ProjectMetadata).
-- Promote individual fields to dedicated columns only once three sections
-- have shipped and real query patterns are visible.

ALTER TABLE projects
  ADD COLUMN metadata jsonb NOT NULL DEFAULT '{}'::jsonb;
