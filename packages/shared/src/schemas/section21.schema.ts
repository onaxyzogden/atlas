import { z } from 'zod';
import { sectionResponse } from './sectionResponse.js';

// Section 21 — Decision Support & Feasibility
//
// Verdict + headline blocker counts the V3 Prove page consumes.
// Drives the "ready to build" / "still gathering" gate.

export const DecisionFeasibilitySummary = z.object({
  verdict: z.enum([
    'strong',
    'supported',
    'supported-with-fixes',
    'conditional',
    'at-risk',
    'blocked',
  ]),
  verdictScore: z.number().min(0).max(100),
  blockerCount: z.number().int().nonnegative(),
  warningCount: z.number().int().nonnegative(),
});
export type DecisionFeasibilitySummary = z.infer<typeof DecisionFeasibilitySummary>;

export const DecisionFeasibilityResponse = sectionResponse(DecisionFeasibilitySummary);
export type DecisionFeasibilityResponse = z.infer<typeof DecisionFeasibilityResponse>;
