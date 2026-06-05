// actHandoffPackage.schema.ts
//
// ActHandoffPackage — the bridge from Plan to Act. Built from an
// approved-for-act or conditionally-approved PlanDecisionRecord. Carries
// the work scope, prerequisites, sequence, materials, success criteria,
// verification + monitoring requirements that Act needs to spawn tasks
// and run them to verification.

import { z } from 'zod';
import { GeoJSONGeometrySchema } from './geometry.schema.js';

export const HandoffMaterialSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  quantity: z.number().optional(),
  unit: z.string().optional(),
  sourceNote: z.string().optional(),
});
export type HandoffMaterial = z.infer<typeof HandoffMaterialSchema>;

export const HandoffSuccessCriterionSchema = z.object({
  id: z.string().min(1),
  description: z.string().min(1),
  measurement: z.string().optional(),
});
export type HandoffSuccessCriterion = z.infer<
  typeof HandoffSuccessCriterionSchema
>;

export const HandoffVerificationRequirementSchema = z.object({
  id: z.string().min(1),
  description: z.string().min(1),
  proofTypeHint: z
    .enum([
      'photo',
      'measurement',
      'note',
      'receipt',
      'inspection',
      'test',
      'signature',
      'before-after',
    ])
    .optional(),
});
export type HandoffVerificationRequirement = z.infer<
  typeof HandoffVerificationRequirementSchema
>;

export const HandoffMonitoringRequirementSchema = z.object({
  id: z.string().min(1),
  description: z.string().min(1),
  cadence: z.string().optional(),
});
export type HandoffMonitoringRequirement = z.infer<
  typeof HandoffMonitoringRequirementSchema
>;

export const ActHandoffPackageSchema = z.object({
  id: z.string().min(1),
  projectId: z.string().min(1),
  planDecisionRecordId: z.string().min(1),
  workScope: z.string().default(''),
  locationGeometry: GeoJSONGeometrySchema.optional(),
  prerequisites: z.array(z.string()).default([]),
  sequence: z.array(z.string()).default([]),
  materials: z.array(HandoffMaterialSchema).default([]),
  successCriteria: z.array(HandoffSuccessCriterionSchema).default([]),
  verificationRequirements: z
    .array(HandoffVerificationRequirementSchema)
    .default([]),
  monitoringRequirements: z
    .array(HandoffMonitoringRequirementSchema)
    .default([]),
  createdBy: z.string().optional(),
  createdAt: z.string().datetime(),
});
export type ActHandoffPackage = z.infer<typeof ActHandoffPackageSchema>;
