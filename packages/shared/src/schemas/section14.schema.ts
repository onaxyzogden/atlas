import { z } from 'zod';
import { sectionResponse } from './sectionResponse.js';

// Section 14 — Moontrance Vision Layer & Concept Overlay
//
// Concept-overlay roll-up: which Moontrance pillars are referenced
// by the project and how many concept notes are attached.

export const MoontranceVisionSummary = z.object({
  pillarCount: z.number().int().nonnegative(),
  conceptNoteCount: z.number().int().nonnegative(),
  pillars: z.array(z.string()),
});
export type MoontranceVisionSummary = z.infer<typeof MoontranceVisionSummary>;

export const MoontranceVisionResponse = sectionResponse(MoontranceVisionSummary);
export type MoontranceVisionResponse = z.infer<typeof MoontranceVisionResponse>;
