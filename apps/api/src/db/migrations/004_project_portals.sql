-- OGDEN Land Design Atlas — Portal Persistence
-- Stores public storytelling portal configuration per project.

CREATE TABLE project_portals (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id          uuid NOT NULL REFERENCES projects ON DELETE CASCADE,
  share_token         uuid NOT NULL DEFAULT gen_random_uuid() UNIQUE,
  is_published        boolean NOT NULL DEFAULT false,
  config              jsonb NOT NULL DEFAULT '{}',
  data_masking_level  text NOT NULL DEFAULT 'curated',
  published_at        timestamptz,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now(),
  UNIQUE (project_id)
);

CREATE INDEX idx_project_portals_share_token ON project_portals (share_token);
CREATE INDEX idx_project_portals_project ON project_portals (project_id);
