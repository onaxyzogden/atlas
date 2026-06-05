/**
 * memberDragMath.test — pure-math coverage for the map-layer member-drag
 * inverse arithmetic. The drag handler in PlanDataLayers.tsx computes
 * `[dEastM, dNorthM] = lonLatToMetresOffset(eventLng - startLng,
 * eventLat - startLat, guildCenter.lat)` and writes
 * `position = [origEast + dEastM, origNorth + dNorthM]`. This file
 * shields that contract; the agroforestry/__tests__/guildMemberPositions
 * suite covers the inverse helper itself in isolation, and here we
 * exercise the absolute-lonlat → guild-local-metres conversion used at
 * the drag boundary.
 */

import { describe, expect, it } from 'vitest';
import {
  lonLatToMetresOffset,
  metresToLonLatOffset,
} from '../../../../features/agroforestry/guildMemberPositions.js';

describe('lonLatToMetresOffset (map-layer drag inverse)', () => {
  it('returns [0, 0] for a zero delta at the origin', () => {
    expect(lonLatToMetresOffset(0, 0, 0)).toEqual([0, 0]);
  });

  it('round-trips metresToLonLatOffset at lat 0 inside 1 mm', () => {
    for (const sample of [[3, 4], [-2, 6], [0, 0.5]] as Array<[number, number]>) {
      const [eIn, nIn] = sample;
      const [dLng, dLat] = metresToLonLatOffset(eIn, nIn, 0);
      const [eOut, nOut] = lonLatToMetresOffset(dLng, dLat, 0);
      expect(eOut).toBeCloseTo(eIn, 3);
      expect(nOut).toBeCloseTo(nIn, 3);
    }
  });

  it('round-trips at lat 45° inside 1 mm', () => {
    for (const sample of [[3, 4], [-2, 6], [0, 0.5]] as Array<[number, number]>) {
      const [eIn, nIn] = sample;
      const [dLng, dLat] = metresToLonLatOffset(eIn, nIn, 45);
      const [eOut, nOut] = lonLatToMetresOffset(dLng, dLat, 45);
      expect(eOut).toBeCloseTo(eIn, 3);
      expect(nOut).toBeCloseTo(nIn, 3);
    }
  });

  it('round-trips at lat 60° inside 1 mm', () => {
    for (const sample of [[3, 4], [-2, 6], [0, 0.5]] as Array<[number, number]>) {
      const [eIn, nIn] = sample;
      const [dLng, dLat] = metresToLonLatOffset(eIn, nIn, 60);
      const [eOut, nOut] = lonLatToMetresOffset(dLng, dLat, 60);
      expect(eOut).toBeCloseTo(eIn, 3);
      expect(nOut).toBeCloseTo(nIn, 3);
    }
  });

  it('round-trips at lat -30° inside 1 mm', () => {
    for (const sample of [[3, 4], [-2, 6], [0, 0.5]] as Array<[number, number]>) {
      const [eIn, nIn] = sample;
      const [dLng, dLat] = metresToLonLatOffset(eIn, nIn, -30);
      const [eOut, nOut] = lonLatToMetresOffset(dLng, dLat, -30);
      expect(eOut).toBeCloseTo(eIn, 3);
      expect(nOut).toBeCloseTo(nIn, 3);
    }
  });

  it('absolute lon/lat → guild-local metres given a fixed Guild.center', () => {
    // Given a guild centred at [-95, 40] and a target point ~3 m east + 4 m
    // north, the drag-time conversion (eventLngLat - guild.center, fed to
    // lonLatToMetresOffset) should recover [3, 4] within sub-mm.
    const center: [number, number] = [-95, 40];
    const [dLng, dLat] = metresToLonLatOffset(3, 4, center[1]);
    const targetLng = center[0] + dLng;
    const targetLat = center[1] + dLat;
    const [eastM, northM] = lonLatToMetresOffset(
      targetLng - center[0],
      targetLat - center[1],
      center[1],
    );
    expect(eastM).toBeCloseTo(3, 6);
    expect(northM).toBeCloseTo(4, 6);
  });
});
