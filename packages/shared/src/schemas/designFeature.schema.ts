/**
 * Design feature schemas — zones, structures, and other drawn features
 * stored in the design_features table.
 */

import { z } from 'zod';

export const DesignFeatureType = z.enum(['zone', 'structure', 'path', 'point', 'annotation']);
export type DesignFeatureType = z.infer<typeof DesignFeatureType>;

export const CreateDesignFeatureInput = z.object({
  featureType: DesignFeatureType,
  subtype: z.string().max(100).optional(),
  geometry: z.unknown(),
  label: z.string().max(200).optional(),
  properties: z.record(z.unknown()).default({}),
  phaseTag: z.string().max(20).optional(),
  style: z.record(z.unknown()).optional(),
  sortOrder: z.number().int().default(0),
});
export type CreateDesignFeatureInput = z.infer<typeof CreateDesignFeatureInput>;

export const UpdateDesignFeatureInput = z.object({
  subtype: z.string().max(100).optional(),
  geometry: z.unknown().optional(),
  label: z.string().max(200).optional(),
  properties: z.record(z.unknown()).optional(),
  phaseTag: z.string().max(20).optional(),
  style: z.record(z.unknown()).optional(),
  sortOrder: z.number().int().optional(),
});
export type UpdateDesignFeatureInput = z.infer<typeof UpdateDesignFeatureInput>;

export const DesignFeatureSummary = z.object({
  id: z.string().uuid(),
  projectId: z.string().uuid(),
  featureType: DesignFeatureType,
  subtype: z.string().nullable(),
  geometry: z.unknown(),
  label: z.string().nullable(),
  properties: z.record(z.unknown()),
  phaseTag: z.string().nullable(),
  style: z.record(z.unknown()).nullable(),
  sortOrder: z.number().int(),
  createdBy: z.string().uuid().nullable(),
  createdAt: z.string().datetime({ offset: true }),
  updatedAt: z.string().datetime({ offset: true }),
});
export type DesignFeatureSummary = z.infer<typeof DesignFeatureSummary>;
