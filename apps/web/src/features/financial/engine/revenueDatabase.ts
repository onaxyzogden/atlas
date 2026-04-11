/**
 * Revenue benchmarks by enterprise type and region.
 *
 * All values are ESTIMATES based on comparable rural operations.
 * Revenue projections are not financial advice.
 */

import type { CostRegion, EnterpriseType, RegionalRevenueBenchmarks, RevenueDrivers } from './types.js';
import { costRange } from './types.js';

// ── US Midwest (base) ──

const US_MIDWEST: RegionalRevenueBenchmarks = {
  enterprises: {
    livestock: {
      unitBasis: 'per hectare of paddock per year',
      annualPerUnit: costRange(800, 2000),
      rampYears: 3,
      rampCurve: [0.25, 0.50, 0.75, 1.0],
      seasonalFactor: true,
      description: 'Livestock sales, breeding stock, fiber/dairy products',
    },
    orchard: {
      unitBasis: 'per acre of orchard per year',
      annualPerUnit: costRange(3000, 8000),
      rampYears: 5,
      rampCurve: [0.0, 0.10, 0.25, 0.50, 0.75, 1.0],
      seasonalFactor: true,
      description: 'Fruit sales, cider, u-pick, value-added products',
    },
    market_garden: {
      unitBasis: 'per acre of garden per year',
      annualPerUnit: costRange(15000, 40000),
      rampYears: 3,
      rampCurve: [0.30, 0.60, 0.85, 1.0],
      seasonalFactor: true,
      description: 'CSA shares, farmers market, direct farm sales',
    },
    retreat: {
      unitBasis: 'per guest cabin per year',
      annualPerUnit: costRange(18000, 35000),
      rampYears: 3,
      rampCurve: [0.25, 0.55, 0.80, 1.0],
      seasonalFactor: false,
      description: 'Nightly accommodation @ $150-$250/night, 50-70% occupancy',
    },
    education: {
      unitBasis: 'per classroom/program per year',
      annualPerUnit: costRange(12000, 30000),
      rampYears: 3,
      rampCurve: [0.20, 0.50, 0.80, 1.0],
      seasonalFactor: false,
      description: 'Permaculture courses, workshops, farm tours, youth programs',
    },
    agritourism: {
      unitBasis: 'per gathering venue per year',
      annualPerUnit: costRange(8000, 25000),
      rampYears: 3,
      rampCurve: [0.15, 0.40, 0.70, 1.0],
      seasonalFactor: true,
      description: 'Farm events, small weddings, community gatherings, seasonal festivals',
    },
    carbon: {
      unitBasis: 'per acre of conservation per year',
      annualPerUnit: costRange(15, 50),
      rampYears: 5,
      rampCurve: [0.0, 0.10, 0.25, 0.50, 0.75, 1.0],
      seasonalFactor: false,
      description: 'Carbon credits, conservation easements, ecosystem service payments',
    },
    grants: {
      unitBasis: 'per project per year',
      annualPerUnit: costRange(5000, 20000),
      rampYears: 2,
      rampCurve: [0.50, 0.80, 1.0],
      seasonalFactor: false,
      description: 'EQIP, CSP, OMAFRA EFP, Growing Forward, stewardship programs',
    },
  },
};

// ── Regional Multipliers ──

const REVENUE_MULTIPLIERS: Record<CostRegion, number> = {
  'us-midwest': 1.0,
  'us-northeast': 1.15,
  'us-southeast': 0.85,
  'us-west': 1.20,
  'ca-ontario': 1.10,
  'ca-bc': 1.15,
  'ca-prairies': 0.90,
};

// ── Public API ──

const CACHE = new Map<CostRegion, RegionalRevenueBenchmarks>();

export function getRevenueBenchmarks(region: CostRegion): RegionalRevenueBenchmarks {
  if (region === 'us-midwest') return US_MIDWEST;

  let cached = CACHE.get(region);
  if (!cached) {
    const mult = REVENUE_MULTIPLIERS[region];
    const enterprises = {} as Record<EnterpriseType, RevenueDrivers>;
    for (const [k, v] of Object.entries(US_MIDWEST.enterprises)) {
      enterprises[k as EnterpriseType] = {
        ...v,
        annualPerUnit: {
          low: Math.round(v.annualPerUnit.low * mult),
          mid: Math.round(v.annualPerUnit.mid * mult),
          high: Math.round(v.annualPerUnit.high * mult),
        },
      };
    }
    cached = { enterprises };
    CACHE.set(region, cached);
  }
  return cached;
}
