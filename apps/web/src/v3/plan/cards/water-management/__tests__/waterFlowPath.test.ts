import { describe, expect, it } from 'vitest';
import { buildParcelBox, type ParcelBox } from '../waterRouterMath.js';
import { computeFlowPath } from '../waterFlowPath.js';

// ~200 m square parcel; downhill bearing 180° (south) ⇒ uphill is north (+lat).
const PARCEL: GeoJSON.FeatureCollection = {
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      properties: {},
      geometry: {
        type: 'Polygon',
        coordinates: [
          [
            [0, 0],
            [0.0018, 0],
            [0.0018, 0.0018],
            [0, 0.0018],
            [0, 0],
          ],
        ],
      },
    },
  ],
};

const MIN_M = 100;
const MAX_M = 200;

function box(): ParcelBox {
  const b = buildParcelBox(PARCEL, 180);
  if (!b) throw new Error('expected a parcel box');
  return b;
}

// Start near the high (north) edge so there is plenty of room to flow south.
const START: [number, number] = [0.0009, 0.0017];

function assertMonotonic(elevations: number[]): void {
  for (let i = 1; i < elevations.length; i++) {
    expect(elevations[i]!).toBeLessThanOrEqual(elevations[i - 1]!);
  }
}

describe('computeFlowPath', () => {
  it('falls back to the heuristic when no DEM sampler is supplied', () => {
    const path = computeFlowPath(START, box(), {
      minElevationM: MIN_M,
      maxElevationM: MAX_M,
    });
    expect(path).not.toBeNull();
    expect(path!.usedDem).toBe(false);
    expect(path!.geometry.type).toBe('LineString');
    expect(path!.geometry.coordinates.length).toBeGreaterThanOrEqual(2);
    assertMonotonic(path!.elevations);
    expect(path!.descentM).toBeGreaterThan(0);
    expect(path!.lengthM).toBeGreaterThan(0);
  });

  it('uses the supplied DEM sampler and stays monotonic downslope', () => {
    // Elevation rises with latitude; flowing south descends.
    const sampleElevationM = (p: [number, number]): number => p[1] * 1_000_000;
    const path = computeFlowPath(START, box(), {
      minElevationM: MIN_M,
      maxElevationM: MAX_M,
      sampleElevationM,
    });
    expect(path).not.toBeNull();
    expect(path!.usedDem).toBe(true);
    assertMonotonic(path!.elevations);
    expect(path!.descentM).toBeGreaterThan(0);
  });

  it('returns null at a local pit where no step descends', () => {
    // A flat DEM: no step ever descends, so no path can form.
    const path = computeFlowPath(START, box(), {
      minElevationM: MIN_M,
      maxElevationM: MAX_M,
      sampleElevationM: () => 50,
    });
    expect(path).toBeNull();
  });

  it('respects maxSteps to bound the polyline length', () => {
    // Start mid-parcel (well below the t=1 ceiling) so small heuristic steps
    // keep descending rather than clamping flat at the top.
    const path = computeFlowPath([0.0009, 0.0012], box(), {
      minElevationM: MIN_M,
      maxElevationM: MAX_M,
      maxSteps: 3,
      stepM: 10,
    });
    expect(path).not.toBeNull();
    // start vertex + at most maxSteps appended.
    expect(path!.geometry.coordinates.length).toBeLessThanOrEqual(4);
  });
});
