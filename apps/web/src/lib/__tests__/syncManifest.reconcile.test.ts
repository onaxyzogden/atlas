// @vitest-environment happy-dom
/**
 * F8 -- append-only RECONCILE appliers for the three Threshold governance logs
 * (`ogden-plan-concerns`, `ogden-act-mandate`, `ogden-coherence-check`). These
 * three are the only blob stores that carry `reconcileForProject`; every other
 * versioned-blob store leaves it absent and keeps the whole-bucket REPLACE
 * applier (`applyForProject`).
 *
 * The clobber being fixed: two devices each edit a project's governance log
 * offline; on reconcile the OLD whole-bucket LWW applier replaced one side with
 * the other, silently dropping a concern / amendment / lift. `reconcileForProject`
 * UNIONS the two slices instead, so nothing is lost. These tests pin:
 *   1. union with no loss across two offline buckets (the core guarantee);
 *   2. an id collision resolves to the more-advanced lifecycle copy (a remote
 *      resolution wins over a local still-raised concern);
 *   3. sibling projects are never disturbed;
 *   4. the REPLACE applier (`applyForProject`) is deliberately UNCHANGED -- only
 *      the new reconcile path merges, so snapshot-restore + the P0-1 round-trip
 *      keep their overwrite semantics.
 */

import { describe, expect, it } from 'vitest';
import { SYNCED_STORES, type SyncedStoreDescriptor } from '../syncManifest';

function makeHandle(initial: Record<string, unknown> = {}) {
  let state: Record<string, unknown> = { ...initial };
  return {
    getState: () => state,
    setState: (p: unknown) => {
      state = {
        ...state,
        ...(typeof p === 'function'
          ? (p as (s: Record<string, unknown>) => Record<string, unknown>)(state)
          : (p as Record<string, unknown>)),
      };
    },
    peek: () => state,
  };
}

const desc = (key: string): SyncedStoreDescriptor => {
  const d = SYNCED_STORES.find((s) => s.storeKey === key);
  expect(d, `${key} must exist in SYNCED_STORES`).toBeDefined();
  return d!;
};

describe('F8 reconcile: only the three governance logs carry it', () => {
  it('exactly the three Threshold governance logs expose reconcileForProject', () => {
    const withReconcile = SYNCED_STORES.filter(
      (d) => typeof d.reconcileForProject === 'function',
    ).map((d) => d.storeKey);
    expect(withReconcile.sort()).toEqual([
      'ogden-act-mandate',
      'ogden-coherence-check',
      'ogden-plan-concerns',
    ]);
  });

  it('every other versioned-blob store keeps replace-only (no reconcile)', () => {
    const leaked = SYNCED_STORES.filter(
      (d) =>
        d.classification === 'versioned-blob' &&
        typeof d.reconcileForProject === 'function' &&
        ![
          'ogden-act-mandate',
          'ogden-coherence-check',
          'ogden-plan-concerns',
        ].includes(d.storeKey),
    ).map((d) => d.storeKey);
    expect(leaked).toEqual([]);
  });
});

describe('F8 reconcile: ogden-plan-concerns (append-only PlanConcern[])', () => {
  const PID = 'P';
  const c = (id: string, status: string, ts: number) => ({
    id,
    objectiveRef: 's5-x',
    observation: `obs-${id}`,
    proposedChange: '',
    raisedBy: 'Maya',
    timestamp: ts,
    status,
  });

  it('unions two offline concern logs with zero loss', () => {
    const d = desc('ogden-plan-concerns');
    // Local device holds c1+c2; the server slice (other device) holds c1+c3.
    const handle = makeHandle({
      byProject: { [PID]: [c('c1', 'raised', 100), c('c2', 'raised', 200)] },
    });
    d.reconcileForProject!(
      handle as never,
      PID,
      [c('c1', 'raised', 100), c('c3', 'raised', 300)],
    );
    const after = handle.peek() as {
      byProject: Record<string, Array<{ id: string }>>;
    };
    // All three survive; c1 is not duplicated; deterministic timestamp order.
    expect(after.byProject[PID]!.map((x) => x.id)).toEqual(['c1', 'c2', 'c3']);
  });

  it('on an id collision the more-advanced lifecycle copy wins', () => {
    const d = desc('ogden-plan-concerns');
    // Local still has c1 as `raised`; the server has it `approved` (governance
    // resolved it on another device). The resolution must win.
    const handle = makeHandle({
      byProject: { [PID]: [c('c1', 'raised', 100)] },
    });
    d.reconcileForProject!(handle as never, PID, [
      { ...c('c1', 'approved', 100), reviewedBy: 'Gov', amendmentText: 'culvert' },
    ]);
    const after = handle.peek() as {
      byProject: Record<string, Array<{ id: string; status: string }>>;
    };
    expect(after.byProject[PID]).toHaveLength(1);
    expect(after.byProject[PID]![0]!.status).toBe('approved');
  });

  it('does not disturb sibling projects', () => {
    const d = desc('ogden-plan-concerns');
    const handle = makeHandle({
      byProject: {
        P: [c('c1', 'raised', 100)],
        Q: [c('q1', 'raised', 100)],
      },
    });
    d.reconcileForProject!(handle as never, 'P', [c('c2', 'raised', 200)]);
    const after = handle.peek() as {
      byProject: Record<string, Array<{ id: string }>>;
    };
    expect(after.byProject.P!.map((x) => x.id)).toEqual(['c1', 'c2']);
    expect(after.byProject.Q!.map((x) => x.id)).toEqual(['q1']);
  });

  it('replace applier (applyForProject) is UNCHANGED -- still clobbers', () => {
    const d = desc('ogden-plan-concerns');
    const handle = makeHandle({
      byProject: { [PID]: [c('c1', 'raised', 100), c('c2', 'raised', 200)] },
    });
    // The REPLACE path is what snapshot-restore + round-trip use: it overwrites.
    d.applyForProject!(handle as never, PID, [c('c3', 'raised', 300)]);
    const after = handle.peek() as {
      byProject: Record<string, Array<{ id: string }>>;
    };
    expect(after.byProject[PID]!.map((x) => x.id)).toEqual(['c3']);
  });
});

