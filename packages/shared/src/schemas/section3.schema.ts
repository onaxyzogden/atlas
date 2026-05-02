import { z } from 'zod';
import { sectionResponse } from './sectionResponse.js';

// Section 3 — Site Data Layers & Environmental Inputs
//
// Response envelope for `GET /api/v1/site-data/:projectId`. Surfaces
// the headline counts the UI consumes to render the layers panel; the
// per-layer detail rides on the existing `/layers/project/:id`
// endpoint and is not re-projected here.

export const SiteDataLayersSummary = z.object({
  layerCount: z.number().int().nonnegative(),
  hasBoundary: z.boolean(),
  ingestedAt: z.string().datetime().nullable(),
  layerKinds: z.array(z.string()),
});
export type SiteDataLayersSummary = z.infer<typeof SiteDataLayersSummary>;

export const SiteDataLayersResponse = sectionResponse(SiteDataLayersSummary);
export type SiteDataLayersResponse = z.infer<typeof SiteDataLayersResponse>;
