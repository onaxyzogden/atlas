/**
 * communityMeetingPlace — pure-helper unit tests (no stores, no DOM).
 *
 * Covers the two framework-free concerns behind the communal-meeting marker:
 *   1. resolveMeetingPlaceCoords — point / feature-centroid / dangling /
 *      undesignated / non-finite.
 *   2. selectUpcomingCommunityMeetings — confirmed-only, kind filter, horizon
 *      bounds, edited-date override, spine done/cancelled drop, project scope,
 *      ascending sort.
 *
 * `todayISO` is injected (the helper never reads the clock) so every assertion
 * is deterministic.
 */

import { describe, it, expect } from 'vitest';
import type { BuiltEnvironmentEntity, CommunityWorkInstance } from '@ogden/shared';
import type { CommunityWorkProposal } from '../../../store/communityWorkPlanStore.js';
import {
  MEETING_DECISION_KINDS,
  resolveMeetingPlaceCoords,
  selectUpcomingCommunityMeetings,
} from '../communityMeetingPlace.js';

const TODAY = '2026-06-13';
const HORIZON = 90; // → horizon end ≈ 2026-09-11

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

function feature(over: Partial<BuiltEnvironmentEntity> = {}): BuiltEnvironmentEntity {
  const stamp = '2026-06-01T00:00:00.000Z';
  return {
    id: 'be-1',
    projectId: 'p1',
    kind: 'pavilion',
    state: 'existing',
    geometry: { type: 'Point', coordinates: [-80.1, 44.3] },
    createdAt: stamp,
    updatedAt: stamp,
    ...over,
  } as BuiltEnvironmentEntity;
}

function inst(over: Partial<CommunityWorkInstance> = {}): CommunityWorkInstance {
  return {
    key: 'cwp__governance__governance-meeting__2026-07-01',
    ruleKey: 'cwp__governance__governance-meeting',
    dueDate: '2026-07-01',
    kind: 'governance-meeting',
    title: 'Governance meeting — agreements & decisions',
    inputsHash: 'h1',
    ...over,
  };
}

function prop(
  instanceOver: Partial<CommunityWorkInstance> = {},
  propOver: Partial<CommunityWorkProposal> = {},
): CommunityWorkProposal {
  const instance = inst(instanceOver);
  return {
    id: `cwp-${instance.key}`,
    projectId: 'p1',
    instance,
    status: 'confirmed',
    confirmedWorkItemId: `cmw__${instance.key}`,
    ...propOver,
    createdAt: '2026-06-01T00:00:00.000Z',
    updatedAt: '2026-06-01T00:00:00.000Z',
  };
}

// ---------------------------------------------------------------------------
// resolveMeetingPlaceCoords
// ---------------------------------------------------------------------------

