import { z } from 'zod';
import { Country, ProjectType, ProjectMetadata } from './project.schema.js';

/**
 * TemplateSnapshotDesignFeature — design feature stored with centroid-normalized
 * relative geometry. Instantiation translates `relativeGeometry` by the visitor's
 * project centroid via PostGIS `ST_Translate(geom, visitorCx, visitorCy)`. The
 * relative geometry was captured at snapshot time as
 * `ST_Translate(orig, -sourceCx, -sourceCy)`, so its centroid is (0,0).
 */
export const TemplateSnapshotDesignFeature = z.object({
  name: z.string(),
  kind: z.string(),
  relativeGeometry: z.unknown(),
  properties: z.record(z.unknown()).nullable().optional(),
});
export type TemplateSnapshotDesignFeature = z.infer<
  typeof TemplateSnapshotDesignFeature
>;

/**
 * TemplateSnapshotRegenerationEvent — regeneration event with a date offset
 * from Y0 (project creation). Instantiation sets
 * `event_date = newProject.created_at + (relativeDateDays * interval '1 day')`.
 */
export const TemplateSnapshotRegenerationEvent = z.object({
  relativeDateDays: z.number().int(),
  phase: z.string().nullable().optional(),
  eventType: z.string(),
  title: z.string(),
  description: z.string().nullable().optional(),
  observations: z.record(z.unknown()).nullable().optional(),
  parentRelativeIndex: z.number().int().nullable().optional(),
});
export type TemplateSnapshotRegenerationEvent = z.infer<
  typeof TemplateSnapshotRegenerationEvent
>;

/**
 * TemplateSnapshotRelationship — edge between two design features, referenced
 * by feature `name` (not id). The instantiation handler builds a name→id map
 * from the freshly-inserted design_features rows and resolves these edges.
 */
export const TemplateSnapshotRelationship = z.object({
  sourceName: z.string(),
  targetName: z.string(),
  kind: z.string(),
  notes: z.string().nullable().optional(),
});
export type TemplateSnapshotRelationship = z.infer<
  typeof TemplateSnapshotRelationship
>;

/**
 * TemplateSnapshot — everything needed to re-create a project from a template.
 *
 * Excludes files, assessments, pipeline state, members — those are derived
 * per-instance. Boundary is the GeoJSON FeatureCollection the wizard stored;
 * instantiation re-runs the boundary setter so PostGIS derives centroid +
 * acreage from scratch.
 *
 * Phase 4 (2026-05-21) extended with optional deep-snapshot fields:
 * `designFeatures`, `regenerationEvents`, `projectRelationships`. These carry
 * the Three Streams (and any future ecosystem-template) canon forward into a
 * cloned project; geometries are centroid-normalized so they translate to the
 * visitor's parcel, and event dates are offsets from project Y0.
 *
 * `projectLayers` and `siteAssessment` are intentionally NOT snapshotted —
 * they are parcel-driven and must be (re)computed from the visitor's actual
 * adapter pulls and scores.
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
  // Phase 4 deep-snapshot additions (all optional for backward compatibility
  // with existing shallow templates produced by `POST /templates`):
  designFeatures: z.array(TemplateSnapshotDesignFeature).optional(),
  regenerationEvents: z.array(TemplateSnapshotRegenerationEvent).optional(),
  projectRelationships: z.array(TemplateSnapshotRelationship).optional(),
});
export type TemplateSnapshot = z.infer<typeof TemplateSnapshot>;

export const CreateTemplateInput = z.object({
  name: z.string().min(1).max(200),
  sourceProjectId: z.string().uuid(),
});
export type CreateTemplateInput = z.infer<typeof CreateTemplateInput>;

export const InstantiateTemplateInput = z.object({
  name: z.string().min(1).max(200),
  parcelBoundaryGeojson: z.unknown().nullable().optional(),
  // Phase 4.5 — explicit workspace attach for the new project. When omitted,
  // the server resolves the caller's oldest owner-role membership (the
  // personal default org created at register-time by Prong 1).
  orgId: z.string().uuid().optional(),
});
export type InstantiateTemplateInput = z.infer<typeof InstantiateTemplateInput>;

export const TemplateSummary = z.object({
  id: z.string().uuid(),
  ownerId: z.string().uuid(),
  name: z.string(),
  sourceProjectId: z.string().uuid().nullable(),
  slug: z.string().nullable().optional(),
  public: z.boolean().optional(),
  createdAt: z.string().datetime(),
});
export type TemplateSummary = z.infer<typeof TemplateSummary>;
