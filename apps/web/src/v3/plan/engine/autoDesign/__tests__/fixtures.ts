/**
 * Shared fixtures for autoDesign tests: square zones with measured
 * area, a goal tree, and a site profile.
 */

import * as turf from '@turf/turf';
import type { Polygon } from 'geojson';
import type { AllocatorZone } from '../types.js';
import type { GoalTree, SiteProfile } from '../../../data/goalCompassTypes.js';
import { emptySiteProfile } from '../../../data/goalCompassTypes.js';

/** Axis-aligned square anchored at (lng0, lat0), `sideDeg` wide. */
export function squarePoly(
  lng0: number,
  lat0: number,
  sideDeg: number,
): Polygon {
  return {
    type: 'Polygon',
    coordinates: [
      [
        [lng0, lat0],
        [lng0 + sideDeg, lat0],
        [lng0 + sideDeg, lat0 + sideDeg],
        [lng0, lat0 + sideDeg],
        [lng0, lat0],
      ],
    ],
  };
}

export function makeZone(
  id: string,
  cfg: Partial<AllocatorZone> & { lng?: number; lat?: number; sideDeg?: number },
): AllocatorZone {
  const geometry =
    cfg.geometry ??
    squarePoly(cfg.lng ?? 0, cfg.lat ?? 0, cfg.sideDeg ?? 0.01);
  const areaM2 = cfg.areaM2 ?? turf.area(turf.feature(geometry));
  return {
    id,
    category: cfg.category ?? 'food_production',
    successionStage: cfg.successionStage ?? null,
    groundCover: cfg.groundCover ?? null,
    permacultureZone: cfg.permacultureZone,
    geometry,
    areaM2,
  };
}

/** Goal tree targeting livestock + food + water criteria so the
 *  sequencer selects a spread of interventions. */
export function makeGoalTree(): GoalTree {
  return {
    archetype: 'regenerative-farm',
    parentGoal: {
      id: 'pg',
      title: 'Regenerative farm',
      narrative: 'Test parent goal.',
    },
    subGoals: [
      {
        id: 'sg-food',
        title: 'Food sovereignty',
        criteria: [
          {
            id: 'food-sov-calories-pct',
            description: 'Calories grown on site',
            unit: 'pct',
            target: 40,
            deadlineYear: 5,
          },
          {
            id: 'food-sov-fruit-lbs',
            description: 'Fruit poundage',
            unit: 'lbs',
            target: 800,
            deadlineYear: 7,
          },
        ],
      },
      {
        id: 'sg-livestock',
        title: 'Livestock',
        criteria: [
          {
            id: 'livestock-paddocks-active-count',
            description: 'Active paddocks',
            unit: 'count',
            target: 8,
            deadlineYear: 3,
          },
          {
            id: 'livestock-protein-lbs',
            description: 'Livestock protein',
            unit: 'lbs',
            target: 500,
            deadlineYear: 3,
          },
        ],
      },
      {
        id: 'sg-water',
        title: 'Water security',
        criteria: [
          {
            id: 'water-self-sufficient-pct',
            description: 'Water self-sufficiency',
            unit: 'pct',
            target: 30,
            deadlineYear: 2,
          },
        ],
      },
    ],
  };
}

export function makeSiteProfile(projectId: string, acres = 30): SiteProfile {
  const p = emptySiteProfile(projectId);
  p.acres = { value: acres, provenance: 'manual' };
  p.avgSlopePct = { value: 8, provenance: 'manual' };
  p.soilCompaction = { value: 'med', provenance: 'manual' };
  p.household = { value: { adults: 2, children: 2 }, provenance: 'manual' };
  return p;
}
