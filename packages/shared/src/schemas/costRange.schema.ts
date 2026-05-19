/**
 * CostRange — the canonical money shape across OLOS.
 *
 * Promoted to a shared schema for Sub-project D3 (budget/cost tracking on the
 * WorkItem spine). The financial-modeling engine convention is that every
 * monetary value is a band, never a single point estimate
 * (`wiki/concepts/financial-model.md`). `export.schema.ts` re-imports this
 * **byte-identically** — the shape stays plain `z.number()` (NOT
 * `.nonnegative()`) because cashflow bands (`netCashflow`,
 * `cumulativeCashflow`) are legitimately negative; constraining here would
 * regress existing export consumers.
 *
 * Covenant (D3, binding): this is strictly project cost/budget tracking. No
 * cost-of-capital, financing, advance-purchase, investor/equity, or
 * yield-as-return semantics attach to this type — those stay in
 * Scholar-gated Sub-project C.
 */

import { z } from 'zod';

export const CostRangeSchema = z.object({
  low: z.number(),
  mid: z.number(),
  high: z.number(),
});

export type CostRange = z.infer<typeof CostRangeSchema>;
