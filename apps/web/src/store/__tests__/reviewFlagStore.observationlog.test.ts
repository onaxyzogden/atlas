// @vitest-environment happy-dom
import { describe, it, expect, beforeEach } from 'vitest';
import { useReviewFlagStore } from '../reviewFlagStore.js';
import { useObservationLogStore } from '../observationLogStore.js';
import type { ObjectiveReviewFlag } from '@ogden/shared';

const flag = (over: Partial<ObjectiveReviewFlag> = {}): ObjectiveReviewFlag => ({
  id: 'flag-1',
  projectId: 'mtc',
  objectiveId: 'obj-1',
  sourceTemplateId: 'tpl-a',
  sourceActivationIds: [],
  observedCount: 2,
  window: { season: 'spring', cycleNumber: 1 },
  deviationSign: 'over',
  depth: 'water',
  direction: 'tighten',
  reason: 'r',
  raisedAt: '2026-03-01T00:00:00.000Z',
  ...over,
});

beforeEach(() => {
  useReviewFlagStore.setState({ byProject: { mtc: [flag()] } });
  useObservationLogStore.setState({ records: [] });
});

describe('reviewFlagStore closure -> observation log', () => {
  it('resolveFlag appends exactly one resolved record carrying the flag fields', () => {
    useReviewFlagStore.getState().resolveFlag('mtc', 'flag-1');
    const recs = useObservationLogStore.getState().records;
    expect(recs).toHaveLength(1);
    expect(recs[0]).toMatchObject({
      flagId: 'flag-1',
      projectId: 'mtc',
      sourceTemplateId: 'tpl-a',
      objectiveId: 'obj-1',
      bucketKey: 'spring:1',
      depth: 'water',
      deviationSign: 'over',
      closeKind: 'resolved',
    });
  });

  it('dismissFlag appends exactly one dismissed record', () => {
    useReviewFlagStore.getState().dismissFlag('mtc', 'flag-1');
    const recs = useObservationLogStore.getState().records;
    expect(recs).toHaveLength(1);
    expect(recs[0]?.closeKind).toBe('dismissed');
  });

  it('resolving an unknown flagId appends nothing', () => {
    useReviewFlagStore.getState().resolveFlag('mtc', 'nope');
    expect(useObservationLogStore.getState().records).toHaveLength(0);
  });

  it('a reopen-then-reclose logs two records', () => {
    useReviewFlagStore.getState().resolveFlag('mtc', 'flag-1');
    useReviewFlagStore.setState({ byProject: { mtc: [flag()] } });
    useReviewFlagStore.getState().dismissFlag('mtc', 'flag-1');
    expect(useObservationLogStore.getState().records).toHaveLength(2);
  });

  it('acknowledgeFlag emits nothing (only closures are logged)', () => {
    useReviewFlagStore.getState().acknowledgeFlag('mtc', 'flag-1');
    expect(useObservationLogStore.getState().records).toHaveLength(0);
  });

  it('stamps the flag closedAt and the record closedAt with the same instant', () => {
    useReviewFlagStore.getState().resolveFlag('mtc', 'flag-1');
    const rec = useObservationLogStore.getState().records[0];
    const flag = useReviewFlagStore
      .getState()
      .byProject['mtc']?.find((f) => f.id === 'flag-1');
    expect(rec?.closedAt).toBe(flag?.resolvedAt);
  });
});
