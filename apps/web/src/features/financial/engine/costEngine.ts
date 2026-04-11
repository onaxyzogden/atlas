/**
 * Cost engine — pure functions that compute cost line items
 * from placed design features and regional benchmarks.
 *
 * All outputs are estimates. Each CostLineItem includes
 * explicit assumptions describing how the estimate was derived.
 */

import type { AllFeaturesInput, CostLineItem, CostRange, CostRegion, SiteContext } from './types.js';
import { costRange } from './types.js';
import { getCostBenchmarks } from './costDatabase.js';
import { STRUCTURE_TEMPLATES } from '../../structures/footprints.js';

const M2_PER_ACRE = 4047;

// ── Zone Costs ──

const ZERO_COST_ZONES = new Set(['access', 'buffer', 'future_expansion']);

export function computeZoneCosts(
  zones: AllFeaturesInput['zones'],
  region: CostRegion,
): CostLineItem[] {
  const benchmarks = getCostBenchmarks(region);
  const items: CostLineItem[] = [];

  for (const zone of zones) {
    if (ZERO_COST_ZONES.has(zone.category)) continue;

    const benchmark = benchmarks.zones[zone.category];
    if (!benchmark) continue;

    const acres = zone.areaM2 / M2_PER_ACRE;
    const cost: CostRange = {
      low: Math.round(acres * benchmark.costPerAcre.low),
      mid: Math.round(acres * benchmark.costPerAcre.mid),
      high: Math.round(acres * benchmark.costPerAcre.high),
    };

    items.push({
      id: `zone-${zone.id}`,
      name: `${zone.name} — Land Preparation`,
      sourceType: 'zone',
      sourceId: zone.id,
      category: 'Land Preparation',
      phase: zone.phase ?? '',
      phaseName: zone.phase || 'Phase 1',
      cost,
      confidence: 'low',
      assumptions: [
        `${acres.toFixed(1)} acres × $${benchmark.costPerAcre.low.toLocaleString()}-$${benchmark.costPerAcre.high.toLocaleString()}/acre`,
        benchmark.description,
        `Regional benchmark: ${region}`,
      ],
      unitCost: { amount: benchmark.costPerAcre.mid, unit: 'per acre', quantity: Math.round(acres * 10) / 10 },
    });
  }

  return items;
}

// ── Structure Costs ──

export function computeStructureCosts(
  structures: AllFeaturesInput['structures'],
  region: CostRegion,
): CostLineItem[] {
  const benchmarks = getCostBenchmarks(region);
  const mult = benchmarks.structureMultiplier;
  const items: CostLineItem[] = [];

  for (const struct of structures) {
    const tmpl = STRUCTURE_TEMPLATES[struct.type];
    if (!tmpl) continue;

    const [low, high] = tmpl.costRange;
    const cost: CostRange = {
      low: Math.round(low * mult),
      mid: Math.round(((low + high) / 2) * mult),
      high: Math.round(high * mult),
    };

    items.push({
      id: `structure-${struct.id}`,
      name: `${struct.name || tmpl.label}`,
      sourceType: 'structure',
      sourceId: struct.id,
      category: 'Structures',
      phase: struct.phase,
      phaseName: struct.phase || 'Unassigned',
      cost,
      confidence: 'medium',
      assumptions: [
        `${tmpl.label} base cost: $${low.toLocaleString()}-$${high.toLocaleString()}`,
        mult !== 1 ? `Regional multiplier: ${mult}x (${region})` : `Base region: ${region}`,
        tmpl.infrastructureReqs.length > 0
          ? `Requires: ${tmpl.infrastructureReqs.join(', ')}`
          : 'No infrastructure requirements',
      ],
    });
  }

  return items;
}

// ── Fencing Costs (from paddocks) ──

export function computeFencingCosts(
  paddocks: AllFeaturesInput['paddocks'],
  region: CostRegion,
): CostLineItem[] {
  const benchmarks = getCostBenchmarks(region);
  const items: CostLineItem[] = [];

  for (const paddock of paddocks) {
    const benchmark = benchmarks.fencing[paddock.fencing];
    if (!benchmark || paddock.fencing === 'none') continue;

    // Approximate perimeter from area (square assumption)
    const perimeterM = 4 * Math.sqrt(paddock.areaM2);
    const cost: CostRange = {
      low: Math.round(perimeterM * benchmark.costPerMetre.low),
      mid: Math.round(perimeterM * benchmark.costPerMetre.mid),
      high: Math.round(perimeterM * benchmark.costPerMetre.high),
    };

    items.push({
      id: `fencing-${paddock.id}`,
      name: `${paddock.name} — Fencing`,
      sourceType: 'paddock',
      sourceId: paddock.id,
      category: 'Agricultural',
      phase: paddock.phase,
      phaseName: paddock.phase || 'Unassigned',
      cost,
      confidence: 'medium',
      assumptions: [
        `Perimeter ~${Math.round(perimeterM)}m (estimated from ${(paddock.areaM2 / M2_PER_ACRE).toFixed(1)} acre area)`,
        `${paddock.fencing} fencing @ $${benchmark.costPerMetre.low}-$${benchmark.costPerMetre.high}/m`,
        'Perimeter estimated assuming rectangular paddock shape',
      ],
      unitCost: { amount: benchmark.costPerMetre.mid, unit: 'per metre', quantity: Math.round(perimeterM) },
    });
  }

  return items;
}

// ── Path Costs ──

