-- 015_regeneration_events.sql
-- 2026-04-24 — regeneration event timeline
--
-- Background:
--   §7 Soil / Ecology / Regeneration manifest item
--   `regen-stage-intervention-log` (Regeneration stage tagging,
--   intervention log, before/after comparison) needs a persistent
--   event timeline per project. CONTEXT.md explicitly forbids
--   jamming these rows into projects.metadata (they are first-class,
--   queryable, geometry-bearing, and grow unbounded).
--
--   Three concerns rolled into one table rather than three:
--     1. Intervention log   — event_type='intervention' + intervention_type
--     2. Stage tagging      — phase + progress columns
--     3. Before/after pairs — parent_event_id self-reference
--
--   Vocabulary mirrors the existing scoring engine:
--     - intervention_type  ↔ InterventionType (soilRegeneration.ts)
--     - phase              ↔ SequencePhase (soilRegeneration.ts)
--
--   Enforced at two boundaries:
--     - Application:  Zod (@ogden/shared RegenerationEvent)
--     - Database:     CHECK constraints below
--   Keep both in sync character-for-character.
--
-- Explicitly out of scope for this migration:
--     - API routes (future ticket)
--     - Media upload plumbing — media_urls is just a pointer array;
--       object storage integration lives elsewhere.
--     - Hard FK to project_layers.soil_regeneration — that layer is
--       recomputed on every Tier-3 run and replaces prior rows, so
--       coupling an event row to it would orphan. When zone pairing
--       is needed, copy the integer zoneId into observations.zoneId.

CREATE TABLE regeneration_events (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id        uuid NOT NULL REFERENCES projects ON DELETE CASCADE,
  author_id         uuid NOT NULL REFERENCES users ON DELETE RESTRICT,

  event_type        text NOT NULL,
  intervention_type text,
  phase             text,
  progress          text,

  title             text NOT NULL,
  notes             text,
  event_date        date NOT NULL,

  location          geometry(Geometry, 4326),
  area_ha           numeric(12, 4),

  observations      jsonb NOT NULL DEFAULT '{}'::jsonb,
  media_urls        text[] NOT NULL DEFAULT ARRAY[]::text[],

  parent_event_id   uuid REFERENCES regeneration_events ON DELETE SET NULL,

  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT regen_events_event_type_ck
    CHECK (event_type IN ('observation', 'intervention', 'milestone', 'photo')),
  CONSTRAINT regen_events_intervention_type_ck
    CHECK (intervention_type IS NULL OR intervention_type IN (
      'mulching_priority',
      'compost_application',
      'cover_crop_candidate',
      'silvopasture_candidate',
      'food_forest_candidate',
      'other'
    )),
  CONSTRAINT regen_events_phase_ck
    CHECK (phase IS NULL OR phase IN (
      'stabilize_erosion',
      'improve_drainage',
      'build_organic_matter',
      'introduce_perennials'
    )),
  CONSTRAINT regen_events_progress_ck
    CHECK (progress IS NULL OR progress IN (
      'planned',
      'in_progress',
      'completed',
      'observed'
    ))
);

CREATE INDEX idx_regen_events_project
  ON regeneration_events (project_id);

CREATE INDEX idx_regen_events_project_date
  ON regeneration_events (project_id, event_date DESC);

CREATE INDEX idx_regen_events_location
  ON regeneration_events USING GIST (location);

CREATE INDEX idx_regen_events_parent
  ON regeneration_events (parent_event_id)
  WHERE parent_event_id IS NOT NULL;

CREATE INDEX idx_regen_events_intervention_type
  ON regeneration_events (project_id, intervention_type)
  WHERE intervention_type IS NOT NULL;

CREATE TRIGGER set_updated_at_regen_events BEFORE UPDATE ON regeneration_events
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();
