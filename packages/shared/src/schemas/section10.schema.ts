import { z } from 'zod';
import { sectionResponse } from './sectionResponse.js';

// Section 10 — Access, Circulation & Movement Systems
//
// Roll-up of the on-parcel path/road network length and the count
// of named access points.

export const AccessCirculationSummary = z.object({
  pathLengthM: z.number().nonnegative(),
  roadLengthM: z.number().nonnegative(),
  accessPointCount: z.number().int().nonnegative(),
  surfaceKinds: z.array(z.string()),
});
export type AccessCirculationSummary = z.infer<typeof AccessCirculationSummary>;

export const AccessCirculationResponse = sectionResponse(AccessCirculationSummary);
export type AccessCirculationResponse = z.infer<typeof AccessCirculationResponse>;
