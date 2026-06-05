/**
 * polyfaceFollowerMath — pure follower-herd sequencing for the rotation
 * sequencer.
 *
 * S3 of the B3 sequencer-fidelity slices. The core move calendar models one
 * paddock = one move (a single herd). But `MultiSpeciesPlannerCard` already
 * *detects* the Salatin polyface stack — cattle break the canopy, a
 * small-ruminant tier cleans up forbs, and a mobile sanitizer flock follows
 * "3–4 days behind" to break parasite cycles and spread dung. This module
 * lifts that ecological ordering into derived **follower moves**: when a
 * paddock's assigned species span more than one niche tier, the trailing
 * tiers enter the SAME paddock a few days behind the lead herd.
 *
 * Purely additive and non-schema: follower moves are derived from the
 * existing `species[]` and the lead's `MoveCalendarEntry`; no store, no
 * migration. Strictly ecological — no financial framing.
 */

import type { LivestockSpecies } from '../../store/livestockStore.js';
import type { MoveCalendarEntry } from './rotationSequenceMath.js';

/**
 * Salatin sanitation window — a follower tier trails the tier ahead of it by
 * this many days ("3–4 days behind" per the MultiSpeciesPlannerCard
 * provenance; 3 is the conservative floor).
 */
export const FOLLOWER_LAG_DAYS = 3;

/** Grazing-niche tiers, lead → follower order. Specialists never follow. */
type FollowerNiche = 'grazer' | 'mixed' | 'browser' | 'mobile';

/**
 * Lead→follower niche ordering. Mirrors `MultiSpeciesPlannerCard`'s `NICHE`
 * map; the Salatin stack runs grazer → small-ruminant (mixed/browser) →
 * mobile sanitizer. `specialist` species (bees, rabbits) are not grazing
 * followers and are excluded from the stack entirely.
 */
const NICHE_OF: Partial<Record<LivestockSpecies, FollowerNiche>> = {
  cattle: 'grazer',
  horses: 'grazer',
  sheep: 'mixed',
  goats: 'browser',
  pigs: 'mobile',
  poultry: 'mobile',
  ducks_geese: 'mobile',
  // rabbits + bees → specialist (omitted: not part of a grazing follower stack)
};

/** Tier order index; lower grazes first. */
const TIER_ORDER: FollowerNiche[] = ['grazer', 'mixed', 'browser', 'mobile'];

export interface FollowerMove {
  cellGroup: string;
  leadPaddockId: string;
  leadPaddockName: string;
  sequenceOrder: number;
  /** 1-based follower index (tier 1 = first follower behind the lead). */
  tierIndex: number;
  species: LivestockSpecies[];
  moveInDateISO: string;
  moveOutDateISO: string;
  grazeDays: number;
  /** Days behind the lead's move-in (`tierIndex × FOLLOWER_LAG_DAYS`). */
  lagDays: number;
}

/** Add `days` to a yyyy-mm-dd string using UTC math; returns yyyy-mm-dd. */
function addDaysISO(iso: string, days: number): string {
  const ms = Date.parse(`${iso}T00:00:00.000Z`);
  return new Date(ms + days * 86_400_000).toISOString().slice(0, 10);
}

/**
 * Group a paddock's species into ordered niche tiers (lead first). Species
 * sharing a niche collapse into one tier; specialists are dropped. A paddock
 * with a single tier (or only specialists) has NO follower stack — the
 * sequencer behaves exactly as before for it.
 *
 * @returns ordered tiers, e.g. cattle+sheep+poultry → [[cattle],[sheep],[poultry]]
 */
export function computeFollowerTiers(
  species: LivestockSpecies[],
): LivestockSpecies[][] {
  const byNiche = new Map<FollowerNiche, LivestockSpecies[]>();
  for (const sp of species) {
    const niche = NICHE_OF[sp];
    if (!niche) continue; // specialist or unknown — not a grazing follower
    const list = byNiche.get(niche) ?? [];
    list.push(sp);
    byNiche.set(niche, list);
  }
  const tiers: LivestockSpecies[][] = [];
  for (const niche of TIER_ORDER) {
    const list = byNiche.get(niche);
    if (list && list.length > 0) tiers.push(list);
  }
  return tiers;
}

/**
 * Derive the follower moves trailing a single lead move. For each follower
 * tier `k ≥ 1`, a move enters the same paddock for the lead's graze duration,
 * `k × FOLLOWER_LAG_DAYS` after the lead moved in. A lead with fewer than two
 * tiers yields no followers.
 */
export function computeFollowerMoves(
  leadEntry: MoveCalendarEntry,
  tiers: LivestockSpecies[][],
): FollowerMove[] {
  if (tiers.length < 2) return [];
  const out: FollowerMove[] = [];
  for (let k = 1; k < tiers.length; k++) {
    const lagDays = k * FOLLOWER_LAG_DAYS;
    const moveInDateISO = addDaysISO(leadEntry.moveInDateISO, lagDays);
    const moveOutDateISO = addDaysISO(moveInDateISO, leadEntry.grazeDays);
    out.push({
      cellGroup: leadEntry.cellGroup,
      leadPaddockId: leadEntry.paddockId,
      leadPaddockName: leadEntry.paddockName,
      sequenceOrder: leadEntry.sequenceOrder,
      tierIndex: k,
      species: tiers[k]!,
      moveInDateISO,
      moveOutDateISO,
      grazeDays: leadEntry.grazeDays,
      lagDays,
    });
  }
  return out;
}

/**
 * Convenience: derive every follower move across a full move calendar, using
 * each paddock's species to detect its tier stack.
 *
 * @param speciesByPaddockId lookup of a paddock's assigned species
 */
export function computeAllFollowerMoves(
  calendar: MoveCalendarEntry[],
  speciesByPaddockId: Map<string, LivestockSpecies[]>,
): FollowerMove[] {
  const out: FollowerMove[] = [];
  for (const entry of calendar) {
    const species = speciesByPaddockId.get(entry.paddockId) ?? [];
    const tiers = computeFollowerTiers(species);
    out.push(...computeFollowerMoves(entry, tiers));
  }
  return out;
}
