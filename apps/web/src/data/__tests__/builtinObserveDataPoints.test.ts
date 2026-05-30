// @vitest-environment happy-dom
/**
 * Guard for the builtin Observe data-point projection.
 *
 * The Observe Dashboard reads ONLY observeDataPointStore.byProject; these
 * bundles are what make the builtin samples' 16 domain cards non-empty.
 * The invariants below keep the projection valid and the two flagship
 * fixtures genuinely distinct (MTC must not borrow 351-House content).
 */

import { beforeEach, describe, expect, it } from 'vitest';
import { ObserveDataPointSchema } from '@ogden/shared';
import { useObserveDataPointStore } from '../../store/observeDataPointStore.js';
import {
  BUILTIN_351_OBSERVE_BUNDLE,
  MTC_OBSERVE_BUNDLE,
  buildBuiltinObserveDataPoints,
  normalizeCapturedAt,
  replayBuiltinObserveDataPoints,
  seedBuiltinObserveDataPoints,
  seedMtcObserveDataPoints,
} from '../builtinObserveDataPoints.js';

function reset(): void {
  useObserveDataPointStore.setState({ byProject: {} });
}

describe('normalizeCapturedAt', () => {
  it('pins date-only to UTC midnight', () => {
    expect(normalizeCapturedAt('2024-06-04')).toBe('2024-06-04T00:00:00.000Z');
  });
  it('expands year-month to the first of the month', () => {
    expect(normalizeCapturedAt('2023-04')).toBe('2023-04-01T00:00:00.000Z');
  });
  it('expands bare year to Jan 1', () => {
    expect(normalizeCapturedAt('2022')).toBe('2022-01-01T00:00:00.000Z');
  });
  it('passes full ISO through as a valid datetime', () => {
    const out = normalizeCapturedAt('2024-06-04T12:30:00.000Z');
    expect(() => ObserveDataPointSchema.shape.capturedAt.parse(out)).not.toThrow();
  });
});

describe('buildBuiltinObserveDataPoints', () => {
  it('every produced point parses against ObserveDataPointSchema', () => {
    for (const bundle of [BUILTIN_351_OBSERVE_BUNDLE, MTC_OBSERVE_BUNDLE]) {
      const points = buildBuiltinObserveDataPoints('p', bundle);
      expect(points.length).toBe(bundle.length);
      for (const pt of points) {
        expect(() => ObserveDataPointSchema.parse(pt)).not.toThrow();
      }
    }
  });

  it('stamps the projectId and a seed: id namespace', () => {
    const points = buildBuiltinObserveDataPoints('proj-x', MTC_OBSERVE_BUNDLE);
    for (const pt of points) {
      expect(pt.projectId).toBe('proj-x');
      expect(pt.id.startsWith('seed:')).toBe(true);
      expect(pt.sourceType).toBe('manual_observation');
    }
  });

  it('uses only valid status outputs and covers several domains', () => {
    const points = buildBuiltinObserveDataPoints('p', BUILTIN_351_OBSERVE_BUNDLE);
    const domains = new Set(points.map((p) => p.domainId));
    expect(domains.size).toBeGreaterThanOrEqual(6);
    for (const p of points) {
      expect(() => ObserveDataPointSchema.shape.statusOutput.parse(p.statusOutput)).not.toThrow();
    }
  });

  it('is deterministic — same input yields identical ids', () => {
    const a = buildBuiltinObserveDataPoints('p', MTC_OBSERVE_BUNDLE).map((p) => p.id);
    const b = buildBuiltinObserveDataPoints('p', MTC_OBSERVE_BUNDLE).map((p) => p.id);
    expect(a).toEqual(b);
  });
});

describe('MTC vs 351-House fixtures are distinct', () => {
  it('share no seed keys', () => {
    const k351 = new Set(BUILTIN_351_OBSERVE_BUNDLE.map((r) => r.key));
    const overlap = MTC_OBSERVE_BUNDLE.filter((r) => k351.has(r.key));
    expect(overlap).toHaveLength(0);
  });
  it('produce disjoint data-point id sets for the same project', () => {
    const ids351 = new Set(
      buildBuiltinObserveDataPoints('shared', BUILTIN_351_OBSERVE_BUNDLE).map((p) => p.id),
    );
    const idsMtc = buildBuiltinObserveDataPoints('shared', MTC_OBSERVE_BUNDLE).map((p) => p.id);
    expect(idsMtc.some((id) => ids351.has(id))).toBe(false);
  });
});

describe('replay into observeDataPointStore', () => {
  beforeEach(reset);

  it('seeds the 351-House dashboard points', () => {
    seedBuiltinObserveDataPoints('house');
    const pts = useObserveDataPointStore.getState().getByProject('house');
    expect(pts.length).toBe(BUILTIN_351_OBSERVE_BUNDLE.length);
  });

  it('seeds an MTC-specific set, not the 351-House set', () => {
    seedMtcObserveDataPoints('mtc');
    const pts = useObserveDataPointStore.getState().getByProject('mtc');
    expect(pts.length).toBe(MTC_OBSERVE_BUNDLE.length);
    expect(pts.some((p) => p.id.includes('mtc-'))).toBe(true);
    expect(pts.some((p) => p.id.includes('351-'))).toBe(false);
  });

  it('is idempotent — a second replay does not duplicate', () => {
    seedMtcObserveDataPoints('mtc');
    const first = useObserveDataPointStore.getState().getByProject('mtc').length;
    seedMtcObserveDataPoints('mtc');
    const second = useObserveDataPointStore.getState().getByProject('mtc').length;
    expect(second).toBe(first);
  });

  it('keeps both nearby soil samples active (supersession bypassed)', () => {
    seedBuiltinObserveDataPoints('house');
    const soil = useObserveDataPointStore
      .getState()
      .getByProject('house')
      .filter((p) => p.domainId === 'soil');
    expect(soil.length).toBe(2);
    expect(soil.every((p) => !p.isSuperseded)).toBe(true);
  });

  it('preserves user-captured points outside the seed id namespace', () => {
    const userPoint = ObserveDataPointSchema.parse({
      id: 'user:1',
      projectId: 'mtc',
      domainId: 'soil',
      sourceType: 'manual_observation',
      statusOutput: 'clear',
      capturedAt: '2026-05-25T00:00:00.000Z',
      capturedBy: 'user',
    });
    useObserveDataPointStore.getState().setProjectPoints('mtc', [userPoint]);
    seedMtcObserveDataPoints('mtc');
    const ids = useObserveDataPointStore
      .getState()
      .getByProject('mtc')
      .map((p) => p.id);
    expect(ids).toContain('user:1');
    expect(ids.length).toBe(MTC_OBSERVE_BUNDLE.length + 1);
  });

  it('replayBuiltinObserveDataPoints no-ops on empty projectId', () => {
    replayBuiltinObserveDataPoints('', MTC_OBSERVE_BUNDLE);
    expect(useObserveDataPointStore.getState().getByProject('')).toHaveLength(0);
  });
});
