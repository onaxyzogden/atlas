import { z } from 'zod';
import { sectionResponse } from './sectionResponse.js';

// Section 24 — Mobile, Fieldwork & Site Visit Tools
//
// Counts of in-field observations and pending sync items the mobile
// fieldwork processor surfaces on the Operate page.

export const MobileFieldworkSummary = z.object({
  observationCount: z.number().int().nonnegative(),
  pendingSyncCount: z.number().int().nonnegative(),
  lastSyncAt: z.string().datetime().nullable(),
});
export type MobileFieldworkSummary = z.infer<typeof MobileFieldworkSummary>;

export const MobileFieldworkResponse = sectionResponse(MobileFieldworkSummary);
export type MobileFieldworkResponse = z.infer<typeof MobileFieldworkResponse>;
