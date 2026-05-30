/**
 * ADR 7 Phase 2 — the 5-tier divergence-first offline-sync priority queue
 * (wiki/decisions/2026-05-29-atlas-spec-offline-sync-priority-queues.md = ADR 12).
 *
 * Pure unit tests on the two seams the queue's drain order is built from:
 *   - `derivePriority`  : a typed Act record's fields -> its tier (1..5)
 *   - `compareQueuedOps`: the total order getAll()/getBatch() sort by
 * No IndexedDB needed — getAll/getBatch delegate their sort to
 * `compareQueuedOps`, so proving the comparator proves the drain order.
 *
 * Canonical 5-tier list (ADR 12 §Decision == Offline Sync Spec §5):
 *   1 divergence            (unconditional — before all others, any created_at)
 *   2 baseline survey
 *   3 non-baseline survey
 *   4 monitoring proof
 *   5 implementation proof  (+ administrative / untyped -> lowest)
 */
import { describe, it, expect } from 'vitest';
import {
  derivePriority,
  compareQueuedOps,
  type QueuedOperation,
  type SyncPriority,
} from '../syncQueue.js';

let seq = 0;
function op(
  partial: Partial<QueuedOperation> & { priority?: SyncPriority },
): QueuedOperation {
  seq += 1;
  return {
    id: partial.id ?? `op-${seq}`,
    timestamp: partial.timestamp ?? seq,
    storeType: partial.storeType ?? 'typed-record',
    action: partial.action ?? 'update',
    localId: partial.localId ?? `local-${seq}`,
    payload: partial.payload ?? {},
    retryCount: 0,
    priority: partial.priority,
  };
}

describe('derivePriority — record fields -> 5-tier (ADR 12)', () => {
  it('tier 1: a record carrying a divergenceFlag (unconditional)', () => {
    expect(derivePriority({ divergenceFlag: { id: 'd1', type: 'site_condition' } })).toBe(1);
  });

  it('tier 1 beats every other tier — divergence is checked first', () => {
    // taskType/cycle would otherwise be tier 2, but a present flag wins.
    expect(
      derivePriority({
        divergenceFlag: { id: 'd1' },
        taskType: 'field_survey',
        cycleId: 'baseline',
      }),
    ).toBe(1);
  });

  it('tier 2: baseline field survey', () => {
    expect(derivePriority({ taskType: 'field_survey', cycleId: 'baseline' })).toBe(2);
  });

  it('tier 3: non-baseline field survey (numbered cycle, incl. cycle 0)', () => {
    expect(derivePriority({ taskType: 'field_survey', cycleId: 0 })).toBe(3);
    expect(derivePriority({ taskType: 'field_survey', cycleId: 4 })).toBe(3);
  });

  it('tier 4: monitoring task', () => {
    expect(derivePriority({ taskType: 'monitoring_task', cycleId: 2 })).toBe(4);
  });

  it('tier 5: implementation task', () => {
    expect(derivePriority({ taskType: 'implementation_task', cycleId: 1 })).toBe(5);
  });

  it('tier 5 (default): administrative task, untyped, and observe records', () => {
    expect(derivePriority({ taskType: 'administrative_task' })).toBe(5);
    expect(derivePriority({})).toBe(5);
    expect(derivePriority({ cycleId: 3 })).toBe(5); // observe record: numeric cycle, no taskType
    expect(derivePriority(null)).toBe(5);
    expect(derivePriority(undefined)).toBe(5);
  });

  it('a null divergenceFlag is NOT divergence (schema default is null)', () => {
    expect(
      derivePriority({ divergenceFlag: null, taskType: 'implementation_task', cycleId: 1 }),
    ).toBe(5);
  });
});

describe('compareQueuedOps — canonical drain order', () => {
  it('orders a shuffled set as [divergence, baseline survey, non-baseline survey, monitoring, implementation]', () => {
    const divergence = op({ id: 'divergence', priority: 1, timestamp: 50 });
    const baseline = op({ id: 'baseline-survey', priority: 2, timestamp: 40 });
    const nonBaseline = op({ id: 'non-baseline-survey', priority: 3, timestamp: 30 });
    const monitoring = op({ id: 'monitoring', priority: 4, timestamp: 20 });
    const implementation = op({ id: 'implementation', priority: 5, timestamp: 10 });

    // Shuffled, with timestamps deliberately inverted vs. priority so a FIFO
    // sort would produce the WRONG order — only priority-first gets it right.
    const sorted = [implementation, monitoring, nonBaseline, baseline, divergence]
      .sort(compareQueuedOps)
      .map((o) => o.id);

    expect(sorted).toEqual([
      'divergence',
      'baseline-survey',
      'non-baseline-survey',
      'monitoring',
      'implementation',
    ]);
  });

  it('divergence (tier 1) preempts a backlog of older lower-tier ops', () => {
    const backlog = [
      op({ id: 'impl-old', priority: 5, timestamp: 1 }),
      op({ id: 'mon-old', priority: 4, timestamp: 2 }),
      op({ id: 'survey-old', priority: 3, timestamp: 3 }),
      op({ id: 'baseline-old', priority: 2, timestamp: 4 }),
    ];
    const divergence = op({ id: 'divergence-new', priority: 1, timestamp: 9999 });

    const sorted = [...backlog, divergence].sort(compareQueuedOps);
    expect(sorted[0]?.id).toBe('divergence-new');
  });

  it('dual-track: at equal priority, structured ops drain before proof-photo blobs', () => {
    const photo = op({
      id: 'divergence-photo',
      priority: 1,
      storeType: 'proof_photo_upload',
      timestamp: 1, // earlier...
    });
    const record = op({
      id: 'divergence-record',
      priority: 1,
      storeType: 'typed-record',
      timestamp: 99, // ...but later
    });
    const sorted = [photo, record].sort(compareQueuedOps).map((o) => o.id);
    expect(sorted).toEqual(['divergence-record', 'divergence-photo']);
  });

  it('missing priority sorts as lowest tier (legacy in-flight ops never preempt)', () => {
    const legacy = op({ id: 'legacy', timestamp: 1 }); // no priority
    const monitoring = op({ id: 'monitoring', priority: 4, timestamp: 999 });
    expect([legacy, monitoring].sort(compareQueuedOps).map((o) => o.id)).toEqual([
      'monitoring',
      'legacy',
    ]);
    // and a missing priority ties with an explicit tier 5, broken by timestamp
    const impl = op({ id: 'impl', priority: 5, timestamp: 5 });
    const legacy2 = op({ id: 'legacy2', timestamp: 2 });
    expect([impl, legacy2].sort(compareQueuedOps).map((o) => o.id)).toEqual([
      'legacy2',
      'impl',
    ]);
  });

  it('FIFO within the same priority + track (stable by timestamp)', () => {
    const a = op({ id: 'a', priority: 3, timestamp: 5 });
    const b = op({ id: 'b', priority: 3, timestamp: 2 });
    const c = op({ id: 'c', priority: 3, timestamp: 8 });
    expect([a, b, c].sort(compareQueuedOps).map((o) => o.id)).toEqual(['b', 'a', 'c']);
  });
});
