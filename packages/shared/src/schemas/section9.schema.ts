import { z } from 'zod';
import { sectionResponse } from './sectionResponse.js';

// Section 9 — Structures & Built Environment Planning
//
// Footprint roll-up for the buildings/structures the design carries.
// Per-structure detail (placement, materials) rides on the design
// feature endpoint.

export const StructuresBuildingsSummary = z.object({
  structureCount: z.number().int().nonnegative(),
  totalFootprintM2: z.number().nonnegative(),
  structureKinds: z.array(z.string()),
});
export type StructuresBuildingsSummary = z.infer<typeof StructuresBuildingsSummary>;

export const StructuresBuildingsResponse = sectionResponse(StructuresBuildingsSummary);
export type StructuresBuildingsResponse = z.infer<typeof StructuresBuildingsResponse>;
