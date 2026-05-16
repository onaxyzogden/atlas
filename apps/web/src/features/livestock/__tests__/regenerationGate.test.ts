import { describe, it, expect } from 'vitest';
import type { RegenerationPlan } from '../../../store/regenerationPlanStore.js';
import {
  findBlockingRegenerationPlan,
  selectActivePlans,
  type GateZone,
} from '../regenerationGate.js';

// A 0.01°-side square around the origin. Centroid (0.005, 0.005) is inside;
// (0.5, 0.5) is well outside.
const SQUARE: GeoJSON.Polygon = {
  type: 'Polygon',
  coordinates: [[[0, 0], [0, 0.01], [0.01, 0.01], [0.01, 0], [0, 0]]],
};

// A second square far to the east, used for the MultiPolygon case.
const FAR_SQUARE_RING = [
  [1, 1],
  [1, 1.01],
  [1.01, 1.01],
  [1.01, 1],
  [1, 1],
];

const MULTI: GeoJSON.MultiPolygon = {
  type: 'MultiPolygon',
  coordinates: [SQUARE.coordinates, [FAR_SQUARE_RING]],
};

const INSIDE: [number, number] = [0.005, 0.005];
const OUTSIDE: [number, number] = [0.5, 0.5];

function makePlan(o: Partial<RegenerationPlan> = {}): RegenerationPlan {
  return {
    id: 'plan-1',
    projectId: 'p1',
    zoneId: 'z1',
    targetState: 'pasture',
    baseline: {
      groundCover: 'barren',
      successionStage: 'disturbed',
      capturedAt: '2026-01-01T00:00:00Z',
      source: 'override',
    },
    thresholds: { groundCover: 'thriving-grasses', minSuccessionStage: 'mid' },
    pathwayMethodIds: [],
    startedAt: null,
    stewardReadinessConfirmedAt: null,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    ...o,
  };
}

const zone = (id: string, geometry: GeoJSON.Polygon | GeoJSON.MultiPolygon): GateZone => ({
  id,
  geometry,
});

describe('findBlockingRegenerationPlan', () => {
  it('blocks: point inside a zone whose plan is not steward-confirmed', () => {
    const blocking = findBlockingRegenerationPlan(
      INSIDE,
      [zone('z1', SQUARE)],
      [makePlan({ zoneId: 'z1', stewardReadinessConfirmedAt: null })],
    );
    expect(blocking?.id).toBe('plan-1');
  });

  it('does not block: plan is steward-confirmed (gate is open)', () => {
    const blocking = findBlockingRegenerationPlan(
      INSIDE,
      [zone('z1', SQUARE)],
      [makePlan({ zoneId: 'z1', stewardReadinessConfirmedAt: '2026-05-01T00:00:00Z' })],
    );
    expect(blocking).toBeNull();
  });

  it('does not block: point is outside the planned zone', () => {
    const blocking = findBlockingRegenerationPlan(
      OUTSIDE,
      [zone('z1', SQUARE)],
      [makePlan({ zoneId: 'z1' })],
    );
    expect(blocking).toBeNull();
  });

  it('does not block: a zone contains the point but has no plan', () => {
    const blocking = findBlockingRegenerationPlan(
      INSIDE,
      [zone('z1', SQUARE)],
      [makePlan({ zoneId: 'other-zone' })],
    );
    expect(blocking).toBeNull();
  });

  it('blocks: MultiPolygon zone whose first part contains the point', () => {
    const blocking = findBlockingRegenerationPlan(
      INSIDE,
      [zone('z1', MULTI)],
      [makePlan({ zoneId: 'z1' })],
    );
    expect(blocking?.id).toBe('plan-1');
  });

  it('does not crash when a plan references a missing zone', () => {
    const blocking = findBlockingRegenerationPlan(
      INSIDE,
      [zone('z1', SQUARE)],
      [makePlan({ id: 'p-missing', zoneId: 'ghost' })],
    );
    expect(blocking).toBeNull();
  });

  it('still blocks when an override was recorded but readiness not confirmed', () => {
    // The override is a recorded per-placement escape hatch, not a gate
    // disabler — `ready` stays false until steward confirmation.
    const blocking = findBlockingRegenerationPlan(
      INSIDE,
      [zone('z1', SQUARE)],
      [
        makePlan({
          zoneId: 'z1',
          stewardReadinessConfirmedAt: null,
          readinessOverride: { at: '2026-05-01T00:00:00Z', reason: 'prior placement' },
        }),
      ],
    );
    expect(blocking?.id).toBe('plan-1');
  });

  it('returns the unconfirmed plan, skipping a confirmed one', () => {
    const confirmed = makePlan({
      id: 'plan-confirmed',
      zoneId: 'z1',
      stewardReadinessConfirmedAt: '2026-05-01T00:00:00Z',
    });
    const unconfirmed = makePlan({ id: 'plan-open', zoneId: 'z2' });
    const blocking = findBlockingRegenerationPlan(
      INSIDE,
      [zone('z1', { type: 'Polygon', coordinates: [[[5, 5], [5, 6], [6, 6], [6, 5], [5, 5]]] }), zone('z2', SQUARE)],
      [confirmed, unconfirmed],
    );
    expect(blocking?.id).toBe('plan-open');
  });

  it('returns null for empty inputs', () => {
    expect(findBlockingRegenerationPlan(INSIDE, [], [])).toBeNull();
  });
});

