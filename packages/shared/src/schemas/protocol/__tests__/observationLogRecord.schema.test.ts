import { describe, it, expect } from 'vitest';
import {
  ObservationLogRecordSchema,
  buildObservationLogRecord,
} from '../observationLogRecord.schema.js';
import type { ObjectiveReviewFlag } from '../reviewFlag.schema.js';

const baseFlag: ObjectiveReviewFlag = {
  id: 'flag-1',
  projectId: 'mtc',
  objectiveId: 'obj-water',
  sourceTemplateId: 'paddock-rotation-cover-trigger',
  sourceActivationIds: [],
  observedCount: 3,
  window: { season: 'spring', cycleNumber: 1 },
  deviationSign: 'over',
  depth: 'water',
  direction: 'tighten',
  reason: 'cover trigger fired 3x vs expected 1',
  raisedAt: '2026-03-01T00:00:00.000Z',
};

describe('buildObservationLogRecord', () => {
  it('maps every field from the flag and stamps closure', () => {
    const rec = buildObservationLogRecord(
      baseFlag,
      'resolved',
      '2026-04-01T00:00:00.000Z',
      'rec-1',
    );
    expect(rec).toEqual({
      id: 'rec-1',
      projectId: 'mtc',
      flagId: 'flag-1',
      sourceTemplateId: 'paddock-rotation-cover-trigger',
      objectiveId: 'obj-water',
      bucketKey: 'spring:1',
      season: 'spring',
      cycleNumber: 1,
      depth: 'water',
      deviationSign: 'over',
      raisedAt: '2026-03-01T00:00:00.000Z',
      closedAt: '2026-04-01T00:00:00.000Z',
      closeKind: 'resolved',
    });
  });

  it('handles an empty window (bucketKey unknown:0, season/cycleNumber omitted)', () => {
    const rec = buildObservationLogRecord(
      { ...baseFlag, window: {} },
      'dismissed',
      '2026-04-02T00:00:00.000Z',
      'rec-2',
    );
    expect(rec.bucketKey).toBe('unknown:0');
    expect(rec.season).toBeUndefined();
    expect(rec.cycleNumber).toBeUndefined();
    expect(rec.closeKind).toBe('dismissed');
  });

  it('produces a value the schema accepts', () => {
    const rec = buildObservationLogRecord(baseFlag, 'resolved', '2026-04-01T00:00:00.000Z', 'rec-3');
    expect(ObservationLogRecordSchema.safeParse(rec).success).toBe(true);
  });

  it('rejects a record missing a required field', () => {
    const bad = { id: 'x' };
    expect(ObservationLogRecordSchema.safeParse(bad).success).toBe(false);
  });
});
