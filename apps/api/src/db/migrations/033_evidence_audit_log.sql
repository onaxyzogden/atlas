-- 033_evidence_audit_log.sql
-- Phase F.4 — Reproducibility anchor for the Evidence selector framework.
--
-- Every `selectEvidenceFor(...)` emission on the web client can now write
-- a passive audit row: a SHA-256 hash of its (stable-stringified) selector
-- inputs, the inputs themselves, and the emitted Evidence output. Identical
-- inputs produce identical hashes — so the table doubles as a
-- reproducibility ledger: given two rows with the same `input_hash`, the
-- `evidence_output` JSONBs MUST match.
--
-- Why a new table rather than `activity_log` (lib/activityLog.ts):
--   * activity_log is steward-action-shaped (verb + project_id + JSONB
--     metadata). Evidence emissions are render-time, not user-initiated,
--     and we need a typed `input_hash` column to query reproducibility
--     by hash rather than by free-text metadata field.
--   * Keeping these in their own table lets us retention-prune
--     independently (Evidence rows can be high-frequency).
--
-- Adoption is incremental: F.4 only instruments `LandVerdictCard`. The
-- other seven panels using `selectEvidenceFor(...)` will follow once
-- the emit path is observed stable.
--
-- Covenant: appreciation of stewarded land value, not investor yield.
-- See [[fiqh-csra-erased-2026-05-04]]. The audit log makes the
-- Evidence-grounded Verdict reproducible from its inputs — auditable
-- stewardship, not opaque "AI scoring."

CREATE TABLE IF NOT EXISTS evidence_audit_log (
  id              uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id      uuid          NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  panel_key       text          NOT NULL,
  input_hash      char(64)      NOT NULL,
  input_payload   jsonb         NOT NULL,
  selector_name   text          NOT NULL,
  evidence_output jsonb         NOT NULL,
  created_at      timestamptz   NOT NULL DEFAULT now(),
  created_by      uuid          REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_evidence_audit_project_panel
  ON evidence_audit_log(project_id, panel_key, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_evidence_audit_hash
  ON evidence_audit_log(input_hash);

COMMENT ON TABLE evidence_audit_log IS
  'Reproducibility ledger for the Evidence selector framework (Phase F.4, migration 033). Each row records the SHA-256 of the selector inputs alongside the emitted Evidence output. Identical input_hash rows MUST yield identical evidence_output JSONB — the integrity invariant for the Anti-GIS / Apricot-Lane Verdict claims.';

COMMENT ON COLUMN evidence_audit_log.panel_key IS
  'Stable identifier for the UI surface emitting Evidence (e.g. "LandVerdictCard").';
COMMENT ON COLUMN evidence_audit_log.input_hash IS
  'SHA-256 hex (64 chars) of the stable-stringified selector inputs. Reproducibility key.';
COMMENT ON COLUMN evidence_audit_log.input_payload IS
  'The selector inputs themselves, stored verbatim so future replay tools can recompute the selector and assert byte-identical output.';
COMMENT ON COLUMN evidence_audit_log.selector_name IS
  'Name of the selector function (e.g. "selectVerdictEvidence"). Lets us partition the ledger by selector when more than one panel adopts.';
COMMENT ON COLUMN evidence_audit_log.evidence_output IS
  'The Evidence object emitted to the panel — typically { fragments, caveats, confidence, ... }.';
