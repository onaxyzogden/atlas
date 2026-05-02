import { z } from 'zod';
import { sectionResponse } from './sectionResponse.js';

// Section 17 — Rule-Based Design Intelligence
//
// Roll-up of design-rule activations and current violation count.
// Per-rule detail rides on the design-rules feature endpoint.

export const DesignRulesSummary = z.object({
  activeRuleCount: z.number().int().nonnegative(),
  violationCount: z.number().int().nonnegative(),
  warningCount: z.number().int().nonnegative(),
  lastEvaluatedAt: z.string().datetime().nullable(),
});
export type DesignRulesSummary = z.infer<typeof DesignRulesSummary>;

export const DesignRulesResponse = sectionResponse(DesignRulesSummary);
export type DesignRulesResponse = z.infer<typeof DesignRulesResponse>;
