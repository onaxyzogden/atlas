// proofRecord.schema.ts
//
// ProofRecord — captures the evidence a worker submits to demonstrate that
// an ActTask has been completed. Multiple proof records can attach to one
// task. VerificationRecord (verificationRecord.schema.ts) is the verifier's
// pass/fail judgement on a proof.

import { z } from 'zod';

export const ProofType = z.enum([
  'photo',
  'measurement',
  'note',
  'receipt',
  'inspection',
  'test',
  'signature',
  'before-after',
  'video',
  'document',
]);
export type ProofType = z.infer<typeof ProofType>;

export const ProofVerificationStatus = z.enum([
  'pending',
  'accepted',
  'rejected',
  'needs-rework',
]);
export type ProofVerificationStatus = z.infer<typeof ProofVerificationStatus>;

export const ProofGeotagSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  accuracyMeters: z.number().nonnegative().optional(),
});
export type ProofGeotag = z.infer<typeof ProofGeotagSchema>;

export const ProofRecordSchema = z.object({
  id: z.string().min(1),
  projectId: z.string().min(1),
  taskId: z.string().min(1),
  proofType: ProofType,
  fileUri: z.string().optional(),
  note: z.string().optional(),
  measurementValue: z.number().optional(),
  measurementUnit: z.string().optional(),
  geotag: ProofGeotagSchema.optional(),
  capturedAt: z.string().datetime(),
  submittedBy: z.string().optional(),
  verificationStatus: ProofVerificationStatus.default('pending'),
});
export type ProofRecord = z.infer<typeof ProofRecordSchema>;
