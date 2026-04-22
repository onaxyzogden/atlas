/**
 * Regional cost database facade.
 *
 * Two base regions carry real (or explicitly-placeholder) data:
 *   • US Midwest   → regionalCosts/US_MIDWEST.ts
 *   • Ontario, CA  → regionalCosts/CA_ONTARIO.ts
 *
 * Every cost row carries a `source` block with either a public citation
 * (NRCS EQIP, USDA NASS, OMAFRA, OSCIA, NREL, NRCan, UVM Ext, etc.) or an
 * explicit `citation: null` + `confidence: 'low'` + `note` declaring it a
 * placeholder. This is audit §6.10's "cite or leave null" contract.
 *
 * Other regions derive from US Midwest via REGION_MULTIPLIERS. Citations
 * are inherited from US Midwest with an added "adjusted ×N for region" note
 * at call time (see applyMultiplier).
 */

import type { CostRegion, RegionalCostBenchmarks, CostSource } from './types.js';
import { US_MIDWEST } from './regionalCosts/US_MIDWEST.js';
import { CA_ONTARIO } from './regionalCosts/CA_ONTARIO.js';

// ── Regional Multipliers (relative to US Midwest) ──

const REGION_MULTIPLIERS: Record<CostRegion, number> = {
  'us-midwest':   1.00,
  'us-northeast': 1.15,
  'us-southeast': 0.90,
  'us-west':      1.25,
  'ca-ontario':   1.20,
  'ca-bc':        1.30,
  'ca-prairies':  1.10,
};

// ── Public API ──

const BENCHMARKS_CACHE = new Map<CostRegion, RegionalCostBenchmarks>();

export function getCostBenchmarks(region: CostRegion): RegionalCostBenchmarks {
  if (region === 'us-midwest') return US_MIDWEST;
  if (region === 'ca-ontario') return CA_ONTARIO;

  let cached = BENCHMARKS_CACHE.get(region);
  if (!cached) {
    cached = applyMultiplier(US_MIDWEST, REGION_MULTIPLIERS[region], region);
    BENCHMARKS_CACHE.set(region, cached);
  }
  return cached;
}

// ── Helpers ──

function applyCostRangeMultiplier(cr: { low: number; mid: number; high: number }, mult: number) {
  return {
    low:  Math.round(cr.low  * mult),
    mid:  Math.round(cr.mid  * mult),
    high: Math.round(cr.high * mult),
  };
}

/**
 * Decorate an inherited source with the multiplier note so downstream callers
 * know the value was derived rather than primary-sourced for the region.
 */
function adjustSource(src: CostSource | undefined, mult: number, region: CostRegion): CostSource {
  const suffix = ` (adjusted ×${mult.toFixed(2)} for ${region})`;
  if (!src) return { citation: null, year: null, confidence: 'low', note: `placeholder — derived from US Midwest × ${mult.toFixed(2)}` };
  return {
    citation: src.citation ? `${src.citation}${suffix}` : null,
    year: src.year,
    // Derived regions are at most 'medium' confidence — multiplier is coarse.
    confidence: src.confidence === 'high' ? 'medium' : src.confidence,
    note: src.note ? `${src.note}; derived ×${mult.toFixed(2)} for ${region}` : `derived ×${mult.toFixed(2)} from US Midwest`,
  };
}

function applyMultiplier(
  base: RegionalCostBenchmarks,
  mult: number,
  region: CostRegion,
): RegionalCostBenchmarks {
  const zones: RegionalCostBenchmarks['zones'] = {};
  for (const [k, v] of Object.entries(base.zones)) {
    zones[k as keyof typeof base.zones] = {
      costPerAcre: applyCostRangeMultiplier(v!.costPerAcre, mult),
      description: v!.description,
      source: adjustSource(v!.source, mult, region),
    };
  }

  const fencing = {} as RegionalCostBenchmarks['fencing'];
  for (const [k, v] of Object.entries(base.fencing)) {
    fencing[k as keyof typeof base.fencing] = {
      costPerMetre: applyCostRangeMultiplier(v.costPerMetre, mult),
      source: adjustSource(v.source, mult, region),
    };
  }

  const paths = {} as RegionalCostBenchmarks['paths'];
  for (const [k, v] of Object.entries(base.paths)) {
    paths[k as keyof typeof base.paths] = {
      costPerMetre: applyCostRangeMultiplier(v.costPerMetre, mult),
      source: adjustSource(v.source, mult, region),
    };
  }

  const utilities = {} as RegionalCostBenchmarks['utilities'];
  for (const [k, v] of Object.entries(base.utilities)) {
    utilities[k as keyof typeof base.utilities] = {
      systemCost: applyCostRangeMultiplier(v.systemCost, mult),
      source: adjustSource(v.source, mult, region),
    };
  }

  const crops = {} as RegionalCostBenchmarks['crops'];
  for (const [k, v] of Object.entries(base.crops)) {
    crops[k as keyof typeof base.crops] = {
      establishmentPerAcre: applyCostRangeMultiplier(v.establishmentPerAcre, mult),
      source: adjustSource(v.source, mult, region),
    };
  }

  return { zones, fencing, paths, utilities, crops, structureMultiplier: mult };
}

// Re-exports for direct access to base regions (used by tests + audit reports).
export { US_MIDWEST, CA_ONTARIO };
