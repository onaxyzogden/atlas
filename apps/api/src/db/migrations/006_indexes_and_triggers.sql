-- OGDEN Atlas — Additional indexes and missing triggers
-- Migration 006

-- Index on project_comments.author_id for per-user comment lookups
CREATE INDEX IF NOT EXISTS idx_pc_author ON project_comments (author_id);

-- Missing updated_at trigger on project_portals
CREATE TRIGGER set_updated_at_portals BEFORE UPDATE ON project_portals
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();
