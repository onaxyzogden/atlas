import { describe, expect, it } from 'vitest';
import {
  climateKpis,
  hazardCounts,
  monthlyClimateSeries,
  noonAltitude,
  polygonCentroid,
  riskLabel,
  solarOpportunities,
  solsticeAltitudes,
  statusLabel,
  topRiskPriorities,
} from '../derivations.js';
import type { Hazard } from '../../../../../store/hazardsStore.js';
import type { MockLayerResult } from '@ogden/shared/scoring';

function climateLayer(summary: Record<string, unknown>): MockLayerResult {
  return {
    layerType: 'climate',
    summary,
  } as unknown as MockLayerResult;
}

function makeHazard(overrides: Partial<Hazard> = {}): Hazard {
  return {
    id: 'h1',
    kind: 'frost',
    label: 'Frost',
    risk: 'moderate',
    trend: 'flat',
    status: 'monitoring',
    mitigationPct: 0,
    createdAt: 0,
    updatedAt: 0,
    ...overrides,
  };
}

describe('climateKpis', () => {
  it('returns em-dashes when layers are missing', () => {
    const items = climateKpis(undefined);
    expect(items).toHaveLength(7);
    expect(items[0]?.value).toBe('—');
    expect(items[1]?.value).toBe('—');
  });

  it('formats populated climate layer', () => {
    const items = climateKpis([
      climateLayer({
        hardiness_zone: '5b',
        annual_precip_mm: 870.4,
        growing_season_days: 152,
        solar_radiation_kwh_m2_day: 4.3,
        annual_sunshine_hours: 2100,
        prevailing_wind: 'NW',
        wind_speed_ms: 4,
        last_frost_date: '2026-05-10',
        first_frost_date: '2026-09-28',
      }),
    ]);
    expect(items[0]?.value).toBe('5b');
    expect(items[1]?.value).toBe('870 mm');
    expect(items[2]?.value).toBe('152');
    expect(items[3]?.value).toBe('4.3 kWh/m²/day');
    expect(items[4]?.value).toBe('NW');
    expect(items[5]?.value).toBe('2026-05-10');
    expect(items[6]?.value).toBe('2026-09-28');
  });
});

describe('monthlyClimateSeries', () => {
  it('returns empty array for missing data', () => {
    expect(monthlyClimateSeries(undefined)).toEqual([]);
  });

  it('maps monthly normals', () => {
    const series = monthlyClimateSeries([
      climateLayer({
        monthly_normals: [
          { month: 1, precip_mm: 80, mean_max_c: 2, mean_min_c: -5 },
          { month: 2, precip_mm: 60 },
        ],
      }),
    ]);
    expect(series).toHaveLength(2);
    expect(series[0]).toEqual({ month: 1, precipMm: 80, meanMaxC: 2, meanMinC: -5 });
    expect(series[1]).toEqual({ month: 2, precipMm: 60, meanMaxC: null, meanMinC: null });
  });
});

describe('solarOpportunities', () => {
  it('returns pending message when no layer', () => {
    expect(solarOpportunities(undefined)).toEqual([
      ['Climate data pending', 'Awaiting layer fetch'],
    ]);
  });

  it('produces multiple opportunities for rich layer', () => {
    const opps = solarOpportunities([
      climateLayer({
        solar_radiation_kwh_m2_day: 5,
        annual_precip_mm: 800,
        growing_season_days: 180,
        prevailing_wind: 'W',
        annual_temp_mean_c: 10,
      }),
    ]);
    expect(opps.length).toBeGreaterThanOrEqual(4);
  });
});

describe('hazardCounts', () => {
  it('returns zeros for empty list', () => {
    const c = hazardCounts([]);
    expect(c.total).toBe(0);
    expect(c.averageMitigationPct).toBe(0);
  });

  it('aggregates by status, risk, and mitigation', () => {
    const c = hazardCounts([
      makeHazard({ id: 'a', risk: 'high', status: 'monitoring', mitigationPct: 20 }),
      makeHazard({ id: 'b', risk: 'moderate', status: 'in_progress', mitigationPct: 60 }),
      makeHazard({ id: 'c', risk: 'low', status: 'mitigated', mitigationPct: 100 }),
      makeHazard({ id: 'd', risk: 'high', status: 'planned', mitigationPct: 0 }),
    ]);
    expect(c.total).toBe(4);
    expect(c.active).toBe(3);
    expect(c.mitigated).toBe(1);
    expect(c.monitoring).toBe(1);
    expect(c.inProgress).toBe(1);
    expect(c.planned).toBe(1);
    expect(c.highRisk).toBe(2);
    expect(c.moderateRisk).toBe(1);
    expect(c.lowRisk).toBe(1);
    expect(c.averageMitigationPct).toBe(45);
  });
});

describe('topRiskPriorities', () => {
  it('excludes mitigated hazards and sorts by risk × lack-of-mitigation', () => {
    const result = topRiskPriorities([
      makeHazard({ id: 'a', risk: 'low', mitigationPct: 0 }),
      makeHazard({ id: 'b', risk: 'high', mitigationPct: 90 }),
      makeHazard({ id: 'c', risk: 'high', mitigationPct: 0 }),
      makeHazard({ id: 'd', risk: 'moderate', status: 'mitigated' }),
    ]);
    expect(result.map((h) => h.id)).toEqual(['c', 'b', 'a']);
  });
});

describe('label helpers', () => {
  it('riskLabel and statusLabel format known values', () => {
    expect(riskLabel('high')).toBe('High');
    expect(riskLabel('moderate')).toBe('Moderate');
    expect(statusLabel('in_progress')).toBe('In progress');
    expect(statusLabel('mitigated')).toBe('Mitigated');
  });
});

describe('polygonCentroid', () => {
  it('returns null for missing or short rings', () => {
    expect(polygonCentroid(undefined)).toBeNull();
    expect(
      polygonCentroid({ type: 'Polygon', coordinates: [[[0, 0], [1, 1]]] }),
    ).toBeNull();
  });

  it('averages outer ring vertices, dropping the closing duplicate', () => {
    const c = polygonCentroid({
      type: 'Polygon',
      coordinates: [[[0, 0], [2, 0], [2, 2], [0, 2], [0, 0]]],
    });
    expect(c).toEqual({ lng: 1, lat: 1 });
  });
});

describe('sun path math', () => {
  it('noonAltitude is highest at summer solstice for mid-latitudes', () => {
    const lat = 45;
    const summer = noonAltitude(lat, 172);
    const winter = noonAltitude(lat, 355);
    expect(summer).toBeGreaterThan(winter);
    expect(summer).toBeLessThanOrEqual(90);
    expect(winter).toBeGreaterThanOrEqual(0);
  });

  it('solsticeAltitudes returns three angles in order', () => {
    const a = solsticeAltitudes(43);
    expect(a.summer).toBeGreaterThan(a.equinox);
    expect(a.equinox).toBeGreaterThan(a.winter);
  });
});
