/**
 * pollinatorHabitat — read-side heuristic synthesizing native planting
 * and pollinator habitat signals from already-computed layer summaries.
 *
 * Pure function; no I/O, no schema dependency, no scoring-component
 * participation (kept out of `computeScores.ts` on purpose so the
 * verify-scoring-parity invariants stay untouched).
 *
 * Inputs:
 *   - LandCoverSummary (classes distribution, tree_canopy_pct)
 *   - WetlandsFloodSummary (wetland_pct, riparian_buffer_m)
 *   - ecoregionId (optional): CEC Level III id from `lookupEcoregion`.
 *     When present, plant recommendations are pulled from the curated
 *     ecoregion list; when absent, falls back to habitat-class regex.
 *   - corridorReadiness (optional): 0-1 index from the
 *     PollinatorOpportunityProcessor's patch-graph connectivity pass.
 *     When present, drives `connectivityBand`; when absent, band is
 *     'unknown' and the corridor caveat remains in the output.
 *
 * Output shape is rendered verbatim by the §7 EcologicalDashboard
 * "Native Planting & Pollinator Habitat" section — keep the types
 * dashboard-friendly (bands, not raw decimals).
 *
 * Explicitly out of scope (still deferred):
 *   - Raster least-cost-path on a true habitat-friction surface. The
 *     vector patch-graph connectivity driven by `corridorReadiness` is
 *     a coarser approximation; see PollinatorOpportunityProcessor.
 *   - GBIF species richness uplift (producer not merged in main yet;
 *     consumer exists in computeScores but falls back to 0).
 */

import type { LandCoverSummary, WetlandsFloodSummary } from '../scoring/layerSummary.js';
import type { EcoregionId, PollinatorPlant } from './ecoregion.js';
import { getEcoregion, plantsForEcoregion } from './ecoregion.js';

export type HabitatBand = 'low' | 'moderate' | 'high';
export type CanopyBand = 'none' | 'sparse' | 'edge_sweet_spot' | 'closed';
export type ConnectivityBand = 'isolated' | 'fragmented' | 'connected' | 'unknown';

export interface PollinatorHabitatResult {
  /** 0-100 composite; see weights below. */
  suitabilityScore: number;
  suitabilityBand: HabitatBand;
  /** Sum of %-cover across pollinator-supportive classes. */
  supportiveCoverPct: number;
  /** Sum of %-cover across cover types that limit pollinator value (intensive crop, impervious). */
  limitingCoverPct: number;
  canopyBand: CanopyBand;
  /** 0-25. Bonus earned from wetland cover + riparian-buffer presence. */
  wetlandEdgeBonus: number;
  /** Habitat-class-keyed native plant category suggestions. Order preserved.
   *  Used as a dashboard-friendly fallback line when ecoregion curation is
   *  missing; always populated. */
  nativePlantCategories: string[];
  /** CEC Level III ecoregion (if resolved) that the curated plant list
   *  was drawn from. `null` when coverage didn't include the site. */
  ecoregion: { id: EcoregionId; name: string } | null;
  /** Curated native pollinator plants for the resolved ecoregion. Empty
   *  array when no ecoregion resolved — callers should then render
   *  `nativePlantCategories` instead. */
  ecoregionPlants: PollinatorPlant[];
  /** Patch-graph corridor readiness ('connected' / 'fragmented' /
   *  'isolated'). 'unknown' when no corridor readiness was supplied. */
  connectivityBand: ConnectivityBand;
  /** Honest limitations of this heuristic. Always non-empty. */
  caveats: string[];
}

// Supportive class weights (0-1). Keys are NLCD/AAFC/WorldCover class names
// as they arrive in LandCoverSummary.classes. Source attribution:
// grassland/shrubland/pasture as foundational pollinator habitat —
// Xerces Society "Pollinator Plants" regional guides + USDA NRCS CP-42
// Pollinator Habitat scoping. Forest weights reflect edge-habitat value.
//
// Exported so PollinatorOpportunityProcessor can re-use the same weights
// when scoring per-patch habitat quality without duplicating the table.
export const POLLINATOR_SUPPORTIVE_WEIGHTS: Record<string, number> = {
  'Grassland/Herbaceous': 1.0,
  'Grassland': 1.0,
  'Herbaceous Wetlands': 1.0,
  'Shrub/Scrub': 1.0,
  'Shrubland': 1.0,
  'Hay/Pasture': 0.9,
  'Pasture': 0.9,
  'Hedgerow': 1.0,
  'Orchard': 0.9,
  'Vineyard': 0.7,
  'Deciduous Forest': 0.7,
  'Mixed Forest': 0.7,
  'Evergreen Forest': 0.4,
  'Forest': 0.6,
  'Woody Wetlands': 0.9,
  'Wetland': 0.9,
  'Wetlands': 0.9,
  'Developed, Open Space': 0.5,
  'Barren Land': 0.15,
};

