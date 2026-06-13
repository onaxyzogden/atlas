/**
 * Phase 6 — self-snap. A draw session records each committed vertex onto
 * `state.selfVertices` (`recordSelfVertex`), and `applySnap` folds those into
 * the snap-candidate set so the sketch can lock onto itself — most usefully a
 * closing polygon onto its own origin vertex. This pins the pure building
 * blocks (the full MapboxDraw mode interaction is verified manually); the live
 * close-click semantics are out of scope for a unit test.
 *
 * Linear mock projection (lng → x*100, lat → y*100), so 1 deg = 100 px and the
 * 8 px snap radius spans 0.08 deg — mirrors snapMagnetGate.test.ts.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { applySnap, recordSelfVertex } from '../snapDrawModes.js';
import { useMapToolStore } from '../../measure/useMapToolStore.js';

type LngLat = [number, number];

const mockMap = {
  project: ([lng, lat]: LngLat) => ({ x: lng * 100, y: lat * 100 }),
  unproject: ([x, y]: [number, number]) => ({ lng: x / 100, lat: y / 100 }),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
} as any;

describe('self-snap (Phase 6)', () => {
  beforeEach(() => {
    useMapToolStore.getState().setSnapEnabled(true);
  });

  it('records each committed vertex onto state.selfVertices', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const state: any = {};
    recordSelfVertex(state, { lngLat: { lng: 1, lat: 2 } });
    recordSelfVertex(state, { lngLat: { lng: 3, lat: 4 } });
    expect(state.selfVertices).toEqual([
      [1, 2],
      [3, 4],
    ]);
  });

  it('ignores events with no pointer coord (never records a phantom vertex)', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const state: any = { selfVertices: [[0, 0]] };
    recordSelfVertex(state, {});
    recordSelfVertex(state, undefined);
    expect(state.selfVertices).toEqual([[0, 0]]);
  });

  it('snaps the cursor onto a committed self-vertex even with no base targets', () => {
    // Origin vertex already committed; a click 5 px away (within radius) closes
    // onto it. No `snapTargets` at all — self-snap stands alone.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const state: any = { selfVertices: [[0, 0]] };
    const e = { lngLat: { lng: 0.05, lat: 0 } };
    applySnap.call({ map: mockMap }, state, e);
    expect(e.lngLat).toEqual({ lng: 0, lat: 0 });
  });

  it('does not self-snap when the magnet is off', () => {
    useMapToolStore.getState().setSnapEnabled(false);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const state: any = { selfVertices: [[0, 0]] };
    const e = { lngLat: { lng: 0.05, lat: 0 } };
    applySnap.call({ map: mockMap }, state, e);
    expect(e.lngLat).toEqual({ lng: 0.05, lat: 0 });
  });

  it('folds self-vertices in additively alongside base snapTargets', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const state: any = {
      snapTargets: { vertices: [[1, 1]], lines: [] },
      selfVertices: [[0, 0]],
    };
    // Near the self-vertex → snaps to it.
    const eSelf = { lngLat: { lng: 0.05, lat: 0 } };
    applySnap.call({ map: mockMap }, state, eSelf);
    expect(eSelf.lngLat).toEqual({ lng: 0, lat: 0 });
    // Near the base-target vertex → still snaps to it (base targets untouched).
    const eBase = { lngLat: { lng: 1.05, lat: 1 } };
    applySnap.call({ map: mockMap }, state, eBase);
    expect(eBase.lngLat).toEqual({ lng: 1, lat: 1 });
  });

  it('is a no-op with neither base targets nor self-vertices', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const state: any = {};
    const e = { lngLat: { lng: 0.05, lat: 0 } };
    applySnap.call({ map: mockMap }, state, e);
    expect(e.lngLat).toEqual({ lng: 0.05, lat: 0 });
  });
});
