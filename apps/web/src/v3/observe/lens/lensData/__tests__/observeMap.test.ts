// @vitest-environment happy-dom
//
// liveBundle.ts -> projectStore.ts/observeDataPointStore.ts attach persist
// side effects at module load; happy-dom provides the storage they need.
// Assertions are pure -- no stores are touched.

import { describe, it, expect } from 'vitest';
import { buildObserveMap } from '../liveBundle.js';
import type { ObserveDataPoint } from '@ogden/shared';

const NOW = Date.parse('2026-06-04T00:00:00.000Z');

function pt(
  id: string,
  domainId: ObserveDataPoint['domainId'],
  coords: [number, number] | null,
): ObserveDataPoint {
  return {
    id,
    projectId: 'mtc',
    domainId,
    sourceType: 'manual_observation',
    sourceActionId: null,
    sourceFeedEntryId: null,
    sourceObjectiveId: null,
    sourceFeatureRef: null,
    locationGeometry: coords ? { type: 'Point', coordinates: coords } : null,
    cycleId: 0,
    isSuperseded: false,
    supersededBy: null,
    statusOutput: 'clear',
    measurementValue: { label: id },
    proofItems: [],
    capturedAt: '2026-05-20T00:00:00.000Z',
    capturedBy: 'test',
  } as ObserveDataPoint;
}

const BOUNDARY: GeoJSON.FeatureCollection = {
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      properties: {},
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [-80.1059, 44.3035],
          [-80.0972, 44.3018],
          [-80.0958, 44.2965],
          [-80.1045, 44.2982],
          [-80.1059, 44.3035],
        ]],
      },
    },
  ],
};

describe('buildObserveMap', () => {
  it('returns null when there is no boundary and no georeferenced point', () => {
    const points = [pt('a', 'soil', null), pt('b', 'hydrology', null)];
    expect(buildObserveMap(points, null, NOW, false)).toBeNull();
  });

  it('passes the boundary through and derives bbox from it', () => {
    const res = buildObserveMap([pt('a', 'soil', null)], BOUNDARY, NOW, true)!;
    expect(res).not.toBeNull();
    expect(res.boundary).toBe(BOUNDARY);
    expect(res.demoGeometry).toBe(true);
    expect(res.bbox[0]).toBeCloseTo(-80.1059, 6);
    expect(res.bbox[1]).toBeCloseTo(44.2965, 6);
    expect(res.bbox[2]).toBeCloseTo(-80.0958, 6);
    expect(res.bbox[3]).toBeCloseTo(44.3035, 6);
  });

  it('emits a marker per georeferenced point (lng/lat + lens), omitting null-geometry points', () => {
    const points = [
      pt('geo-soil', 'soil', [-80.1015, 44.2992]),
      pt('no-geo', 'climate', null),
    ];
    const res = buildObserveMap(points, BOUNDARY, NOW, false)!;
    expect(res.markers).toHaveLength(1);
    const m = res.markers[0];
    expect(m.id).toBe('geo-soil');
    expect(m.lng).toBeCloseTo(-80.1015, 6);
    expect(m.lat).toBeCloseTo(44.2992, 6);
    expect(m.lens).toBe('living');
  });

  it('derives bbox from markers when there is no boundary', () => {
    const points = [
      pt('p1', 'soil', [-80.1045, 44.2982]),
      pt('p2', 'hydrology', [-80.0972, 44.3018]),
    ];
    const res = buildObserveMap(points, null, NOW, false)!;
    expect(res.boundary).toBeNull();
    expect(res.bbox[0]).toBeCloseTo(-80.1045, 6);
    expect(res.bbox[1]).toBeCloseTo(44.2982, 6);
    expect(res.bbox[2]).toBeCloseTo(-80.0972, 6);
    expect(res.bbox[3]).toBeCloseTo(44.3018, 6);
  });
});
