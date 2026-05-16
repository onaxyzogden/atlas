// @vitest-environment happy-dom
/**
 * regenerationPlanStore — steward-authored regeneration plans, 1:1 with a
 * troubled LandZone. This store is the steward's truth: it never writes
 * BuildPhase rows (the system-forced barren obligation is adopted via the
 * acknowledgedRegenerationZoneIds seam, not duplicated here).
 *
 * Covers the Phase-1 contract: create-from-zone with a baseline snapshot,
 * start the pathway, confirm readiness (the gate flip), record an override
 * (the recorded escape hatch), persist round-trip, and zundo undo/redo.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  useRegenerationPlanStore,
  DEFAULT_REGEN_THRESHOLDS,
  migrateRegenPlans,
  type RegenerationBaseline,
} from '../regenerationPlanStore.js';

const baseline: RegenerationBaseline = {
  groundCover: 'barren',
  successionStage: 'disturbed',
  capturedAt: '2026-05-16T00:00:00.000Z',
  source: 'derived',
};

function tquery<T>(
  fn: (t: {
    undo: () => void;
    redo: () => void;
    clear: () => void;
    pastStates: unknown[];
  }) => T,
): T {
  return fn(
    (
      useRegenerationPlanStore as unknown as {
        temporal: {
          getState: () => {
            undo: () => void;
            redo: () => void;
            clear: () => void;
            pastStates: unknown[];
          };
        };
      }
    ).temporal.getState(),
  );
}

describe('regenerationPlanStore', () => {
  beforeEach(() => {
    useRegenerationPlanStore.setState({ plans: [], activePlanIdByZone: {} });
    tquery((t) => t.clear());
    if (typeof localStorage !== 'undefined') localStorage.clear();
  });

  it('creates a plan from a zone, snapshotting the baseline and applying defaults', () => {
    const plan = useRegenerationPlanStore.getState().createPlan({
      projectId: 'p1',
      zoneId: 'z1',
      baseline,
    });

    expect(plan.id).toBeTruthy();
    expect(plan.projectId).toBe('p1');
    expect(plan.zoneId).toBe('z1');
    expect(plan.targetState).toBe('pasture');
    expect(plan.baseline).toEqual(baseline);
    expect(plan.thresholds).toEqual(DEFAULT_REGEN_THRESHOLDS);
    expect(plan.pathwayMethodIds).toEqual([]);
    expect(plan.startedAt).toBeNull();
    expect(plan.stewardReadinessConfirmedAt).toBeNull();
    expect(plan.readinessOverride).toBeUndefined();
    expect(plan.createdAt).toBeTruthy();
    expect(plan.updatedAt).toBeTruthy();
    expect(useRegenerationPlanStore.getState().plans).toHaveLength(1);
  });

  it('honours an explicit target, thresholds, and pathway selection', () => {
    const plan = useRegenerationPlanStore.getState().createPlan({
      projectId: 'p1',
      zoneId: 'z1',
      baseline,
      targetState: 'silvopasture',
      thresholds: { groundCover: 'sparse-grasses', minSuccessionStage: 'late' },
      pathwayMethodIds: ['keyline-subsoiling', 'cover-crop-rebuild'],
    });

    expect(plan.targetState).toBe('silvopasture');
    expect(plan.thresholds).toEqual({
      groundCover: 'sparse-grasses',
      minSuccessionStage: 'late',
    });
    expect(plan.pathwayMethodIds).toEqual([
      'keyline-subsoiling',
      'cover-crop-rebuild',
    ]);
  });

  it('is 1:1 with a zone — getPlanForZone returns the plan', () => {
    const plan = useRegenerationPlanStore
      .getState()
      .createPlan({ projectId: 'p1', zoneId: 'z1', baseline });

    expect(useRegenerationPlanStore.getState().getPlanForZone('z1')?.id).toBe(
      plan.id,
    );
    expect(
      useRegenerationPlanStore.getState().getPlanForZone('z-none'),
    ).toBeUndefined();
  });

  it('scopes getProjectPlans to a project', () => {
    const s = useRegenerationPlanStore.getState();
    s.createPlan({ projectId: 'p1', zoneId: 'z1', baseline });
    s.createPlan({ projectId: 'p1', zoneId: 'z2', baseline });
    s.createPlan({ projectId: 'p2', zoneId: 'z3', baseline });

    expect(
      useRegenerationPlanStore.getState().getProjectPlans('p1'),
    ).toHaveLength(2);
    expect(
      useRegenerationPlanStore.getState().getProjectPlans('p2'),
    ).toHaveLength(1);
  });

  it('startPathway anchors startedAt', () => {
    const plan = useRegenerationPlanStore
      .getState()
      .createPlan({ projectId: 'p1', zoneId: 'z1', baseline });

    useRegenerationPlanStore
      .getState()
      .startPathway(plan.id, '2026-06-01T00:00:00.000Z');

    const updated = useRegenerationPlanStore
      .getState()
      .getPlanForZone('z1');
    expect(updated?.startedAt).toBe('2026-06-01T00:00:00.000Z');
  });

  it('confirmReadiness flips the steward gate', () => {
    const plan = useRegenerationPlanStore
      .getState()
      .createPlan({ projectId: 'p1', zoneId: 'z1', baseline });
    expect(plan.stewardReadinessConfirmedAt).toBeNull();

    useRegenerationPlanStore
      .getState()
      .confirmReadiness(plan.id, '2028-04-01T00:00:00.000Z');

    expect(
      useRegenerationPlanStore.getState().getPlanForZone('z1')
        ?.stewardReadinessConfirmedAt,
    ).toBe('2028-04-01T00:00:00.000Z');
  });

  it('recordOverride stores the recorded escape hatch with a reason', () => {
    const plan = useRegenerationPlanStore
      .getState()
      .createPlan({ projectId: 'p1', zoneId: 'z1', baseline });

    useRegenerationPlanStore
      .getState()
      .recordOverride(
        plan.id,
        'Steward inspected on foot; placing sheep early at own risk',
        '2026-09-01T00:00:00.000Z',
      );

    const ov = useRegenerationPlanStore.getState().getPlanForZone('z1')
      ?.readinessOverride;
    expect(ov).toEqual({
      at: '2026-09-01T00:00:00.000Z',
      reason: 'Steward inspected on foot; placing sheep early at own risk',
    });
  });

  it('updatePlan merges fields and bumps updatedAt', () => {
    vi.useFakeTimers();
    try {
      vi.setSystemTime(new Date('2026-05-16T00:00:00.000Z'));
      const plan = useRegenerationPlanStore
        .getState()
        .createPlan({ projectId: 'p1', zoneId: 'z1', baseline });
      const before = plan.updatedAt;

      vi.setSystemTime(new Date('2026-05-16T00:05:00.000Z'));
      useRegenerationPlanStore.getState().updatePlan(plan.id, {
        pathwayMethodIds: ['compost-amendment'],
      });

      const updated = useRegenerationPlanStore.getState().getPlanForZone('z1');
      expect(updated?.pathwayMethodIds).toEqual(['compost-amendment']);
      expect(before).toBe('2026-05-16T00:00:00.000Z');
      expect(updated?.updatedAt).toBe('2026-05-16T00:05:00.000Z');
      expect(updated?.updatedAt).not.toBe(before);
    } finally {
      vi.useRealTimers();
    }
  });

  it('deletePlan removes the plan', () => {
    const plan = useRegenerationPlanStore
      .getState()
      .createPlan({ projectId: 'p1', zoneId: 'z1', baseline });

    useRegenerationPlanStore.getState().deletePlan(plan.id);

    expect(useRegenerationPlanStore.getState().plans).toHaveLength(0);
  });

  it('persists created plans to localStorage under ogden-regen-plans', () => {
    const plan = useRegenerationPlanStore
      .getState()
      .createPlan({ projectId: 'p1', zoneId: 'z1', baseline });

    const raw = localStorage.getItem('ogden-regen-plans');
    expect(raw).toBeTruthy();
    expect(raw as string).toContain(plan.id);
  });

  it('undoes and redoes createPlan via the zundo timeline', () => {
    const plan = useRegenerationPlanStore
      .getState()
      .createPlan({ projectId: 'p1', zoneId: 'z1', baseline });
    expect(useRegenerationPlanStore.getState().plans).toHaveLength(1);

    tquery((t) => t.undo());
    expect(useRegenerationPlanStore.getState().plans).toHaveLength(0);

    tquery((t) => t.redo());
    expect(useRegenerationPlanStore.getState().plans).toHaveLength(1);
    expect(
      useRegenerationPlanStore.getState().getPlanForZone('z1')?.id,
    ).toBe(plan.id);
  });

  it('undoes a readiness confirmation, reverting the gate', () => {
    const plan = useRegenerationPlanStore
      .getState()
      .createPlan({ projectId: 'p1', zoneId: 'z1', baseline });
    tquery((t) => t.clear());

    useRegenerationPlanStore
      .getState()
      .confirmReadiness(plan.id, '2028-04-01T00:00:00.000Z');
    expect(
      useRegenerationPlanStore.getState().getPlanForZone('z1')
        ?.stewardReadinessConfirmedAt,
    ).toBe('2028-04-01T00:00:00.000Z');

    tquery((t) => t.undo());
    expect(
      useRegenerationPlanStore.getState().getPlanForZone('z1')
        ?.stewardReadinessConfirmedAt,
    ).toBeNull();
  });
});

describe('regenerationPlanStore — active plan per zone (scenarios)', () => {
  beforeEach(() => {
    useRegenerationPlanStore.setState({ plans: [], activePlanIdByZone: {} });
    tquery((t) => t.clear());
    if (typeof localStorage !== 'undefined') localStorage.clear();
  });

  it('marks the first plan for a zone active, leaving later plans as scenarios', () => {
    const s = useRegenerationPlanStore.getState();
    const a = s.createPlan({ projectId: 'p1', zoneId: 'z1', baseline });
    const b = s.createPlan({ projectId: 'p1', zoneId: 'z1', baseline });

    expect(b.id).not.toBe(a.id);
    expect(
      useRegenerationPlanStore.getState().getActivePlanForZone('z1')?.id,
    ).toBe(a.id);
    expect(
      useRegenerationPlanStore
        .getState()
        .getPlansForZone('z1')
        .map((p) => p.id),
    ).toEqual([a.id, b.id]);
  });

  it('setActivePlan flips which plan a zone keys on', () => {
    const s = useRegenerationPlanStore.getState();
    const a = s.createPlan({ projectId: 'p1', zoneId: 'z1', baseline });
    const b = s.createPlan({ projectId: 'p1', zoneId: 'z1', baseline });

    useRegenerationPlanStore.getState().setActivePlan('z1', b.id);
    expect(
      useRegenerationPlanStore.getState().getActivePlanForZone('z1')?.id,
    ).toBe(b.id);
    void a;
  });

  it('getActivePlanForZone falls back to the most-recent plan when no mapping exists', () => {
    vi.useFakeTimers();
    try {
      vi.setSystemTime(new Date('2026-05-16T00:00:00.000Z'));
      const s = useRegenerationPlanStore.getState();
      s.createPlan({ projectId: 'p1', zoneId: 'z1', baseline });
      vi.setSystemTime(new Date('2026-05-16T03:00:00.000Z'));
      const b = useRegenerationPlanStore
        .getState()
        .createPlan({ projectId: 'p1', zoneId: 'z1', baseline });
      // wipe the mapping but keep the plans (legacy / corrupted map)
      useRegenerationPlanStore.setState({ activePlanIdByZone: {} });
      expect(
        useRegenerationPlanStore.getState().getActivePlanForZone('z1')?.id,
      ).toBe(b.id);
    } finally {
      vi.useRealTimers();
    }
  });

  it('deletePlan of the active plan promotes the most-recent remaining plan', () => {
    vi.useFakeTimers();
    try {
      vi.setSystemTime(new Date('2026-05-16T00:00:00.000Z'));
      const a = useRegenerationPlanStore
        .getState()
        .createPlan({ projectId: 'p1', zoneId: 'z1', baseline });
      vi.setSystemTime(new Date('2026-05-16T01:00:00.000Z'));
      const b = useRegenerationPlanStore
        .getState()
        .createPlan({ projectId: 'p1', zoneId: 'z1', baseline });
      vi.setSystemTime(new Date('2026-05-16T02:00:00.000Z'));
      const c = useRegenerationPlanStore
        .getState()
        .createPlan({ projectId: 'p1', zoneId: 'z1', baseline });

      // a is active (first); deleting it promotes the most-recent remaining = c
      useRegenerationPlanStore.getState().deletePlan(a.id);
      expect(
        useRegenerationPlanStore.getState().getActivePlanForZone('z1')?.id,
      ).toBe(c.id);
      void b;
    } finally {
      vi.useRealTimers();
    }
  });

  it('deletePlan of the last plan for a zone clears the mapping', () => {
    const a = useRegenerationPlanStore
      .getState()
      .createPlan({ projectId: 'p1', zoneId: 'z1', baseline });
    useRegenerationPlanStore.getState().deletePlan(a.id);
    expect(
      useRegenerationPlanStore.getState().getActivePlanForZone('z1'),
    ).toBeUndefined();
    expect(
      useRegenerationPlanStore.getState().activePlanIdByZone.z1,
    ).toBeUndefined();
  });

  it('deleting a non-active scenario leaves the active plan unchanged', () => {
    const a = useRegenerationPlanStore
      .getState()
      .createPlan({ projectId: 'p1', zoneId: 'z1', baseline });
    const b = useRegenerationPlanStore
      .getState()
      .createPlan({ projectId: 'p1', zoneId: 'z1', baseline });
    useRegenerationPlanStore.getState().deletePlan(b.id);
    expect(
      useRegenerationPlanStore.getState().getActivePlanForZone('z1')?.id,
    ).toBe(a.id);
  });

  it('persists activePlanIdByZone and round-trips it', () => {
    const a = useRegenerationPlanStore
      .getState()
      .createPlan({ projectId: 'p1', zoneId: 'z1', baseline });
    const b = useRegenerationPlanStore
      .getState()
      .createPlan({ projectId: 'p1', zoneId: 'z1', baseline });
    useRegenerationPlanStore.getState().setActivePlan('z1', b.id);

    const raw = localStorage.getItem('ogden-regen-plans');
    expect(raw as string).toContain('activePlanIdByZone');
    expect(raw as string).toContain(b.id);
    void a;
  });

  it('undoes setActivePlan via the zundo timeline', () => {
    const a = useRegenerationPlanStore
      .getState()
      .createPlan({ projectId: 'p1', zoneId: 'z1', baseline });
    const b = useRegenerationPlanStore
      .getState()
      .createPlan({ projectId: 'p1', zoneId: 'z1', baseline });
    tquery((t) => t.clear());

    useRegenerationPlanStore.getState().setActivePlan('z1', b.id);
    expect(
      useRegenerationPlanStore.getState().getActivePlanForZone('z1')?.id,
    ).toBe(b.id);

    tquery((t) => t.undo());
    expect(
      useRegenerationPlanStore.getState().getActivePlanForZone('z1')?.id,
    ).toBe(a.id);
  });
});

describe('migrateRegenPlans (persist v1 -> v2)', () => {
  it('backfills each zone single plan as active when upgrading from v1', () => {
    const v1State = {
      plans: [
        { id: 'r1', projectId: 'p1', zoneId: 'z1' },
        { id: 'r2', projectId: 'p1', zoneId: 'z2' },
      ],
    };
    const migrated = migrateRegenPlans(v1State, 1) as {
      activePlanIdByZone: Record<string, string>;
      plans: unknown[];
    };
    expect(migrated.activePlanIdByZone).toEqual({ z1: 'r1', z2: 'r2' });
    expect(migrated.plans).toHaveLength(2);
  });

  it('when a v1 zone has multiple plans, the last wins as active (deterministic)', () => {
    const v1State = {
      plans: [
        { id: 'r1', projectId: 'p1', zoneId: 'z1' },
        { id: 'r2', projectId: 'p1', zoneId: 'z1' },
      ],
    };
    const migrated = migrateRegenPlans(v1State, 1) as {
      activePlanIdByZone: Record<string, string>;
    };
    expect(migrated.activePlanIdByZone).toEqual({ z1: 'r2' });
  });

  it('passes an already-v2 state through untouched', () => {
    const v2State = {
      plans: [{ id: 'r1', projectId: 'p1', zoneId: 'z1' }],
      activePlanIdByZone: { z1: 'r1' },
    };
    const migrated = migrateRegenPlans(v2State, 2) as {
      activePlanIdByZone: Record<string, string>;
    };
    expect(migrated.activePlanIdByZone).toEqual({ z1: 'r1' });
  });

  it('tolerates an empty persisted blob', () => {
    const migrated = migrateRegenPlans({ plans: [] }, 1) as {
      activePlanIdByZone: Record<string, string>;
    };
    expect(migrated.activePlanIdByZone).toEqual({});
  });
});
