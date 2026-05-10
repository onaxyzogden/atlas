-- Migration 024 — act_interaction_events
--
-- Backing table for the Act-stage telemetry pipeline that validates the
-- v1 project-type → Act module affinity table at
-- apps/web/src/v3/act/data/projectTypeModuleAffinity.ts. The pen-and-paper
-- sanity review (wiki/decisions/2026-05-09-atlas-act-affinity-v1-sanity-review.md)
-- recommended shipping no ranking changes until real-steward telemetry
-- exists; this table is the durable signal store that that future decision
-- will read from.
--
-- The 7 event_type values mirror the discriminated union in
-- packages/shared (ActInteractionEvent). The CHECK constraint here is the
-- single source of truth for the enum; the shared-types const tuple is
-- kept identical by hand.
--
-- See: apps/api/src/routes/telemetry/index.ts,
--      apps/web/src/lib/actInteractionLog.ts,
--      apps/web/src/features/dashboard/pages/AffinityTelemetryDashboard.tsx,
--      wiki/decisions/2026-05-10-atlas-act-affinity-telemetry-pipeline.md.

CREATE TABLE IF NOT EXISTS act_interaction_events (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id    UUID        NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id       UUID        NOT NULL REFERENCES users(id)    ON DELETE CASCADE,
  session_id    TEXT        NOT NULL,
  occurred_at   TIMESTAMPTZ NOT NULL,
  received_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  project_type  TEXT,
  module        TEXT        NOT NULL,
  event_type    TEXT        NOT NULL,
  payload       JSONB       NOT NULL DEFAULT '{}'::jsonb,
  CONSTRAINT act_interaction_events_event_type_check CHECK (event_type IN (
    'tile_select','tile_open','tile_close',
    'quick_log_click',
    'slideup_open','slideup_close',
    'panel_row_visible'
  ))
);

CREATE INDEX IF NOT EXISTS act_interaction_events_proj_time_idx
  ON act_interaction_events (project_id, occurred_at DESC);

CREATE INDEX IF NOT EXISTS act_interaction_events_type_module_idx
  ON act_interaction_events (project_type, module, event_type);

CREATE INDEX IF NOT EXISTS act_interaction_events_session_idx
  ON act_interaction_events (session_id, occurred_at);

COMMENT ON TABLE act_interaction_events IS
  'Per-event log of Act-stage UI interactions. Drives the affinity-validation dashboard. Added in migration 024 (2026-05-10).';

COMMENT ON COLUMN act_interaction_events.project_type IS
  'Effective project type at event time (PlanProjectTypeKey or NULL when picker untouched + no wizard seed).';

COMMENT ON COLUMN act_interaction_events.payload IS
  'Per-event-type extras. Schema lives alongside the discriminated union in packages/shared.';
