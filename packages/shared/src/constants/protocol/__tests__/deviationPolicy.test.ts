// deviationPolicy.test.ts
//
// TDD suite for the pure deviation policy helpers (T1.2).
// Tests written FIRST before implementation exists.

import { describe, it, expect } from 'vitest';
import {
  evaluateDeviation,
  temporalBucketKey,
  S6_BOUND_TEMPLATE_IDS,
  TEMPLATE_DEPTH,
} from '../deviationPolicy.js';

// ---------------------------------------------------------------------------
// evaluateDeviation
// ---------------------------------------------------------------------------

describe('evaluateDeviation', () => {
  it('flags existential template with 1 activation and NO expectedRate', () => {
    const result = evaluateDeviation({
      templateId: 'emergency-destocking',
      activationsInWindow: 1,
    });
    expect(result.shouldFlag).toBe(true);
    expect(result.deviationSign).toBe('existential');
    expect(result.direction).toBe('tighten');
    expect(result.observedCount).toBe(1);
  });

  it('existential template: fires even with 0 activations -> should NOT flag (guard: >=1)', () => {
    const result = evaluateDeviation({
      templateId: 'emergency-destocking',
      activationsInWindow: 0,
    });
    // 0 activations is no firing -> no existential flag; no expectedRate -> shouldFlag false
    expect(result.shouldFlag).toBe(false);
    expect(result.observedCount).toBe(0);
  });

  it('over-count: activationsInWindow > expectedRate.count -> over / tighten', () => {
    const result = evaluateDeviation({
      templateId: 'paddock-rotation-cover-trigger',
      activationsInWindow: 3,
      expectedRate: { count: 2, per: 'season' },
    });
    expect(result.shouldFlag).toBe(true);
    expect(result.deviationSign).toBe('over');
    expect(result.direction).toBe('tighten');
    expect(result.observedCount).toBe(3);
  });

  it('under-count: activationsInWindow < expectedRate.count -> under / loosen', () => {
    const result = evaluateDeviation({
      templateId: 'paddock-rotation-cover-trigger',
      activationsInWindow: 1,
      expectedRate: { count: 2, per: 'season' },
    });
    expect(result.shouldFlag).toBe(true);
    expect(result.deviationSign).toBe('under');
    expect(result.direction).toBe('loosen');
    expect(result.observedCount).toBe(1);
  });

  it('equal count: activationsInWindow === expectedRate.count -> no flag', () => {
    const result = evaluateDeviation({
      templateId: 'paddock-rotation-cover-trigger',
      activationsInWindow: 2,
      expectedRate: { count: 2, per: 'cycle' },
    });
    expect(result.shouldFlag).toBe(false);
    expect(result.observedCount).toBe(2);
    // deviationSign and direction must be absent
    expect(result.deviationSign).toBeUndefined();
    expect(result.direction).toBeUndefined();
  });

  it('non-existential template with NO expectedRate -> no flag', () => {
    const result = evaluateDeviation({
      templateId: 'paddock-rotation-cover-trigger',
      activationsInWindow: 5,
    });
    expect(result.shouldFlag).toBe(false);
    expect(result.observedCount).toBe(5);
  });

  it('always includes observedCount in return value', () => {
    const result = evaluateDeviation({
      templateId: 'livestock-health-check-prompt',
      activationsInWindow: 7,
      expectedRate: { count: 3, per: 'season' },
    });
    expect(result.observedCount).toBe(7);
  });
});

// ---------------------------------------------------------------------------
// temporalBucketKey
// ---------------------------------------------------------------------------

describe('temporalBucketKey', () => {
  it('returns unknown:0 when both args are undefined', () => {
    expect(temporalBucketKey()).toBe('unknown:0');
  });

  it('is stable for identical inputs', () => {
    expect(temporalBucketKey('spring', 2)).toBe(temporalBucketKey('spring', 2));
  });

  it('is distinct across different seasons', () => {
    expect(temporalBucketKey('spring', 1)).not.toBe(
      temporalBucketKey('autumn', 1)
    );
  });

  it('is distinct across different cycleNumbers', () => {
    expect(temporalBucketKey('summer', 1)).not.toBe(
      temporalBucketKey('summer', 2)
    );
  });

  it('encodes season and cycleNumber in the key', () => {
    expect(temporalBucketKey('winter', 5)).toBe('winter:5');
  });

  it('uses 0 as default cycleNumber when season is given but cycleNumber is undefined', () => {
    expect(temporalBucketKey('spring')).toBe('spring:0');
  });

  it('uses unknown as default season when cycleNumber is given but season is undefined', () => {
    expect(temporalBucketKey(undefined, 3)).toBe('unknown:3');
  });
});

// ---------------------------------------------------------------------------
// S6_BOUND_TEMPLATE_IDS sanity
// ---------------------------------------------------------------------------

describe('S6_BOUND_TEMPLATE_IDS', () => {
  it('contains exactly 5 entries', () => {
    expect(S6_BOUND_TEMPLATE_IDS.size).toBe(5);
  });

  it('includes emergency-destocking', () => {
    expect(S6_BOUND_TEMPLATE_IDS.has('emergency-destocking')).toBe(true);
  });

  it('includes paddock-rotation-cover-trigger', () => {
    expect(S6_BOUND_TEMPLATE_IDS.has('paddock-rotation-cover-trigger')).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// TEMPLATE_DEPTH sanity
// ---------------------------------------------------------------------------

describe('TEMPLATE_DEPTH', () => {
  it('every S6_BOUND_TEMPLATE_IDS entry maps to threshold depth', () => {
    for (const id of S6_BOUND_TEMPLATE_IDS) {
      expect(TEMPLATE_DEPTH[id]).toBe('threshold');
    }
  });

  it('has exactly 5 entries (one per S6 bound template)', () => {
    expect(Object.keys(TEMPLATE_DEPTH).length).toBe(5);
  });
});
