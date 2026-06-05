/**
 * @vitest-environment happy-dom
 *
 * WaterRouterCard — Rec #3 v2 one-click "move to suggested catchment" test.
 * Seeds a water tank placed low in the watershed (flagged LOW POTENTIAL) plus
 * an elevation summary, then clicks "Move to suggested catchment" and asserts
 * the element's geometry is rewritten uphill (higher latitude) via
 * landDesignStore.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import WaterRouterCard from '../WaterRouterCard.js';
import { useLandDesignStore } from '../../../../../store/landDesignStore.js';
import { useSiteDataStore } from '../../../../../store/siteDataStore.js';
import type { DesignElement } from '../../../../../store/designElementsStore.js';
import type { LocalProject } from '../../../../../store/projectStore.js';

const PROJECT_ID = 'p1';

// ~200 m square parcel; downhill bearing 'S' ⇒ uphill is north (+lat).
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

const project = {
  id: PROJECT_ID,
  parcelBoundaryGeojson: PARCEL,
} as LocalProject;

// A tank near the south (low) edge — squanders gravity head.
function lowTank(): DesignElement {
  return {
    id: 'tank1',
    category: 'water',
    kind: 'water-tank',
    label: 'South tank',
    geometry: { type: 'Point', coordinates: [0.0009, 0.0001] },
    phase: 'water',
  } as DesignElement;
}

function seedElevation(): void {
  useSiteDataStore.setState({
    dataByProject: {
      [PROJECT_ID]: {
        layers: [
          {
            layerType: 'elevation',
            summary: {
              min_elevation_m: 100,
              max_elevation_m: 200,
              predominant_aspect: 'S',
            },
          },
        ],
        isLive: false,
        liveCount: 0,
        fetchedAt: Date.now(),
        status: 'complete',
      },
    },
  } as never);
}

beforeEach(() => {
  localStorage.clear();
  useLandDesignStore.setState({ byProject: {} });
  useSiteDataStore.setState({ dataByProject: {} });
});

describe('WaterRouterCard — Rec #3 v2', () => {
  it('flags a low-placed tank and moves it uphill on click', () => {
    seedElevation();
    useLandDesignStore.setState({ byProject: { [PROJECT_ID]: [lowTank()] } });

    render(<WaterRouterCard project={project} onSwitchToMap={() => {}} />);

    expect(screen.getByText('LOW POTENTIAL')).toBeTruthy();

    const before = useLandDesignStore.getState().byProject[PROJECT_ID]![0]!
      .geometry as GeoJSON.Point;
    const latBefore = before.coordinates[1]!;

    fireEvent.click(screen.getByText('Move to suggested catchment'));

    const after = useLandDesignStore.getState().byProject[PROJECT_ID]![0]!
      .geometry as GeoJSON.Point;
    expect(after.type).toBe('Point');
    // Uphill is north (+lat): the tank should move to a higher latitude.
    expect(after.coordinates[1]!).toBeGreaterThan(latBefore);
  });
});
