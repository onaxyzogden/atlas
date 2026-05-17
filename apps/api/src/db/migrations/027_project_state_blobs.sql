-- Migration 027 — project_state_blobs
--
-- The generic versioned-blob transport for Phase 2 of the durable P0-1 fix
-- (Full syncService Coverage). syncService historically synced only 4 of
-- ~68 project-scoped Zustand persist stores, so a multi-device tester
-- silently lost the rest. This table is the catch-all: one opaque row per
-- (project, store_key) for every store classified `versioned-blob` in
-- apps/web/src/lib/syncManifest.ts.
--
-- Conflict model — stale-write reject + surface (decision locked
-- 2026-05-16, wiki/concepts/full-syncservice-coverage-backlog.md):
--   * `rev` is a per-(project,store_key) monotonic counter.
--   * The PUT route does INSERT … ON CONFLICT DO UPDATE … WHERE the
--     stored rev <= the client's baseRev; a stale write affects 0 rows and
--     the route returns 409 with {serverRev, serverPayload} so the client
--     can surface the conflict instead of silently clobbering.
--   * `schema_version` is the store's own persist `version`; it anchors
--     the client-side version-skew guard (an old client refuses a newer
--     blob rather than downcasting through a stale `migrate`).
--
-- Geometry-bearing design elements NEVER travel here — they stay on the
-- existing `design_features` typed path (no double-write); the
-- syncManifest coverage guard enforces that classification.
--
-- See: packages/shared/src/schemas/projectState.schema.ts,
--      apps/api/src/routes/project-state/index.ts,
--      apps/web/src/lib/blobSync.ts.

CREATE TABLE IF NOT EXISTS project_state_blobs (
  project_id     UUID        NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  store_key      TEXT        NOT NULL,
  payload        JSONB       NOT NULL,
  schema_version INTEGER     NOT NULL,
  rev            BIGINT      NOT NULL DEFAULT 1,
  updated_by     UUID        REFERENCES users(id) ON DELETE SET NULL,
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (project_id, store_key)
);

CREATE INDEX IF NOT EXISTS project_state_blobs_project_idx
  ON project_state_blobs (project_id);

COMMENT ON TABLE project_state_blobs IS
  'Generic versioned-blob sync transport — one opaque row per (project, store_key) for every versioned-blob store in syncManifest.ts. Added in migration 027 (2026-05-16).';

COMMENT ON COLUMN project_state_blobs.rev IS
  'Per-(project,store_key) monotonic revision. PUT bumps it; a write whose baseRev is behind the stored rev is rejected 409 (stale-write reject + surface).';

COMMENT ON COLUMN project_state_blobs.schema_version IS
  'The store''s own Zustand persist version. Anchors the client version-skew guard — an old client refuses a blob whose schema_version exceeds its local version.';
