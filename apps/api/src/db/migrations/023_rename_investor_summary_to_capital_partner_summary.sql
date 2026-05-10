-- Migration 023: rename ai_outputs.output_type 'investor_summary' → 'capital_partner_summary'.
--
-- Context: CSRA / "investor" framing was erased on 2026-05-04 on Islamic fiqh
-- grounds (bayʿ mā laysa ʿindak — Islam does not permit the sale of what one
-- does not yet possess). All operator-visible "investor" surfaces are being
-- renamed to "capital partner" across web + api + shared. This migration
-- updates the database side: backfill existing rows, then replace the CHECK
-- constraint to reflect the new vocabulary.
--
-- See: apps/web/CapitalPartnerSummaryExport.tsx,
--      apps/api/src/services/pdf/templates/capitalPartnerSummary.ts,
--      packages/shared/src/schemas/export.schema.ts (ExportType enum),
--      packages/shared/src/schemas/assessment.schema.ts (AIOutput.outputType),
--      wiki/decisions/2026-05-09-atlas-csra-erasure.md.

-- 1. Backfill any existing rows that still carry the old enum value.
UPDATE ai_outputs
SET output_type = 'capital_partner_summary'
WHERE output_type = 'investor_summary';

-- 2. Drop the existing CHECK constraint.
--    Postgres auto-names CHECK constraints; the original constraint
--    in migration 010 is named "ai_outputs_output_type_check".
ALTER TABLE ai_outputs
DROP CONSTRAINT IF EXISTS ai_outputs_output_type_check;

-- 3. Re-add the constraint with the new vocabulary.
ALTER TABLE ai_outputs
ADD CONSTRAINT ai_outputs_output_type_check
CHECK (output_type IN (
  'site_narrative', 'design_recommendation', 'risk_flag',
  'planting_guide', 'capital_partner_summary', 'design_brief'
));

COMMENT ON COLUMN ai_outputs.output_type IS
  'Server-generated AI output type. Renamed investor_summary → capital_partner_summary in migration 023 (2026-05-09) to align with the post-CSRA capital framing.';
