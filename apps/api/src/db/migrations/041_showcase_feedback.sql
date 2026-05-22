-- Migration 041 — showcase_feedback
--
-- Backing table for the Phase 5 public-showcase observation loop's
-- qualitative half. Where showcase_visitor_events (migration 040) captures
-- behavioural telemetry (which tier, which CTA), this table captures the
-- visitor's own words: a free-text "what was confusing?" prompt plus an
-- optional 1–5 rating and an optional contact handle they may volunteer.
--
-- Pipeline mirrors the showcase-events one
-- (migration 040 + apps/api/src/routes/telemetry/index.ts):
--   apps/web/src/showcase/components/FeedbackForm.tsx (form submit)
--     → POST /api/v1/telemetry/showcase-feedback (PUBLIC, rate-limited)
--       → migration 041 (showcase_feedback)
--
-- Anonymous-first, like migration 040:
--   * session_id is NULLABLE — feedback may be submitted before any
--     telemetry session id is established; when present it cross-links the
--     written feedback to the behavioural trail in showcase_visitor_events.
--   * rating is NULLABLE — the prompt leads with the message; the star
--     rating is optional sugar.
--   * contact is NULLABLE — visitor-supplied, opt-in only. The only column
--     that may carry PII, and only if the visitor chooses to type it.
--   * message is the one REQUIRED field; the route + form both block empty.
--
-- See: apps/api/src/routes/telemetry/index.ts,
--      apps/web/src/showcase/components/FeedbackForm.tsx,
--      wiki/decisions/2026-05-21-atlas-showcase-observation-loop.md.

CREATE TABLE IF NOT EXISTS showcase_feedback (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id  TEXT,
  tier        TEXT,
  rating      SMALLINT,
  message     TEXT        NOT NULL,
  contact     TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT showcase_feedback_tier_check CHECK (tier IS NULL OR tier IN (
    'dreaming',
    'transitioning',
    'stewarding'
  )),
  CONSTRAINT showcase_feedback_rating_check CHECK (rating IS NULL OR (rating BETWEEN 1 AND 5)),
  CONSTRAINT showcase_feedback_message_nonempty CHECK (length(btrim(message)) > 0)
);

CREATE INDEX IF NOT EXISTS showcase_feedback_session_idx
  ON showcase_feedback (session_id);

CREATE INDEX IF NOT EXISTS showcase_feedback_created_idx
  ON showcase_feedback (created_at DESC);

COMMENT ON TABLE showcase_feedback IS
  'Visitor-authored feedback from the public showcase portal (free-text message + optional 1-5 rating + optional contact). Anonymous-first: session_id/contact NULL-able. Added in migration 041 (2026-05-21).';

COMMENT ON COLUMN showcase_feedback.session_id IS
  'NULL-able; when present cross-links this feedback to the behavioural trail in showcase_visitor_events (same sessionStorage id).';

COMMENT ON COLUMN showcase_feedback.rating IS
  'Optional 1-5 satisfaction rating; NULL when the visitor only left a message.';

COMMENT ON COLUMN showcase_feedback.contact IS
  'Visitor-supplied, opt-in only. May carry PII (email/handle) if the visitor chose to type it; otherwise NULL.';

COMMENT ON COLUMN showcase_feedback.message IS
  'Required free-text feedback. Both the route and the form block empty/whitespace-only submissions.';
