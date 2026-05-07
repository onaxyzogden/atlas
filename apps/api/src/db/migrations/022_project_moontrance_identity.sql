-- Migration 022 — project_moontrance_identity
--
-- Per-project Moontrance opt-in table per ADR
-- 2026-05-02-phase-gated-future-routes-scoping (D1, accepted 2026-05-04).
-- The platform-level ATLAS_MOONTRANCE env flag still gates the route at
-- the deployment level (`fastify.requirePhase('MT')`); this table layers
-- per-project opt-in on top so a deployment can enable Moontrance for
-- some projects without it leaking onto every project. Missing row → 404
-- (not Forbidden) so route existence isn't leaked through the status code,
-- mirroring the env-flag treatment.

CREATE TABLE IF NOT EXISTS project_moontrance_identity (
  project_id UUID PRIMARY KEY REFERENCES projects(id) ON DELETE CASCADE,
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  summary JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS project_moontrance_identity_enabled_idx
  ON project_moontrance_identity (enabled) WHERE enabled = TRUE;