export function computePathCosts(
  paths: AllFeaturesInput['paths'],
  siteContext: SiteContext,
  region: CostRegion,
): CostLineItem[] {
  const benchmarks = getCostBenchmarks(region);
  const items: CostLineItem[] = [];

  // Slope difficulty multiplier: flat terrain (<=5 deg) = 1.0x, steep = up to 1.5x
  const slopeFactor = Math.min(1.5, 1 + 0.02 * Math.max(0, siteContext.meanSlopeDeg - 5));

  for (const path of paths) {
    const benchmark = benchmarks.paths[path.type];
    if (!benchmark) continue;

    const cost: CostRange = {
      low: Math.round(path.lengthM * benchmark.costPerMetre.low * slopeFactor),
      mid: Math.round(path.lengthM * benchmark.costPerMetre.mid * slopeFactor),
      high: Math.round(path.lengthM * benchmark.costPerMetre.high * slopeFactor),
    };

    const assumptions = [
      `${Math.round(path.lengthM)}m × $${benchmark.costPerMetre.low}-$${benchmark.costPerMetre.high}/m`,
    ];
    if (slopeFactor > 1.0) {
      assumptions.push(`Slope difficulty factor: ${slopeFactor.toFixed(2)}x (site avg ${siteContext.meanSlopeDeg.toFixed(1)} deg)`);
    }

    items.push({
      id: `path-${path.id}`,
      name: `${path.name}`,
      sourceType: 'path',
      sourceId: path.id,
      category: 'Infrastructure',
      phase: path.phase,
      phaseName: path.phase || 'Unassigned',
      cost,
      confidence: 'medium',
      assumptions,
      unitCost: { amount: Math.round(benchmark.costPerMetre.mid * slopeFactor), unit: 'per metre', quantity: Math.round(path.lengthM) },
    });
  }

  return items;
}

// ── Utility Costs ──

export function computeUtilityCosts(
  utilities: AllFeaturesInput['utilities'],
  region: CostRegion,
): CostLineItem[] {
  const benchmarks = getCostBenchmarks(region);
  const items: CostLineItem[] = [];

  for (const util of utilities) {
    const benchmark = benchmarks.utilities[util.type];
    if (!benchmark) continue;

    items.push({
      id: `utility-${util.id}`,
      name: `${util.name}`,
      sourceType: 'utility',
      sourceId: util.id,
      category: 'Infrastructure',
      phase: util.phase,
      phaseName: util.phase || 'Unassigned',
      cost: { ...benchmark.systemCost },
      confidence: 'medium',
      assumptions: [
        `System cost estimate: $${benchmark.systemCost.low.toLocaleString()}-$${benchmark.systemCost.high.toLocaleString()}`,
        `Regional benchmark: ${region}`,
      ],
    });
  }

  return items;
}

// ── Crop Establishment Costs ──

export function computeCropCosts(
  crops: AllFeaturesInput['crops'],
  region: CostRegion,
): CostLineItem[] {
  const benchmarks = getCostBenchmarks(region);
  const items: CostLineItem[] = [];

  for (const crop of crops) {
    const benchmark = benchmarks.crops[crop.type];
    if (!benchmark) continue;

    const acres = crop.areaM2 / M2_PER_ACRE;
    const cost: CostRange = {
      low: Math.round(acres * benchmark.establishmentPerAcre.low),
      mid: Math.round(acres * benchmark.establishmentPerAcre.mid),
      high: Math.round(acres * benchmark.establishmentPerAcre.high),
    };

    items.push({
      id: `crop-${crop.id}`,
      name: `${crop.name} — Establishment`,
      sourceType: 'crop',
      sourceId: crop.id,
      category: 'Agricultural',
      phase: crop.phase,
      phaseName: crop.phase || 'Unassigned',
      cost,
      confidence: 'medium',
      assumptions: [
        `${acres.toFixed(1)} acres × $${benchmark.establishmentPerAcre.low.toLocaleString()}-$${benchmark.establishmentPerAcre.high.toLocaleString()}/acre`,
        `Regional benchmark: ${region}`,
      ],
      unitCost: { amount: benchmark.establishmentPerAcre.mid, unit: 'per acre', quantity: Math.round(acres * 10) / 10 },
    });
  }

  return items;
}

// ── Aggregate All Costs ──

export function computeAllCosts(
  input: AllFeaturesInput,
  region: CostRegion,
  siteContext: SiteContext,
): CostLineItem[] {
  return [
    ...computeZoneCosts(input.zones, region),
    ...computeStructureCosts(input.structures, region),
    ...computeFencingCosts(input.paddocks, region),
    ...computePathCosts(input.paths, siteContext, region),
    ...computeUtilityCosts(input.utilities, region),
    ...computeCropCosts(input.crops, region),
  ];
}

// ── Helpers ──

export function sumCosts(items: CostLineItem[]): CostRange {
  return items.reduce(
    (acc, item) => ({
      low: acc.low + item.cost.low,
      mid: acc.mid + item.cost.mid,
      high: acc.high + item.cost.high,
    }),
    costRange(0, 0),
  );
}

export function applyOverrides(
  items: CostLineItem[],
  overrides: Record<string, Partial<CostRange>>,
): CostLineItem[] {
  if (Object.keys(overrides).length === 0) return items;
  return items.map((item) => {
    const ov = overrides[item.id];
    if (!ov) return item;
    return { ...item, cost: { ...item.cost, ...ov } };
  });
}