describe('resolveMeetingPlaceCoords', () => {
  it('returns null when undesignated', () => {
    expect(resolveMeetingPlaceCoords(undefined, [])).toBeNull();
  });

  it('returns a point designation’s coordinates verbatim', () => {
    expect(
      resolveMeetingPlaceCoords(
        { kind: 'point', coordinates: [-79.5, 43.65] },
        [],
      ),
    ).toEqual([-79.5, 43.65]);
  });

  it('returns null for a non-finite point (guards NaN / Infinity)', () => {
    expect(
      resolveMeetingPlaceCoords(
        { kind: 'point', coordinates: [Number.NaN, 44] },
        [],
      ),
    ).toBeNull();
    expect(
      resolveMeetingPlaceCoords(
        { kind: 'point', coordinates: [-80, Number.POSITIVE_INFINITY] },
        [],
      ),
    ).toBeNull();
  });

  it('resolves a feature designation to its geometry centroid (point → itself)', () => {
    const ent = feature({
      id: 'pav-1',
      geometry: { type: 'Point', coordinates: [-80.12, 44.31] },
    });
    expect(
      resolveMeetingPlaceCoords({ kind: 'feature', featureId: 'pav-1' }, [ent]),
    ).toEqual([-80.12, 44.31]);
  });

  it('resolves a polygon feature to a finite centroid coordinate', () => {
    const ent = feature({
      id: 'pav-poly',
      geometry: {
        type: 'Polygon',
        coordinates: [
          [
            [-80.2, 44.4],
            [-80.0, 44.4],
            [-80.0, 44.6],
            [-80.2, 44.6],
            [-80.2, 44.4],
          ],
        ],
      },
    });
    const coords = resolveMeetingPlaceCoords(
      { kind: 'feature', featureId: 'pav-poly' },
      [ent],
    );
    expect(coords).not.toBeNull();
    expect(Number.isFinite(coords![0])).toBe(true);
    expect(Number.isFinite(coords![1])).toBe(true);
    // Centroid lies inside the square's lng/lat span.
    expect(coords![0]).toBeGreaterThan(-80.2);
    expect(coords![0]).toBeLessThan(-80.0);
    expect(coords![1]).toBeGreaterThan(44.4);
    expect(coords![1]).toBeLessThan(44.6);
  });

  it('returns null for a dangling feature id (structure deleted)', () => {
    const ent = feature({ id: 'still-here' });
    expect(
      resolveMeetingPlaceCoords({ kind: 'feature', featureId: 'gone' }, [ent]),
    ).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// selectUpcomingCommunityMeetings
// ---------------------------------------------------------------------------

describe('selectUpcomingCommunityMeetings', () => {
  it('includes a confirmed, in-horizon meeting/decision kind', () => {
    const out = selectUpcomingCommunityMeetings([prop()], 'p1', TODAY, HORIZON);
    expect(out).toHaveLength(1);
    expect(out[0]).toMatchObject({
      title: 'Governance meeting — agreements & decisions',
      dueDate: '2026-07-01',
      kind: 'governance-meeting',
      workItemId: 'cmw__cwp__governance__governance-meeting__2026-07-01',
    });
  });

  it('excludes non-confirmed proposals (proposed / dismissed)', () => {
    const proposed = prop({}, { status: 'proposed' });
    const dismissed = prop(
      { key: 'cwp__governance__governance-meeting__2026-07-02', dueDate: '2026-07-02' },
      { status: 'dismissed' },
    );
    expect(
      selectUpcomingCommunityMeetings([proposed, dismissed], 'p1', TODAY, HORIZON),
    ).toEqual([]);
  });

  it('excludes kinds outside MEETING_DECISION_KINDS (e.g. onboarding-step)', () => {
    const onboarding = prop({ kind: 'onboarding-step' });
    expect(
      selectUpcomingCommunityMeetings([onboarding], 'p1', TODAY, HORIZON),
    ).toEqual([]);
    // The five gathering kinds are exactly the meeting set.
    expect([...MEETING_DECISION_KINDS].sort()).toEqual(
      [
        'adaptive-review',
        'commons-review',
        'five-year-review',
        'governance-meeting',
        'member-ratification',
      ].sort(),
    );
  });

  it('excludes meetings before today and beyond the horizon', () => {
    const past = prop({
      key: 'cwp__governance__governance-meeting__2026-06-01',
      dueDate: '2026-06-01',
    });
    const beyond = prop({
      key: 'cwp__governance__governance-meeting__2026-10-01',
      dueDate: '2026-10-01',
    });
    expect(
      selectUpcomingCommunityMeetings([past, beyond], 'p1', TODAY, HORIZON),
    ).toEqual([]);
  });

  it('includes a meeting due exactly today and exactly at the horizon edge', () => {
    const todayMeeting = prop({
      key: 'cwp__governance__governance-meeting__2026-06-13',
      dueDate: TODAY,
    });
    const edge = prop({
      key: 'cwp__governance__governance-meeting__2026-09-11',
      dueDate: '2026-09-11', // TODAY + 90d
    });
    const out = selectUpcomingCommunityMeetings(
      [todayMeeting, edge],
      'p1',
      TODAY,
      HORIZON,
    );
    expect(out.map((e) => e.dueDate)).toEqual([TODAY, '2026-09-11']);
  });

  it('honours an operator-edited dueDate over the instance dueDate', () => {
    // Instance date is beyond horizon, but the edited date pulls it in.
    const edited = prop(
      {
        key: 'cwp__governance__governance-meeting__2026-12-01',
        dueDate: '2026-12-01',
      },
      { editedFields: { dueDate: '2026-07-15' } },
    );
    const out = selectUpcomingCommunityMeetings([edited], 'p1', TODAY, HORIZON);
    expect(out).toHaveLength(1);
    expect(out[0]!.dueDate).toBe('2026-07-15');
  });

  it('drops entries whose spine row is done or cancelled', () => {
    const a = prop({
      key: 'cwp__governance__governance-meeting__2026-07-01',
      dueDate: '2026-07-01',
    });
    const b = prop({
      key: 'cwp__commons__commons-review__2026-07-05',
      ruleKey: 'cwp__commons__commons-review',
      kind: 'commons-review',
      dueDate: '2026-07-05',
    });
    const c = prop({
      key: 'cwp__adaptive__adaptive-review__2026-07-09',
      ruleKey: 'cwp__adaptive__adaptive-review',
      kind: 'adaptive-review',
      dueDate: '2026-07-09',
    });
    const spine = new Map<string, string>([
      [a.confirmedWorkItemId!, 'done'],
      [b.confirmedWorkItemId!, 'cancelled'],
      [c.confirmedWorkItemId!, 'todo'],
    ]);
    const out = selectUpcomingCommunityMeetings(
      [a, b, c],
      'p1',
      TODAY,
      HORIZON,
      spine,
    );
    expect(out.map((e) => e.kind)).toEqual(['adaptive-review']);
  });

  it('scopes to the project — other projects are ignored', () => {
    const mine = prop();
    const theirs = prop({}, { projectId: 'p2' });
    expect(
      selectUpcomingCommunityMeetings([mine, theirs], 'p1', TODAY, HORIZON),
    ).toHaveLength(1);
  });

  it('sorts ascending by due date', () => {
    const late = prop({
      key: 'cwp__governance__governance-meeting__2026-08-01',
      dueDate: '2026-08-01',
    });
    const early = prop({
      key: 'cwp__commons__commons-review__2026-06-20',
      ruleKey: 'cwp__commons__commons-review',
      kind: 'commons-review',
      dueDate: '2026-06-20',
    });
    const mid = prop({
      key: 'cwp__adaptive__adaptive-review__2026-07-10',
      ruleKey: 'cwp__adaptive__adaptive-review',
      kind: 'adaptive-review',
      dueDate: '2026-07-10',
    });
    const out = selectUpcomingCommunityMeetings(
      [late, early, mid],
      'p1',
      TODAY,
      HORIZON,
    );
    expect(out.map((e) => e.dueDate)).toEqual([
      '2026-06-20',
      '2026-07-10',
      '2026-08-01',
    ]);
  });
});
