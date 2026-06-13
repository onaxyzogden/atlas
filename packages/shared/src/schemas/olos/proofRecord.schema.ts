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

// -- ProofDetails: per-type structured capture payload ------------------------
// A discriminated union of type-specific structured proof data. The `inspection`,
// `signature`, and `test` variants are implemented; new variants are added
// additively (extend the union + reuse the `kind` discriminator key). `measurement`
// keeps its dedicated measurementValue/measurementUnit fields and is NOT modelled
// here. Stored as a jsonb column (olos_proof_records.details) - nullable, no CHECK
// constraint, so additive variants need no migration (validated by Zod at the API
// boundary, like geotag).

export const ProofInspectionItemSchema = z.object({
  label: z.string().min(1),
  status: z.enum(['pass', 'fail', 'na']),
  note: z.string().optional(),
});
export type ProofInspectionItem = z.infer<typeof ProofInspectionItemSchema>;

// One party's signed attestation. Reused both by the `signature` ProofDetails
// variant (one record per signatory; multiple ProofRecords may attach to a task)
// and by decision-capture sign-offs that record an array of these attestations.
// `signerRole` distinguishes self vs third-party attestation (e.g. "founding
// member", "legal adviser", "independent verifier"); absent = unspecified.
export const ProofSignatorySchema = z.object({
  signerName: z.string().min(1),
  signerRole: z.string().optional(),
  attestation: z.string().min(1),
  signedAt: z.string().datetime(),
});
export type ProofSignatory = z.infer<typeof ProofSignatorySchema>;

export const ProofDetailsSchema = z.discriminatedUnion('kind', [
  z.object({
    kind: z.literal('inspection'),
    // At least one checklist item: an empty inspection is benign but meaningless,
    // so it is rejected at the schema boundary rather than stored as evidence.
    items: z.array(ProofInspectionItemSchema).min(1),
  }),
  // One signed attestation by one signatory (signerName, attestation, signedAt,
  // optional signerRole). Multi-party sign-offs attach one record per signatory.
  z.object({
    kind: z.literal('signature'),
    ...ProofSignatorySchema.shape,
  }),
  // A measured test result with a pass/fail verdict (value, optional unit, passed,
  // optional method). Distinct from `measurement` (a bare reading with no verdict).
  z.object({
    kind: z.literal('test'),
    value: z.number(),
    unit: z.string().optional(),
    passed: z.boolean(),
    method: z.string().optional(),
  }),
]);
export type ProofDetails = z.infer<typeof ProofDetailsSchema>;

/** Safe-read companion (mirrors parseLensMeasurement): returns the typed details
 *  for a recognised shape, or null for anything else - so readers branch without
 *  throwing on legacy/unknown records. */
export function parseProofDetails(value: unknown): ProofDetails | null {
  const result = ProofDetailsSchema.safeParse(value);
  return result.success ? result.data : null;
}

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
  details: ProofDetailsSchema.optional(),
  capturedAt: z.string().datetime(),
  submittedBy: z.string().optional(),
  verificationStatus: ProofVerificationStatus.default('pending'),
});
export type ProofRecord = z.infer<typeof ProofRecordSchema>;
