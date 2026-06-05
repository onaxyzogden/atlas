-- Migration 037 — Phase 4.5: organizations gain optional jurisdiction +
-- registry_id columns to support the Stewarding-tier prelude (institutional
-- bodies / land trusts often need to record their legal jurisdiction +
-- registered charity / society number for downstream reporting).
--
-- Both columns are nullable — solo stewards leave them blank.

BEGIN;

ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS jurisdiction text,
  ADD COLUMN IF NOT EXISTS registry_id  text;

COMMIT;
