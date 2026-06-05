import { describe, it, expect } from 'vitest';
import {
  computeProjectBreakEven,
  type AssembledFinancialInputs,
} from '../computeProjectBreakEven.js';
import type { AllFeaturesInput, CostRegion } from '../types.js';
import { DEFAULT_SITE_CONTEXT } from '../types.js';
import { computeAllCosts, applyOverrides, sumCosts } from '../costEngine.js';
import { detectEnterprises } from '../enterpriseDetector.js';
import { computeRevenueStreams, applyRevenueOverrides } from '../revenueEngine.js';
import { computeCashflow } from '../cashflowEngine.js';
import { computeBreakEven } from '../breakEvenEngine.js';

const REGION: CostRegion = 'ca-ontario';

const EMPTY_FEATURES: AllFeaturesInput = {
  zones: [],
  structures: [],
  paddocks: [],
  paths: [],
  utilities: [],
  crops: [],
};

/** A fenced, stocked paddock => a livestock enterprise AND fence capital. */
function stockedPaddockFeatures(): AllFeaturesInput {
  return {
    ...EMPTY_FEATURES,
    paddocks: [
      {
        id: 'pad1',
        projectId: 'p1',
        name: 'North paddock',
        areaM2: 10_000,
        fencing: 'electric',
        species: ['cattle'],
        phase: 'establishment',
      },
    ],
  };
}

/**
 * A lone utility => capital cost, but NO detected enterprise. (A paddock --
 * even unstocked -- would trip the `grants` enterprise via paddocks.length>0,
 * so we use a utility, which triggers no enterprise.)
 */
function utilityOnlyFeatures(): AllFeaturesInput {
  return {
    ...EMPTY_FEATURES,
    utilities: [
      {
        id: 'util1',
        projectId: 'p1',
        name: 'Cistern',
        type: 'water_tank',
        phase: 'establishment',
      },
    ],
  };
}

function inputs(
  features: AllFeaturesInput,
  revenueOverrides: AssembledFinancialInputs['revenueOverrides'] = {},
): AssembledFinancialInputs {
  return {
    features,
    region: REGION,
    costOverrides: {},
    revenueOverrides,
    // Empty phases => cashflow defaults capital to years [0,1]; no BuildPhase
    // construction needed for these cost-recovery assertions.
    phases: [],
    siteContext: DEFAULT_SITE_CONTEXT,
  };
}

describe('computeProjectBreakEven', () => {
  it('returns no-model for an empty project', () => {
    const r = computeProjectBreakEven(inputs(EMPTY_FEATURES));
    expect(r.hasModel).toBe(false);
    expect(r.breakEvenYear).toEqual({ low: null, mid: null, high: null });
    expect(r.peakNegativeCashflow).toEqual({ low: 0, mid: 0, high: 0 });
  });

  it('returns no-model when there is capital cost but no detected enterprise', () => {
    const r = computeProjectBreakEven(inputs(utilityOnlyFeatures()));
    expect(r.hasModel).toBe(false);
  });

  it('computes a cost-recovery model for a stocked paddock', () => {
    const r = computeProjectBreakEven(inputs(stockedPaddockFeatures()));
    expect(r.hasModel).toBe(true);
    // peak negative cashflow reflects the capital outlay before recovery
    expect(r.peakNegativeCashflow.mid).toBeLessThan(0);
  });

  it('keeps hasModel true but breakEvenYear null when revenue is overridden to zero', () => {
    // A stocked paddock detects both `livestock` and `grants` enterprises, so
    // both revenue streams must be zeroed for cumulative cashflow to never
    // recover (=> null break-even year, but a model still computed).
    const r = computeProjectBreakEven(
      inputs(stockedPaddockFeatures(), {
        'revenue-livestock': { low: 0, mid: 0, high: 0 },
        'revenue-grants': { low: 0, mid: 0, high: 0 },
      }),
    );
    expect(r.hasModel).toBe(true);
    expect(r.breakEvenYear).toEqual({ low: null, mid: null, high: null });
  });

  it('agrees with the raw engine pipeline (no drift from useFinancialModel)', () => {
    const features = stockedPaddockFeatures();
    const i = inputs(features);

    // Raw pipeline, mirroring useFinancialModel's useMemo body.
    const costItems = applyOverrides(
      computeAllCosts(features, REGION, DEFAULT_SITE_CONTEXT),
      {},
    );
    const enterprises = detectEnterprises(
      features.zones,
      features.structures,
      features.paddocks,
      features.crops,
    );
    expect(enterprises.length).toBeGreaterThan(0);
    expect(sumCosts(costItems).mid).toBeGreaterThan(0);
    const streams = applyRevenueOverrides(
      computeRevenueStreams(enterprises, features, DEFAULT_SITE_CONTEXT, REGION),
      {},
    );
    const cashflow = computeCashflow(costItems, streams, [], 10);
    const expected = computeBreakEven(cashflow);

    const r = computeProjectBreakEven(i);
    expect(r.breakEvenYear).toEqual(expected.breakEvenYear);
    expect(r.peakNegativeCashflow).toEqual(expected.peakNegativeCashflow);
  });

  it('never exposes tenYearROI on its return shape (covenant: cost-recovery only)', () => {
    const r = computeProjectBreakEven(inputs(stockedPaddockFeatures()));
    expect(Object.keys(r).sort()).toEqual(
      ['breakEvenYear', 'hasModel', 'peakNegativeCashflow'].sort(),
    );
    expect('tenYearROI' in r).toBe(false);
  });
});
