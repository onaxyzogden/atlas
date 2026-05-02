import { z } from 'zod';
import { sectionResponse } from './sectionResponse.js';

// Section 22 — Economic Planning & Business Modeling
//
// Capex/opex roll-up and the projected payback window the economic
// modeling processor surfaces on the Prove page.

export const EconomicModelingSummary = z.object({
  capexUsd: z.number().nonnegative(),
  annualOpexUsd: z.number().nonnegative(),
  annualRevenueUsd: z.number().nonnegative(),
  paybackYears: z.number().nullable(),
  currency: z.string(),
});
export type EconomicModelingSummary = z.infer<typeof EconomicModelingSummary>;

export const EconomicModelingResponse = sectionResponse(EconomicModelingSummary);
export type EconomicModelingResponse = z.infer<typeof EconomicModelingResponse>;
