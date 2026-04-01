import { z } from 'zod';

export const ConfidenceLevel = z.enum(['high', 'medium', 'low']);
export type ConfidenceLevel = z.infer<typeof ConfidenceLevel>;

// Mixin applied to every object that carries an analysis result.
// This makes uncertainty structural — not a feature someone has to remember to add.
export const WithConfidence = z.object({
  confidence: ConfidenceLevel,
  dataSources: z.array(z.string()),
  computedAt: z.string().datetime(),
});
export type WithConfidence = z.infer<typeof WithConfidence>;
