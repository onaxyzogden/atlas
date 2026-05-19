/**
 * compostMethodSpec — Sub-project B2.1, compost-method heuristic table.
 *
 * Static B2-owned per-method spec — the way `soilBiologyProfiles.ts`
 * owns the species soil-biology table and B1's checker owns the
 * companion bridge. CompostCycleCard's old single-string `METHOD_HINT`
 * carried no machine-readable bands; this table is the structured
 * source the spec-driven hint and the yield model both read.
 *
 * Values are documented field heuristics (Cornell Waste Management
 * Institute composting table; Mollison B. *Permaculture Designer's
 * Manual* ch.8) — coarse design bands, never lab-grade. `volumeRetention`
 * is finished-volume retained per unit raw feedstock. No false
 * precision: integers / bands / one heuristic note per method.
 *
 * Covenant: this is compost volume, not financial return — no
 * riba/gharar/CSRA/salam/investor/financing/cost-of-capital framing.
 */

import type { CompostMethod } from '../../../../store/compostCycleStore.js';

export interface CompostMethodSpec {
  /** Ideal feedstock C:N band for this method. */
  cnTargetLow: number;
  cnTargetHigh: number;
  /** Turn cadence in days; `null` = no turning required. */
  turnEveryDays: number | null;
  /** Expected time to finished/cured. */
  cureWeeksLow: number;
  cureWeeksHigh: number;
  /** Working temperature band (°C); `null` = ambient / not temp-driven. */
  tempCLow: number | null;
  tempCHigh: number | null;
  /** Finished-volume retained per unit raw feedstock (0..1). */
  volumeRetention: number;
  /** One-line steward heuristic. */
  note: string;
}

export const COMPOST_METHOD_SPEC: Record<CompostMethod, CompostMethodSpec> = {
  hot: {
    cnTargetLow: 25,
    cnTargetHigh: 35,
    turnEveryDays: 7,
    cureWeeksLow: 6,
    cureWeeksHigh: 10,
    tempCLow: 55,
    tempCHigh: 65,
    volumeRetention: 0.45,
    note: 'Thermophilic: build ≥ 1 m³ at 25–35:1, turn weekly, ready ≈ 8 weeks; ≈ 45% of raw volume survives as finished compost.',
  },
  cold: {
    cnTargetLow: 25,
    cnTargetHigh: 50,
    turnEveryDays: null,
    cureWeeksLow: 26,
    cureWeeksHigh: 52,
    tempCLow: null,
    tempCHigh: null,
    volumeRetention: 0.5,
    note: 'Slow / no turning: tolerant of a wider C:N, ready ≈ 6–12 months; ≈ 50% of raw volume retained (less microbial burn-off than hot).',
  },
  vermicompost: {
    cnTargetLow: 20,
    cnTargetHigh: 30,
    turnEveryDays: null,
    cureWeeksLow: 10,
    cureWeeksHigh: 16,
    tempCLow: 15,
    tempCHigh: 25,
    volumeRetention: 0.3,
    note: 'Worm castings: no turning, keep 15–25 °C, harvest ≈ 12 weeks; ≈ 30% of feed is recovered as dense castings.',
  },
  compost_tea: {
    cnTargetLow: 20,
    cnTargetHigh: 35,
    turnEveryDays: null,
    cureWeeksLow: 0,
    cureWeeksHigh: 1,
    tempCLow: 18,
    tempCHigh: 25,
    volumeRetention: 0.9,
    note: 'Aerated extract, not a solid amendment: brew 24–48 h with aeration, use within hours — retention is brew liquid, not comparable to solid compost.',
  },
};
