import { z } from 'zod';

// 'INTL' is the catch-all bucket for projects outside US/CA coverage.
// Adapter registry routes INTL → NasaPowerAdapter for climate; other Tier-1
// layers fall through to ManualFlagAdapter until a global source is wired.
// DB CHECK constraint (migration 011) enforces this enum at the storage layer.
export const Country = z.enum(['US', 'CA', 'INTL']);
export type Country = z.infer<typeof Country>;

export const ProjectStatus = z.enum(['active', 'archived', 'shared']);

export const ProjectType = z.enum([
  'regenerative_farm',
  'retreat_center',
  'homestead',
  'educational_farm',
  'conservation',
  'multi_enterprise',
  'moontrance',       // OGDEN identity template
]);

export const CreateProjectInput = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  address: z.string().max(500).optional(),
  parcelId: z.string().max(100).optional(),
  projectType: ProjectType.optional(),
  country: Country.default('US'),
  provinceState: z.string().max(10).optional(),
  units: z.enum(['metric', 'imperial']).default('metric'),
});
export type CreateProjectInput = z.infer<typeof CreateProjectInput>;

export const UpdateProjectInput = CreateProjectInput.partial().extend({
  parcelBoundaryGeojson: z.unknown().optional(), // GeoJSON MultiPolygon
  ownerNotes: z.string().max(5000).optional(),
  zoningNotes: z.string().max(2000).optional(),
  accessNotes: z.string().max(2000).optional(),
  waterRightsNotes: z.string().max(2000).optional(),
});
export type UpdateProjectInput = z.infer<typeof UpdateProjectInput>;

export const ProjectSummary = z.object({
  id: z.string().uuid(),
  name: z.string(),
  description: z.string().nullable(),
  status: ProjectStatus,
  projectType: ProjectType.nullable(),
  country: Country,
  provinceState: z.string().nullable(),
  conservationAuthId: z.string().nullable(),
  address: z.string().nullable(),
  parcelId: z.string().nullable(),
  acreage: z.number().nullable(),
  dataCompletenessScore: z.number().nullable(),
  hasParcelBoundary: z.boolean(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type ProjectSummary = z.infer<typeof ProjectSummary>;
