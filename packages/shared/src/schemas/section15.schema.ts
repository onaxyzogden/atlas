import { z } from 'zod';
import { sectionResponse } from './sectionResponse.js';

// Section 15 — Timeline, Phasing & Staged Buildout
//
// Headline phase counts and overall progress the buildout planner
// surfaces on the Build page.

export const TimelinePhasingSummary = z.object({
  phaseCount: z.number().int().nonnegative(),
  completedPhases: z.number().int().nonnegative(),
  activePhase: z.string().nullable(),
  startDate: z.string().datetime().nullable(),
  targetDate: z.string().datetime().nullable(),
});
export type TimelinePhasingSummary = z.infer<typeof TimelinePhasingSummary>;

export const TimelinePhasingResponse = sectionResponse(TimelinePhasingSummary);
export type TimelinePhasingResponse = z.infer<typeof TimelinePhasingResponse>;
