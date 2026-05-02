import { z } from 'zod';
import { sectionResponse } from './sectionResponse.js';

// Section 4 — Site Assessment & Diagnostic Atlas
//
// Aggregate completeness signal for the Atlas (sections 2..7 land
// here). Used by the V3 Diagnose page header to decide between "ready
// to design" and "still gathering data".

export const SiteAssessmentSummary = z.object({
  totalSections: z.number().int().nonnegative(),
  completedSections: z.number().int().nonnegative(),
  pendingSections: z.array(z.string()),
  lastUpdatedAt: z.string().datetime().nullable(),
});
export type SiteAssessmentSummary = z.infer<typeof SiteAssessmentSummary>;

export const SiteAssessmentResponse = sectionResponse(SiteAssessmentSummary);
export type SiteAssessmentResponse = z.infer<typeof SiteAssessmentResponse>;
