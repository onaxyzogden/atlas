// compostPile.schema.ts
//
// CompostPile — one compost batch and its Plan-stage payload. Mirrors the
// PLAN_RECIPE shape in the compost prototype: dimensions, target C:N ratio,
// target moisture and temperature band, a layered feedstock recipe, a build
// checklist, and the tiered planning objectives.
//
// A pile belongs to a CompostSite (schemas/compost/compostSite.schema.ts)
// and is scoped to an org + owner for sharing via the existing RBAC model.
// Its readings live in CompostReading (compostReading.schema.ts).
//
// This vertical is intentionally NOT part of the land-use project taxonomy
// (ProjectTypeId / objective catalogues / 7 strata): a pile is a batch
// instrument, not a parcel. Temperatures are canonical Celsius.

import { z } from 'zod';

export const CompostPileStatus = z.enum([
  'planning',
  'building',
  'active',
  'curing',
  'complete',
]);
export type CompostPileStatus = z.infer<typeof CompostPileStatus>;

export const CompostLayerType = z.enum([
  'brown', // carbon-rich
  'green', // nitrogen-rich
]);
export type CompostLayerType = z.infer<typeof CompostLayerType>;

export const CompostLayerStatus = z.enum([
  'pending',
  'complete',
]);
export type CompostLayerStatus = z.infer<typeof CompostLayerStatus>;

export const CompostRecipeLayerSchema = z.object({
  id: z.string().min(1),
  type: CompostLayerType,
  name: z.string().min(1),
  depth: z.string().optional(), // free text e.g. "4 in"
  cnApprox: z.number().positive().optional(),
  status: CompostLayerStatus.default('pending'),
});
export type CompostRecipeLayer = z.infer<typeof CompostRecipeLayerSchema>;

export const CompostChecklistItemSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  done: z.boolean().default(false),
});
export type CompostChecklistItem = z.infer<typeof CompostChecklistItemSchema>;

export const CompostObjectiveStatus = z.enum([
  'locked',
  'available',
  'complete',
]);
export type CompostObjectiveStatus = z.infer<typeof CompostObjectiveStatus>;

export const CompostPlanObjectiveSchema = z.object({
  id: z.string().min(1),
  tier: z.number().int().min(0),
  title: z.string().min(1),
  status: CompostObjectiveStatus.default('locked'),
  gate: z.string().optional(),
});
export type CompostPlanObjective = z.infer<typeof CompostPlanObjectiveSchema>;

export const CompostDimensionsSchema = z.object({
  lengthFt: z.number().positive(),
  widthFt: z.number().positive(),
  heightFt: z.number().positive(),
});
export type CompostDimensions = z.infer<typeof CompostDimensionsSchema>;

export const CompostPileSchema = z.object({
  id: z.string().min(1),
  siteId: z.string().min(1),
  orgId: z.string().min(1),
  ownerId: z.string().optional(),
  name: z.string().min(1),
  cycleLabel: z.string().optional(),
  status: CompostPileStatus.default('planning'),
  dimensions: CompostDimensionsSchema.optional(),
  targetCnRatio: z.number().positive().optional(),
  targetMoisturePct: z.number().min(0).max(100).optional(),
  targetTempMinC: z.number().optional(),
  targetTempMaxC: z.number().optional(),
  recipeLayers: z.array(CompostRecipeLayerSchema).default([]),
  buildChecklist: z.array(CompostChecklistItemSchema).default([]),
  objectives: z.array(CompostPlanObjectiveSchema).default([]),
});
export type CompostPile = z.infer<typeof CompostPileSchema>;
