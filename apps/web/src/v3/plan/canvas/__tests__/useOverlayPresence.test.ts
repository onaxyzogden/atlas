/**
 * @vitest-environment happy-dom
 *
 * useOverlayPresence — per-overlay "does this project have content?" gate that
 * drives the BaseMapCard legend pruning.
 *
 * Asserts:
 *   - computed overlays (topography, sunPath) are ALWAYS present
 *   - with no projectId, every data-backed overlay is absent
 *   - with a projectId but empty stores, every data-backed overlay is absent
 *   - populating a store flips its overlay to present (and only its overlay)
 *   - features for a DIFFERENT project do not light up the row
 */

import { describe, it, expect, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useOverlayPresence } from '../useOverlayPresence.js';
import { useZoneStore } from '../../../../store/zoneStore.js';
import { useSlopeSurveyStore } from '../../../../store/slopeSurveyStore.js';

const P = 'proj-1';

afterEach(() => {
  useZoneStore.setState({ zones: [] });
  useSlopeSurveyStore.setState({ byProject: {} });
});

describe('useOverlayPresence', () => {
  it('keeps the three computed overlays always present (no projectId)', () => {
    const { result } = renderHook(() => useOverlayPresence(undefined));
    expect(result.current.topography).toBe(true);
    expect(result.current.sunPath).toBe(true);
    // sectors is computed too — the SectorCompass HUD renders solar/wind from
    // location even with no manual arrows, so the toggle row is always offered.
    expect(result.current.sectors).toBe(true);
  });

  it('marks every data-backed overlay absent when no projectId is given', () => {
    const { result } = renderHook(() => useOverlayPresence(undefined));
    const p = result.current;
    expect(p.zones).toBe(false);
    expect(p.water).toBe(false);
    expect(p.builtEnvironment).toBe(false);
    expect(p.observeAnnotations).toBe(false);
    expect(p.zoneRings).toBe(false);
    expect(p.seededZones).toBe(false);
    expect(p.placedZones).toBe(false);
    expect(p.scheduledMoves).toBe(false);
    expect(p.waterRouter).toBe(false);
    expect(p.slopeSurvey).toBe(false);
    expect(p.vegetationSurvey).toBe(false);
  });

  it('marks data-backed overlays absent for a project with empty stores', () => {
    const { result } = renderHook(() => useOverlayPresence(P));
    expect(result.current.placedZones).toBe(false);
    expect(result.current.slopeSurvey).toBe(false);
    // computed stay on
    expect(result.current.topography).toBe(true);
    expect(result.current.sunPath).toBe(true);
  });

  it('lights up placedZones (and only it) when a manual zone exists', () => {
    useZoneStore.setState({
      // minimal LandZone shape — only the fields the presence predicate reads
      zones: [{ id: 'z1', projectId: P } as never],
    });
    const { result } = renderHook(() => useOverlayPresence(P));
    expect(result.current.placedZones).toBe(true);
    expect(result.current.zoneRings).toBe(false); // permacultureZone !== 0
    expect(result.current.seededZones).toBe(false); // not ring-seed
  });

  it('lights up zoneRings + seededZones from a Z0 ring-seeded zone', () => {
    useZoneStore.setState({
      zones: [
        {
          id: 'z0',
          projectId: P,
          permacultureZone: 0,
          seedProvenance: 'ring-seed',
        } as never,
      ],
    });
    const { result } = renderHook(() => useOverlayPresence(P));
    expect(result.current.zoneRings).toBe(true);
    expect(result.current.seededZones).toBe(true);
    expect(result.current.placedZones).toBe(false); // ring-seed, not manual
  });

  it('lights up slopeSurvey from a byProject keyed entry', () => {
    useSlopeSurveyStore.setState({ byProject: { [P]: { s1: {} as never } } });
    const { result } = renderHook(() => useOverlayPresence(P));
    expect(result.current.slopeSurvey).toBe(true);
  });

  it('does not light up a row from another project', () => {
    useZoneStore.setState({ zones: [{ id: 'z1', projectId: 'other' } as never] });
    const { result } = renderHook(() => useOverlayPresence(P));
    expect(result.current.placedZones).toBe(false);
  });
});
