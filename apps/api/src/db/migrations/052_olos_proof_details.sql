-- 052_olos_proof_details.sql
-- Phase 2 of the OLOS formal-proof migration: per-type structured capture.
-- Adds an optional jsonb `details` column to olos_proof_records, carrying the
-- ProofDetails discriminated union (packages/shared/.../proofRecord.schema.ts).
-- Phase 2 uses only the `inspection` variant; the column is nullable and
-- back-compatible (existing rows stay NULL). No CHECK constraint - the shape is
-- validated by Zod (ProofDetailsSchema) at the API boundary, like geotag.

ALTER TABLE olos_proof_records
  ADD COLUMN details jsonb;
