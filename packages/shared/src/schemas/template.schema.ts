import { z } from 'zod';
import { Country, ProjectType, ProjectMetadata } from './project.schema.js';

/**
 * TemplateSnapshot — everything needed to re-create a project from a template.
 *
 * Excludes files, assessments, pipeline state, members — those are derived
 * per-instance. Boundary is the GeoJSON FeatureCollection the wizard stored;
 * instantiation re-runs the boundary setter so PostGIS derives centroid +
 * acreage from scratch.
 */
export const TemplateSnapshot = z.object({
  name: z.string().max(200),
  description: z.string().max(2000).nullable(),
  projectType: ProjectType.nullable(),
  country: Country,
  provinceState: z.string().max(10).nullable(),
  units: z.enum(['metric', 'imperial']),
  metadata: ProjectMetadata,
  ownerNotes: z.string().nullable(),
  zoningNotes: z.string().nullable(),
  accessNotes: z.string().nullable(),
  waterRightsNotes: z.string().nullable(),
  parcelBoundaryGeojson: z.unknown().nullable(),
});
export type TemplateSnapshot = z.infer<typeof TemplateSnapshot>;

export const CreateTemplateInput = z.object({
  name: z.string().min(1).max(200),
  sourceProjectId: z.string().uuid(),
});
export type CreateTemplateInput = z.infer<typeof CreateTemplateInput>;

export const InstantiateTemplateInput = z.object({
  name: z.string().min(1).max(200),
});
export type InstantiateTemplateInput = z.infer<typeof InstantiateTemplateInput>;

export const TemplateSummary = z.object({
  id: z.string().uuid(),
  ownerId: z.string().uuid(),
  name: z.string(),
  sourceProjectId: z.string().uuid().nullable(),
  createdAt: z.string().datetime(),
});
export type TemplateSummary = z.infer<typeof TemplateSummary>;
