// divergenceFlag.schema.ts
//
// DivergenceFlag — what gets captured when a steward taps "Reality Diverges"
// on a field action (OLOS Act Command Center Spec v1 §6, "Reality Diverges
// path"). Divergence is explicitly NOT a failure: it is field-truth that
// contradicts a plan assumption, routed back to Observe and surfaced as a
// Plan revision flag on the parent objective.
//
// The six DivergenceType values match spec §6.3 verbatim. The flag carries
// its own proof bundle (photo + note minimum, GPS point recommended — see
// proofSchemas.ts proof catalog 'divergence-minimum') so the divergence is
// itself an evidence-bearing record once captured.

import { z } from 'zod';
import { FieldActionProofItemSchema } from './proofItem.schema.js';

export const DivergenceType = z.enum([
  'physical_constraint',
  'new_discovery',
  'access_issue',
  'resource_constraint',
  'safety_concern',
  'plan_error',
]);
export type DivergenceType = z.infer<typeof DivergenceType>;

export const DivergenceResolutionStatus = z.enum(['open', 'resolved']);
export type DivergenceResolutionStatus = z.infer<
  typeof DivergenceResolutionStatus
>;

export const DivergenceFlagSchema = z.object({
  id: z.string().min(1),
  type: DivergenceType,
  noteText: z.string().optional(),
  proofItems: z.array(FieldActionProofItemSchema).default([]),
  capturedAt: z.string().datetime(),
  capturedBy: z.string().optional(),
  /** Mirrors FieldAction.planObjectiveId so a flag can be surfaced standalone. */
  parentObjectiveId: z.string().min(1),
  resolutionStatus: DivergenceResolutionStatus.default('open'),
  /** Set by Plan Revision Banner when the steward closes the loop in Plan. */
  resolvedAt: z.string().datetime().nullable().optional(),
});
export type DivergenceFlag = z.infer<typeof DivergenceFlagSchema>;
