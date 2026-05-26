// stewardshipRoutine.schema.ts
//
// StewardshipRoutine — the cadenced, recurring work that keeps a Domain
// healthy after the initial Act tasks complete. Each routine binds to a
// project + domain + optional location, references the checklist items
// that drive each cycle, and declares its review cycle.

import { z } from 'zod';
import { UniversalDomain } from '../universalDomain.schema.js';
import { GeoJSONGeometrySchema } from './geometry.schema.js';

export const StewardshipFrequency = z.enum([
  'daily',
  'weekly',
  'biweekly',
  'monthly',
  'quarterly',
  'seasonal',
  'annual',
  'on-trigger',
]);
export type StewardshipFrequency = z.infer<typeof StewardshipFrequency>;

export const StewardshipMonitoringRequirementSchema = z.object({
  id: z.string().min(1),
  description: z.string().min(1),
  metric: z.string().optional(),
  threshold: z.string().optional(),
});
export type StewardshipMonitoringRequirement = z.infer<
  typeof StewardshipMonitoringRequirementSchema
>;

export const StewardshipRoutineSchema = z.object({
  id: z.string().min(1),
  projectId: z.string().min(1),
  domainId: UniversalDomain,
  title: z.string().min(1),
  locationGeometry: GeoJSONGeometrySchema.optional(),
  frequency: StewardshipFrequency,
  stewardRoleId: z.string().optional(),
  checklistItemIds: z.array(z.string()).default([]),
  monitoringRequirements: z
    .array(StewardshipMonitoringRequirementSchema)
    .default([]),
  reviewCycle: z.string().optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime().optional(),
});
export type StewardshipRoutine = z.infer<typeof StewardshipRoutineSchema>;
