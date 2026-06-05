-- Migration 048 — sync_log + failed_records
--
-- The durable conflict model for the typed per-record Act transport
-- (ADR 7 Phase 3; ADR 12 §6 —
-- wiki/decisions/2026-05-29-atlas-spec-offline-sync-priority-queues.md).
--
-- Phase 1 (migration 047) shipped the never-clobber envelope at runtime: a
-- stale per-record write 409s, the client keeps local + adopts the server rev,
-- and surfaces a badge. Phase 3 makes that conflict DURABLE and adds
-- escalation. Both tables are append-only work/audit logs (no updated_at
-- trigger — same posture as client_error_events / synced_records):
--   * sync_log       — every 409 writes one row capturing BOTH payloads, both
--                      revs, both observed_at timestamps, and the resolution
--                      the route chose. Audit trail + data source for the
--                      Phase 4 Keep-mine/Keep-server surface.
--   * failed_records — the open work-queue: one row per record whose conflict
--                      could NOT be auto-resolved (steward must decide).
--                      UNIQUE per (project, store, record) so a re-escalation
--                      of a still-open record updates the pointer rather than
--                      stacking duplicates; deleted on resolution (the
--                      lifecycle/history stays on the sync_log row).
--
-- Resolution is decided server-side under ratified last-write-wins (ADR 12
-- amendment), keyed on observed_at: server >= local (tie → server, §6.1) is
-- `auto_resolved` (the loser is preserved here, client stays quiet); local
-- strictly newer, or either timestamp missing/unparseable, is `escalated`
-- (never auto-applied — local retained, conflict surfaced). A steward closing
-- an escalation via Phase 4 sets status `resolved`. Mirrors Observe's
-- non-destructive isSuperseded/supersededBy model: keep both, flag the loser.
--
-- See: packages/shared/src/schemas/syncConflict.schema.ts,
--      apps/api/src/routes/act-records/index.ts,
--      apps/web/src/lib/syncService.ts, apps/web/src/lib/recordSync.ts.

CREATE TABLE IF NOT EXISTS sync_log (
  id                 UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id         UUID        NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  store_key          TEXT        NOT NULL,
  record_id          TEXT        NOT NULL,
  local_payload      JSONB,
  server_payload     JSONB,
  local_rev          BIGINT,
  server_rev         BIGINT,
  observed_at_local  TIMESTAMPTZ,
  observed_at_server TIMESTAMPTZ,
  resolution_status  TEXT        NOT NULL,
  detected_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  detected_by        UUID        REFERENCES users(id) ON DELETE SET NULL,
  resolved_at        TIMESTAMPTZ,
  resolved_by        UUID        REFERENCES users(id) ON DELETE SET NULL,
  -- Mirrors SyncResolutionStatus in syncConflict.schema.ts character-for-character.
  CONSTRAINT sync_log_resolution_status_check CHECK (resolution_status IN (
    'auto_resolved',
    'escalated',
    'resolved'
  ))
);

CREATE TABLE IF NOT EXISTS failed_records (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  sync_log_id UUID        NOT NULL REFERENCES sync_log(id) ON DELETE CASCADE,
  project_id  UUID        NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  store_key   TEXT        NOT NULL,
  record_id   TEXT        NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- At most one OPEN escalation per record; re-escalation upserts the pointer.
  UNIQUE (project_id, store_key, record_id)
);

-- Phase 4 lists conflicts by status (the badge counts escalated/open); the
-- per-record index serves "history for this record" lookups. The failed_records
-- UNIQUE btree already covers its (project_id) prefix reads, so no extra index.
CREATE INDEX IF NOT EXISTS sync_log_project_status_idx
  ON sync_log (project_id, resolution_status);
CREATE INDEX IF NOT EXISTS sync_log_project_record_idx
  ON sync_log (project_id, store_key, record_id);

COMMENT ON TABLE sync_log IS
  'Durable per-record sync-conflict audit. One row per 409 on synced_records, capturing both payloads/revs/observed_at and the server-chosen resolution. Source for the Phase 4 Keep-mine/Keep-server surface. Added in migration 048 (2026-05-29, ADR 7 Phase 3 / ADR 12 §6).';

COMMENT ON COLUMN sync_log.local_rev IS
  'The baseRev the rejected local write was built on (the rev the client last saw). NULL/0 for a never-synced record.';

COMMENT ON COLUMN sync_log.server_rev IS
  'The authoritative synced_records.rev that beat the local write (server was ahead of local_rev).';

COMMENT ON COLUMN sync_log.resolution_status IS
  'auto_resolved (server observed_at >= local, LWW; loser preserved here, client quiet) | escalated (local strictly newer or timestamp missing; never auto-applied, awaits steward) | resolved (steward closed it via Phase 4).';

COMMENT ON TABLE failed_records IS
  'Open escalation queue — one row per synced_records conflict awaiting a steward Keep-mine/Keep-server decision. UNIQUE per (project, store, record); deleted on resolution. Added in migration 048 (2026-05-29, ADR 7 Phase 3 / ADR 12 §6).';
