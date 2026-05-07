import { describe, expect, it } from 'vitest';
import type { MockLayerResult } from '@ogden/shared/scoring';
import {
  aspectDegrees,
  featureCounts,
  getElevationLayer,
  noonAltitude,
  polygonCentroid,
  slopeBand,
  solsticeAltitudes,
  topographyKpis,
  transectStats,
} from '../derivations.js';
import type { Transect } from '../../../../../store/topographyStore.js';

const elevationLayer: MockLayerResult = {
  layerId: 'elevation',
  layerType: 'elevation',
  status: 'ok',
  fetchedAt: '2026-01-01T00:00:00Z',
  source: 'mock',
  summary: {
    min_elevation_m: 185,
    max_elevation_m: 312,
    mean_elevation_m: 247,
    mean_slope_deg: 8.4,
    max_slope_deg: 32.1,
    predominant_aspect: 'SE',
  },
} as unknown as MockLayerResult;

describe('topography derivations', () => {
  it('topographyKpis returns dashes for empty layers', () => {
    const k = topographyKpis(undefined, []);
    expect(k.find((x) => x.label === 'Mean slope')?.value).toBe('—');
    expect(k.find((x) => x.label === 'Elevation range')?.value).toBe('—');
    expect(k.find((x) => x.label === 'Aspect tendency')?.value).toBe('—');
    expect(k.find((x) => x.label === 'A–B transects')?.value).toBe('0');
  });

  it('topographyKpis populates from elevation layer + transects', () => {
    const k = topographyKpis([elevationLayer], []);
    expect(k.find((x) => x.label === 'Mean slope')?.value).toBe('8.4°');
    expect(k.find((x) => x.label === 'Elevation range')?.value).toBe('185–312 m');
    expect(k.find((x) => x.label === 'Aspect tendency')?.value).toBe('SE');
    expect(k.find((x) => x.label === 'Aspect tendency')?.pill).toBe('135°');
  });

  it('getElevationLayer narrows discriminated union', () => {
    expect(getElevationLayer([elevationLayer])?.summary.mean_slope_deg).toBe(8.4);
    expect(getElevationLayer(undefined)).toBeUndefined();
  });

  it('slopeBand classifies boundaries', () => {
    expect(slopeBand(0).band).toBe('flat');
    expect(slopeBand(2.9).band).toBe('flat');
    expect(slopeBand(3).band).toBe('gentle');
    expect(slopeBand(7.9).band).toBe('gentle');
    expect(slopeBand(8).band).toBe('moderate');
    expect(slopeBand(14.9).band).toBe('moderate');
    expect(slopeBand(15).band).toBe('steep');
    expect(slopeBand(24.9).band).toBe('steep');
    expect(slopeBand(25).band).toBe('severe');
    expect(slopeBand(45).band).toBe('severe');
    expect(slopeBand(null).tone).toBe('dim');
  });

  it('aspectDegrees maps compass labels', () => {
    expect(aspectDegrees('N')).toBe(0);
    expect(aspectDegrees('NE')).toBe(45);
    expect(aspectDegrees('e')).toBe(90);
    expect(aspectDegrees('SE')).toBe(135);
    expect(aspectDegrees('S')).toBe(180);
    expect(aspectDegrees('SW')).toBe(225);
    expect(aspectDegrees('W')).toBe(270);
    expect(aspectDegrees('NW')).toBe(315);
    expect(aspectDegrees('XX')).toBeNull();
    expect(aspectDegrees(null)).toBeNull();
  });

  it('transectStats computes delta + slope from profile', () => {
    const t: Transect = {
      id: 't1',
      projectId: 'p1',
      name: 'A-B',
      pointA: [0, 0],
      pointB: [1, 1],
      elevationProfileM: [100, 105, 103, 110],
      totalDistanceM: 200,
    };
    const s = transectStats(t);
    expect(s).not.toBeNull();
    expect(s?.minM).toBe(100);
    expect(s?.maxM).toBe(110);
    expect(s?.deltaM).toBe(10);
    expect(s?.meanSlopePct).toBeCloseTo(5);
    expect(s?.samples).toBe(4);
  });

  it('transectStats returns null for empty profile', () => {
    expect(transectStats(undefined)).toBeNull();
    expect(
      transectStats({
        id: 'x',
        projectId: 'p',
        name: 'x',
        pointA: [0, 0],
        pointB: [1, 1],
      }),
    ).toBeNull();
  });

  it('featureCounts aggregates per type', () => {
    const c = featureCounts({
      contours: [{ id: 'c1' } as never, { id: 'c2' } as never],
      highPoints: [{ id: 'h1' } as never],
      drainageLines: [],
      transects: [{ id: 't1' } as never, { id: 't2' } as never, { id: 't3' } as never],
    });
    expect(c).toEqual({
      contours: 2,
      highPoints: 1,
      drainageLines: 0,
      transects: 3,
      total: 6,
    });
  });

  it('polygonCentroid averages outer ring', () => {
    const poly: GeoJSON.Polygon = {
      type: 'Polygon',
      coordinates: [[[0, 0], [10, 0], [10, 10], [0, 10], [0, 0]]],
    };
    const c = polygonCentroid(poly);
    expect(c?.lng).toBe(5);
    expect(c?.lat).toBe(5);
  });

  it('noonAltitude is highest at summer solstice', () => {
    const lat = 44.5;
    const { summer, equinox, winter } = solsticeAltitudes(lat);
    expect(summer).toBeGreaterThan(equinox);
    expect(equinox).toBeGreaterThan(winter);
    expect(summer).toBeGreaterThan(0);
    expect(winter).toBeGreaterThan(0);
    expect(noonAltitude(0, 80)).toBeGreaterThan(80); // equator equinox ≈ 90
  });
});
