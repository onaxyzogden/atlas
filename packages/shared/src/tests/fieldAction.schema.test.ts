import { describe, it, expect } from 'vitest';
import {
  FieldActionSchema,
  FieldActionTaskType,
  FieldActionSourceObjectiveType,
  compareCycleId,
} from '../schemas/fieldAction/fieldAction.schema.js';
import type { FieldActionCycleId } from '../schemas/fieldAction/fieldAction.schema.js';

// Minimal valid FieldAction — only the no-default required fields set, so the
// assertions below exercise the Phase 0 defaults (cycleId, sourceObjectiveType,
// observedAt).
const base = {
  id: 'fa-1',
  projectId: 'p-1',
  planObjectiveId: 'obj-1',
  stratumId: 's1',
  title: 'Walk and photograph the parcel perimeter',
  taskType: 'field_survey',
  status: 'not_started',
  proofSchemaId: 'generic-fallback',
  verificationMode: 'self',
  createdAt: '2026-05-29T00:00:00.000Z',
  updatedAt: '2026-05-29T00:00:00.000Z',
} as const;

describe('FieldActionTaskType (ADR 2 4-value taxonomy)', () => {
  it('is exactly the 4 canonical tokens', () => {
    expect(FieldActionTaskType.options).toEqual([
      'field_survey',
      'monitoring_task',
      'implementation_task',
      'administrative_task',
    ]);
  });

  it('rejects the legacy 2-value tokens', () => {
    expect(FieldActionTaskType.safeParse('survey').success).toBe(false);
    expect(FieldActionTaskType.safeParse('implementation').success).toBe(false);
  });
});

describe('FieldActionSchema — Phase 0 fields', () => {
  it('parses a minimal record and applies the new defaults', () => {
    const parsed = FieldActionSchema.parse(base);
    expect(parsed.taskType).toBe('field_survey');
    expect(parsed.cycleId).toBe(0);
    expect(parsed.sourceObjectiveType).toBeNull();
    expect(parsed.observedAt).toBeUndefined();
  });

  it('accepts cycleId as the baseline sentinel or a nonnegative int', () => {
    expect(
      FieldActionSchema.parse({ ...base, cycleId: 'baseline' }).cycleId,
    ).toBe('baseline');
    expect(FieldActionSchema.parse({ ...base, cycleId: 4 }).cycleId).toBe(4);
  });

  it('rejects a negative or fractional cycleId', () => {
    expect(FieldActionSchema.safeParse({ ...base, cycleId: -1 }).success).toBe(
      false,
    );
    expect(FieldActionSchema.safeParse({ ...base, cycleId: 1.5 }).success).toBe(
      false,
    );
  });

  it('keeps observedAt when provided (the §6 observed_at)', () => {
    const parsed = FieldActionSchema.parse({
      ...base,
      observedAt: '2026-05-29T03:00:00.000Z',
    });
    expect(parsed.observedAt).toBe('2026-05-29T03:00:00.000Z');
  });

  it('accepts a nullable sourceObjectiveType anchor; rejects unknown tokens', () => {
    expect(
      FieldActionSchema.parse({ ...base, sourceObjectiveType: 'primary' })
        .sourceObjectiveType,
    ).toBe('primary');
    expect(
      FieldActionSchema.parse({ ...base, sourceObjectiveType: null })
        .sourceObjectiveType,
    ).toBeNull();
    expect(
      FieldActionSchema.safeParse({ ...base, sourceObjectiveType: 'bogus' })
        .success,
    ).toBe(false);
    expect(FieldActionSourceObjectiveType.options).toEqual([
      'universal',
      'primary',
      'secondary',
    ]);
  });
});

describe('compareCycleId (baseline < 0 < 1 < ...)', () => {
  it('orders the baseline sentinel before every numbered cycle', () => {
    expect(compareCycleId('baseline', 0)).toBeLessThan(0);
    expect(compareCycleId(0, 'baseline')).toBeGreaterThan(0);
    expect(compareCycleId('baseline', 99)).toBeLessThan(0);
  });

  it('orders numbered cycles numerically and treats equal ids as 0', () => {
    expect(compareCycleId(0, 1)).toBeLessThan(0);
    expect(compareCycleId(3, 1)).toBeGreaterThan(0);
    expect(compareCycleId(2, 2)).toBe(0);
    expect(compareCycleId('baseline', 'baseline')).toBe(0);
  });

  it('sorts a mixed list into baseline-first order', () => {
    const sorted = ([3, 'baseline', 0, 1] as FieldActionCycleId[])
      .slice()
      .sort(compareCycleId);
    expect(sorted).toEqual(['baseline', 0, 1, 3]);
  });
});
