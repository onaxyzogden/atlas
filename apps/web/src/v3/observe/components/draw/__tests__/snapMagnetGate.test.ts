/**
 * Phase 4 — snap magnet gate. The `snapEnabled` flag on `useMapToolStore` is
 * the single source of truth for whether draw tools snap. Both central snap
 * gates read it live: `snapDrawModes.applySnap` (mapbox-draw point/line/polygon
 * modes) and the `useContinuousPointDrawTool` `snap` helper (design-element
 * point drops). This pins the mode-side gate end to end — magnet on rewrites
 * the pointer coord to the snapped position; magnet off lets the raw click
 * through unchanged even when a target sits within the snap radius.
 *
 * Linear mock projection (lng → x*100, lat → y*100), so 1 deg = 100 px and the
 * 8 px snap radius spans 0.08 deg — mirrors snapDrawPoint.test.ts.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { applySnap } from '../snapDrawModes.js';
import type { SnapTargets } from '../../../../lib/snapPoint.js';
import { useMapToolStore } from '../../measure/useMapToolStore.js';

type LngLat = [number, number];

const mockMap = {
  project: ([lng, lat]: LngLat) => ({ x: lng * 100, y: lat * 100 }),
  unproject: ([x, y]: [number, number]) => ({ lng: x / 100, lat: y / 100 }),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
} as any;

// One snappable vertex at the origin; a click 0.05 deg (5 px) away is in range.
const targets: SnapTargets = { vertices: [[0, 0]], lines: [] };

function clickEvent() {
  return { lngLat: { lng: 0.05, lat: 0 } };
}

describe('snap magnet gate (Phase 4)', () => {
  beforeEach(() => {
    // Each test sets the flag explicitly; restore the default afterwards.
    useMapToolStore.getState().setSnapEnabled(true);
  });

  it('defaults snapEnabled to true', () => {
    expect(useMapToolStore.getState().snapEnabled).toBe(true);
  });

  it('snaps the pointer coord onto an in-range target when the magnet is on', () => {
    useMapToolStore.getState().setSnapEnabled(true);
    const e = clickEvent();
    applySnap.call({ map: mockMap }, { snapTargets: targets }, e);
    expect(e.lngLat).toEqual({ lng: 0, lat: 0 });
  });

  it('leaves the raw pointer coord untouched when the magnet is off', () => {
    useMapToolStore.getState().setSnapEnabled(false);
    const e = clickEvent();
    applySnap.call({ map: mockMap }, { snapTargets: targets }, e);
    // Atop a target, yet unchanged — free placement.
    expect(e.lngLat).toEqual({ lng: 0.05, lat: 0 });
  });

  it('survives tool switches (setActiveTool does not reset the magnet)', () => {
    const store = useMapToolStore.getState();
    store.setSnapEnabled(false);
    store.setActiveTool('plan.livestock.paddock');
    store.setActiveTool(null);
    expect(useMapToolStore.getState().snapEnabled).toBe(false);
  });
});