// Limiting weights (penalty multiplier on the raw cover pct).
// Intensive cropland + impervious reduce pollinator value but do not
// fully negate it (edge effects persist), hence 0.5 / 0.8.
export const POLLINATOR_LIMITING_WEIGHTS: Record<string, number> = {
  'Cultivated Crops': 0.5,
  'Annual Crops': 0.5,
  'Crops': 0.5,
  'Developed, Low Intensity': 0.6,
  'Developed, Medium Intensity': 0.8,
  'Developed, High Intensity': 1.0,
  'Open Water': 0.25, // Not limiting to pollinators, but displaces vegetation.
  'Perennial Ice/Snow': 1.0,
};

function canopyBandFor(canopyPct: number | null | undefined): CanopyBand {
  if (canopyPct == null || canopyPct < 5) return 'none';
  if (canopyPct < 10) return 'sparse';
  if (canopyPct <= 60) return 'edge_sweet_spot';
  return 'closed';
}

function hasRiparianBuffer(v: WetlandsFloodSummary['riparian_buffer_m']): boolean {
  if (v == null) return false;
  if (typeof v === 'number') return v > 0;
  const s = v.trim().toLowerCase();
  if (!s) return false;
  if (s.includes('not detected') || s.includes('none')) return false;
  return true;
}

function recommendCategories(
  classes: Record<string, number>,
  wetlandPct: number | null | undefined,
): string[] {
  const byShare = Object.entries(classes)
    .filter(([, pct]) => pct > 2)
    .sort((a, b) => b[1] - a[1])
    .map(([name]) => name);
  const out: string[] = [];
  const push = (s: string) => { if (!out.includes(s)) out.push(s); };

  for (const name of byShare) {
    if (/grass|herbaceous|shrub|scrub/i.test(name)) {
      push('Warm-season bunch grasses (little bluestem, side-oats grama) + native forb mix (milkweed spp., goldenrod, aster, bergamot)');
    }
    if (/pasture|hay/i.test(name)) {
      push('Native clover + chicory overseed with pollinator strips (phacelia, buckwheat, alfalfa) along fencelines');
    }
    if (/deciduous|mixed forest|^forest$/i.test(name)) {
      push('Understorey shrubs: serviceberry, spicebush, pawpaw, native viburnum — prioritise forest-edge plantings');
    }
    if (/evergreen/i.test(name)) {
      push('Edge-planting mix at conifer margins: native willow, chokecherry, elderberry for early-season nectar');
    }
    if (/wetland|woody wetland|herbaceous wetland/i.test(name)) {
      push('Wetland pollinators: swamp milkweed, joe-pye weed, blue vervain, cardinal flower, native sedges');
    }
    if (/cultivated|annual crops|^crops$/i.test(name)) {
      push('Hedgerow buffer between crop fields: elderberry, viburnum, native dogwood, pollinator strip headlands');
    }
    if (/developed, open/i.test(name)) {
      push('Urban-tolerant natives: aster, black-eyed susan, butterfly weed, coneflower');
    }
    if (/orchard|vineyard/i.test(name)) {
      push('Perennial groundcover between rows: self-heal, white Dutch clover, native phacelia strips');
    }
  }

  if ((wetlandPct ?? 0) > 2 && !out.some((s) => s.startsWith('Wetland pollinators'))) {
    push('Wetland pollinators: swamp milkweed, joe-pye weed, blue vervain, cardinal flower, native sedges');
  }

  if (out.length === 0) {
    push('Insufficient land-cover detail to recommend categories — field survey of existing flora recommended before planting plan');
  }
  return out;
}

function connectivityBandFor(readiness: number | null | undefined): ConnectivityBand {
  if (readiness == null || !Number.isFinite(readiness)) return 'unknown';
  if (readiness >= 0.6) return 'connected';
  if (readiness >= 0.3) return 'fragmented';
  return 'isolated';
}

