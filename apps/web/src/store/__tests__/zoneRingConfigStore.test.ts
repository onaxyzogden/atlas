// @vitest-environment happy-dom
/**
 * zoneRingConfigStore — per-project adjustable Mollison ring radii. Locks
 * the contract every consumer relies on: an untouched project reads the
 * canonical default ladder, writes are monotonic-clamped (rings never
 * collapse or invert), and the `scaleRadii` helper multiplies the ladder
 * uniformly.
 */

import { describe, expect, it } from 'vitest';
import {
  useZoneRingConfigStore,
  clampRingRadii,
  scaleRadii,
} from '../zoneRingConfigStore.js';
import { DEFAULT_RING_RADII } from '../../v3/plan/layers/zoneRingConstants.js';

describe('zoneRingConfigStore', () => {
  it('getRadii returns DEFAULT_RING_RADII for an untouched project', () => {
    const r = useZoneRingConfigStore.getState().getRadii('untouched-proj');
    expect(r).toEqual(DEFAULT_RING_RADII);
  });

  it('setRadii persists and merges a partial patch', () => {
    const pid = 'proj-merge';
    useZoneRingConfigStore.getState().setRadii(pid, { z3M: 400 });
    const r = useZoneRingConfigStore.getState().getRadii(pid);
    expect(r.z3M).toBe(400);
    // Untouched slots keep their defaults.
    expect(r.homeM).toBe(DEFAULT_RING_RADII.homeM);
    expect(r.z5M).toBe(DEFAULT_RING_RADII.z5M);
  });

  it('setRadii clamps to strictly increasing radii', () => {
    const pid = 'proj-clamp';
    // z1 below home, z2 below z1 — must be lifted above their predecessors.
    useZoneRingConfigStore
      .getState()
      .setRadii(pid, { homeM: 50, z1M: 10, z2M: 5 });
    const r = useZoneRingConfigStore.getState().getRadii(pid);
    expect(r.homeM).toBe(50);
    expect(r.z1M).toBeGreaterThan(r.homeM);
    expect(r.z2M).toBeGreaterThan(r.z1M);
    expect(r.z3M).toBeGreaterThan(r.z2M);
  });

  it('resetRadii reverts a project to the default ladder', () => {
    const pid = 'proj-reset';
    useZoneRingConfigStore.getState().setRadii(pid, { homeM: 99 });
    expect(useZoneRingConfigStore.getState().getRadii(pid).homeM).toBe(99);
    useZoneRingConfigStore.getState().resetRadii(pid);
    expect(useZoneRingConfigStore.getState().getRadii(pid)).toEqual(
      DEFAULT_RING_RADII,
    );
  });

  it('clampRingRadii falls back to the default for a non-finite slot', () => {
    const r = clampRingRadii({ homeM: NaN, z2M: -5 });
    expect(r.homeM).toBe(DEFAULT_RING_RADII.homeM);
    // z2M was invalid → default, still clamped above z1.
    expect(r.z2M).toBeGreaterThan(r.z1M);
    expect(r.z1M).toBeGreaterThan(r.homeM);
  });

  it('scaleRadii multiplies the ladder uniformly and stays monotonic', () => {
    const doubled = scaleRadii(2);
    expect(doubled.homeM).toBeCloseTo(DEFAULT_RING_RADII.homeM * 2, 6);
    expect(doubled.z5M).toBeCloseTo(DEFAULT_RING_RADII.z5M * 2, 6);
    expect(doubled.z1M).toBeGreaterThan(doubled.homeM);

    const half = scaleRadii(0.5);
    expect(half.z2M).toBeCloseTo(DEFAULT_RING_RADII.z2M * 0.5, 6);

    // A bad scale falls back to ×1 (the canonical ladder).
    expect(scaleRadii(0)).toEqual(clampRingRadii(DEFAULT_RING_RADII));
    expect(scaleRadii(Number.NaN)).toEqual(clampRingRadii(DEFAULT_RING_RADII));
  });
});
