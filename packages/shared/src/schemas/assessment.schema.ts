import { z } from 'zod';
import { WithConfidence } from './confidence.schema.js';

export const AssessmentFlagCategory = z.enum([
  'agriculture',
  'conservation',
  'development',
  'regulatory',
  'climate',
]);
export type AssessmentFlagCategory = z.infer<typeof AssessmentFlagCategory>;

export const AssessmentFlag = z.object({
  id: z.string(),
  type: z.enum(['risk', 'opportunity', 'limitation', 'site_visit_required', 'data_gap']),
  severity: z.enum(['info', 'warning', 'critical']),
  category: AssessmentFlagCategory,
  message: z.string(),
  layerSource: z.string().optional(),
  priority: z.number().int().min(0).max(100).default(50),
  country: z.enum(['US', 'CA', 'all']).default('all'),
  needsSiteVisit: z.boolean().default(false),
});
export type AssessmentFlag = z.infer<typeof AssessmentFlag>;

export const ScoreCard = WithConfidence.extend({
  score: z.number().min(0).max(100),
  label: z.string(),
  breakdown: z.record(z.number()).optional(),
});
export type ScoreCard = z.infer<typeof ScoreCard>;

export const SiteAssessment = WithConfidence.extend({
  id: z.string().uuid(),
  projectId: z.string().uuid(),
  version: z.number().int().positive(),
  isCurrent: z.boolean(),
  suitability: ScoreCard,
  buildability: ScoreCard,
  waterResilience: ScoreCard,
  agriculturalPotential: ScoreCard,
  overallScore: z.number().min(0).max(100),
  flags: z.array(AssessmentFlag),
  needsSiteVisit: z.boolean(),
});
export type SiteAssessment = z.infer<typeof SiteAssessment>;

// Phase 3 stub — AI outputs conform to this shape.
// ClaudeClient fills this in Phase 3; frontend components already built against it.
export const AIOutput = WithConfidence.extend({
  outputId: z.string().uuid(),
  projectId: z.string().uuid(),
  outputType: z.enum([
    'site_narrative',
    'design_recommendation',
    'risk_flag',
    'planting_guide',
    'investor_summary',
    'design_brief',
  ]),
  content: z.string(),
  caveat: z.string().optional(),
  needsSiteVisit: z.boolean(),
  generatedAt: z.string().datetime(),
  modelId: z.string(),
  userRating: z.enum(['helpful', 'not_helpful']).optional(),
});
export type AIOutput = z.infer<typeof AIOutput>;

// Phase 3 — AI enrichment of assessment flags
export const AIEnrichmentRequest = z.object({
  projectId: z.string().uuid(),
  flags: z.array(AssessmentFlag),
  layerSummaries: z.record(z.record(z.unknown())),
  country: z.enum(['US', 'CA']),
});
export type AIEnrichmentRequest = z.infer<typeof AIEnrichmentRequest>;

export const EnrichedAssessmentFlag = AssessmentFlag.extend({
  aiNarrative: z.string().optional(),
  aiConfidence: z.enum(['high', 'medium', 'low']).optional(),
});
export type EnrichedAssessmentFlag = z.infer<typeof EnrichedAssessmentFlag>;

export const AIEnrichmentResponse = z.object({
  enrichedFlags: z.array(EnrichedAssessmentFlag),
  siteSynthesis: z.string().optional(),
  generatedAt: z.string().datetime(),
  modelId: z.string(),
});
export type AIEnrichmentResponse = z.infer<typeof AIEnrichmentResponse>;
