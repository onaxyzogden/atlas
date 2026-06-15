// @vitest-environment happy-dom
/**
 * useObserveSnapTargets — survey-store fold. Mirror of the Plan-side fold: the
 * Observe snap-target builder now also folds the drawn slope-class and
 * vegetation-community polygons in, so an Observe draw can snap onto a drawn
 * survey polygon's edge/corner.
 *
 * Same shape as usePlanSnapTargetsSurvey.test: real Zustand stores seeded via
 * `addFeature`, asserting each ring lands in `lines` and its corners in
 * `vertices`, scoped to the seeded project.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { renderHook, cleanup } from '@testing-library/react';
import { useObserveSnapTargets } from '../useObserveSnapTargets.js';
import { useSlopeSurveyStore } from '../../../../../store/slopeSurveyStore.js';
import { useVegetationSurveyStore } from '../../../../../store/vegetationSurveyStore.js';

const SLOPE_RING: [number, number][] = [
  [0, 0],
  [0, 1],
  [1, 1],
  [1, 0],
  [0, 0],
];
const SLOPE_POLY: GeoJSON.Polygon = { type: 'Polygon', coordinates: [SLOPE_RING] };

const VEG_RING: [number, number][] = [
  [5, 5],
  [5, 6],
  [6, 6],
  [6, 5],
  [5, 5],
];
const VEG_POLY: GeoJSON.Polygon = { type: 'Polygon', coordinates: [VEG_RING] };

beforeEach(() => {
  useSlopeSurveyStore.setState({ byProject: {}, active: false, activeProjectId: null });
  useVegetationSurveyStore.setState({
    byProject: {},
    active: false,
    activeProjectId: null,
    activeCommunity: null,
  });
  useSlopeSurveyStore
    .getState()
    .addFeature('proj-1', { slopeClass: 'gentle', geometry: SLOPE_POLY, acreage: 5 });
  useVegetationSurveyStore
    .getState()
    .addFeature('proj-1', { community: 'riparian', geometry: VEG_POLY, acreage: 5 });
});
afterEach(cleanup);

describe('useObserveSnapTargets — survey-store fold', () => {
  it('includes both survey polygons (ring as a line, corners as vertices) for the seeded project', () => {
    const { result } = renderHook(() => useObserveSnapTargets('proj-1'));
    const { lines, vertices } = result.current();

    expect(lines).toContainEqual(SLOPE_RING);
    expect(lines).toContainEqual(VEG_RING);
    expect(vertices).toContainEqual([0, 0]);
    expect(vertices).toContainEqual([5, 5]);
  });

  it('does not leak another project\'s survey polygons', () => {
    const { result } = renderHook(() => useObserveSnapTargets('proj-2'));
    const { lines } = result.current();

    expect(lines).not.toContainEqual(SLOPE_RING);
    expect(lines).not.toContainEqual(VEG_RING);
  });
});
