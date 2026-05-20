// @vitest-environment happy-dom
/**
 * seedGoalCompassCosts — intervention-catalog → WorkItem planned-cost band
 * seeding (Sub-project D3). Catalog `costRangeUSD` + a single maintenance
 * occurrence baseline; pure, no acreage scaling; covenant: strictly project
 * cost tracking (no financing/capital/investor framing).
 */

import { describe, it, expect } from 'vitest';
import type { WorkItem } from '@ogden/shared';
import { seedGoalCompassCosts } from '../goalCompassSpineSync.js';

function gc(id: string, intervention?: string): WorkItem {
  return {
    id,
    projectId: 'p1',
    source: 'goal-compass',
    overridden: false,
    createdAt: 'c',
    updatedAt: 'u',
    title: id,
    phaseId: null,
    status: 'todo',
    dependsOn: [],
    dependsOnAuto: [],
    precedesAuto: [],
    materialsAuto: [],
    equipmentRequiredAuto: [],
    generatedFromInterventionId: intervention,
  } as WorkItem;
}

const CATALOG = [
  {
    id: 'swale',
    costRangeUSD: { low: 1000, mid: 2000, high: 4000, perAcre: true },
    maintenanceSchedule: { costUSDPerOccurrence: 180 },
  },
  {
    id: 'nomaint',
    costRangeUSD: { low: 500, mid: 700, high: 900 },
  },
  { id: 'nocost', maintenanceSchedule: { costUSDPerOccurrence: 50 } },
];

describe('seedGoalCompassCosts', () => {
  it('seeds costRangeUSD + flat maintenance-occurrence baseline per band', () => {
    const map = seedGoalCompassCosts([gc('a', 'swale')], CATALOG);
    // perAcre carried as-authored (no acreage scaling); +180 per band.
    expect(map.get('a')).toEqual({ low: 1180, mid: 2180, high: 4180 });
  });

  it('seeds the base band unchanged when there is no maintenance cost', () => {
    const map = seedGoalCompassCosts([gc('b', 'nomaint')], CATALOG);
    expect(map.get('b')).toEqual({ low: 500, mid: 700, high: 900 });
  });

  it('skips items with no intervention, unknown intervention, or no catalog cost', () => {
    const map = seedGoalCompassCosts(
      [gc('none'), gc('ghost', 'missing'), gc('c', 'nocost')],
      CATALOG,
    );
    expect(map.size).toBe(0);
  });

  it('emits only a {low,mid,high} band — no financing/capital/investor semantics', () => {
    const map = seedGoalCompassCosts([gc('a', 'swale')], CATALOG);
    const v = map.get('a')!;
    expect(Object.keys(v).sort()).toEqual(['high', 'low', 'mid']);
    const json = JSON.stringify([...map.values()]);
    expect(json).not.toMatch(
      /interest|riba|invest|equity|capital|financ|loan|yield|return|salam|gharar/i,
    );
  });
});
