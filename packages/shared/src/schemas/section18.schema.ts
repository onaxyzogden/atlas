import { z } from 'zod';
import { sectionResponse } from './sectionResponse.js';

// Section 18 — AI-Assisted Design Support
//
// Counts of AI-generated suggestions and how many a steward has
// accepted. Per-suggestion content rides on the AI suggestion feed.

export const AiDesignSupportSummary = z.object({
  suggestionCount: z.number().int().nonnegative(),
  acceptedCount: z.number().int().nonnegative(),
  pendingCount: z.number().int().nonnegative(),
  lastGeneratedAt: z.string().datetime().nullable(),
});
export type AiDesignSupportSummary = z.infer<typeof AiDesignSupportSummary>;

export const AiDesignSupportResponse = sectionResponse(AiDesignSupportSummary);
export type AiDesignSupportResponse = z.infer<typeof AiDesignSupportResponse>;