describe('F8 reconcile: ogden-act-mandate (singleton record)', () => {
  const PID = 'P';

  it('earliest mandatedAt stands, lock stays armed, lift windows union', () => {
    const d = desc('ogden-act-mandate');
    const handle = makeHandle({
      byProject: {
        [PID]: {
          mandatedAt: 200,
          planReadOnly: true,
          objectiveOverrides: { 'obj-a': 10 },
        },
      },
    });
    // Server slice crossed earlier (100) and lifted a DIFFERENT objective.
    d.reconcileForProject!(handle as never, PID, {
      mandatedAt: 100,
      planReadOnly: true,
      objectiveOverrides: { 'obj-b': 20 },
    });
    const after = handle.peek() as {
      byProject: Record<
        string,
        { mandatedAt: number; planReadOnly: boolean; objectiveOverrides: Record<string, number> }
      >;
    };
    expect(after.byProject[PID]!.mandatedAt).toBe(100); // original crossing stands
    expect(after.byProject[PID]!.planReadOnly).toBe(true);
    expect(after.byProject[PID]!.objectiveOverrides).toEqual({
      'obj-a': 10,
      'obj-b': 20,
    });
  });

  it('an armed lock on either side stays armed after reconcile', () => {
    const d = desc('ogden-act-mandate');
    const handle = makeHandle({
      byProject: { [PID]: { planReadOnly: false, objectiveOverrides: {} } },
    });
    d.reconcileForProject!(handle as never, PID, {
      mandatedAt: 100,
      planReadOnly: true,
      objectiveOverrides: {},
    });
    const after = handle.peek() as {
      byProject: Record<string, { planReadOnly: boolean; mandatedAt?: number }>;
    };
    expect(after.byProject[PID]!.planReadOnly).toBe(true);
    expect(after.byProject[PID]!.mandatedAt).toBe(100);
  });
});

describe('F8 reconcile: ogden-coherence-check (singleton record)', () => {
  const PID = 'P';
  const am = (itemId: string, at: number) => ({
    itemId,
    amendmentText: `fix-${itemId}`,
    resolvedAt: at,
  });

  it('unions the amendments log + resolutions, earliest seal stands', () => {
    const d = desc('ogden-coherence-check');
    const handle = makeHandle({
      byProject: {
        [PID]: {
          itemResolutions: { B1: { resolvedAt: 100, amendmentText: 'fix-B1' } },
          amendments: [am('B1', 100)],
          sealedAt: 500,
        },
      },
    });
    // Server slice resolved a different item (B2) and sealed earlier.
    d.reconcileForProject!(handle as never, PID, {
      itemResolutions: { B2: { resolvedAt: 200, amendmentText: 'fix-B2' } },
      amendments: [am('B2', 200)],
      sealedAt: 400,
    });
    const after = handle.peek() as {
      byProject: Record<
        string,
        {
          itemResolutions: Record<string, unknown>;
          amendments: Array<{ itemId: string }>;
          sealedAt: number;
        }
      >;
    };
    expect(after.byProject[PID]!.amendments.map((x) => x.itemId)).toEqual([
      'B1',
      'B2',
    ]);
    expect(Object.keys(after.byProject[PID]!.itemResolutions).sort()).toEqual([
      'B1',
      'B2',
    ]);
    expect(after.byProject[PID]!.sealedAt).toBe(400); // earliest seal stands
  });

  it('an unsealed local + unsealed server stays unsealed (no sealedAt key)', () => {
    const d = desc('ogden-coherence-check');
    const handle = makeHandle({
      byProject: { [PID]: { itemResolutions: {}, amendments: [] } },
    });
    d.reconcileForProject!(handle as never, PID, {
      itemResolutions: {},
      amendments: [],
    });
    const after = handle.peek() as {
      byProject: Record<string, Record<string, unknown>>;
    };
    expect('sealedAt' in after.byProject[PID]!).toBe(false);
  });
});
