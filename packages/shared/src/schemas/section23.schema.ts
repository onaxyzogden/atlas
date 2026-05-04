import { z } from 'zod';
import { sectionResponse } from './sectionResponse.js';

// Section 23 — Reporting, Export & Presentation
//
// Counts of generated reports + last export timestamp the Report
// page surfaces in the header.

export const ReportingExportSummary = z.object({
  reportCount: z.number().int().nonnegative(),
  lastExportAt: z.string().datetime().nullable(),
  exportFormats: z.array(z.string()),
});
export type ReportingExportSummary = z.infer<typeof ReportingExportSummary>;

export const ReportingExportResponse = sectionResponse(ReportingExportSummary);
export type ReportingExportResponse = z.infer<typeof ReportingExportResponse>;
