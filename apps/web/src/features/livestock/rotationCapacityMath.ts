/**
 * rotationCapacityMath — pure rotation-aware carrying-capacity roll-up.
 *
 * B3.1 of Sub-project B. The original B3 decomposition named
 * "animal-integration carrying-capacity" but the only capacity surface
 * shipped was the *static* per-paddock `computeOvergrazingRisk` (planned vs
 * recommended head/ha, no rotation coupling). This module couples
 * animal-unit (AU) grazing demand to the rotation cycle per cell-group.
 *
 * It REUSES — never forks — the canonical pure stocking rule
 * `computePaddockRecommendedStocking` and the `AU_FACTORS` catalog. The
 * result is a coarse planning heuristic, **not** a forage-budget model
 * (no dry-matter intake, no biomass regrowth curve) — same honesty posture
 * as B2.1's compost-yield "not a lab assay" line.
 *
 * Owns no state and reads no store. "Capacity" here is strictly animal-unit
 * grazing load — never a financial or yield-as-return notion.
 */

import type { Paddock } from '../../store/livestockStore.js';
import type { RotationCell, RotationPlan } from './rotationSequenceMath.js';
import { computePaddockRecommendedStocking } from './livestockAnalysis.js';
import { AU_FACTORS } from './speciesData.js';

export interface GroupCapacityRow {
  cellGroup: string;
  paddockCount: number;
  /** One full cycle through the group, honoring each cell's rest floor. */
  cycleDays: number;
  /** Σ planned AU-load × grazeDays across the group's live cells. */
  auDemandDays: number;
  /** Σ recommended AU-load × grazeDays across the group's live cells. */
  auSupplyDays: number;
  /** demand / supply × 100; 0 when supply is 0 (no div-by-zero). */
  utilizationPct: number;
  status: 'ok' | 'tight' | 'over';
}

/** AU-load for `headPerHa` of a paddock's primary species over its area. */
function auLoad(paddock: Paddock, headPerHa: number): number {
  const species = paddock.species[0];
  if (!species || headPerHa <= 0) return 0;
  const areaHa = paddock.areaM2 / 10_000;
  return headPerHa * areaHa * (AU_FACTORS[species] ?? 0);
}

function statusFor(utilizationPct: number): GroupCapacityRow['status'] {
  if (utilizationPct > 110) return 'over';
  if (utilizationPct >= 85) return 'tight';
  return 'ok';
}

/**
 * Per-cell-group rotation-aware carrying-capacity rows. Demand uses each
 * paddock's planned `stockingDensity`; supply uses the canonical
 * `computePaddockRecommendedStocking`. Groups with no live cell are omitted.
 */
export function computeRotationCarryingCapacity(
  paddocks: Paddock[],
  plan: RotationPlan | null,
): GroupCapacityRow[] {
  if (!plan || plan.cells.length === 0) return [];

  const byId = new Map<string, Paddock>();
  for (const p of paddocks) byId.set(p.id, p);

  const groups = new Map<string, RotationCell[]>();
  for (const c of plan.cells) {
    const list = groups.get(c.cellGroup) ?? [];
    list.push(c);
    groups.set(c.cellGroup, list);
  }

  const rows: GroupCapacityRow[] = [];
  for (const [cellGroup, cells] of groups) {
    const live = cells.filter((c) => byId.has(c.paddockId));
    if (live.length === 0) continue;

    const totalGraze = live.reduce((s, c) => s + c.targetGrazeDays, 0);
    // Cycle length must give every cell grazeDays + its honored rest floor.
    const cycleDays = live.reduce(
      (mx, c) => Math.max(mx, c.targetGrazeDays + c.targetRestDays),
      totalGraze,
    );

    let auDemandDays = 0;
    let auSupplyDays = 0;
    for (const c of live) {
      const pad = byId.get(c.paddockId)!;
      const plannedHeadPerHa = pad.stockingDensity ?? 0;
      const recommendedHeadPerHa = computePaddockRecommendedStocking(pad);
      auDemandDays += auLoad(pad, plannedHeadPerHa) * c.targetGrazeDays;
      auSupplyDays += auLoad(pad, recommendedHeadPerHa) * c.targetGrazeDays;
    }

    const utilizationPct =
      auSupplyDays > 0
        ? Math.round((100 * auDemandDays) / auSupplyDays)
        : 0;

    rows.push({
      cellGroup,
      paddockCount: live.length,
      cycleDays,
      auDemandDays: Math.round(auDemandDays * 100) / 100,
      auSupplyDays: Math.round(auSupplyDays * 100) / 100,
      utilizationPct,
      status: statusFor(utilizationPct),
    });
  }

  return rows;
}
