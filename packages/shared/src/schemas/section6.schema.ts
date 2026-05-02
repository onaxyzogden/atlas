import { z } from 'zod';
import { sectionResponse } from './sectionResponse.js';

// Section 6 — Solar, Wind & Climate Analysis
//
// Climate envelope used by the Diagnose page to surface headline
// macroclimate signals (precip, growing season, frost-free window).
// Per-station detail rides on the layer endpoints; this projection
// only captures the rolled-up summary the section processor emits.

export const ClimateAnalysisSummary = z.object({
  annualPrecipMm: z.number().nullable(),
  growingDegreeDays: z.number().nullable(),
  frostFreeDays: z.number().int().nullable(),
  hardinessZone: z.string().nullable(),
});
export type ClimateAnalysisSummary = z.infer<typeof ClimateAnalysisSummary>;

export const ClimateAnalysisResponse = sectionResponse(ClimateAnalysisSummary);
export type ClimateAnalysisResponse = z.infer<typeof ClimateAnalysisResponse>;
