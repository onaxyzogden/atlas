import { z } from 'zod';
import { sectionResponse } from './sectionResponse.js';

// Section 7 — Soil, Ecology & Regeneration Diagnostics
//
// Roll-up of dominant soil texture, organic-matter signal, and an
// ecological-integrity score the regen processor derives from the
// soil + land-cover layers.

export const SoilEcologySummary = z.object({
  dominantTexture: z.string().nullable(),
  organicMatterPct: z.number().nullable(),
  ecologicalIntegrityScore: z.number().min(0).max(100).nullable(),
  observationCount: z.number().int().nonnegative(),
});
export type SoilEcologySummary = z.infer<typeof SoilEcologySummary>;

export const SoilEcologyResponse = sectionResponse(SoilEcologySummary);
export type SoilEcologyResponse = z.infer<typeof SoilEcologyResponse>;
