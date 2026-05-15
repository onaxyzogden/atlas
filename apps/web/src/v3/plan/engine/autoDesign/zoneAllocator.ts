/**
 * zoneAllocator — pure function mapping one selected intervention to a
 * list of zone allocations.
 *
 * Scoring: each candidate zone earns +1 per `preferred*` list it
 * matches (categories, succession, ground cover, ring band).
 * `avoidedCategories` is a hard veto. Zones outside an explicit
 * `permacultureRingRange` are vetoed when both the rule and the zone's
 * ring are present. Ties broken by area (largest first), then zoneId
 * ascending for full determinism.
 *
 * Allocation is greedy: walk the sorted candidates, taking as much of
 * each zone's area as the remaining acreage budget needs, clamped to
 * the zone's own area. Stops once the budget is met or candidates run
 * out (partial allocation is returned — the caller decides).
 *
 * Spec: wiki/decisions/2026-05-14-auto-design-pipeline.md.
 */

import type { Intervention } from '../../data/goalCompassTypes.js';
import { ACRE_M2, type AllocatorZone, type ZoneAllocation } from './types.js';

interface ScoredZone {
  zone: AllocatorZone;
  score: number;
}

function scoreZone(
  zone: AllocatorZone,
  affinity: NonNullable<Intervention['zoneAffinity']>,
): number | null {
  if (affinity.avoidedCategories?.includes(zone.category)) return null;

  if (affinity.permacultureRingRange && zone.permacultureZone != null) {
    const [min, max] = affinity.permacultureRingRange;
    if (zone.permacultureZone < min || zone.permacultureZone > max) return null;
  }

  let score = 0;
  if (affinity.preferredCategories?.includes(zone.category)) score += 1;
  if (
    zone.successionStage &&
    affinity.preferredSuccession?.includes(zone.successionStage)
  ) {
    score += 1;
  }
  if (
    zone.groundCover &&
    affinity.preferredGroundCover?.includes(zone.groundCover)
  ) {
    score += 1;
  }
  if (
    affinity.permacultureRingRange &&
    zone.permacultureZone != null &&
    zone.permacultureZone >= affinity.permacultureRingRange[0] &&
    zone.permacultureZone <= affinity.permacultureRingRange[1]
  ) {
    score += 1;
  }
  return score;
}

export function allocateZones(
  intervention: Intervention,
  zones: AllocatorZone[],
  acresNeeded: number,
): ZoneAllocation[] {
  const affinity = intervention.zoneAffinity;
  // No affinity declared → no zone preference; caller falls back to
  // free placement inside the parcel. Return empty allocation.
  if (!affinity) return [];

  const scored: ScoredZone[] = [];
  for (const zone of zones) {
    const score = scoreZone(zone, affinity);
    if (score == null) continue; // hard veto
    scored.push({ zone, score });
  }

  scored.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    if (b.zone.areaM2 !== a.zone.areaM2) return b.zone.areaM2 - a.zone.areaM2;
    return a.zone.id < b.zone.id ? -1 : a.zone.id > b.zone.id ? 1 : 0;
  });

  let budgetM2 = Math.max(0, acresNeeded) * ACRE_M2;
  const out: ZoneAllocation[] = [];
  for (const { zone, score } of scored) {
    if (budgetM2 <= 0) break;
    const take = Math.min(budgetM2, zone.areaM2);
    if (take <= 0) continue;
    out.push({ zoneId: zone.id, areaM2: take, score });
    budgetM2 -= take;
  }
  return out;
}
