/**
 * revenueEngine.ts — tests for revenue stream computation.
 */

import { describe, it, expect } from 'vitest';
import {
  computeRevenueStreams,
  sumRevenue,
  applyRevenueOverrides,
} from '../../features/financial/engine/revenueEngine.js';
import { detectEnterprises } from '../../features/financial/engine/enterpriseDetector.js';
import { regenerativeFarmScenario, retreatCenterScenario, emptyInput, defaultSiteContext } from '../helpers/mockFinancialInput.js';

const REGION = 'us-midwest' as const;
const siteCtx = defaultSiteContext();

describe('computeRevenueStreams', () => {
  it('generates streams for detected enterprises', () => {
    const input = regenerativeFarmScenario();
    const enterprises = detectEnterprises(input.zones, input.structures, input.paddocks, input.crops);
    const streams = computeRevenueStreams(enterprises, input, siteCtx, REGION);
    expect(streams.length).toBeGreaterThan(0);
  });

  it('each stream has valid structure', () => {
    const input = regenerativeFarmScenario();
    const enterprises = detectEnterprises(input.zones, input.structures, input.paddocks, input.crops);
    const streams = computeRevenueStreams(enterprises, input, siteCtx, REGION);

    for (const stream of streams) {
      expect(stream.id).toBeTruthy();
      expect(stream.name).toBeTruthy();
      expect(stream.enterprise).toBeTruthy();
      expect(stream.annualRevenue.low).toBeGreaterThanOrEqual(0);
      expect(stream.annualRevenue.mid).toBeGreaterThanOrEqual(stream.annualRevenue.low);
      expect(stream.annualRevenue.high).toBeGreaterThanOrEqual(stream.annualRevenue.mid);
      expect(stream.startYear).toBeGreaterThanOrEqual(1);
      expect(stream.maturityYear).toBeGreaterThanOrEqual(stream.startYear);
      expect(stream.rampSchedule).toBeDefined();
      expect(stream.assumptions.length).toBeGreaterThan(0);
    }
  });

  it('ramp schedule starts at 0 before start year', () => {
    const input = regenerativeFarmScenario();
    const enterprises = detectEnterprises(input.zones, input.structures, input.paddocks, input.crops);
    const streams = computeRevenueStreams(enterprises, input, siteCtx, REGION);
    for (const stream of streams) {
      if (stream.startYear > 0) {
        expect(stream.rampSchedule[0]).toBe(0);
      }
    }
  });

  it('scales revenue by growing season factor', () => {
    const input = regenerativeFarmScenario();
    const enterprises = detectEnterprises(input.zones, input.structures, input.paddocks, input.crops);

    const shortSeason = defaultSiteContext({ growingSeasonDays: 100 });
    const longSeason = defaultSiteContext({ growingSeasonDays: 300 });

    const shortStreams = computeRevenueStreams(enterprises, input, shortSeason, REGION);
    const longStreams = computeRevenueStreams(enterprises, input, longSeason, REGION);

    // Find a seasonal enterprise (livestock)
    const shortLivestock = shortStreams.find((s) => s.enterprise === 'livestock');
    const longLivestock = longStreams.find((s) => s.enterprise === 'livestock');
    if (shortLivestock && longLivestock) {
      expect(longLivestock.annualRevenue.mid).toBeGreaterThan(shortLivestock.annualRevenue.mid);
    }
  });

  it('returns empty for empty enterprises array', () => {
    const streams = computeRevenueStreams([], emptyInput(), siteCtx, REGION);
    expect(streams).toHaveLength(0);
  });

  it('grants confidence is low', () => {
    const input = regenerativeFarmScenario();
    const enterprises = detectEnterprises(input.zones, input.structures, input.paddocks, input.crops);
    const streams = computeRevenueStreams(enterprises, input, siteCtx, REGION);
    const grants = streams.find((s) => s.enterprise === 'grants');
    if (grants) {
      expect(grants.confidence).toBe('low');
    }
  });
});

describe('sumRevenue', () => {
  it('sums all revenue streams at maturity', () => {
    const input = regenerativeFarmScenario();
    const enterprises = detectEnterprises(input.zones, input.structures, input.paddocks, input.crops);
    const streams = computeRevenueStreams(enterprises, input, siteCtx, REGION);
    const total = sumRevenue(streams);
    expect(total.low).toBeGreaterThan(0);
    expect(total.mid).toBeGreaterThanOrEqual(total.low);
    expect(total.high).toBeGreaterThanOrEqual(total.mid);
  });

  it('returns 0 for empty streams', () => {
    const total = sumRevenue([]);
    expect(total).toEqual({ low: 0, mid: 0, high: 0 });
  });
});

describe('applyRevenueOverrides', () => {
  it('overrides matching stream revenue', () => {
    const input = retreatCenterScenario();
    const enterprises = detectEnterprises(input.zones, input.structures, input.paddocks, input.crops);
    const streams = computeRevenueStreams(enterprises, input, siteCtx, REGION);
    if (streams.length > 0) {
      const firstId = streams[0]!.id;
      const overridden = applyRevenueOverrides(streams, { [firstId]: { mid: 50000 } });
      expect(overridden.find((s) => s.id === firstId)!.annualRevenue.mid).toBe(50000);
    }
  });

  it('returns same reference if no overrides', () => {
    const input = retreatCenterScenario();
    const enterprises = detectEnterprises(input.zones, input.structures, input.paddocks, input.crops);
    const streams = computeRevenueStreams(enterprises, input, siteCtx, REGION);
    expect(applyRevenueOverrides(streams, {})).toBe(streams);
  });
});
