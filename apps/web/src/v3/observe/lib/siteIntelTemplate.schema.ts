/**
 * Zod schemas for the Site Intelligence import template. Validation is
 * lenient on unknown summary fields (we strip `__hint_*` and pass the rest
 * through `normalizeSummary` at apply time) but strict on top-level shape:
 * unknown layer types and unknown top-level keys are rejected.
 */

import { z } from 'zod';
import { TIER1_IMPORT_LAYERS, PROJECT_NOTE_KEYS } from './siteIntelTemplate.js';

const ConfidenceSchema = z.enum(['high', 'medium', 'low']);

const DateLikeSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'dataDate must be YYYY-MM-DD')
  .nullable();

export const TemplateLayerEntrySchema = z
  .object({
    include: z.boolean(),
    confidence: ConfidenceSchema,
    dataDate: DateLikeSchema,
    attribution: z.string(),
    summary: z.record(z.unknown()),
  })
  .superRefine((entry, ctx) => {
    if (!entry.include) return;
    if (!entry.attribution.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['attribution'],
        message: 'attribution is required when include=true',
      });
    }
    if (!entry.dataDate) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['dataDate'],
        message: 'dataDate is required when include=true',
      });
    }
  });

const layersShape = TIER1_IMPORT_LAYERS.reduce(
  (acc, key) => {
    acc[key] = TemplateLayerEntrySchema;
    return acc;
  },
  {} as Record<(typeof TIER1_IMPORT_LAYERS)[number], typeof TemplateLayerEntrySchema>,
);

export const LayersSchema = z.object(layersShape).strict();

const projectNotesShape = PROJECT_NOTE_KEYS.reduce(
  (acc, key) => {
    acc[key] = z.union([z.string(), z.number(), z.null()]);
    return acc;
  },
  {} as Record<(typeof PROJECT_NOTE_KEYS)[number], z.ZodType>,
);

export const ProjectNotesSchema = z.object(projectNotesShape).strict();

export const MetaSchema = z
  .object({
    schemaVersion: z.number(),
    projectId: z.string(),
    projectName: z.string(),
    country: z.string(),
    units: z.enum(['metric', 'imperial']),
    generatedAt: z.string(),
  })
  .passthrough();

export const SiteIntelTemplateSchema = z
  .object({
    __meta: MetaSchema,
    __instructions: z.array(z.string()).optional(),
    projectNotes: ProjectNotesSchema,
    layers: LayersSchema,
  })
  .strict();

export type SiteIntelTemplateParsed = z.infer<typeof SiteIntelTemplateSchema>;
