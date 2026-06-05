// verificationRecord.schema.ts
//
// VerificationRecord — the verifier's pass/fail judgement on a completed
// ActTask + its ProofRecords. A passing verification transitions the task
// to verified-complete; a failing one lists the required rework items.

import { z } from 'zod';

export const VerificationCriterionResultSchema = z.object({
  id: z.string().min(1),
  description: z.string().min(1),
  passed: z.boolean(),
  note: z.string().optional(),
});
export type VerificationCriterionResult = z.infer<
  typeof VerificationCriterionResultSchema
>;

export const VerificationOutcome = z.enum([
  'pass',
  'fail',
  'partial',
  'needs-rework',
]);
export type VerificationOutcome = z.infer<typeof VerificationOutcome>;

export const VerificationRecordSchema = z.object({
  id: z.string().min(1),
  projectId: z.string().min(1),
  taskId: z.string().min(1),
  verifierId: z.string().optional(),
  outcome: VerificationOutcome,
  criteriaChecked: z.array(VerificationCriterionResultSchema).default([]),
  notes: z.string().optional(),
  requiredReworkIds: z.array(z.string()).default([]),
  proofRecordIds: z.array(z.string()).default([]),
  verifiedAt: z.string().datetime(),
});
export type VerificationRecord = z.infer<typeof VerificationRecordSchema>;
