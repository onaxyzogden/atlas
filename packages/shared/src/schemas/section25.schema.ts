import { z } from 'zod';
import { sectionResponse } from './sectionResponse.js';

// Section 25 — Template System & Reusable Design Frameworks
//
// Counts of templates applied to a project and how many remain
// available. Per-template detail rides on the template endpoint.

export const ReusableFrameworksSummary = z.object({
  appliedTemplateCount: z.number().int().nonnegative(),
  availableTemplateCount: z.number().int().nonnegative(),
  templateKinds: z.array(z.string()),
});
export type ReusableFrameworksSummary = z.infer<typeof ReusableFrameworksSummary>;

export const ReusableFrameworksResponse = sectionResponse(ReusableFrameworksSummary);
export type ReusableFrameworksResponse = z.infer<typeof ReusableFrameworksResponse>;
