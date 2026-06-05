-- Migration 043 — OLOS foundation (Stage × Domain × Objective × Record)
--
-- Backing tables for the Observe / Plan / Act workflow system defined by
-- the developer specs in docs/olos/ and modelled in packages/shared/src/
-- schemas/olos/. The frontend (apps/web/src/v3/olos) already runs against
-- the universal catalogue baked into packages/shared/src/constants/olos/
-- and per-project Zustand stores; this migration adds the durable backing
-- store. Migration 044 seeds the read-only catalogue rows.
--
-- Two layers:
--
--   1. Catalogue tables (read-only after seed):
--        olos_overlays            (15 rows  — universal overlays)
--        olos_objectives          (48 rows  — 16 Universal Domains × 3 Stages)
--        olos_checklist_items     (~384 rows — ordered steps per objective)
--        olos_objective_overlays  (m:n — for "which objectives use overlay X")
--
--   2. Per-project record tables (CRUD via Fastify routes in 2.3):
--        olos_observation_records      (Observe output)
--        olos_plan_decision_records    (Plan output)
--        olos_act_handoff_packages     (Plan→Act bridge, gated on approval)
--        olos_act_tasks                (assignable executable units)
--        olos_proof_records            (worker-submitted evidence)
--        olos_verification_records     (verifier judgement on proofs)
--        olos_escalation_records       (Act→upstream feedback loop)
--        olos_stewardship_routines     (cadenced recurring work)
--
-- Enum CHECK constraints mirror the Zod enums in
-- packages/shared/src/schemas/olos/*.schema.ts character-for-character.
-- Keep both in sync when adding statuses or kinds.
--
-- Geometry: WGS84 (SRID 4326), generic geometry type to permit Point /
-- Polygon / MultiPolygon / LineString per the GeoJSONGeometrySchema union.

-- ─────────────────────────────────────────────────────────────────────────
-- CATALOGUE
-- ─────────────────────────────────────────────────────────────────────────

CREATE TABLE olos_overlays (
  id              text PRIMARY KEY,
  name            text NOT NULL,
  description     text NOT NULL DEFAULT '',
  geometry_type   text NOT NULL,
  default_style   jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at      timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT olos_overlays_geometry_type_ck
    CHECK (geometry_type IN ('polygon', 'line', 'point', 'raster', 'mixed'))
);

CREATE TABLE olos_objectives (
  id                       text PRIMARY KEY,
  stage                    text NOT NULL,
  domain                   text NOT NULL,
  title                    text NOT NULL,
  focused_question         text NOT NULL,
  completion_criteria      text,
  required_inputs          jsonb NOT NULL DEFAULT '[]'::jsonb,
  default_overlay_bundle   text[] NOT NULL DEFAULT ARRAY[]::text[],
  checklist_item_ids       text[] NOT NULL DEFAULT ARRAY[]::text[],
  output_kind              text NOT NULL,
  allowed_statuses         text[] NOT NULL DEFAULT ARRAY[]::text[],
  created_at               timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT olos_objectives_stage_ck
    CHECK (stage IN ('observe', 'plan', 'act')),
  CONSTRAINT olos_objectives_domain_ck
    CHECK (domain IN (
      'vision-intent', 'land-base', 'climate', 'topography',
      'hydrology', 'soil', 'ecology', 'plants-food',
      'animals-livestock', 'built-infrastructure', 'access-circulation',
      'energy-resources', 'people-governance', 'economics-capacity',
      'risk-compliance', 'monitoring-records'
    )),
  CONSTRAINT olos_objectives_output_kind_ck
    CHECK (output_kind IN (
      'observation-record',
      'plan-decision-record',
      'act-task',
      'stewardship-routine'
    ))
);

CREATE INDEX idx_olos_objectives_stage_domain
  ON olos_objectives (stage, domain);

CREATE TABLE olos_checklist_items (
  id                    text PRIMARY KEY,
  objective_id          text NOT NULL REFERENCES olos_objectives ON DELETE CASCADE,
  ordinal               integer NOT NULL,
  instruction           text NOT NULL,
  linked_overlay_id     text REFERENCES olos_overlays ON DELETE SET NULL,
  required_input_type   text NOT NULL,
  required              boolean NOT NULL DEFAULT true,
  created_at            timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT olos_checklist_items_required_input_type_ck
    CHECK (required_input_type IN (
      'evidence', 'decision', 'proof', 'verification', 'reference'
    ))
);

CREATE INDEX idx_olos_checklist_items_objective
  ON olos_checklist_items (objective_id, ordinal);

CREATE TABLE olos_objective_overlays (
  objective_id   text NOT NULL REFERENCES olos_objectives ON DELETE CASCADE,
  overlay_id     text NOT NULL REFERENCES olos_overlays ON DELETE CASCADE,
  PRIMARY KEY (objective_id, overlay_id)
);

CREATE INDEX idx_olos_objective_overlays_overlay
  ON olos_objective_overlays (overlay_id);

-- ─────────────────────────────────────────────────────────────────────────
-- OBSERVATION RECORDS
-- ─────────────────────────────────────────────────────────────────────────

CREATE TABLE olos_observation_records (
  id                       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id               uuid NOT NULL REFERENCES projects ON DELETE CASCADE,
  objective_id             text NOT NULL REFERENCES olos_objectives ON DELETE RESTRICT,

  status                   text NOT NULL,
  summary                  text NOT NULL DEFAULT '',
  constraints              text NOT NULL DEFAULT '',
  unknowns                 text NOT NULL DEFAULT '',
  flags                    text[] NOT NULL DEFAULT ARRAY[]::text[],
  evidence_refs            jsonb NOT NULL DEFAULT '[]'::jsonb,
  location_geometry        geometry(Geometry, 4326),
  recorded_by              uuid REFERENCES users ON DELETE SET NULL,
  recorded_at              timestamptz NOT NULL DEFAULT now(),
  recommended_next_review  timestamptz,

  created_at               timestamptz NOT NULL DEFAULT now(),
  updated_at               timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT olos_observation_records_status_ck
    CHECK (status IN (
      'clear', 'unknown', 'needs-investigation',
      'major-constraint', 'potential-disqualifier'
    ))
);

CREATE INDEX idx_olos_obs_records_project_objective
  ON olos_observation_records (project_id, objective_id);
CREATE INDEX idx_olos_obs_records_status
  ON olos_observation_records (objective_id, status);
CREATE INDEX idx_olos_obs_records_location
  ON olos_observation_records USING GIST (location_geometry);

CREATE TRIGGER set_updated_at_olos_obs BEFORE UPDATE ON olos_observation_records
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- ─────────────────────────────────────────────────────────────────────────
-- PLAN DECISION RECORDS
-- ─────────────────────────────────────────────────────────────────────────

CREATE TABLE olos_plan_decision_records (
  id                              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id                      uuid NOT NULL REFERENCES projects ON DELETE CASCADE,
  objective_id                    text NOT NULL REFERENCES olos_objectives ON DELETE RESTRICT,

  selected_option                 jsonb NOT NULL,
  rejected_options                jsonb NOT NULL DEFAULT '[]'::jsonb,
  rationale                       text NOT NULL DEFAULT '',
  assumptions                     text[] NOT NULL DEFAULT ARRAY[]::text[],
  constraints                     text[] NOT NULL DEFAULT ARRAY[]::text[],
  dependencies                    text[] NOT NULL DEFAULT ARRAY[]::text[],
  risk_flags                      jsonb NOT NULL DEFAULT '[]'::jsonb,
  upstream_observation_record_ids text[] NOT NULL DEFAULT ARRAY[]::text[],
  approval_status                 text NOT NULL,
  decided_by                      uuid REFERENCES users ON DELETE SET NULL,
  decided_at                      timestamptz NOT NULL DEFAULT now(),

  created_at                      timestamptz NOT NULL DEFAULT now(),
  updated_at                      timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT olos_plan_decisions_approval_status_ck
    CHECK (approval_status IN (
      'approved-for-act', 'conditionally-approved',
      'needs-more-observation', 'needs-professional-review',
      'redesign-required', 'deferred', 'rejected'
    ))
);

CREATE INDEX idx_olos_plan_records_project_objective
  ON olos_plan_decision_records (project_id, objective_id);
CREATE INDEX idx_olos_plan_records_approval
  ON olos_plan_decision_records (objective_id, approval_status);

CREATE TRIGGER set_updated_at_olos_plan BEFORE UPDATE ON olos_plan_decision_records
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- ─────────────────────────────────────────────────────────────────────────
-- ACT HANDOFF PACKAGES
-- ─────────────────────────────────────────────────────────────────────────

CREATE TABLE olos_act_handoff_packages (
  id                          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id                  uuid NOT NULL REFERENCES projects ON DELETE CASCADE,
  plan_decision_record_id     uuid NOT NULL REFERENCES olos_plan_decision_records ON DELETE CASCADE,

  work_scope                  text NOT NULL DEFAULT '',
  location_geometry           geometry(Geometry, 4326),
  prerequisites               text[] NOT NULL DEFAULT ARRAY[]::text[],
  sequence                    text[] NOT NULL DEFAULT ARRAY[]::text[],
  materials                   jsonb NOT NULL DEFAULT '[]'::jsonb,
  success_criteria            jsonb NOT NULL DEFAULT '[]'::jsonb,
  verification_requirements   jsonb NOT NULL DEFAULT '[]'::jsonb,
  monitoring_requirements     jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_by                  uuid REFERENCES users ON DELETE SET NULL,
  created_at                  timestamptz NOT NULL DEFAULT now(),
  updated_at                  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_olos_handoffs_project
  ON olos_act_handoff_packages (project_id);
CREATE INDEX idx_olos_handoffs_plan_decision
  ON olos_act_handoff_packages (plan_decision_record_id);
CREATE INDEX idx_olos_handoffs_location
  ON olos_act_handoff_packages USING GIST (location_geometry);

CREATE TRIGGER set_updated_at_olos_handoff BEFORE UPDATE ON olos_act_handoff_packages
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- ─────────────────────────────────────────────────────────────────────────
-- ACT TASKS
-- ─────────────────────────────────────────────────────────────────────────

CREATE TABLE olos_act_tasks (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id            uuid NOT NULL REFERENCES projects ON DELETE CASCADE,
  objective_id          text NOT NULL REFERENCES olos_objectives ON DELETE RESTRICT,
  handoff_package_id    uuid NOT NULL REFERENCES olos_act_handoff_packages ON DELETE CASCADE,

  title                 text NOT NULL,
  description           text NOT NULL DEFAULT '',
  location_geometry     geometry(Geometry, 4326),
  assignee_id           uuid REFERENCES users ON DELETE SET NULL,
  role_id               text,
  due_date              timestamptz,
  priority              text NOT NULL DEFAULT 'normal',
  status                text NOT NULL DEFAULT 'ready',
  blocker_reason        text,

  created_by            uuid REFERENCES users ON DELETE SET NULL,
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT olos_act_tasks_priority_ck
    CHECK (priority IN ('low', 'normal', 'high', 'critical')),
  CONSTRAINT olos_act_tasks_status_ck
    CHECK (status IN (
      'ready', 'assigned', 'in-progress', 'paused-for-conditions',
      'blocked', 'completed-pending-verification', 'verified-complete',
      'needs-rework', 'needs-follow-up', 'escalated', 'archived', 'cancelled'
    ))
);

CREATE INDEX idx_olos_tasks_project_objective
  ON olos_act_tasks (project_id, objective_id);
CREATE INDEX idx_olos_tasks_handoff
  ON olos_act_tasks (handoff_package_id);
CREATE INDEX idx_olos_tasks_assignee
  ON olos_act_tasks (assignee_id)
  WHERE assignee_id IS NOT NULL;
CREATE INDEX idx_olos_tasks_status
  ON olos_act_tasks (project_id, status);
CREATE INDEX idx_olos_tasks_location
  ON olos_act_tasks USING GIST (location_geometry);

CREATE TRIGGER set_updated_at_olos_task BEFORE UPDATE ON olos_act_tasks
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- ─────────────────────────────────────────────────────────────────────────
-- PROOF RECORDS
-- ─────────────────────────────────────────────────────────────────────────

CREATE TABLE olos_proof_records (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id            uuid NOT NULL REFERENCES projects ON DELETE CASCADE,
  task_id               uuid NOT NULL REFERENCES olos_act_tasks ON DELETE CASCADE,

  proof_type            text NOT NULL,
  file_uri              text,
  note                  text,
  measurement_value     numeric(18, 6),
  measurement_unit      text,
  geotag                jsonb,
  captured_at           timestamptz NOT NULL DEFAULT now(),
  submitted_by          uuid REFERENCES users ON DELETE SET NULL,
  verification_status   text NOT NULL DEFAULT 'pending',

  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT olos_proof_records_proof_type_ck
    CHECK (proof_type IN (
      'photo', 'measurement', 'note', 'receipt',
      'inspection', 'test', 'signature', 'before-after',
      'video', 'document'
    )),
  CONSTRAINT olos_proof_records_verification_status_ck
    CHECK (verification_status IN (
      'pending', 'accepted', 'rejected', 'needs-rework'
    ))
);

CREATE INDEX idx_olos_proofs_task
  ON olos_proof_records (task_id);
CREATE INDEX idx_olos_proofs_project_status
  ON olos_proof_records (project_id, verification_status);

CREATE TRIGGER set_updated_at_olos_proof BEFORE UPDATE ON olos_proof_records
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- ─────────────────────────────────────────────────────────────────────────
-- VERIFICATION RECORDS
-- ─────────────────────────────────────────────────────────────────────────

CREATE TABLE olos_verification_records (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id            uuid NOT NULL REFERENCES projects ON DELETE CASCADE,
  task_id               uuid NOT NULL REFERENCES olos_act_tasks ON DELETE CASCADE,

  verifier_id           uuid REFERENCES users ON DELETE SET NULL,
  outcome               text NOT NULL,
  criteria_checked      jsonb NOT NULL DEFAULT '[]'::jsonb,
  notes                 text,
  required_rework_ids   text[] NOT NULL DEFAULT ARRAY[]::text[],
  proof_record_ids      uuid[] NOT NULL DEFAULT ARRAY[]::uuid[],
  verified_at           timestamptz NOT NULL DEFAULT now(),

  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT olos_verification_records_outcome_ck
    CHECK (outcome IN ('pass', 'fail', 'partial', 'needs-rework'))
);

CREATE INDEX idx_olos_verifications_task
  ON olos_verification_records (task_id);
CREATE INDEX idx_olos_verifications_project_outcome
  ON olos_verification_records (project_id, outcome);

CREATE TRIGGER set_updated_at_olos_verification BEFORE UPDATE ON olos_verification_records
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- ─────────────────────────────────────────────────────────────────────────
-- ESCALATION RECORDS
-- ─────────────────────────────────────────────────────────────────────────

CREATE TABLE olos_escalation_records (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id            uuid NOT NULL REFERENCES projects ON DELETE CASCADE,
  task_id               uuid REFERENCES olos_act_tasks ON DELETE SET NULL,
  objective_id          text REFERENCES olos_objectives ON DELETE SET NULL,

  trigger_kind          text NOT NULL,
  trigger_note          text NOT NULL DEFAULT '',
  severity              text NOT NULL DEFAULT 'medium',
  routed_to_stage       text NOT NULL,
  routed_to_domain      text,
  requested_action      text NOT NULL DEFAULT '',
  status                text NOT NULL DEFAULT 'open',
  raised_by             uuid REFERENCES users ON DELETE SET NULL,
  raised_at             timestamptz NOT NULL DEFAULT now(),
  resolved_by           uuid REFERENCES users ON DELETE SET NULL,
  resolved_at           timestamptz,
  resolution_note       text,

  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT olos_escalations_trigger_kind_ck
    CHECK (trigger_kind IN (
      'new-condition', 'scope-change', 'incident',
      'monitoring-signal', 'safety', 'compliance',
      'cost-overrun', 'schedule-overrun'
    )),
  CONSTRAINT olos_escalations_severity_ck
    CHECK (severity IN ('info', 'low', 'medium', 'high', 'critical')),
  CONSTRAINT olos_escalations_routed_stage_ck
    CHECK (routed_to_stage IN ('observe', 'plan', 'act')),
  CONSTRAINT olos_escalations_routed_domain_ck
    CHECK (routed_to_domain IS NULL OR routed_to_domain IN (
      'vision-intent', 'land-base', 'climate', 'topography',
      'hydrology', 'soil', 'ecology', 'plants-food',
      'animals-livestock', 'built-infrastructure', 'access-circulation',
      'energy-resources', 'people-governance', 'economics-capacity',
      'risk-compliance', 'monitoring-records'
    )),
  CONSTRAINT olos_escalations_status_ck
    CHECK (status IN (
      'open', 'acknowledged', 'in-progress', 'resolved', 'dismissed'
    ))
);

CREATE INDEX idx_olos_escalations_project_status
  ON olos_escalation_records (project_id, status);
CREATE INDEX idx_olos_escalations_task
  ON olos_escalation_records (task_id)
  WHERE task_id IS NOT NULL;
CREATE INDEX idx_olos_escalations_routed
  ON olos_escalation_records (routed_to_stage, routed_to_domain);

CREATE TRIGGER set_updated_at_olos_escalation BEFORE UPDATE ON olos_escalation_records
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- ─────────────────────────────────────────────────────────────────────────
-- STEWARDSHIP ROUTINES
-- ─────────────────────────────────────────────────────────────────────────

CREATE TABLE olos_stewardship_routines (
  id                       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id               uuid NOT NULL REFERENCES projects ON DELETE CASCADE,
  domain_id                text NOT NULL,

  title                    text NOT NULL,
  location_geometry        geometry(Geometry, 4326),
  frequency                text NOT NULL,
  steward_role_id          text,
  checklist_item_ids       text[] NOT NULL DEFAULT ARRAY[]::text[],
  monitoring_requirements  jsonb NOT NULL DEFAULT '[]'::jsonb,
  review_cycle             text,

  created_at               timestamptz NOT NULL DEFAULT now(),
  updated_at               timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT olos_routines_domain_ck
    CHECK (domain_id IN (
      'vision-intent', 'land-base', 'climate', 'topography',
      'hydrology', 'soil', 'ecology', 'plants-food',
      'animals-livestock', 'built-infrastructure', 'access-circulation',
      'energy-resources', 'people-governance', 'economics-capacity',
      'risk-compliance', 'monitoring-records'
    )),
  CONSTRAINT olos_routines_frequency_ck
    CHECK (frequency IN (
      'daily', 'weekly', 'biweekly', 'monthly',
      'quarterly', 'seasonal', 'annual', 'on-trigger'
    ))
);

CREATE INDEX idx_olos_routines_project_domain
  ON olos_stewardship_routines (project_id, domain_id);
CREATE INDEX idx_olos_routines_location
  ON olos_stewardship_routines USING GIST (location_geometry);

CREATE TRIGGER set_updated_at_olos_routine BEFORE UPDATE ON olos_stewardship_routines
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

COMMENT ON TABLE olos_overlays                 IS 'OLOS universal overlay catalogue (15 rows). Seeded in migration 044.';
COMMENT ON TABLE olos_objectives               IS 'OLOS objective catalogue (48 rows = 16 domains × 3 stages). Seeded in 044.';
COMMENT ON TABLE olos_checklist_items          IS 'OLOS checklist items (~384 rows). Seeded in 044.';
COMMENT ON TABLE olos_objective_overlays       IS 'M:N mapping between objectives and their default overlay bundle.';
COMMENT ON TABLE olos_observation_records      IS 'Observe-stage outputs: what is. Documented conditions, constraints, unknowns.';
COMMENT ON TABLE olos_plan_decision_records    IS 'Plan-stage outputs: what should happen. Selected/rejected options + approval status.';
COMMENT ON TABLE olos_act_handoff_packages     IS 'Bridge from approved PlanDecisionRecord to Act. Carries scope, materials, success criteria.';
COMMENT ON TABLE olos_act_tasks                IS 'Assignable executable units derived from handoff packages.';
COMMENT ON TABLE olos_proof_records            IS 'Worker-submitted evidence that an ActTask is complete.';
COMMENT ON TABLE olos_verification_records     IS 'Verifier pass/fail judgement on a task + its proofs.';
COMMENT ON TABLE olos_escalation_records       IS 'Act-to-upstream feedback loop. New conditions, scope change, incidents, monitoring signals.';
COMMENT ON TABLE olos_stewardship_routines     IS 'Cadenced recurring work that keeps a domain healthy after initial Act tasks complete.';
