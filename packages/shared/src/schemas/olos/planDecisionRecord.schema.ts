// planDecisionRecord.schema.ts
//
// PlanDecisionRecord — the output of a Plan Objective. Captures the chosen
// option, the rejected options + rationale, assumptions, constraints,
// dependencies, risk flags, and an approval status that gates the Act
// handoff. The handoff emitter only converts records whose approvalStatus
// is in APPROVED_PLAN_STATUSES.

import { z } from 'zod';
import { PlanApprovalStatus } from './status.schema.js';

export const PlanDecisionOptionSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  rationale: z.string().default(''),
  pros: z.array(z.string()).default([]),
  cons: z.array(z.string()).default([]),
  estimatedCost: z.number().optional(),
  estimatedEffortHours: z.number().optional(),
});
export type PlanDecisionOption = z.infer<typeof PlanDecisionOptionSchema>;

export const PlanRiskFlagSchema = z.object({
  id: z.string().min(1),
  description: z.string().min(1),
  severity: z.enum(['low', 'medium', 'high', 'critical']).default('medium'),
  mitigation: z.string().optional(),
});
export type PlanRiskFlag = z.infer<typeof PlanRiskFlagSchema>;

export const PlanDecisionRecordSchema = z.object({
  id: z.string().min(1),
  projectId: z.string().min(1),
  objectiveId: z.string().min(1),
  selectedOption: PlanDecisionOptionSchema,
  rejectedOptions: z.array(PlanDecisionOptionSchema).default([]),
  rationale: z.string().default(''),
  assumptions: z.array(z.string()).default([]),
  constraints: z.array(z.string()).default([]),
  dependencies: z.array(z.string()).default([]),
  riskFlags: z.array(PlanRiskFlagSchema).default([]),
  upstreamObservationRecordIds: z.array(z.string()).default([]),
  approvalStatus: PlanApprovalStatus,
  decidedBy: z.string().optional(),
  decidedAt: z.string().datetime(),
});
export type PlanDecisionRecord = z.infer<typeof PlanDecisionRecordSchema>;
