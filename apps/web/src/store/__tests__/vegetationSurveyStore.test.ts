// @vitest-environment happy-dom
/**
 * vegetationSurveyStore — drawn vegetation-community survey (s2-ecology-c1).
 *
 * The substantive behaviour this feature promises is "percentages are
 * calculated automatically" from drawn polygon acreage. These tests pin that
 * math (selectVegetationSurveyTotals) deterministically — summed acres per
 * community, % of site, the unclassified remainder, and the divide-by-zero /
 * bad-acreage guards — plus the persisted byProject mutations and the
 * ephemeral takeover flags.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  useVegetationSurveyStore,
  selectVegetationSurveyTotals,
  type VegetationSurveyFeature,
  type VegCommunityKey,
} from '../vegetationSurveyStore.js';

// Geometry is irrelevant to the selector (it consumes the precomputed
// `acreage`); a minimal valid square ring keeps the GeoJSON.Polygon type happy.
const SQUARE: GeoJSON.Polygon = {
  type: 'Polygon',
  coordinates: [
    [
      [0, 0],
      [0, 1],
      [1, 1],
      [1, 0],
      [0, 0],
    ],
  ],
};

function feat(
  community: VegCommunityKey,
  acreage: number,
  id = `f-${community}-${acreage}`,
): VegetationSurveyFeature {
  return { id, community, geometry: SQUARE, acreage, createdAt: '2026-06-10' };
}

function reset(): void {
  useVegetationSurveyStore.setState({
    byProject: {},
    active: false,
    activeProjectId: null,
    activeCommunity: null,
  });
}

describe('selectVegetationSurveyTotals — auto % of site', () => {
  it('empty survey: 0 total acres, fully unclassified', () => {
    const t = selectVegetationSurveyTotals([], 100);
    expect(t.totalAcres).toBe(0);
    expect(t.byCommunity).toEqual({});
    expect(t.unclassifiedPct).toBe(100);
  });

  it('single community: pct = acres / site * 100; remainder is unclassified', () => {
    const t = selectVegetationSurveyTotals([feat('riparian', 25)], 100);
    expect(t.totalAcres).toBe(25);
    expect(t.byCommunity['riparian']).toEqual({ acres: 25, pct: 25, count: 1 });
    expect(t.unclassifiedPct).toBe(75);
  });

  it('sums multiple polygons of the same community and keeps a count', () => {
    const t = selectVegetationSurveyTotals(
      [feat('cleared', 10, 'a'), feat('cleared', 30, 'b')],
      200,
    );
    expect(t.byCommunity['cleared']).toEqual({ acres: 40, pct: 20, count: 2 });
    expect(t.unclassifiedPct).toBe(80);
  });

  it('computes communities independently and shrinks the remainder', () => {
    const t = selectVegetationSurveyTotals(
      [feat('cleared', 25), feat('riparian', 5), feat('wetland', 20)],
      100,
    );
    expect(t.byCommunity['cleared']!.pct).toBe(25);
    expect(t.byCommunity['riparian']!.pct).toBe(5);
    expect(t.byCommunity['wetland']!.pct).toBe(20);
    expect(t.totalAcres).toBe(50);
    expect(t.unclassifiedPct).toBe(50);
  });

  it('clamps the unclassified remainder at 0 when drawn area exceeds the site', () => {
    const t = selectVegetationSurveyTotals(
      [feat('cleared', 80), feat('riparian', 80)],
      100,
    );
    expect(t.unclassifiedPct).toBe(0);
  });

  it('guards divide-by-zero: site acreage 0 yields 0% (not NaN/Infinity)', () => {
    const t = selectVegetationSurveyTotals([feat('cleared', 10)], 0);
    expect(t.byCommunity['cleared']!.pct).toBe(0);
    expect(Number.isFinite(t.byCommunity['cleared']!.pct)).toBe(true);
    expect(t.unclassifiedPct).toBe(100);
  });

  it('ignores non-finite and non-positive acreage in the sum', () => {
    const t = selectVegetationSurveyTotals(
      [
        feat('cleared', Number.NaN, 'nan'),
        feat('cleared', -5, 'neg'),
        feat('cleared', 10, 'ok'),
      ],
      100,
    );
    expect(t.byCommunity['cleared']!.acres).toBe(10);
    expect(t.totalAcres).toBe(10);
  });
});

describe('vegetationSurveyStore — persisted byProject mutations', () => {
  beforeEach(reset);

  it('addFeature assigns an id + createdAt and stores under the project', () => {
    const created = useVegetationSurveyStore
      .getState()
      .addFeature('p1', { community: 'riparian', geometry: SQUARE, acreage: 3 });
    expect(created.id).toBeTruthy();
    expect(created.createdAt).toBeTruthy();
    expect(useVegetationSurveyStore.getState().listForProject('p1')).toHaveLength(1);
  });

  it('removeFeature drops only the matching feature', () => {
    const { addFeature, removeFeature } = useVegetationSurveyStore.getState();
    const a = addFeature('p1', { community: 'cleared', geometry: SQUARE, acreage: 1 });
    addFeature('p1', { community: 'wetland', geometry: SQUARE, acreage: 2 });
    removeFeature('p1', a.id);
    const list = useVegetationSurveyStore.getState().listForProject('p1');
    expect(list).toHaveLength(1);
    expect(list[0]!.community).toBe('wetland');
  });

  it('updateGeometry replaces geometry and recomputed acreage', () => {
    const { addFeature, updateGeometry } = useVegetationSurveyStore.getState();
    const a = addFeature('p1', { community: 'cleared', geometry: SQUARE, acreage: 1 });
    updateGeometry('p1', a.id, SQUARE, 42);
    expect(
      useVegetationSurveyStore.getState().listForProject('p1')[0]!.acreage,
    ).toBe(42);
  });

  it('isolates features across projects', () => {
    const { addFeature } = useVegetationSurveyStore.getState();
    addFeature('p1', { community: 'cleared', geometry: SQUARE, acreage: 1 });
    addFeature('p2', { community: 'wetland', geometry: SQUARE, acreage: 2 });
    expect(useVegetationSurveyStore.getState().listForProject('p1')).toHaveLength(1);
    expect(useVegetationSurveyStore.getState().listForProject('p2')).toHaveLength(1);
  });
});

describe('vegetationSurveyStore — ephemeral takeover flags', () => {
  beforeEach(reset);

  it('open sets active + activeProjectId and clears the armed community', () => {
    useVegetationSurveyStore.getState().setActiveCommunity('riparian');
    useVegetationSurveyStore.getState().open('p1');
    const s = useVegetationSurveyStore.getState();
    expect(s.active).toBe(true);
    expect(s.activeProjectId).toBe('p1');
    expect(s.activeCommunity).toBeNull();
  });

  it('close resets all ephemeral flags', () => {
    const st = useVegetationSurveyStore.getState();
    st.open('p1');
    st.setActiveCommunity('wetland');
    st.close();
    const s = useVegetationSurveyStore.getState();
    expect(s.active).toBe(false);
    expect(s.activeProjectId).toBeNull();
    expect(s.activeCommunity).toBeNull();
  });
});
