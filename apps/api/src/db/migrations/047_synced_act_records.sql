-- Migration 047 — synced_records
--
-- The typed per-record sync transport for the Act stores (ADR 7 Phase 1;
-- wiki/decisions/2026-05-29-atlas-spec-act-map-first-surface.md). Where
-- migration 027's project_state_blobs carries ONE opaque row per
-- (project, store_key), this table carries one typed row per
-- (project, store_key, record_id) so an individual FieldAction / Observe feed
-- event / Observe data point / Observe cycle is first-class on the wire, each
-- with its own monotonic rev. This is what lets ADR 12's 5-tier priority queue
-- tier records by semantics (source_type / cycle_id / task_type) instead of
-- erasing them inside a per-project blob.
--
-- Conflict model — identical to project_state_blobs (stale-write reject +
-- surface, decision locked 2026-05-16):
--   * `rev` is a per-(project,store_key,record_id) monotonic counter.
--   * The PUT route does INSERT … ON CONFLICT DO UPDATE … WHERE the stored
--     rev <= the client's baseRev; a stale write affects 0 rows and the route
--     returns 409 {serverRev, serverPayload} so the client surfaces the
--     conflict instead of silently clobbering (the never-clobber envelope).
--   * `schema_version` is the store's own persist `version`; it anchors the
--     client-side version-skew guard.
--
-- The observed_at / source_type / cycle_id / task_type columns are
-- denormalised, best-effort copies of fields already inside `payload`,
-- surfaced as columns so the queue (Phase 2) can tier and the server can index
-- without parsing the blob. They are nullable — a store whose records lack a
-- given field (e.g. Observe cycles have no task_type) writes NULL.
--
-- See: packages/shared/src/schemas/syncedRecord.schema.ts,
--      apps/api/src/routes/act-records/index.ts,
--      apps/web/src/lib/recordSync.ts, apps/web/src/lib/syncManifest.ts.

CREATE TABLE IF NOT EXISTS synced_records (
  project_id     UUID        NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  store_key      TEXT        NOT NULL,
  record_id      TEXT        NOT NULL,
  payload        JSONB       NOT NULL,
  schema_version INTEGER     NOT NULL,
  rev            BIGINT      NOT NULL DEFAULT 1,
  observed_at    TIMESTAMPTZ,
  source_type    TEXT,
  cycle_id       TEXT,
  task_type      TEXT,
  updated_by     UUID        REFERENCES users(id) ON DELETE SET NULL,
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (project_id, store_key, record_id)
);

-- The composite PRIMARY KEY btree already covers the (project_id, store_key)
-- and (project_id) prefix lookups the GET-all route does, so no separate
-- (project_id, store_key) index is created (it would be pure write overhead).
-- The source_type index is NOT prefix-covered by the PK and serves Phase 2's
-- divergence-first tiering / source-filtered reads.
CREATE INDEX IF NOT EXISTS synced_records_project_source_idx
  ON synced_records (project_id, source_type);

COMMENT ON TABLE synced_records IS
  'Typed per-record sync transport — one row per (project, store_key, record_id) for every store classified `typed-record` in syncManifest.ts (the 4 Act stores). Added in migration 047 (2026-05-29, ADR 7 Phase 1).';

COMMENT ON COLUMN synced_records.rev IS
  'Per-(project,store_key,record_id) monotonic revision. PUT bumps it; a write whose baseRev is behind the stored rev is rejected 409 (stale-write reject + surface, never clobber).';

COMMENT ON COLUMN synced_records.cycle_id IS
  'Denormalised spiral cycle id (ADR 2). TEXT so it carries both the reserved "baseline" sentinel and stringified numbered cycles. Best-effort copy of payload.cycleId.';

COMMENT ON COLUMN synced_records.source_type IS
  'Denormalised source discriminator (ADR 9). Best-effort copy of payload.sourceType / payload.sourceObjectiveType. Indexed for Phase 2 tiering.';
