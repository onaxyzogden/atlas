/**
 * compostYieldMath — Sub-project B2.1, pure compost projections.
 *
 * Two design-time projections, deterministic, no React / no store
 * import (mirrors `soilFoodWebMath.ts`):
 *
 *   1. `aggregateCN` + the GREENS/BROWNS catalog — extracted verbatim
 *      from `SoilResourcesCard.tsx` so the C:N maths has one home and a
 *      colocated test (the card had none). The card now imports these;
 *      its rendered numbers are unchanged by construction.
 *   2. `estimateYield` — projected finished-compost volume from raw
 *      feedstock × the method's documented `volumeRetention`. Coarse
 *      heuristic, never lab-grade.
 *
 * Covenant: "yield" here is *compost volume*, never financial return —
 * no riba/gharar/CSRA/salam/investor/financing/cost-of-capital framing.
 *
 * Sources (unchanged from SoilResourcesCard): Cornell Waste Management
 * Institute C:N table; USDA; Mollison B. *Permaculture Designer's
 * Manual* ch.8; Holmgren D. P6 *Produce No Waste*.
 */

import {
  COMPOST_METHOD_SPEC,
} from './compostMethodSpec.js';
import type { CompostMethod } from '../../../../store/compostCycleStore.js';

export interface Feedstock {
  id: string;
  name: string;
  /** Reference C:N ratio (coarse field figure, not a lab value). */
  cn: number;
  note?: string;
}

// Coarse reference C:N ratios. Cornell + USDA tables. These are the
// figures stewards quote in the field — "20:1 grass clippings, 80:1
// straw" — not the lab values you'd find in a soil-science journal.
export const GREENS: Feedstock[] = [
  { id: 'green-kitchen',        name: 'Kitchen scraps (fruit, veg)',    cn: 15, note: 'Bury or cover — exposed scraps attract pests.' },
  { id: 'green-grass',          name: 'Fresh grass clippings',          cn: 20, note: 'Heats fast; spread thin or it will mat & go anaerobic.' },
  { id: 'green-coffee',         name: 'Coffee grounds',                 cn: 20, note: 'Mildly acidic; great worm food.' },
  { id: 'green-manure-cow',     name: 'Cow / horse manure (fresh)',     cn: 20, note: 'Compost ≥ 90 days before food-crop contact.' },
  { id: 'green-manure-poultry', name: 'Poultry manure (fresh)',         cn: 10, note: 'Hot — pair with high-C bedding (straw / wood shavings).' },
  { id: 'green-comfrey',        name: 'Comfrey / nettle (chop & drop)', cn: 10, note: 'Dynamic accumulator — high-K leachate.' },
  { id: 'green-cover-crop',     name: 'Cover crop (turned in green)',   cn: 18, note: 'Legume mixes 12–18:1; grass mixes higher.' },
  { id: 'green-seaweed',        name: 'Seaweed / kelp',                 cn: 19, note: 'Rinse to drop salt; trace minerals + cytokinins.' },
];

export const BROWNS: Feedstock[] = [
  { id: 'brown-leaves',         name: 'Dry autumn leaves',              cn: 60,  note: 'Shred — whole leaves mat and exclude oxygen.' },
  { id: 'brown-straw',          name: 'Straw (wheat, oat, rice)',       cn: 80,  note: 'Fluffy bulking agent; check for herbicide residue.' },
  { id: 'brown-woodchip',       name: 'Wood chips (deciduous)',         cn: 400, note: 'Slow; better as path / sheet-mulch top dressing.' },
  { id: 'brown-sawdust',        name: 'Sawdust (untreated)',            cn: 500, note: 'Use sparingly — locks up N if uncomposted.' },
  { id: 'brown-cardboard',      name: 'Cardboard / paper (shredded)',   cn: 350, note: 'Strip tape and glossy print; sheet-mulch base layer.' },
  { id: 'brown-pine-needles',   name: 'Pine needles',                   cn: 80,  note: 'Acidic — pair with wood ash or use for blueberries.' },
  { id: 'brown-corn-stalks',    name: 'Corn / sunflower stalks',        cn: 75,  note: 'Chop fine; otherwise composts over multiple seasons.' },
  { id: 'brown-spent-mushroom', name: 'Spent mushroom substrate',       cn: 30,  note: 'Borderline — counts as brown when fresh, green when leached.' },
];

/** Coarse — enough to weight ratios in the right direction. */
export const DENSITY_KG_PER_M3 = 200;

export interface CNAggregate {
  totalC: number;
  totalN: number;
  /** Mass-weighted aggregate C:N; 0 when nothing logged. */
  ratio: number;
  greenCount: number;
  brownCount: number;
}

/**
 * Mass-weighted aggregate C:N over a `{ feedstockId → m³ }` inventory.
 *
 * Extracted verbatim from `SoilResourcesCard.tsx`: for a feedstock with
 * ratio r, C-fraction ≈ r/(r+1), N-fraction ≈ 1/(r+1); aggregate C:N =
 * ΣC/ΣN. Density is constant across feedstocks (200 kg/m³) so it
 * cancels, but it is kept explicit for a future per-feedstock-density
 * refinement.
 */
export function aggregateCN(inventory: Record<string, number>): CNAggregate {
  let totalC = 0;
  let totalN = 0;
  for (const f of GREENS) {
    const v = inventory[f.id] ?? 0;
    if (v <= 0) continue;
    const m = v * DENSITY_KG_PER_M3;
    totalC += m * (f.cn / (f.cn + 1));
    totalN += m * (1 / (f.cn + 1));
  }
  for (const f of BROWNS) {
    const v = inventory[f.id] ?? 0;
    if (v <= 0) continue;
    const m = v * DENSITY_KG_PER_M3;
    totalC += m * (f.cn / (f.cn + 1));
    totalN += m * (1 / (f.cn + 1));
  }
  const ratio = totalN > 0 ? totalC / totalN : 0;
  const greenCount = GREENS.filter((f) => (inventory[f.id] ?? 0) > 0).length;
  const brownCount = BROWNS.filter((f) => (inventory[f.id] ?? 0) > 0).length;
  return { totalC, totalN, ratio, greenCount, brownCount };
}

/** Total inventoried feedstock volume (m³); ignores ≤ 0 entries. */
export function projectInventoryVolumeM3(
  inventory: Record<string, number>,
): number {
  let sum = 0;
  for (const v of Object.values(inventory)) {
    if (v > 0) sum += v;
  }
  return sum;
}

export interface YieldEstimate {
  method: CompostMethod;
  feedstockM3: number;
  /** Projected finished volume (raw × method retention), rounded coarse. */
  finishedM3: number;
  retentionPct: number;
}

/**
 * Projected finished-compost volume from raw feedstock. Documented
 * heuristic only (`COMPOST_METHOD_SPEC[method].volumeRetention`) — not a
 * lab assay; surface it with that caveat.
 */
export function estimateYield(
  method: CompostMethod,
  feedstockM3: number,
): YieldEstimate {
  const retention = COMPOST_METHOD_SPEC[method].volumeRetention;
  const raw = feedstockM3 > 0 ? feedstockM3 : 0;
  const finishedM3 = Math.round(raw * retention * 100) / 100;
  return {
    method,
    feedstockM3: raw,
    finishedM3,
    retentionPct: Math.round(retention * 100),
  };
}
