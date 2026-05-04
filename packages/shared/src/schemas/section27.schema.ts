import { z } from 'zod';
import { sectionResponse } from './sectionResponse.js';

// Section 27 — Public Experience & Storytelling Portal
//
// Public-facing visibility flags and counts the portal processor
// surfaces. Detail (story content, tour stops) rides on the portal
// endpoint.

export const PublicPortalSummary = z.object({
  isPublished: z.boolean(),
  storyCount: z.number().int().nonnegative(),
  tourStopCount: z.number().int().nonnegative(),
  lastPublishedAt: z.string().datetime().nullable(),
});
export type PublicPortalSummary = z.infer<typeof PublicPortalSummary>;

export const PublicPortalResponse = sectionResponse(PublicPortalSummary);
export type PublicPortalResponse = z.infer<typeof PublicPortalResponse>;
