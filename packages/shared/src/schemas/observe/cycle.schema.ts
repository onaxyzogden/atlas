// cycle.schema.ts
//
// ObserveCycleEntry — append-only log entry for cycle advances, keyed
// per (project, domain). A cycle advance happens when a Plan revision
// is confirmed or revised; the cycle id stamps subsequent observations
// so the Temporal Layer can draw cycle-boundary annotations.
//
// The cycle store carries both the *current* cycleId (a counter per
// project + domain) and the *history* of advance events (this schema)
// so the Temporal chart can annotate the x-axis. Counter and log live
// together in the same persist record.

import { z } from 'zod';
import { UniversalDomain } from '../universalDomain.schema.js';

export const ObserveCycleAdvanceReason = z.enum([
  'plan_revision_confirmed',
  'plan_revision_revised',
]);
export type ObserveCycleAdvanceReason = z.infer<
  typeof ObserveCycleAdvanceReason
>;

export const ObserveCycleEntrySchema = z.object({
  domainId: UniversalDomain,
  /** Cycle id that started AT this entry. Cycle 0 is implicit (no entry). */
  cycleId: z.number().int().nonnegative(),
  advancedAt: z.string().datetime(),
  reason: ObserveCycleAdvanceReason,
  /** Plan tier objective whose revision triggered the advance, if known. */
  planObjectiveId: z.string().min(1).optional(),
});
export type ObserveCycleEntry = z.infer<typeof ObserveCycleEntrySchema>;

export const ObserveDomainCycleStateSchema = z.object({
  /** Current cycle id for this domain. Increments only via cycleAdvance. */
  currentCycleId: z.number().int().nonnegative().default(0),
  /** Append-only log of cycle advances. Sorted oldest → newest by advancedAt. */
  history: z.array(ObserveCycleEntrySchema).default([]),
});
export type ObserveDomainCycleState = z.infer<
  typeof ObserveDomainCycleStateSchema
>;
