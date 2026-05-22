-- Migration 039 — client_error_events
--
-- Backing table for the general client-error telemetry sink. First
-- consumer: zustand persist-rehydrate failures, which on 2026-05-21 wiped
-- the MTC Observe baseline silently (see
-- wiki/log/2026-05-21-persist-rehydrate-instrumentation.md). The
-- rehydrateWithLogging helper console.errors such failures; this table
-- captures them in production.
--
-- The `source` values mirror CLIENT_ERROR_SOURCES in
-- packages/shared/src/schemas/clientErrorTelemetry.schema.ts. The CHECK
-- constraint here is the single source of truth for the enum; the shared
-- tuple is kept identical by hand.
--
-- Differs from act_interaction_events (migration 024):
--   * project_id is NULLABLE (ON DELETE SET NULL) — a rehydrate failure is
--     on a global store with no project context, possibly at boot.
--
-- See: apps/api/src/routes/telemetry/index.ts,
--      apps/web/src/lib/clientErrorLog.ts,
--      apps/web/src/store/persistRehydrate.ts.

CREATE TABLE IF NOT EXISTS client_error_events (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID        NOT NULL REFERENCES users(id)    ON DELETE CASCADE,
  project_id    UUID            NULL REFERENCES projects(id) ON DELETE SET NULL,
  session_id    TEXT        NOT NULL,
  occurred_at   TIMESTAMPTZ NOT NULL,
  received_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  source        TEXT        NOT NULL,
  name          TEXT        NOT NULL,
  message       TEXT        NOT NULL DEFAULT '',
  stack         TEXT,
  context       JSONB       NOT NULL DEFAULT '{}'::jsonb,
  url           TEXT,
  user_agent    TEXT,
  app_version   TEXT,
  CONSTRAINT client_error_events_source_check CHECK (source IN (
    'persist_rehydrate',
    'api_client',
    'react_error_boundary',
    'unhandled_rejection'
  ))
);

CREATE INDEX IF NOT EXISTS client_error_events_source_time_idx
  ON client_error_events (source, occurred_at DESC);

CREATE INDEX IF NOT EXISTS client_error_events_user_time_idx
  ON client_error_events (user_id, occurred_at DESC);

COMMENT ON TABLE client_error_events IS
  'Per-event log of front-end client errors (persist rehydrate, api client, error boundary, unhandled rejection). Added in migration 039 (2026-05-21).';

COMMENT ON COLUMN client_error_events.project_id IS
  'Optional project context; NULL for global-store failures (e.g. persist rehydrate at boot).';

COMMENT ON COLUMN client_error_events.context IS
  'Per-source extras, e.g. { persistKey } for persist_rehydrate. Schema lives alongside the enum in packages/shared.';
