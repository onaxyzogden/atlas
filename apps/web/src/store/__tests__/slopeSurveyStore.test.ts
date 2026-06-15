// @vitest-environment happy-dom
/**
 * slopeSurveyStore — the two actions added so a drawn slope-gradient polygon
 * becomes selectable on the Plan canvas (Delete / Reshape / Reclassify):
 *   - updateClass: changes a polygon's slope class, leaving geometry/acreage
 *     untouched (the Reclassify popover).
 *   - findFeatureGlobal: resolves a feature's projectId from its (globally
 *     unique) id, so the registry/vertex handlers needn't thread projectId.
 *
 * Sibling coverage to vegetationSurveyStore.test; the per-class % math
 * (selectSlopeSurveyTotals) is exercised elsewhere.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  useSlopeSurveyStore,
  type SlopeSurveyFeature,
  type SlopeClassKey,
} from '../slopeSurveyStore.js';

// Minimal valid square ring — geometry content is irrelevant to these actions.
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
  slopeClass: SlopeClassKey,
  acreage: number,
  id = `slope-survey-${slopeClass}-${acreage}`,
): SlopeSurveyFeature {
  return { id, slopeClass, geometry: SQUARE, acreage, createdAt: '2026-06-14' };
}

function reset(): void {
  useSlopeSurveyStore.setState({
    byProject: {},
    active: false,
    activeProjectId: null,
  });
}

describe('slopeSurveyStore — updateClass', () => {
  beforeEach(reset);

  it('changes the slope class and leaves geometry + acreage intact', () => {
    const { addFeature, updateClass } = useSlopeSurveyStore.getState();
    const a = addFeature('p1', feat('gentle', 12));
    updateClass('p1', a.id, 'steep');
    const row = useSlopeSurveyStore.getState().listForProject('p1')[0]!;
    expect(row.slopeClass).toBe('steep');
    expect(row.acreage).toBe(12);
    expect(row.geometry).toEqual(SQUARE);
  });

  it('is a safe no-op for an absent feature', () => {
    expect(() =>
      useSlopeSurveyStore.getState().updateClass('p1', '__nope__', 'flat'),
    ).not.toThrow();
    expect(useSlopeSurveyStore.getState().listForProject('p1')).toHaveLength(0);
  });
});

describe('slopeSurveyStore — findFeatureGlobal', () => {
  beforeEach(reset);

  it('resolves a known id to its project + feature', () => {
    const { addFeature } = useSlopeSurveyStore.getState();
    addFeature('p1', feat('flat', 5, 's-a'));
    addFeature('p2', feat('extreme', 9, 's-b'));
    const hit = useSlopeSurveyStore.getState().findFeatureGlobal('s-b');
    expect(hit).not.toBeNull();
    expect(hit!.projectId).toBe('p2');
    expect(hit!.feature.slopeClass).toBe('extreme');
    expect(hit!.feature.acreage).toBe(9);
  });

  it('returns null for an unknown id', () => {
    useSlopeSurveyStore.getState().addFeature('p1', feat('moderate', 3, 's-a'));
    expect(useSlopeSurveyStore.getState().findFeatureGlobal('__nope__')).toBeNull();
  });
});
