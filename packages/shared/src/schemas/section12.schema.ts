import { z } from 'zod';
import { sectionResponse } from './sectionResponse.js';

// Section 12 — Crop, Orchard & Agroforestry Design
//
// Roll-up of planted areas, distinct species, and tree counts the
// crop/agroforestry processor derives from the design features.

export const CropsAgroforestrySummary = z.object({
  plantedAreaHa: z.number().nonnegative(),
  speciesCount: z.number().int().nonnegative(),
  treeCount: z.number().int().nonnegative(),
  systemKinds: z.array(z.string()),
});
export type CropsAgroforestrySummary = z.infer<typeof CropsAgroforestrySummary>;

export const CropsAgroforestryResponse = sectionResponse(CropsAgroforestrySummary);
export type CropsAgroforestryResponse = z.infer<typeof CropsAgroforestryResponse>;
