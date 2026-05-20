// @vitest-environment happy-dom
/**
 * usePlacedFeatures — selector + helpers unit tests.
 *
 * Covers the pure helpers (centroidOf, rollupRows) and validates that
 * the hook respects per-stage scoping. The hook itself is exercised via
 * a synthetic store state primed by writing localStorage before render
 * is unnecessary — instead, the underlying stores expose setState which
 * the test uses directly.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import {
  centroidOf,
  rollupRows,
  usePlacedFeatures,
  type PlacedFeatureRow,
} from './usePlacedFeatures.js';
import { useBuiltEnvironmentStoreV2 } from '../../../store/builtEnvironmentStoreV2.js';
import { useLandDesignStore } from '../../../store/landDesignStore.js';
import { useZoneStore, type LandZone } from '../../../store/zoneStore.js';
import type { BuiltEnvironmentEntity } from '@ogden/shared';
import type { DesignElement } from '../../../store/designElementsStore.js';

const PROJECT = 'test-project';

function makeBuilt(
  id: string,
  kind: BuiltEnvironmentEntity['kind'],
  state: 'existing' | 'proposed',
): BuiltEnvironmentEntity {
  return {
    id,
    projectId: PROJECT,
    kind,
    state,
    geometry: { type: 'Point', coordinates: [10, 20] },
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    existing: state === 'existing' ? {} : undefined,
    proposed: state === 'proposed' ? {} : undefined,
  } as BuiltEnvironmentEntity;
}

function makeDesign(id: string, kind: string): DesignElement {
  return {
    id,
    category: 'grazing',
    kind,
    geometry: {
      type: 'Polygon',
      coordinates: [[[0, 0], [2, 0], [2, 2], [0, 2], [0, 0]]],
    },
    phase: 'climate' as DesignElement['phase'],
    createdAt: '2026-01-01T00:00:00Z',
  };
}

function makeZone(id: string, name: string): LandZone {
  return {
    id,
    projectId: PROJECT,
    name,
    category: 'habitation',
    color: '#abcdef',
    primaryUse: '',
    secondaryUse: '',
    notes: '',
    geometry: {
      type: 'Polygon',
      coordinates: [[[0, 0], [4, 0], [4, 4], [0, 4], [0, 0]]],
    },
    areaM2: 16,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  };
}

function resetStores() {
  useBuiltEnvironmentStoreV2.setState({ entities: [] });
  useLandDesignStore.setState({ byProject: {} });
  useZoneStore.setState({ zones: [] });
}

describe('centroidOf', () => {
  it('returns the coordinates for a Point', () => {
    expect(centroidOf({ type: 'Point', coordinates: [5, 7] })).toEqual([5, 7]);
  });

  it('returns the mid vertex for a LineString', () => {
    expect(
      centroidOf({
        type: 'LineString',
        coordinates: [[0, 0], [2, 2], [4, 4]],
      }),
    ).toEqual([2, 2]);
  });

  it('averages the outer ring for a Polygon', () => {
    const c = centroidOf({
      type: 'Polygon',
      coordinates: [[[0, 0], [4, 0], [4, 4], [0, 4], [0, 0]]],
    });
    expect(c).not.toBeNull();
    expect(c![0]).toBeCloseTo(1.6);
    expect(c![1]).toBeCloseTo(1.6);
  });

  it('returns null for unsupported geometry', () => {
    expect(centroidOf(null)).toBeNull();
    expect(centroidOf({ type: 'Polygon', coordinates: [] })).toBeNull();
  });
});

describe('rollupRows', () => {
  it('totals + groups by groupLabel', () => {
    const rows: PlacedFeatureRow[] = [
      { rowKey: 'a', id: 'a', source: 'built', kind: 'building', groupLabel: 'Buildings', label: 'A', color: '#000', centroid: null, hidden: false },
      { rowKey: 'b', id: 'b', source: 'built', kind: 'building', groupLabel: 'Buildings', label: 'B', color: '#000', centroid: null, hidden: false },
      { rowKey: 'c', id: 'c', source: 'design', kind: 'paddock', groupLabel: 'Paddocks', label: 'C', color: '#0f0', centroid: null, hidden: false },
    ];
    const r = rollupRows(rows);
    expect(r.total).toBe(3);
    expect(r.perGroup).toEqual([
      { groupLabel: 'Buildings', count: 2 },
      { groupLabel: 'Paddocks', count: 1 },
    ]);
  });

  it('returns empty rollup for empty input', () => {
    expect(rollupRows([])).toEqual({ total: 0, perGroup: [] });
  });
});

describe('usePlacedFeatures', () => {
  beforeEach(() => {
    resetStores();
  });

  it('returns empty when projectId is null', () => {
    const { result } = renderHook(() => usePlacedFeatures('plan', null));
    expect(result.current.rows).toEqual([]);
  });

  it('observe stage shows existing built + zones, hides design + proposed', () => {
    useBuiltEnvironmentStoreV2.setState({
      entities: [
        makeBuilt('b1', 'building', 'existing'),
        makeBuilt('b2', 'building', 'proposed'),
      ],
    });
    useLandDesignStore.setState({
      byProject: { [PROJECT]: [makeDesign('d1', 'paddock')] },
    });
    useZoneStore.setState({ zones: [makeZone('z1', 'Home')] });

    const { result } = renderHook(() => usePlacedFeatures('observe', PROJECT));
    const sources = result.current.rows.map((r) => r.source).sort();
    expect(sources).toEqual(['built', 'zone']);
    expect(result.current.rows.find((r) => r.id === 'b1')).toBeDefined();
    expect(result.current.rows.find((r) => r.id === 'b2')).toBeUndefined();
    expect(result.current.rows.find((r) => r.id === 'd1')).toBeUndefined();
  });

  it('plan stage shows proposed built + design + zones, hides existing', () => {
    useBuiltEnvironmentStoreV2.setState({
      entities: [
        makeBuilt('b1', 'building', 'existing'),
        makeBuilt('b2', 'building', 'proposed'),
      ],
    });
    useLandDesignStore.setState({
      byProject: { [PROJECT]: [makeDesign('d1', 'paddock')] },
    });
    useZoneStore.setState({ zones: [makeZone('z1', 'Home')] });

    const { result } = renderHook(() => usePlacedFeatures('plan', PROJECT));
    const ids = result.current.rows.map((r) => r.id).sort();
    expect(ids).toEqual(['b2', 'd1', 'z1']);
  });

  it('filters by projectId', () => {
    useZoneStore.setState({
      zones: [
        makeZone('z1', 'Home'),
        { ...makeZone('z2', 'Other'), projectId: 'OTHER' },
      ],
    });
    const { result } = renderHook(() => usePlacedFeatures('plan', PROJECT));
    expect(result.current.rows.map((r) => r.id)).toEqual(['z1']);
  });

  it('hides auto-design draft elements', () => {
    useLandDesignStore.setState({
      byProject: {
        [PROJECT]: [
          makeDesign('d1', 'paddock'),
          { ...makeDesign('d2', 'paddock'), draft: true },
        ],
      },
    });
    const { result } = renderHook(() => usePlacedFeatures('plan', PROJECT));
    expect(result.current.rows.map((r) => r.id)).toEqual(['d1']);
  });

  it('sorts by group then label', () => {
    useZoneStore.setState({
      zones: [makeZone('z1', 'Beta'), makeZone('z2', 'Alpha')],
    });
    const { result } = renderHook(() => usePlacedFeatures('plan', PROJECT));
    expect(result.current.rows.map((r) => r.label)).toEqual(['Alpha', 'Beta']);
  });

  it('threads `hidden` through from each source onto the row', () => {
    useBuiltEnvironmentStoreV2.setState({
      entities: [
        { ...makeBuilt('b1', 'building', 'proposed'), hidden: true },
      ],
    });
    useLandDesignStore.setState({
      byProject: {
        [PROJECT]: [{ ...makeDesign('d1', 'paddock'), hidden: true }],
      },
    });
    useZoneStore.setState({
      zones: [{ ...makeZone('z1', 'Home'), hidden: true }],
    });
    const { result } = renderHook(() => usePlacedFeatures('plan', PROJECT));
    const rows = result.current.rows;
    expect(rows.find((r) => r.id === 'b1')?.hidden).toBe(true);
    expect(rows.find((r) => r.id === 'd1')?.hidden).toBe(true);
    expect(rows.find((r) => r.id === 'z1')?.hidden).toBe(true);
  });

  it('keeps hidden rows in the list (does not filter them out)', () => {
    useZoneStore.setState({
      zones: [
        makeZone('z1', 'Visible'),
        { ...makeZone('z2', 'Hidden'), hidden: true },
      ],
    });
    const { result } = renderHook(() => usePlacedFeatures('plan', PROJECT));
    expect(result.current.rows.map((r) => r.id).sort()).toEqual(['z1', 'z2']);
  });
});
