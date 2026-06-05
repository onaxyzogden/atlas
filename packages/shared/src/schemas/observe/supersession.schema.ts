// supersession.schema.ts
//
// Shape of the supersession decision returned by `computeSupersession`
// (../relationships/supersession.ts). Carrying a typed shape rather than
// a bare array lets consumers branch on `supersededPointIds.length === 0`
// without losing the new-point id context (useful for telemetry +
// undo trails).
//
// Persisted only as the side-effect on the ObserveDataPoint rows
// themselves (isSuperseded / supersededBy) — this schema is for the
// helper's return contract, not for a stored entity.

import { z } from 'zod';

export const SupersessionDecisionSchema = z.object({
  /** The freshly-recorded data point that triggered the supersession check. */
  newPointId: z.string().min(1),
  /** Ids of pre-existing active points that this capture supersedes. Empty
   *  when the new capture is the first in its (domain, location) cluster. */
  supersededPointIds: z.array(z.string().min(1)).default([]),
});
export type SupersessionDecision = z.infer<typeof SupersessionDecisionSchema>;
