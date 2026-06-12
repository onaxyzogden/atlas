// @vitest-environment happy-dom
/**
 * gatePlacement — tiered gate behaviour against a pre-built context:
 * blocks reject with a `plan:tree-rejected` toast event and never open
 * the dialog; warns open PlacementConflictDialog's store and resolve on
 * confirm (with acknowledgments) or cancel; clean placements pass
 * straight through.
 */

import { afterEach, describe, expect, it } from 'vitest';
import { usePlacementConflictStore } from '../../draw/placementConflictStore.js';
import { gatePlacement } from '../placementGate.js';
import type { PlacementContext } from '../placementContext.js';

const M = 1 / 111_320;

function sq(cxM: number, cyM: number, halfM: number): GeoJSON.Polygon {
  const x0 = (cxM - halfM) * M;
  const x1 = (cxM + halfM) * M;
  const y0 = (cyM - halfM) * M;
  const y1 = (cyM + halfM) * M;
  return {
    type: 'Polygon',
    coordinates: [
      [
        [x0, y0],
        [x1, y0],
        [x1, y1],
        [x0, y1],
        [x0, y0],
      ],
    ],
  };
}

function makeCtx(partial?: Partial<PlacementContext>): PlacementContext {
  return {
    projectId: 'p1',
    boundary: null,
    zones: [],
    setbackRings: [],
    features: [],
    siteLayers: { wetland: [], waterway: [] },
    bufferCache: new Map(),
    ...partial,
  };
}

const ANCHOR: [number, number] = [0, 0];
const paddock = { kind: 'paddock', category: 'grazing' };

afterEach(() => {
  usePlacementConflictStore.getState().close();
});

describe('gatePlacement', () => {
  it('resolves ok immediately for a clean placement', async () => {
    const result = await gatePlacement(sq(0, 0, 10), paddock, {
      projectId: 'p1',
      anchor: ANCHOR,
      ctx: makeCtx(),
    });
    expect(result).toEqual({ ok: true });
    expect(usePlacementConflictStore.getState().active).toBe(false);
  });

  it('rejects blocks with a toast event and never opens the dialog', async () => {
    const ctx = makeCtx({
      zones: [{ id: 'z1', category: 'spiritual', geometry: sq(0, 0, 50) }],
    });
    let toastReason: string | null = null;
    const onToast = (ev: Event) => {
      toastReason = (ev as CustomEvent<{ reason: string }>).detail.reason;
    };
    window.addEventListener('plan:tree-rejected', onToast);
    try {
      const result = await gatePlacement(sq(0, 0, 10), paddock, {
        projectId: 'p1',
        anchor: ANCHOR,
        ctx,
      });
      expect(result).toEqual({ ok: false });
      expect(toastReason).toContain('spiritual');
      expect(usePlacementConflictStore.getState().active).toBe(false);
    } finally {
      window.removeEventListener('plan:tree-rejected', onToast);
    }
  });

  it('opens the dialog for warns and resolves with acknowledgments on confirm', async () => {
    const ctx = makeCtx({
      features: [
        { id: 'pad1', kind: 'paddock', category: 'grazing', geometry: sq(0, 0, 30) },
      ],
    });
    const pending = gatePlacement(sq(20, 0, 30), paddock, {
      projectId: 'p1',
      anchor: ANCHOR,
      ctx,
    });
    const store = usePlacementConflictStore.getState();
    expect(store.active).toBe(true);
    expect(store.violations.map((v) => v.ruleId)).toContain('paddock-no-self-overlap');
    store.onConfirm?.('intentional — splitting this paddock');
    const result = await pending;
    expect(result.ok).toBe(true);
    expect(result.acknowledgments).toHaveLength(1);
    expect(result.acknowledgments?.[0]).toMatchObject({
      ruleId: 'paddock-no-self-overlap',
      acknowledgment: 'intentional — splitting this paddock',
    });
    expect(typeof result.acknowledgments?.[0]?.acknowledgedAt).toBe('string');
  });

  it('resolves not-ok when the steward cancels the dialog', async () => {
    const ctx = makeCtx({
      features: [
        { id: 'pad1', kind: 'paddock', category: 'grazing', geometry: sq(0, 0, 30) },
      ],
    });
    const pending = gatePlacement(sq(20, 0, 30), paddock, {
      projectId: 'p1',
      anchor: ANCHOR,
      ctx,
    });
    usePlacementConflictStore.getState().onCancel?.();
    await expect(pending).resolves.toEqual({ ok: false });
  });

  it('passes excludeFeatureId through (drag re-validation does not self-collide)', async () => {
    const ctx = makeCtx({
      features: [
        { id: 'pad1', kind: 'paddock', category: 'grazing', geometry: sq(0, 0, 30) },
      ],
    });
    const result = await gatePlacement(sq(20, 0, 30), paddock, {
      projectId: 'p1',
      anchor: ANCHOR,
      ctx,
      excludeFeatureId: 'pad1',
    });
    expect(result).toEqual({ ok: true });
  });
});