describe('selectActivePlans', () => {
  it('returns only the mapped active plan for a zone, dropping scenarios', () => {
    const active = makePlan({ id: 'plan-active', zoneId: 'z1' });
    const scenario = makePlan({ id: 'plan-scenario', zoneId: 'z1' });
    const result = selectActivePlans(
      [active, scenario],
      { z1: 'plan-active' },
    );
    expect(result.map((p) => p.id)).toEqual(['plan-active']);
  });

  it('falls back to the most-recently-created plan when no mapping exists', () => {
    const older = makePlan({
      id: 'plan-old',
      zoneId: 'z1',
      createdAt: '2026-01-01T00:00:00Z',
    });
    const newer = makePlan({
      id: 'plan-new',
      zoneId: 'z1',
      createdAt: '2026-03-01T00:00:00Z',
    });
    const result = selectActivePlans([older, newer], {});
    expect(result.map((p) => p.id)).toEqual(['plan-new']);
  });

  it('falls back to most-recent when the mapping points at a deleted plan', () => {
    const survivor = makePlan({ id: 'plan-survivor', zoneId: 'z1' });
    const result = selectActivePlans([survivor], { z1: 'plan-gone' });
    expect(result.map((p) => p.id)).toEqual(['plan-survivor']);
  });

  it('selects one active plan per zone independently', () => {
    const a = makePlan({ id: 'a', zoneId: 'z1' });
    const aScenario = makePlan({ id: 'a2', zoneId: 'z1' });
    const b = makePlan({ id: 'b', zoneId: 'z2' });
    const result = selectActivePlans(
      [a, aScenario, b],
      { z1: 'a', z2: 'b' },
    );
    expect(result.map((p) => p.id).sort()).toEqual(['a', 'b']);
  });

  it('returns an empty list when there are no plans', () => {
    expect(selectActivePlans([], {})).toEqual([]);
  });
});

describe('gate keys on the active plan only', () => {
  it('does not block when the active plan is confirmed even if a scenario is unconfirmed', () => {
    const activeConfirmed = makePlan({
      id: 'plan-active',
      zoneId: 'z1',
      stewardReadinessConfirmedAt: '2026-05-01T00:00:00Z',
    });
    const scenarioUnconfirmed = makePlan({
      id: 'plan-scenario',
      zoneId: 'z1',
      stewardReadinessConfirmedAt: null,
    });
    const active = selectActivePlans(
      [activeConfirmed, scenarioUnconfirmed],
      { z1: 'plan-active' },
    );
    const blocking = findBlockingRegenerationPlan(
      INSIDE,
      [zone('z1', SQUARE)],
      active,
    );
    expect(blocking).toBeNull();
  });

  it('blocks when the active plan is unconfirmed even if a scenario is confirmed', () => {
    const activeUnconfirmed = makePlan({
      id: 'plan-active',
      zoneId: 'z1',
      stewardReadinessConfirmedAt: null,
    });
    const scenarioConfirmed = makePlan({
      id: 'plan-scenario',
      zoneId: 'z1',
      stewardReadinessConfirmedAt: '2026-05-01T00:00:00Z',
    });
    const active = selectActivePlans(
      [activeUnconfirmed, scenarioConfirmed],
      { z1: 'plan-active' },
    );
    const blocking = findBlockingRegenerationPlan(
      INSIDE,
      [zone('z1', SQUARE)],
      active,
    );
    expect(blocking?.id).toBe('plan-active');
  });
});
