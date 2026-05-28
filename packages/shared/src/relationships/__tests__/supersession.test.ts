import { describe, it, expect } from 'vitest';
import {
  computeSupersession,
  restoreFromSupersession,
  haversineMeters,
  DEFAULT_SUPERSESSION_PROXIMITY_METERS,
} from '../supersession.js';
import type { ObserveDataPoint } from '../../schemas/observe/dataPoint.schema.js';

function fixture(
  id: string,
  overrides: Partial<ObserveDataPoint> = {},
): ObserveDataPoint {
  return {
    id,
    projectId: 'p1',
    domainId: 'soil',
    sourceType: 'manual_observation',
    sourceActionId: null,
    sourceFeedEntryId: null,
    locationGeometry: {
      type: 'Point',
      coordinates: [-118.5, 34.1],
    },
    cycleId: 0,
    isSuperseded: false,
    supersededBy: null,
    statusOutput: 'clear',
    measurementValue: null,
    proofItems: [],
    capturedAt: '2026-05-28T12:00:00.000Z',
    capturedBy: 'user-1',
    ...overrides,
  };
}

describe('haversineMeters', () => {
  it('returns 0 for the same point', () => {
    expect(haversineMeters([-118.5, 34.1], [-118.5, 34.1])).toBe(0);
  });

  it('returns a small distance (under default radius) for points 5m apart', () => {
    // ~5m east at lat 34.1: ~0.0000543 deg lng
    const d = haversineMeters([-118.5, 34.1], [-118.5 + 0.0000543, 34.1]);
    expect(d).toBeGreaterThan(4);
    expect(d).toBeLessThan(6);
  });
});

describe('DEFAULT_SUPERSESSION_PROXIMITY_METERS', () => {
  it('locks to 10 per Dashboard Spec §4.3', () => {
    expect(DEFAULT_SUPERSESSION_PROXIMITY_METERS).toBe(10);
  });
});

describe('computeSupersession', () => {
  it('returns empty supersededPointIds for an empty existing set', () => {
    const newP = fixture('new');
    const decision = computeSupersession(newP, []);
    expect(decision).toEqual({ newPointId: 'new', supersededPointIds: [] });
  });

  it('supersedes a same-domain active point within the default radius', () => {
    const newP = fixture('new');
    const existing = fixture('old');
    const decision = computeSupersession(newP, [existing]);
    expect(decision.supersededPointIds).toEqual(['old']);
  });

  it('skips itself (same id) — does not self-supersede', () => {
    const p = fixture('same');
    const decision = computeSupersession(p, [p]);
    expect(decision.supersededPointIds).toEqual([]);
  });

  it('skips already-superseded candidates', () => {
    const newP = fixture('new');
    const existing = fixture('old', { isSuperseded: true });
    const decision = computeSupersession(newP, [existing]);
    expect(decision.supersededPointIds).toEqual([]);
  });

  it('skips different-domain candidates', () => {
    const newP = fixture('new', { domainId: 'soil' });
    const existing = fixture('old', { domainId: 'hydrology' });
    const decision = computeSupersession(newP, [existing]);
    expect(decision.supersededPointIds).toEqual([]);
  });

  it('returns empty when the new point has no location geometry', () => {
    const newP = fixture('new', { locationGeometry: null });
    const existing = fixture('old');
    const decision = computeSupersession(newP, [existing]);
    expect(decision.supersededPointIds).toEqual([]);
  });

  it('skips candidates with no location geometry', () => {
    const newP = fixture('new');
    const existing = fixture('old', { locationGeometry: null });
    const decision = computeSupersession(newP, [existing]);
    expect(decision.supersededPointIds).toEqual([]);
  });

  it('does NOT supersede a same-domain point beyond the default radius', () => {
    const newP = fixture('new', {
      locationGeometry: { type: 'Point', coordinates: [-118.5, 34.1] },
    });
    // ~50m east — well outside 10m radius
    const existing = fixture('old', {
      locationGeometry: { type: 'Point', coordinates: [-118.5 + 0.000543, 34.1] },
    });
    const decision = computeSupersession(newP, [existing]);
    expect(decision.supersededPointIds).toEqual([]);
  });

  it('honors a custom per-domain proximity override', () => {
    const newP = fixture('new', {
      locationGeometry: { type: 'Point', coordinates: [-118.5, 34.1] },
    });
    // ~30m east
    const existing = fixture('old', {
      locationGeometry: { type: 'Point', coordinates: [-118.5 + 0.000326, 34.1] },
    });
    // default 10m — no supersession
    expect(computeSupersession(newP, [existing]).supersededPointIds).toEqual([]);
    // override to 50m — supersedes
    expect(
      computeSupersession(newP, [existing], { proximityMeters: 50 })
        .supersededPointIds,
    ).toEqual(['old']);
  });

  it('supersedes multiple eligible candidates in one pass', () => {
    const newP = fixture('new');
    const a = fixture('a');
    const b = fixture('b');
    const decision = computeSupersession(newP, [a, b]);
    expect(decision.supersededPointIds.sort()).toEqual(['a', 'b']);
  });
});

describe('restoreFromSupersession', () => {
  it('round-trips both rows back to active with null supersededBy', () => {
    const superseded = fixture('old', {
      isSuperseded: true,
      supersededBy: 'new',
    });
    const superseding = fixture('new');
    const { restored } = restoreFromSupersession(superseded, superseding);
    expect(restored).toEqual([
      { id: 'old', isSuperseded: false, supersededBy: null },
      { id: 'new', isSuperseded: false, supersededBy: null },
    ]);
  });
});
