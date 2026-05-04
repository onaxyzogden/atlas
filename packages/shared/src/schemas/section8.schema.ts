import { z } from 'zod';
import { sectionResponse } from './sectionResponse.js';

// Section 8 — Land Use Zoning & Functional Allocation
//
// Counts of allocated zones and the share of the parcel covered;
// the per-zone polygons live on the design-feature endpoint.

export const ZoningAllocationSummary = z.object({
  zoneCount: z.number().int().nonnegative(),
  allocatedAreaHa: z.number().nonnegative(),
  unallocatedAreaHa: z.number().nonnegative(),
  zoneKinds: z.array(z.string()),
});
export type ZoningAllocationSummary = z.infer<typeof ZoningAllocationSummary>;

export const ZoningAllocationResponse = sectionResponse(ZoningAllocationSummary);
export type ZoningAllocationResponse = z.infer<typeof ZoningAllocationResponse>;
