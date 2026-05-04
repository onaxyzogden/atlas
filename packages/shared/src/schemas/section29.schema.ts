import { z } from 'zod';
import { sectionResponse } from './sectionResponse.js';

// Section 29 — Moontrance-Specific Features
//
// Phase-gated under requirePhase('MT'); minimal summary tracks
// Moontrance-identity binding state until the ADR for the full
// surface lands.

export const MoontranceIdentitySummary = z.object({
  isLinked: z.boolean(),
  linkedAt: z.string().datetime().nullable(),
  capabilities: z.array(z.string()),
});
export type MoontranceIdentitySummary = z.infer<typeof MoontranceIdentitySummary>;

export const MoontranceIdentityResponse = sectionResponse(MoontranceIdentitySummary);
export type MoontranceIdentityResponse = z.infer<typeof MoontranceIdentityResponse>;
