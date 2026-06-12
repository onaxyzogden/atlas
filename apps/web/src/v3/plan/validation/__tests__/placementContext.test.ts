/**
 * buildPlacementContext — store-wiring smoke test.
 *
 * Seeds the real zustand stores via setState with a unique projectId and
 * asserts the context pools come back with catalog-matchable kinds
 * (utility points keep their UtilityType, paddocks normalize to
 * 'paddock'/'grazing', wetland waterbodies split from open waterways).
 * Built-environment V2 pools (wells/septics/structures) are covered by
 * the projection tests in @ogden/shared — not re-seeded here.
 */

import { describe, expect, it } from 'vitest';
import { useCropStore, type CropArea } from '../../../../store/cropStore.js';
import { useLivestockStore, type Paddock } from '../../../../store/livestockStore.js';
import { useSetbackStore, type SetbackRing } from '../../../../store/setbackStore.js';
import { useUtilityStore, type Utility } from '../../../../store/utilityStore.js';
import {
  useWaterSystemsStore,
  type Waterbody,
  type Watercourse,
} from '../../../../store/waterSystemsStore.js';
import { useZoneStore, type LandZone } from '../../../../store/zoneStore.js';
import { buildPlacementContext } from '../placementContext.js';

const PROJECT = 'placement-ctx-test-project';

const square: GeoJSON.Polygon = {
  type: 'Polygon',
  coordinates: [
    [
      [0, 0],
      [0.001, 0],
      [0.001, 0.001],
      [0, 0.001],
      [0, 0],
    ],
  ],
};

describe('buildPlacementContext', () => {
  it('assembles pools with catalog-matchable kinds and splits site layers', () => {
    useZoneStore.setState({
      zones: [
        {
          id: 'ctx-z1',
          projectId: PROJECT,
          name: 'Spiritual',
          category: 'spiritual',
          geometry: square,
          permacultureZone: 1,
        } as LandZone,
        {
          id: 'ctx-z-other',
          projectId: 'someone-else',
          name: 'Elsewhere',
          category: 'buffer',
          geometry: square,
        } as LandZone,
      ],
    });
    useLivestockStore.setState({
      paddocks: [
        { id: 'ctx-p1', projectId: PROJECT, name: 'Paddock A', geometry: square } as Paddock,
      ],
    });
    useUtilityStore.setState({
      utilities: [
        {
          id: 'ctx-u1',
          projectId: PROJECT,
          name: 'Pump',
          type: 'well_pump',
          center: [0, 0],
          phase: 'building',
          notes: '',
        } as Utility,
      ],
    });
    useCropStore.setState({
      cropAreas: [
        {
          id: 'ctx-c1',
          projectId: PROJECT,
          name: 'Nursery beds',
          type: 'nursery',
          geometry: square,
        } as CropArea,
      ],
    });
    useWaterSystemsStore.setState({
      watercourses: [
        {
          id: 'ctx-wc1',
          projectId: PROJECT,
          geometry: { type: 'LineString', coordinates: [[0, 0], [0.001, 0.001]] },
          kind: 'stream',
          createdAt: '2026-06-12',
        } as Watercourse,
      ],
      waterbodies: [
        {
          id: 'ctx-wb1',
          projectId: PROJECT,
          geometry: square,
          kind: 'wetland',
          createdAt: '2026-06-12',
        } as Waterbody,
        {
          id: 'ctx-wb2',
          projectId: PROJECT,
          geometry: square,
          kind: 'pond',
          createdAt: '2026-06-12',
        } as Waterbody,
      ],
    });
    useSetbackStore.setState({
      rings: [
        { id: 'ctx-r1', projectId: PROJECT, name: 'Well ring', geometry: square } as SetbackRing,
      ],
    });

    const ctx = buildPlacementContext(PROJECT, { boundary: square });

    expect(ctx.boundary).toBe(square);
    expect(ctx.zones).toHaveLength(1);
    expect(ctx.zones[0]).toMatchObject({
      id: 'ctx-z1',
      category: 'spiritual',
      permacultureZone: 1,
    });

    const byId = new Map(ctx.features.map((f) => [f.id, f]));
    expect(byId.get('ctx-p1')).toMatchObject({ kind: 'paddock', category: 'grazing' });
    expect(byId.get('ctx-u1')).toMatchObject({
      kind: 'well_pump',
      category: 'utility',
      geometry: { type: 'Point', coordinates: [0, 0] },
    });
    expect(byId.get('ctx-c1')).toMatchObject({ kind: 'nursery', category: 'crop-area' });

    expect(ctx.setbackRings).toEqual([
      expect.objectContaining({ id: 'ctx-r1', label: 'Well ring' }),
    ]);
    // wetland waterbody → wetland layer; stream + pond → waterway layer.
    expect(ctx.siteLayers.wetland).toHaveLength(1);
    expect(ctx.siteLayers.waterway).toHaveLength(2);
    expect(ctx.bufferCache.size).toBe(0);
  });

  it('returns empty pools for an unknown project', () => {
    const ctx = buildPlacementContext('no-such-project');
    expect(ctx.boundary).toBeNull();
    expect(ctx.zones).toEqual([]);
    expect(ctx.setbackRings).toEqual([]);
    expect(ctx.features.filter((f) => f.id.startsWith('ctx-'))).toEqual([]);
    expect(ctx.siteLayers).toEqual({ wetland: [], waterway: [] });
  });
});
