/**
 * Adapter-level integration test for the polygon-mask wiring.
 *
 * Proves the three-line plumbing across `extractParcelPolygon` →
 * `sampleHistogram(bbox, polygon)` → `summaryData.outsidePolygonCount`.
 * One test file is enough: NlcdLandCoverAdapter and AciLandCoverAdapter
 * share the same shape (same helper, same `buildLandCoverResult`),
 * so proving WorldCover proves the cohort.
 *
 * The raster service is stubbed — we never touch geotiff or the
 * filesystem. The stub records what the adapter passed and returns
 * a hand-crafted ClassHistogram.
 */

import { describe, it, expect, vi } from 'vitest';
import type { Polygon } from 'geojson';
import type {
  ClassHistogram,
  ParcelBbox4326,
} from '../../landcover/LandCoverRasterServiceBase.js';
import type { WorldCoverRasterService } from '../../landcover/WorldCoverRasterService.js';
import type { ProjectContext } from '../DataPipelineOrchestrator.js';
import { WorldCoverLandCoverAdapter } from './WorldCoverLandCoverAdapter.js';

function makeStubRaster(args: {
  histogram: ClassHistogram | null;
}): {
  raster: WorldCoverRasterService;
  sampleHistogram: ReturnType<typeof vi.fn>;
} {
  const sampleHistogram = vi.fn(async (_bbox: ParcelBbox4326, _polygon?: Polygon) => args.histogram);
  const raster = {
    isEnabled: () => true,
    getAttribution: () => 'ESA WorldCover (test)',
    getVintage: () => 2021,
    sampleHistogram,
  } as unknown as WorldCoverRasterService;
  return { raster, sampleHistogram };
}

const CONTEXT_NO_BOUNDARY: ProjectContext = {
  projectId: 'test',
  country: 'US',
  provinceState: null,
  conservationAuthId: null,
  boundaryGeojson: null,
  centroidLat: 44.55,
  centroidLng: -123.27,
};

const HIST_WITH_OUTSIDE: ClassHistogram = {
  counts: { '10': 75, '80': 25 }, // 75% Forest + 25% Open Water
  totalPixels: 100,
  nodataCount: 0,
  outsidePolygonCount: 42,
  vintage: 2021,
  pixelSize: { x: 0.0001, y: 0.0001 },
};

const HIST_BBOX_ONLY: ClassHistogram = {
  counts: { '10': 100 },
  totalPixels: 100,
  nodataCount: 0,
  // outsidePolygonCount intentionally omitted — bbox-only path.
  vintage: 2021,
  pixelSize: { x: 0.0001, y: 0.0001 },
};

const PARCEL_POLYGON = {
  type: 'Polygon',
  coordinates: [[
    [-123.272, 44.549],
    [-123.270, 44.549],
    [-123.270, 44.551],
    [-123.272, 44.551],
    [-123.272, 44.549],
  ]],
};

describe('WorldCoverLandCoverAdapter — polygon-mask wiring', () => {
  it('passes the parcel polygon to sampleHistogram when boundary is a GeoJSON Polygon', async () => {
    const { raster, sampleHistogram } = makeStubRaster({ histogram: HIST_WITH_OUTSIDE });
    const adapter = new WorldCoverLandCoverAdapter('worldcover-test', 'land_cover', raster);

    const ctx: ProjectContext = { ...CONTEXT_NO_BOUNDARY, boundaryGeojson: PARCEL_POLYGON };
    const result = await adapter.fetchForBoundary(PARCEL_POLYGON, ctx);

    expect(sampleHistogram).toHaveBeenCalledTimes(1);
    const [bboxArg, polygonArg] = sampleHistogram.mock.calls[0]!;
    expect(bboxArg).toEqual({
      minLng: -123.272,
      minLat: 44.549,
      maxLng: -123.270,
      maxLat: 44.551,
    });
    expect(polygonArg).toBeDefined();
    expect(polygonArg!.type).toBe('Polygon');
    expect(polygonArg!.coordinates).toEqual(PARCEL_POLYGON.coordinates);

    // outsidePolygonCount surfaces into telemetry.
    const summary = result.summaryData as { outsidePolygonCount: number };
    expect(summary.outsidePolygonCount).toBe(42);
  });

  it('passes undefined polygon when boundary is null (centroid-only fast path)', async () => {
    const { raster, sampleHistogram } = makeStubRaster({ histogram: HIST_BBOX_ONLY });
    const adapter = new WorldCoverLandCoverAdapter('worldcover-test', 'land_cover', raster);

    const result = await adapter.fetchForBoundary(null, CONTEXT_NO_BOUNDARY);

    expect(sampleHistogram).toHaveBeenCalledTimes(1);
    const [, polygonArg] = sampleHistogram.mock.calls[0]!;
    expect(polygonArg).toBeUndefined();

    // When the histogram doesn't carry outsidePolygonCount, summaryData
    // gets the 0 sentinel — never NaN, never undefined.
    const summary = result.summaryData as { outsidePolygonCount: number };
    expect(summary.outsidePolygonCount).toBe(0);
  });

  it('preserves outsidePolygonCount = 0 when polygon arg was passed but no pixels were rejected', async () => {
    const histExactCover: ClassHistogram = {
      ...HIST_BBOX_ONLY,
      outsidePolygonCount: 0,
    };
    const { raster } = makeStubRaster({ histogram: histExactCover });
    const adapter = new WorldCoverLandCoverAdapter('worldcover-test', 'land_cover', raster);

    const ctx: ProjectContext = { ...CONTEXT_NO_BOUNDARY, boundaryGeojson: PARCEL_POLYGON };
    const result = await adapter.fetchForBoundary(PARCEL_POLYGON, ctx);

    const summary = result.summaryData as { outsidePolygonCount: number };
    expect(summary.outsidePolygonCount).toBe(0);
  });
});
