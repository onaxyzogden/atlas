import { z } from 'zod';
import { sectionResponse } from './sectionResponse.js';

// Section 13 — Utilities, Energy & Support Systems
//
// Energy-source mix and storage capacity headline the utilities
// processor emits for the section card.

export const UtilitiesEnergySummary = z.object({
  energySources: z.array(z.string()),
  generationKw: z.number().nonnegative(),
  storageKwh: z.number().nonnegative(),
  hasGridConnection: z.boolean(),
});
export type UtilitiesEnergySummary = z.infer<typeof UtilitiesEnergySummary>;

export const UtilitiesEnergyResponse = sectionResponse(UtilitiesEnergySummary);
export type UtilitiesEnergyResponse = z.infer<typeof UtilitiesEnergyResponse>;