export function computePollinatorHabitat(input: {
  landCover: LandCoverSummary | null | undefined;
  wetlands: WetlandsFloodSummary | null | undefined;
  /** CEC Level III ecoregion id (from `lookupEcoregion(lat, lng)`). When
   *  supplied, curated ecoregion plant list is returned in addition to
   *  the habitat-class fallback. */
  ecoregionId?: EcoregionId | null | undefined;
  /** 0-1 patch-graph connectivity index from PollinatorOpportunityProcessor.
   *  Drives `connectivityBand` when present. */
  corridorReadiness?: number | null | undefined;
}): PollinatorHabitatResult {
  const lc = input.landCover ?? {};
  const w = input.wetlands ?? {};
  const classes = lc.classes ?? {};

  // --- Cover-supportive component (0-60 pts) ---
  let supportiveRaw = 0;
  let supportivePct = 0;
  for (const [name, pct] of Object.entries(classes)) {
    const weight = POLLINATOR_SUPPORTIVE_WEIGHTS[name];
    if (weight == null) continue;
    supportiveRaw += weight * pct;
    supportivePct += pct;
  }
  let limitingRaw = 0;
  let limitingPct = 0;
  for (const [name, pct] of Object.entries(classes)) {
    const weight = POLLINATOR_LIMITING_WEIGHTS[name];
    if (weight == null) continue;
    limitingRaw += weight * pct;
    limitingPct += pct;
  }
  const coverNet = Math.max(0, supportiveRaw - limitingRaw * 0.5);
  const coverComponent = Math.min(60, (coverNet / 100) * 60);

  // --- Canopy edge-habitat bonus (0-15 pts) ---
  const canopyBand = canopyBandFor(lc.tree_canopy_pct);
  const canopyBonus =
    canopyBand === 'edge_sweet_spot' ? 15
    : canopyBand === 'sparse' ? 8
    : canopyBand === 'closed' ? 4
    : 0;

  // --- Wetland + riparian bonus (0-25 pts) ---
  const wetlandPct = w.wetland_pct ?? 0;
  const wetlandComponent = Math.min(15, wetlandPct * 1.5);
  const riparianComponent = hasRiparianBuffer(w.riparian_buffer_m) ? 10 : 0;
  const wetlandEdgeBonus = Math.min(25, wetlandComponent + riparianComponent);

  const suitabilityScore = Math.min(
    100,
    Math.round(coverComponent + canopyBonus + wetlandEdgeBonus),
  );
  const suitabilityBand: HabitatBand =
    suitabilityScore >= 65 ? 'high'
    : suitabilityScore >= 35 ? 'moderate'
    : 'low';

  // --- Ecoregion plant list (P2 upgrade) ---
  const ecoregionRecord = input.ecoregionId ? getEcoregion(input.ecoregionId) : null;
  const ecoregionPlants = input.ecoregionId ? plantsForEcoregion(input.ecoregionId) : [];

  // --- Corridor connectivity band (P2 upgrade) ---
  const connectivityBand = connectivityBandFor(input.corridorReadiness);

  const caveats: string[] = [];
  if (connectivityBand === 'unknown') {
    caveats.push(
      'Corridor connectivity not computed for this site — run the pollinator-opportunity layer to populate.',
    );
  }
  // Always surface the raster-LCP limitation so users know the connectivity
  // band is a vector patch-graph approximation, not a true friction-raster
  // least-cost-path result.
  caveats.push(
    'Connectivity band reflects vector patch-graph analysis, not raster least-cost-path on a habitat-friction surface — use as a planning prompt, not a definitive corridor map.',
  );
  if (ecoregionPlants.length === 0) {
    caveats.push(
      'No curated ecoregion plant list available for this site — recommendations fall back to habitat-class categories. Cross-check with your local native plant society or USDA PLANTS.',
    );
  } else {
    caveats.push(
      `Plant list curated for CEC Level III ecoregion ${ecoregionRecord?.id ?? input.ecoregionId} (${ecoregionRecord?.name ?? 'unknown'}). Local microsite conditions still govern — field verify before planting.`,
    );
  }
  caveats.push(
    'Field verification of existing floral resources and invasive pressure is recommended before any planting plan.',
  );
  if (Object.keys(classes).length === 0) {
    caveats.unshift(
      'No land-cover class distribution available — run site analysis to populate.',
    );
  }

  return {
    suitabilityScore,
    suitabilityBand,
    supportiveCoverPct: Math.round(supportivePct * 10) / 10,
    limitingCoverPct: Math.round(limitingPct * 10) / 10,
    canopyBand,
    wetlandEdgeBonus,
    nativePlantCategories: recommendCategories(classes, wetlandPct),
    ecoregion: ecoregionRecord ? { id: ecoregionRecord.id, name: ecoregionRecord.name } : null,
    ecoregionPlants,
    connectivityBand,
    caveats,
  };
}
