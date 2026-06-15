// @vitest-environment happy-dom
/**
 * usePlanSnapTargets — survey-store fold. The hook now folds the drawn slope-
 * class (slopeSurveyStore) and vegetation-community (vegetationSurveyStore)
 * polygons into the snap-target set, so a survey draw can snap onto an adjacent
 * survey polygon's edge/corner (the highest-value survey snap, since per-class %
 * is computed from polygon acreage) as well as onto every other plan feature.
 *
 * Drives the real Zustand stores (node-safe idb persist backend) through
 * `renderHook`, seeds one polygon per store via `addFeature`, then asserts the
 * assembled `{ lines, vertices }` contains each ring + its corners — and that a
 * different project does NOT inherit them.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { renderHook, cleanup } from '@testing-library/react';
import { usePlanSnapTargets } from '../usePlanSnapTargets.js';
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

describe('usePlanSnapTargets — survey-store fold', () => {
  it('includes both survey polygons (ring as a line, corners as vertices) for the seeded project', () => {
    const { result } = renderHook(() => usePlanSnapTargets('proj-1'));
    const { lines, vertices } = result.current();

    expect(lines).toContainEqual(SLOPE_RING);
    expect(lines).toContainEqual(VEG_RING);
    expect(vertices).toContainEqual([0, 0]);
    expect(vertices).toContainEqual([5, 5]);
  });

  it('does not leak another project\'s survey polygons', () => {
    const { result } = renderHook(() => usePlanSnapTargets('proj-2'));
    const { lines } = result.current();

    expect(lines).not.toContainEqual(SLOPE_RING);
    expect(lines).not.toContainEqual(VEG_RING);
  });
});
