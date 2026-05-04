import { z } from 'zod';
import { sectionResponse } from './sectionResponse.js';

// Section 28 — Advanced Geospatial / Future-Ready Features
//
// Phase-gated under requirePhase('FUTURE'); summary remains lean
// until the ADR for advanced geospatial work lands. Reports counts
// of any experimental layers attached.

export const FutureGeospatialSummary = z.object({
  experimentalLayerCount: z.number().int().nonnegative(),
  enabledFeatures: z.array(z.string()),
});
export type FutureGeospatialSummary = z.infer<typeof FutureGeospatialSummary>;

export const FutureGeospatialResponse = sectionResponse(FutureGeospatialSummary);
export type FutureGeospatialResponse = z.infer<typeof FutureGeospatialResponse>;
