// compostSite.schema.ts
//
// CompostSite — a physical location where one or more compost piles live.
// For city composters this is often a remote plot they cannot visit daily.
//
// Deliberately lightweight geo: a single pinned point (lat/long), NOT the
// parcel-boundary polygon machinery the land-use project types carry. A site
// is owned by a user and scoped to an org so the existing membership/RBAC
// model can share it across a community without any new auth surface.

import { z } from 'zod';

export const CompostSitePointSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
});
export type CompostSitePoint = z.infer<typeof CompostSitePointSchema>;

export const CompostSiteSchema = z.object({
  id: z.string().min(1),
  orgId: z.string().min(1),
  ownerId: z.string().optional(),
  name: z.string().min(1),
  label: z.string().optional(),
  location: CompostSitePointSchema.optional(),
  address: z.string().optional(),
});
export type CompostSite = z.infer<typeof CompostSiteSchema>;
