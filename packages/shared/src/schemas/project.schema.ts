import { z } from 'zod';

// 'INTL' is the catch-all bucket for projects outside US/CA coverage.
// Adapter registry routes INTL → NasaPowerAdapter for climate; other Tier-1
// layers fall through to ManualFlagAdapter until a global source is wired.
// DB CHECK constraint (migration 011) enforces this enum at the storage layer.
export const Country = z.enum(['US', 'CA', 'INTL']);
export type Country = z.infer<typeof Country>;

export const ProjectStatus = z.enum(['active', 'archived', 'shared', 'candidate']);

/**
 * Long-tail property metadata captured by the intake wizard.
 *
 * Stored as a single `projects.metadata` jsonb column (migration 012).
 * Shape is validated here at the application boundary; the DB does not
 * enforce it. Promote any field to a dedicated column once query
 * patterns demand indexing or FKs.
 */
/**
 * Free-text soil observations captured by the intake wizard before a
 * site visit. These sit alongside (not instead of) SSURGO / SoilGrids
 * adapter output — the dashboard surfaces both, clearly labelled.
 */
export const SoilNotes = z.object({
  ph: z.string().max(200).optional(),
  organicMatter: z.string().max(200).optional(),
  compaction: z.string().max(500).optional(),
  biologicalActivity: z.string().max(500).optional(),
}).strict();
export type SoilNotes = z.infer<typeof SoilNotes>;

export const ProjectMetadata = z.object({
  climateRegion: z.string().max(100).optional(),
  bioregion: z.string().max(100).optional(),
  county: z.string().max(100).optional(),
  legalDescription: z.string().max(2000).optional(),
  fieldObservations: z.string().max(5000).optional(),
  restrictionsCovenants: z.string().max(2000).optional(),
  mapProjection: z.string().max(50).optional(),
  soilNotes: SoilNotes.optional(),
  centerLat: z.number().min(-90).max(90).optional(),
  centerLng: z.number().min(-180).max(180).optional(),
}).strict();
export type ProjectMetadata = z.infer<typeof ProjectMetadata>;

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
  metadata: ProjectMetadata.optional(),
});
export type CreateProjectInput = z.infer<typeof CreateProjectInput>;

export const UpdateProjectInput = CreateProjectInput.partial().extend({
  parcelBoundaryGeojson: z.unknown().optional(), // GeoJSON MultiPolygon
  ownerNotes: z.string().max(5000).optional(),
  zoningNotes: z.string().max(2000).optional(),
  accessNotes: z.string().max(2000).optional(),
  waterRightsNotes: z.string().max(2000).optional(),
  metadata: ProjectMetadata.optional(),
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
  candidateOf: z.string().uuid().nullable().optional(),
  // Builtin sample project flag (migration 017). Read-only for every
  // account; the system user is the sole owner.
  isBuiltin: z.boolean().default(false),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type ProjectSummary = z.infer<typeof ProjectSummary>;
