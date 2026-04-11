-- OGDEN Atlas — Multi-User Collaboration
-- Adds project comments, project members, activity log, and suggested edits.
-- Existing organizations + organization_members tables (001_initial.sql) are reused as-is.

-- ────────────────────────────────────────────────────────────────────────────
-- PROJECT COMMENTS (backend-persisted, replacing localStorage)
-- ────────────────────────────────────────────────────────────────────────────

CREATE TABLE project_comments (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id    uuid NOT NULL REFERENCES projects ON DELETE CASCADE,
  author_id     uuid NOT NULL REFERENCES users ON DELETE CASCADE,
  text          text NOT NULL,
  location      geometry(Point, 4326),    -- map-pinned comments (nullable)
  feature_id    uuid REFERENCES design_features ON DELETE SET NULL,
  feature_type  text,                     -- zone | structure | path | point | annotation
  resolved      boolean NOT NULL DEFAULT false,
  resolved_by   uuid REFERENCES users ON DELETE SET NULL,
  resolved_at   timestamptz,
  parent_id     uuid REFERENCES project_comments ON DELETE CASCADE,  -- threading
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_pc_project  ON project_comments (project_id);
CREATE INDEX idx_pc_feature  ON project_comments (feature_id);
CREATE INDEX idx_pc_parent   ON project_comments (parent_id);

-- ────────────────────────────────────────────────────────────────────────────
-- PROJECT MEMBERS (per-project role assignments)
-- ────────────────────────────────────────────────────────────────────────────

CREATE TABLE project_members (
  project_id  uuid NOT NULL REFERENCES projects ON DELETE CASCADE,
  user_id     uuid NOT NULL REFERENCES users ON DELETE CASCADE,
  role        text NOT NULL DEFAULT 'viewer',   -- owner | designer | reviewer | viewer
  invited_by  uuid REFERENCES users ON DELETE SET NULL,
  joined_at   timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (project_id, user_id)
);

CREATE INDEX idx_pm_user ON project_members (user_id);

-- ────────────────────────────────────────────────────────────────────────────
-- PROJECT ACTIVITY (audit log)
-- ────────────────────────────────────────────────────────────────────────────

CREATE TABLE project_activity (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id  uuid NOT NULL REFERENCES projects ON DELETE CASCADE,
  user_id     uuid REFERENCES users ON DELETE SET NULL,
  action      text NOT NULL,    -- comment_added | comment_resolved | feature_created |
                                -- feature_updated | feature_deleted | member_joined |
                                -- member_removed | role_changed | export_generated |
                                -- suggestion_created | suggestion_approved | suggestion_rejected
  entity_type text,             -- comment | feature | member | export | suggestion
  entity_id   uuid,
  metadata    jsonb,            -- action-specific payload (e.g. { featureType, role, exportType })
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_pa_project ON project_activity (project_id, created_at DESC);

-- ────────────────────────────────────────────────────────────────────────────
-- SUGGESTED EDITS (reviewer suggestions with approval workflow)
-- ────────────────────────────────────────────────────────────────────────────

CREATE TABLE suggested_edits (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id    uuid NOT NULL REFERENCES projects ON DELETE CASCADE,
  author_id     uuid NOT NULL REFERENCES users ON DELETE CASCADE,
  feature_id    uuid NOT NULL REFERENCES design_features ON DELETE CASCADE,
  comment_id    uuid REFERENCES project_comments ON DELETE SET NULL,
  status        text NOT NULL DEFAULT 'pending',  -- pending | approved | rejected
  diff_payload  jsonb NOT NULL,   -- { properties?: { before, after }, geometry?: { before, after } }
  reviewed_by   uuid REFERENCES users ON DELETE SET NULL,
  reviewed_at   timestamptz,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_se_project ON suggested_edits (project_id);
CREATE INDEX idx_se_feature ON suggested_edits (feature_id);
CREATE INDEX idx_se_status  ON suggested_edits (project_id, status) WHERE status = 'pending';

-- ────────────────────────────────────────────────────────────────────────────
-- TRIGGERS
-- ────────────────────────────────────────────────────────────────────────────

CREATE TRIGGER set_updated_at_comments BEFORE UPDATE ON project_comments
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();
