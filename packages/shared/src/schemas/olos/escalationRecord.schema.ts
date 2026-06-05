// escalationRecord.schema.ts
//
// EscalationRecord — the feedback loop. When an ActTask surfaces a new
// condition, scope change, incident, or monitoring signal, it is routed
// back upstream (to Observe / Plan / Risk / Monitoring) as an escalation.
// The receiving Stage decides whether to re-observe, redesign, escalate
// to a Steward, or close.

import { z } from 'zod';
import { Stage } from './stage.schema.js';
import { UniversalDomain } from '../universalDomain.schema.js';

export const EscalationSeverity = z.enum([
  'info',
  'low',
  'medium',
  'high',
  'critical',
]);
export type EscalationSeverity = z.infer<typeof EscalationSeverity>;

export const EscalationStatus = z.enum([
  'open',
  'acknowledged',
  'in-progress',
  'resolved',
  'dismissed',
]);
export type EscalationStatus = z.infer<typeof EscalationStatus>;

export const EscalationTriggerKind = z.enum([
  'new-condition',
  'scope-change',
  'incident',
  'monitoring-signal',
  'safety',
  'compliance',
  'cost-overrun',
  'schedule-overrun',
]);
export type EscalationTriggerKind = z.infer<typeof EscalationTriggerKind>;

export const EscalationRecordSchema = z.object({
  id: z.string().min(1),
  projectId: z.string().min(1),
  taskId: z.string().optional(),
  objectiveId: z.string().optional(),
  triggerKind: EscalationTriggerKind,
  triggerNote: z.string().default(''),
  severity: EscalationSeverity.default('medium'),
  routedToStage: Stage,
  routedToDomain: UniversalDomain.optional(),
  requestedAction: z.string().default(''),
  status: EscalationStatus.default('open'),
  raisedBy: z.string().optional(),
  raisedAt: z.string().datetime(),
  resolvedBy: z.string().optional(),
  resolvedAt: z.string().datetime().optional(),
  resolutionNote: z.string().optional(),
});
export type EscalationRecord = z.infer<typeof EscalationRecordSchema>;
