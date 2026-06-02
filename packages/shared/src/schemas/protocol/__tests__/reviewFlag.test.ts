// reviewFlag.test.ts
//
// TDD for ExpectedRate + ObjectiveReviewFlag schemas (OLOS Observe Cyclical
// Review Spec). Tests intentionally written BEFORE implementation.

import { describe, it, expect } from 'vitest';
import {
  ExpectedRateSchema,
  FlagDirection,
  FlagDepth,
  ObjectiveReviewFlagSchema,
} from '../reviewFlag.schema.js';

// ---------------------------------------------------------------------------
// Minimal existential flag fixture (no expectedRate, no window data)
// ---------------------------------------------------------------------------
const MINIMAL_EXISTENTIAL = {
  id: 'flag-001',
  projectId: 'proj-1',
  objectiveId: 'obj-tree-planting',
  sourceTemplateId: 'tmpl-afforestation',
  observedCount: 1,
  deviationSign: 'existential',
  depth: 'threshold',
  direction: 'tighten',
  reason: 'x',
  raisedAt: '2026-01-01T00:00:00.000Z',
} as const;

// ---------------------------------------------------------------------------
// Over-deviation fixture with expectedRate + window
// ---------------------------------------------------------------------------
const OVER_WITH_RATE = {
  id: 'flag-002',
  projectId: 'proj-1',
  objectiveId: 'obj-grazing',
  sourceTemplateId: 'tmpl-grazing-pressure',
  observedCount: 5,
  expectedRate: { count: 2, per: 'season' },
  window: { season: 'autumn', cycleNumber: 1 },
  deviationSign: 'over',
  depth: 'soil',
  direction: 'loosen',
  reason: 'Grazing pressure exceeded expected rate in autumn cycle',
  raisedAt: '2026-01-15T08:00:00.000Z',
} as const;

// ---------------------------------------------------------------------------
// ExpectedRateSchema
// ---------------------------------------------------------------------------
describe('ExpectedRateSchema', () => {
  it('parses a valid rate', () => {
    const r = ExpectedRateSchema.parse({ count: 3, per: 'cycle' });
    expect(r.count).toBe(3);
    expect(r.per).toBe('cycle');
  });

  it('rejects negative count', () => {
    expect(ExpectedRateSchema.safeParse({ count: -1, per: 'season' }).success).toBe(false);
  });

  it('rejects unknown per value', () => {
    expect(ExpectedRateSchema.safeParse({ count: 1, per: 'year' }).success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// FlagDirection + FlagDepth enums
// ---------------------------------------------------------------------------
describe('FlagDirection', () => {
  it('enumerates tighten and loosen', () => {
    expect(FlagDirection.options).toEqual(['tighten', 'loosen']);
  });
});

describe('FlagDepth', () => {
  it('enumerates all depth levels in spec order', () => {
    expect(FlagDepth.options).toEqual([
      'threshold',
      'soil',
      'water',
      'zones',
      'structural',
    ]);
  });
});

// ---------------------------------------------------------------------------
// ObjectiveReviewFlagSchema
// ---------------------------------------------------------------------------
describe('ObjectiveReviewFlagSchema', () => {
  // Case 1: minimal existential flag
  it('parses a minimal existential flag and applies defaults', () => {
    const parsed = ObjectiveReviewFlagSchema.parse(MINIMAL_EXISTENTIAL);
    expect(parsed.deviationSign).toBe('existential');
    expect(parsed.window).toEqual({});
    expect(parsed.sourceActivationIds).toEqual([]);
    expect(parsed.expectedRate).toBeUndefined();
    expect(parsed.acknowledgedAt).toBeUndefined();
    expect(parsed.resolvedAt).toBeUndefined();
    expect(parsed.dismissedAt).toBeUndefined();
  });

  // Case 2: over-deviation with expectedRate + window
  it('parses an over-deviation flag with expectedRate and window', () => {
    const parsed = ObjectiveReviewFlagSchema.parse(OVER_WITH_RATE);
    expect(parsed.deviationSign).toBe('over');
    expect(parsed.expectedRate).toEqual({ count: 2, per: 'season' });
    expect(parsed.window.season).toBe('autumn');
    expect(parsed.window.cycleNumber).toBe(1);
  });

  // Case 3: rejects unknown deviationSign
  it('rejects an unknown deviationSign', () => {
    const result = ObjectiveReviewFlagSchema.safeParse({
      ...MINIMAL_EXISTENTIAL,
      deviationSign: 'sideways',
    });
    expect(result.success).toBe(false);
  });

  // dismissedAt and resolvedAt are distinct fields
  it('accepts resolvedAt without dismissedAt', () => {
    const parsed = ObjectiveReviewFlagSchema.parse({
      ...MINIMAL_EXISTENTIAL,
      resolvedAt: '2026-02-01T00:00:00.000Z',
    });
    expect(parsed.resolvedAt).toBe('2026-02-01T00:00:00.000Z');
    expect(parsed.dismissedAt).toBeUndefined();
  });

  it('accepts dismissedAt with dismissedAtCount independently', () => {
    const parsed = ObjectiveReviewFlagSchema.parse({
      ...MINIMAL_EXISTENTIAL,
      dismissedAt: '2026-03-01T00:00:00.000Z',
      dismissedAtCount: 1,
    });
    expect(parsed.dismissedAt).toBe('2026-03-01T00:00:00.000Z');
    expect(parsed.dismissedAtCount).toBe(1);
    expect(parsed.resolvedAt).toBeUndefined();
  });

  it('accepts all optional escalation fields', () => {
    const parsed = ObjectiveReviewFlagSchema.parse({
      ...MINIMAL_EXISTENTIAL,
      sourceActivationIds: ['act-1', 'act-2'],
      acknowledgedAt: '2026-01-10T00:00:00.000Z',
      dormantSince: '2026-01-20T00:00:00.000Z',
      resolutionParameterDelta: {
        itemId: 'item-7',
        from: '3',
        to: '5',
      },
      firingsSinceResolution: 2,
    });
    expect(parsed.sourceActivationIds).toEqual(['act-1', 'act-2']);
    expect(parsed.acknowledgedAt).toBe('2026-01-10T00:00:00.000Z');
    expect(parsed.dormantSince).toBe('2026-01-20T00:00:00.000Z');
    expect(parsed.resolutionParameterDelta).toEqual({
      itemId: 'item-7',
      from: '3',
      to: '5',
    });
    expect(parsed.firingsSinceResolution).toBe(2);
  });

  it('rejects an empty reason string', () => {
    expect(ObjectiveReviewFlagSchema.safeParse({
      ...MINIMAL_EXISTENTIAL,
      reason: '',
    }).success).toBe(false);
  });

  it('rejects a negative observedCount', () => {
    expect(ObjectiveReviewFlagSchema.safeParse({
      ...MINIMAL_EXISTENTIAL,
      observedCount: -1,
    }).success).toBe(false);
  });
});
