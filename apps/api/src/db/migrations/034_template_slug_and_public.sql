-- 034_template_slug_and_public.sql
-- 2026-05-21 — Phase 4: extend project_templates with `slug` + `public`
-- columns to support the new POST /templates/public/:slug/instantiate
-- route used by the Three Streams showcase ContactCTA terminus and the
-- "Start from template" branch in NewProjectPage.
--
-- Rationale: cold visitors from /showcase/three-streams/* register a fresh
-- account and need to clone the "Ecosystem Farm (Apricot-Lane-style)"
-- template without owning it. The route still requires `authenticate`
-- (no anonymous projects); only the *owner* check on
-- POST /templates/:id/instantiate is relaxed for rows where
-- public = TRUE. The slug column gives the public route a stable,
-- human-meaningful URL fragment (e.g. `/templates/public/ecosystem-farm/...`).
--
-- Both columns are nullable / default-false to preserve all existing rows
-- (owner-private templates created via POST /templates pre-Phase-4).

ALTER TABLE project_templates
  ADD COLUMN slug   text,
  ADD COLUMN public boolean NOT NULL DEFAULT false;

-- Unique slug only enforced when slug is non-null. Owner-private templates
-- (no slug) coexist with named public templates.
CREATE UNIQUE INDEX project_templates_slug_unique
  ON project_templates (slug)
  WHERE slug IS NOT NULL;

-- Partial index speeds the public lookup path
-- (`SELECT id, snapshot FROM project_templates WHERE slug = $1 AND public = TRUE`).
CREATE INDEX project_templates_public_idx
  ON project_templates (public)
  WHERE public = TRUE;
