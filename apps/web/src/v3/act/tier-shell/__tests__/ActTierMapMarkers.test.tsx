/**
 * @vitest-environment happy-dom
 *
 * ActTierMapMarkers -- one pin per objective, coloured by execution state.
 * This suite pins the Operational Role Layer de-emphasis contract (slice 4f):
 *   - no scope supplied  -> every pin full opacity, data-scope="in" (today).
 *   - scope supplied      -> out-of-scope pins DIM to 0.4 but stay on the map
 *     (never hide, only de-emphasize); in-scope + promoted pins stay full.
 *
 * maplibre-gl is mocked with a tiny spy Marker (a real GL context is impossible
 * under happy-dom); each instance captures its element + lng so we can read the
 * data-scope / opacity it was painted with and correlate it to an objective.
 */

import * as React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render } from '@testing-library/react';
import { scopeForRoles, findPlanStratumObjective } from '@ogden/shared';
import type { SurfaceReason } from '../../../roles/alwaysSurface.js';
import type { ObjectiveProgress } from '../objectiveProgress.js';

// Spy MapLibre -- hoisted so the mock factory and assertions share the same ref.
const gl = vi.hoisted(() => {
  const markers: Array<{
    element: HTMLElement;
    lng: number | null;
    added: boolean;
    removed: boolean;
  }> = [];
  class FakeMarker {
    element: HTMLElement;
    lng: number | null = null;
    added = false;
    removed = false;
    constructor(opts: { element: HTMLElement }) {
      this.element = opts.element;
      markers.push(this);
    }
    setLngLat(pos: [number, number]) {
      this.lng = pos[0];
      return this;
    }
    addTo() {
      this.added = true;
      return this;
    }
    remove() {
      this.removed = true;
    }
  }
  return { markers, FakeMarker };
});

vi.mock('../../../../lib/maplibre.js', () => ({
  maplibregl: { Marker: gl.FakeMarker },
}));

import ActTierMapMarkers from '../ActTierMapMarkers.js';

const map = {} as unknown as React.ComponentProps<
  typeof ActTierMapMarkers
>['map'];

// Real objectives straddling the FOOD scope boundary.
const IN = findPlanStratumObjective('s6-yield-flows')!; // plants-food -> IN
const OUT_WATER = findPlanStratumObjective('s5-water-strategy')!; // hydrology -> OUT
const OUT_STEWARD = findPlanStratumObjective('s1-stewardship')!; // people-gov -> OUT
const OBJECTIVES = [IN, OUT_WATER, OUT_STEWARD];

const FOOD = scopeForRoles(['food_production']); // { plants-food }

// Distinct lng per objective so each gets a pin and the marker is identifiable.
const POSITIONS: Readonly<Record<string, [number, number]>> = {
  [IN.id]: [-79.1, 43],
  [OUT_WATER.id]: [-79.2, 43],
  [OUT_STEWARD.id]: [-79.3, 43],
};
const PROGRESS: Readonly<Record<string, ObjectiveProgress>> = {};

const byLng = (lng: number) => gl.markers.find((m) => m.lng === lng)!;

beforeEach(() => {
  gl.markers.length = 0;
});

describe('ActTierMapMarkers (operational role scope)', () => {
  it('renders every objective at full opacity when no scope is supplied', () => {
    render(
      <ActTierMapMarkers
        map={map}
        positionByObjective={POSITIONS}
        objectives={OBJECTIVES}
        progressByObjective={PROGRESS}
        activeObjectiveId={null}
        onSelectObjective={vi.fn()}
      />,
    );
    expect(gl.markers).toHaveLength(3);
    for (const m of gl.markers) {
      expect(m.added).toBe(true);
      expect(m.element.style.opacity).toBe('1');
      expect(m.element.dataset.scope).toBe('in');
    }
  });

  it('dims out-of-scope pins, keeps in-scope + promoted pins full, removes none', () => {
    const surfaceMap = new Map<string, SurfaceReason[]>([
      ['s1-stewardship', ['open-review-flag']],
    ]);
    render(
      <ActTierMapMarkers
        map={map}
        positionByObjective={POSITIONS}
        objectives={OBJECTIVES}
        progressByObjective={PROGRESS}
        activeObjectiveId={null}
        onSelectObjective={vi.fn()}
        scopedDomains={FOOD}
        surfaceMap={surfaceMap}
      />,
    );
    // Never hide: all three pins still on the map.
    expect(gl.markers).toHaveLength(3);

    const inPin = byLng(-79.1);
    expect(inPin.element.dataset.scope).toBe('in');
    expect(inPin.element.style.opacity).toBe('1');

    const outPin = byLng(-79.2);
    expect(outPin.element.dataset.scope).toBe('out');
    expect(outPin.element.style.opacity).toBe('0.4');

    const promotedPin = byLng(-79.3);
    expect(promotedPin.element.dataset.scope).toBe('out-surfaced');
    expect(promotedPin.element.style.opacity).toBe('1');
  });
});
