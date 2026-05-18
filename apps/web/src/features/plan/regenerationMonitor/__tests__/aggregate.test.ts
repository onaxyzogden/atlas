import { describe, it, expect } from 'vitest';
import type { RegenerationEvent } from '@ogden/shared';
import {
  buildTrajectories,
  flattenGoalTargets,
  SITE_WIDE_ZONE,
  type GoalTargetLookup,
} from '../aggregate.js';

function ev(
  eventDate: string,
  observations: Record<string, unknown>,
): RegenerationEvent {
  return {
    id: `00000000-0000-0000-0000-${Math.random().toString(16).slice(2, 14).padEnd(12, '0')}`,
    projectId: '00000000-0000-0000-0000-000000000001',
    authorId: '00000000-0000-0000-0000-000000000002',
    eventType: 'observation',
    interventionType: null,
    phase: null,
    progress: 'observed',
    title: 'sample',
    notes: null,
    eventDate,
    location: null,
    areaHa: null,
    observations,
    mediaUrls: [],
    parentEventId: null,
    createdAt: eventDate,
    updatedAt: eventDate,
  };
}

const SOIL_OM_GOAL: GoalTargetLookup = {
  'regen-soil-om': { target: 4, deadlineYear: 7 },
};

function omTraj(events: RegenerationEvent[], goal = SOIL_OM_GOAL) {
  const t = buildTrajectories(events, goal).find((x) => x.key === 'soil_om_pct');
  if (!t) throw new Error('soil_om_pct trajectory missing');
  return t;
}

describe('buildTrajectories', () => {
  it('always returns every monitored metric, even with no events', () => {
    const trajs = buildTrajectories([], {});
    expect(trajs).toHaveLength(10);
    for (const t of trajs) {
      expect(t.series).toEqual([]);
      expect(t.baseline).toBeNull();
      expect(t.verdict).toBe('no-target');
    }
  });

  it('picks the earliest dated sample as the baseline (year 0)', () => {
    const t = omTraj([
      ev('2022-06-01', { soil_om_pct: 3 }),
      ev('2020-01-01', { soil_om_pct: 2 }),
      ev('2021-03-01', { soil_om_pct: 2.5 }),
    ]);
    expect(t.baseline).toEqual({ date: '2020-01-01', value: 2 });
    expect(t.latest).toEqual({ date: '2022-06-01', value: 3 });
  });

  it('groups samples per zone and sorts each series ascending', () => {
    const t = omTraj([
      ev('2021-01-01', { soil_om_pct: 3, zoneRef: 'North' }),
      ev('2020-01-01', { soil_om_pct: 2, zoneRef: 'North' }),
      ev('2020-06-01', { soil_om_pct: 2.2, zoneRef: 'South' }),
    ]);
    expect(t.series.map((s) => s.zoneRef)).toEqual(['North', 'South']);
    const north = t.series.find((s) => s.zoneRef === 'North')!;
    expect(north.points.map((p) => p.date)).toEqual([
      '2020-01-01',
      '2021-01-01',
    ]);
  });

  it('defaults missing zoneRef to the site-wide bucket', () => {
    const t = omTraj([ev('2020-01-01', { soil_om_pct: 2 })]);
    expect(t.series[0]!.zoneRef).toBe(SITE_WIDE_ZONE);
  });

  it('verdict is on-track when latest meets the linear pace', () => {
    // 7-yr window, baseline 2 → target 4. After ~3.5 yr expected ≈ 3.0.
    const t = omTraj([
      ev('2020-01-01', { soil_om_pct: 2 }),
      ev('2023-07-01', { soil_om_pct: 3.2 }),
    ]);
    expect(t.verdict).toBe('on-track');
    expect(t.expectedNow).toBeGreaterThan(2.9);
    expect(t.expectedNow).toBeLessThan(3.1);
  });

  it('verdict is lagging when latest falls below the pace line', () => {
    const t = omTraj([
      ev('2020-01-01', { soil_om_pct: 2 }),
      ev('2023-07-01', { soil_om_pct: 2.3 }),
    ]);
    expect(t.verdict).toBe('lagging');
  });

  it('clamps expected progress at the target after the deadline', () => {
    const t = omTraj([
      ev('2020-01-01', { soil_om_pct: 2 }),
      ev('2030-01-01', { soil_om_pct: 4 }),
    ]);
    expect(t.expectedNow).toBeCloseTo(4, 5);
    expect(t.verdict).toBe('on-track');
  });

  it('reports insufficient-data with a single sample', () => {
    const t = omTraj([ev('2020-01-01', { soil_om_pct: 2 })]);
    expect(t.verdict).toBe('insufficient-data');
    expect(t.expectedNow).toBeNull();
  });

  it('reports no-target for a metric not wired to the goal tree', () => {
    const t = buildTrajectories(
      [ev('2020-01-01', { microbial_biomass_index: 100 })],
      SOIL_OM_GOAL,
    ).find((x) => x.key === 'microbial_biomass_index')!;
    expect(t.verdict).toBe('no-target');
    expect(t.target).toBeNull();
  });

  it('inverts the verdict for lower-is-better metrics (bulk density)', () => {
    const goal: GoalTargetLookup = {
      'regen-bulk-density': { target: 1.0, deadlineYear: 5 },
    };
    // bulk_density has no goalCriterionId in the registry → stays no-target
    // regardless of the lookup, so falling values are only charted.
    const t = buildTrajectories(
      [
        ev('2020-01-01', { bulk_density: 1.4 }),
        ev('2023-01-01', { bulk_density: 1.2 }),
      ],
      goal,
    ).find((x) => x.key === 'bulk_density')!;
    expect(t.higherIsBetter).toBe(false);
    expect(t.verdict).toBe('no-target');
  });
});

describe('flattenGoalTargets', () => {
  it('flattens sub-goal criteria into a criterionId lookup', () => {
    const lookup = flattenGoalTargets([
      {
        criteria: [
          { id: 'regen-soil-om', target: 4, deadlineYear: 7 },
          { id: 'regen-soil-cover', target: 90, deadlineYear: 3 },
        ],
      },
      { criteria: [{ id: 'regen-water-infiltration', target: 75, deadlineYear: 5 }] },
    ]);
    expect(lookup['regen-soil-om']).toEqual({ target: 4, deadlineYear: 7 });
    expect(lookup['regen-water-infiltration']).toEqual({
      target: 75,
      deadlineYear: 5,
    });
  });
});
