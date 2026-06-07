-- 053_olos_record_revs.sql
-- Phase 3 of OLOS local-first hardening: give the three olos record tables
-- (observations / proofs / verifications, defined in 043) full `rev`-based
-- parity with the synced Act records (047), so they can join the same
-- real-time broadcast + reconnect delta-pull + 409 stale-write path.
--
-- `rev` is a per-record monotonic BIGINT bumped on every authoritative write.
-- The server PUT is rev-gated exactly like synced_records:
--   UPDATE ... SET rev = rev + 1, updated_at = now()
--   WHERE id = $rec AND rev <= $baseRev
-- 0 rows + a supplied baseRev => stale write => 409 {serverRev, serverPayload}.
--
-- DEFAULT 0 = pre-sync sentinel. Existing rows (written before this column
-- existed) backfill to rev 0; a steward's FIRST post-upgrade push carries
-- baseRev 0, and `0 <= 0` lets that first push win and bump the row to 1 —
-- coherent with the 409 gate and idempotent under the changed-since re-pull.
-- The create path explicitly sets rev = 1 (a freshly created row has been
-- authoritatively written once), so only legacy backfilled rows ever sit at 0.
--
-- Pure additive DDL; the rev-gate is opt-in (baseRev absent => today's COALESCE
-- update is untouched), so existing non-sync callers and tests stay green.

ALTER TABLE olos_observation_records
  ADD COLUMN rev BIGINT NOT NULL DEFAULT 0;

ALTER TABLE olos_proof_records
  ADD COLUMN rev BIGINT NOT NULL DEFAULT 0;

ALTER TABLE olos_verification_records
  ADD COLUMN rev BIGINT NOT NULL DEFAULT 0;
