-- Migration 040 — showcase_visitor_events
--
-- Backing table for the Phase 5 public-showcase observation loop. Captures
-- cold-visitor interaction telemetry from the `/showcase/three-streams`
-- scrollytelling portal (Phase 3) so we can read tier-conversion signal:
-- which audience tier visitors pick, whether they click through to register,
-- whether they go on to instantiate a template.
--
-- Pipeline mirrors the client-error / act-interaction telemetry ones
-- (migrations 024 + 039 + apps/api/src/routes/telemetry/index.ts):
--   apps/web/src/showcase/lib/showcaseEventLog.ts (buffer, sendBeacon)
--     → POST /api/v1/telemetry/showcase-events (PUBLIC, rate-limited)
--       → migration 040 (showcase_visitor_events)
--
-- The `event_type` values here are the single source of truth for the enum;
-- the shared tuple SHOWCASE_EVENT_TYPES in
-- packages/shared/src/schemas/showcaseTelemetry.schema.ts is kept identical
-- by hand. Both are sources of truth in their own layer; keep them in
-- lock-step.
--
-- Differs from client_error_events (migration 039) and act_interaction_events
-- (migration 024) in one load-bearing way:
--   * BOTH user_id AND project_id are NULLABLE — a showcase visitor is, by
--     definition, anonymous and unauthenticated when the first events fire.
--     The route stamps user_id best-effort IF a bearer token is present
--     (e.g. a `visitor_registered` event posted just after sign-up), and
--     project_id only once a `template_instantiated` event names one. Neither
--     is ever required.
--
-- See: apps/api/src/routes/telemetry/index.ts,
--      apps/web/src/showcase/lib/showcaseEventLog.ts,
--      wiki/decisions/2026-05-21-atlas-showcase-observation-loop.md.

CREATE TABLE IF NOT EXISTS showcase_visitor_events (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id    TEXT        NOT NULL,
  occurred_at   TIMESTAMPTZ NOT NULL,
  received_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  tier          TEXT,
  event_type    TEXT        NOT NULL,
  user_id       UUID            NULL REFERENCES users(id)    ON DELETE SET NULL,
  project_id    UUID            NULL REFERENCES projects(id) ON DELETE SET NULL,
  payload       JSONB       NOT NULL DEFAULT '{}'::jsonb,
  CONSTRAINT showcase_visitor_events_tier_check CHECK (tier IS NULL OR tier IN (
    'dreaming',
    'transitioning',
    'stewarding'
  )),
  CONSTRAINT showcase_visitor_events_type_check CHECK (event_type IN (
    'showcase_view',
    'tier_selected',
    'scene_viewed',
    'cta_primary_click',
    'cta_secondary_click',
    'visitor_registered',
    'template_instantiated'
  ))
);

CREATE INDEX IF NOT EXISTS showcase_visitor_events_session_idx
  ON showcase_visitor_events (session_id);

CREATE INDEX IF NOT EXISTS showcase_visitor_events_type_time_idx
  ON showcase_visitor_events (event_type, occurred_at DESC);

COMMENT ON TABLE showcase_visitor_events IS
  'Per-event log of public showcase-portal visitor interactions (view, tier select, scene view, CTA clicks, register, instantiate). Anonymous-first: user_id/project_id NULL until known. Added in migration 040 (2026-05-21).';

COMMENT ON COLUMN showcase_visitor_events.user_id IS
  'NULL for anonymous visitors; stamped best-effort once a bearer token is present (e.g. post-registration events).';

COMMENT ON COLUMN showcase_visitor_events.project_id IS
  'NULL until a template_instantiated event names a project; never required.';

COMMENT ON COLUMN showcase_visitor_events.payload IS
  'Per-event-type extras, e.g. { sceneId } for scene_viewed, { href } for cta clicks. Schema lives alongside the enum in packages/shared.';
