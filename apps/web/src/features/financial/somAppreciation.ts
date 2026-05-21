/**
 * somAppreciation — Phase D.4.
 *
 * Converts a per-year SOM trajectory (tC sequestered) into a cumulative
 * USD natural-capital appreciation series, which renders as the optional
 * secondary axis on `JCurveChart`. Drives the D.1 scenarioStore field
 * `naturalCapitalAppreciationByYear` (producer landed in this slice).
 *
 * Covenant: appreciation of stewarded land value, not investor yield.
 * Labels stay neutral. See [[fiqh-csra-erased-2026-05-04]].
 *
 * Pricing: `USD_PER_TC_DEFAULT = 50` is a mid-range social-cost-of-carbon
 * proxy. D.7 (Capital Partner Summary) will plumb a configurable source;
 * until then, callers may pass `usdPerTc` to override per-call.
 */

/** Mid-range social-cost-of-carbon proxy ($/tonne C). D.7 may override. */
export const USD_PER_TC_DEFAULT = 50;

/** Acres → hectares conversion (1 ac ≈ 0.4047 ha). */
const HECTARES_PER_ACRE = 0.4047;

/** Mirrors the API `SomYearRow` shape from D.3 — kept local to avoid a
 *  cross-package import. The web side never reads this from the same
 *  source as the API; the values arrive over HTTP via apiClient. */
export interface SomYearRow {
  year: number;
  som_stock_tc: number;
  sequestration_tcyr: number;
  j_curve_stage: 'establishment' | 'build-up' | 'maturation';
}

export interface NaturalCapitalAppreciationInput {
  /** D.3 `som_trajectory_yearly` rows for the project (whole-project series). */
  trajectory: SomYearRow[];
  /** Project acreage (acres). Converted to hectares internally. */
  acres: number;
  /** USD per tonne C; defaults to `USD_PER_TC_DEFAULT`. */
  usdPerTc?: number;
}

/**
 * Returns a year → cumulative USD natural-capital appreciation map.
 *
 *   cumulative_y = Σ (sequestration_tcyr × hectares × usdPerTc) for k ≤ y
 *
 * Pre-regen years (`sequestration_tcyr = 0` per D.3) contribute zero, so
 * the cumulative line stays flat at the baseline until the establishment
 * ramp begins. Empty trajectory → empty record.
 */
export function naturalCapitalAppreciationByYear(
  input: NaturalCapitalAppreciationInput,
): Record<number, number> {
  if (input.trajectory.length === 0) return {};

  const hectares = input.acres * HECTARES_PER_ACRE;
  const price = input.usdPerTc ?? USD_PER_TC_DEFAULT;

  const out: Record<number, number> = {};
  let cumulative = 0;
  for (const row of input.trajectory) {
    cumulative += row.sequestration_tcyr * hectares * price;
    out[row.year] = +cumulative.toFixed(2);
  }
  return out;
}
