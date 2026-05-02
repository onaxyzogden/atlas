import { z } from 'zod';
import { sectionResponse } from './sectionResponse.js';

// Section 19 — Educational & Interpretive Layer
//
// Counts of interpretive stops and educational artifacts authored
// for visitor experience.

export const EducationInterpretiveSummary = z.object({
  stopCount: z.number().int().nonnegative(),
  artifactCount: z.number().int().nonnegative(),
  topicTags: z.array(z.string()),
});
export type EducationInterpretiveSummary = z.infer<typeof EducationInterpretiveSummary>;

export const EducationInterpretiveResponse = sectionResponse(EducationInterpretiveSummary);
export type EducationInterpretiveResponse = z.infer<typeof EducationInterpretiveResponse>;
