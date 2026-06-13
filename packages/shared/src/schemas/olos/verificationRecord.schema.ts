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

// Who stood behind the verification, relative to the worker who did the task.
// Anything other than 'self' is a third-party attestation - which is what
// catalogue scopeNotes mean by "verified by someone other than the arriving
// household" / "legally reviewed". 'self' is an explicit self-certification;
// absent means unspecified (legacy / not asserted).
export const VerifierRole = z.enum([
  'self',
  'peer',
  'steward',
  'external-adviser',
  'independent',
]);
export type VerifierRole = z.infer<typeof VerifierRole>;

export const VerificationRecordSchema = z.object({
  id: z.string().min(1),
  projectId: z.string().min(1),
  taskId: z.string().min(1),
  verifierId: z.string().optional(),
  verifierRole: VerifierRole.optional(),
  outcome: VerificationOutcome,
  criteriaChecked: z.array(VerificationCriterionResultSchema).default([]),
  notes: z.string().optional(),
  requiredReworkIds: z.array(z.string()).default([]),
  proofRecordIds: z.array(z.string()).default([]),
  verifiedAt: z.string().datetime(),
});
export type VerificationRecord = z.infer<typeof VerificationRecordSchema>;
