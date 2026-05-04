import { z } from 'zod';
import { sectionResponse } from './sectionResponse.js';

// Section 11 — Livestock System Design
//
// Headline animal-unit and paddock counts the livestock processor
// emits; per-rotation detail rides on the regeneration-event feed.

export const LivestockSystemsSummary = z.object({
  speciesCount: z.number().int().nonnegative(),
  totalAnimalUnits: z.number().nonnegative(),
  paddockCount: z.number().int().nonnegative(),
  rotationDays: z.number().int().nullable(),
});
export type LivestockSystemsSummary = z.infer<typeof LivestockSystemsSummary>;

export const LivestockSystemsResponse = sectionResponse(LivestockSystemsSummary);
export type LivestockSystemsResponse = z.infer<typeof LivestockSystemsResponse>;
