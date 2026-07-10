-- 058_project_client_local_id.sql
-- Client-supplied idempotency key for POST /projects. The web client sends its
-- stable local row id (crypto.randomUUID) as client_local_id so a retried or
-- raced create returns the SAME row instead of minting a duplicate. Nullable:
-- every legacy row and every PULL-created row has none, so the uniqueness must
-- exclude NULLs (partial index) -- unlimited NULL rows may coexist.
--
-- Plain (non-CONCURRENTLY) index on purpose: the migration runner wraps each
-- file in a single transaction, and CREATE INDEX CONCURRENTLY is illegal inside
-- a txn. The column is all-NULL at creation, so the build is instant.

ALTER TABLE projects ADD COLUMN IF NOT EXISTS client_local_id uuid;

CREATE UNIQUE INDEX IF NOT EXISTS uq_projects_owner_client_local_id
  ON projects (owner_id, client_local_id)
  WHERE client_local_id IS NOT NULL;
