// @vitest-environment happy-dom
/**
 * planDataLayersStyleReload — guards the fix for "drawn Plan polygons vanish on
 * the topographic basemap after navigating to another stage and back".
 *
 * Root cause: PlanDataLayers re-added its MapLibre sources+layers from an
 * `apply()` gated on `map.isStyleLoaded()`. That predicate flips back to false
 * while vector tiles/glyphs are still loading — and topographic is the heaviest
 * vector style — so on a freshly-remounted map (Plan/Act/Observe are sibling
 * routes; the map is recreated on every stage change) the gate bailed on every
 * style.load/load/styledata and the dedicated-store polygons (zones/water/
 * fences/paths/…) were never re-added. It was the lone holdout still on
 * isStyleLoaded(); the survey layers + DesignElementLayers had already moved to
 * a getStyle() gate + a re-arming idle retry. The fix brings it to parity:
 *   - gate on `getStyle()` (null only pre-first-load / post-dispose),
 *   - re-arm an idle retry when the style isn't paintable yet, and
 *   - re-add on style.load + load + styledata (styledata fires on initial paint
 *     AND every basemap swap).
 *
 * These tests drive a hand-rolled mock map (the live v3 map mount hangs the
 * preview tool deterministically, so this is the proof of the re-add behaviour).
 * Empty stores are sufficient: the `plan-data-poly` source and its
 * poly-fill / poly-line layers are added unconditionally, independent of how
 * many features exist.
 */

import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, cleanup, act } from '@testing-library/react';
import type { Map as MaplibreMap } from 'maplibre-gl';
import PlanDataLayers, { retileStalledSource } from '../PlanDataLayers.js';

const POLY_SOURCE = 'plan-data-poly';
const POLY_LAYERS = ['plan-data-poly-fill', 'plan-data-poly-line'] as const;

/**
 * A stand-in for a MapLibre map modelling just enough of the source/layer/event
 * surface PlanDataLayers touches at mount. Tracks which sources + layers
 * currently "exist" so a `_wipe()` (what setStyle(diff:false) does) plus a fired
 * `styledata` can be asserted to re-add them. `getCanvasContainer` returns a
 * real detached node so any portal/listener setup has a valid target.
 */
function makeMap(styleReady = true) {
  const sources = new Set<string>();
  const layers = new Set<string>();
  const onHandlers: Record<string, Array<() => void>> = {};
  const onceHandlers: Record<string, Array<() => void>> = {};
  let style: { layers: never[] } | null = styleReady ? { layers: [] } : null;
  const container = document.createElement('div');

  return {
    // Default healthy: loaded() === true keeps the keyless re-tile kick (see
    // retileStalledSource) gated off, so these remount/basemap-swap tests are
    // unaffected by it.
    loaded: vi.fn(() => true),
    triggerRepaint: vi.fn(),
    getStyle: vi.fn(() => style),
    getSource: vi.fn((id: string) =>
      sources.has(id) ? { setData: vi.fn() } : undefined,
    ),
    addSource: vi.fn((id: string) => {
      sources.add(id);
    }),
    getLayer: vi.fn((id: string) => (layers.has(id) ? { id } : undefined)),
    addLayer: vi.fn((def: { id: string }) => {
      layers.add(def.id);
    }),
    removeLayer: vi.fn((id: string) => {
      layers.delete(id);
    }),
    removeSource: vi.fn((id: string) => {
      sources.delete(id);
    }),
    setPaintProperty: vi.fn(),
    setFilter: vi.fn(),
    setLayoutProperty: vi.fn(),
    moveLayer: vi.fn(),
    getCanvasContainer: vi.fn(() => container),
    queryRenderedFeatures: vi.fn(() => []),
    unproject: vi.fn(() => ({ lng: 0, lat: 0 })),
    project: vi.fn(() => ({ x: 0, y: 0 })),
    on: vi.fn((event: string, handler: () => void) => {
      (onHandlers[event] ??= []).push(handler);
    }),
    off: vi.fn((event: string, handler: () => void) => {
      const arr = onHandlers[event];
      if (arr) {
        const i = arr.indexOf(handler);
        if (i >= 0) arr.splice(i, 1);
      }
    }),
    once: vi.fn((event: string, handler: () => void) => {
      (onceHandlers[event] ??= []).push(handler);
    }),
    // ---- test-only helpers (not part of the MaplibreMap surface) ----
    _sources: sources,
    _layers: layers,
    _setStyleReady: (v: boolean) => {
      style = v ? { layers: [] } : null;
    },
    /** Simulate a setStyle(diff:false) basemap swap wiping app-added objects. */
    _wipe: () => {
      sources.clear();
      layers.clear();
    },
    _fire: (event: string) => {
      (onHandlers[event] ?? []).slice().forEach((h) => h());
    },
    _fireOnce: (event: string) => {
      const arr = onHandlers[event] ?? [];
      const onceArr = onceHandlers[event] ?? [];
      onceHandlers[event] = [];
      [...arr, ...onceArr].forEach((h) => h());
    },
  };
}

type MockMap = ReturnType<typeof makeMap>;

afterEach(cleanup);

function mount(map: MockMap) {
  // editable={false} mirrors the Act/read-only mount and keeps drag wiring out
  // of the way; the re-add effect under test runs regardless of `editable`.
  return render(
    <PlanDataLayers
      map={map as unknown as MaplibreMap}
      projectId="proj-1"
      editable={false}
    />,
  );
}

describe('PlanDataLayers — survives stage remounts + basemap swaps', () => {
  it('adds the poly source + layers and registers style.load / load / styledata', () => {
    const map = makeMap(true);
    mount(map);

    expect(map.addSource).toHaveBeenCalledWith(POLY_SOURCE, expect.anything());
    for (const id of POLY_LAYERS) {
      expect(map._layers.has(id)).toBe(true);
    }
    const events = map.on.mock.calls.map((c) => c[0]);
    expect(events).toContain('style.load');
    expect(events).toContain('load');
    expect(events).toContain('styledata');
  });

  it('re-adds the wiped source + layers when styledata fires after a basemap swap', () => {
    const map = makeMap(true);
    mount(map);
    map.addSource.mockClear();

    // A setStyle(diff:false) basemap swap (e.g. topographic ⇄ satellite, or a
    // fresh map on stage re-entry) wipes everything we added...
    act(() => {
      map._wipe();
    });
    expect(map._sources.has(POLY_SOURCE)).toBe(false);

    // ...and the styledata that fires on the new style's first paint re-adds it.
    act(() => {
      map._fire('styledata');
    });
    expect(map.addSource).toHaveBeenCalledWith(POLY_SOURCE, expect.anything());
    expect(map._sources.has(POLY_SOURCE)).toBe(true);
    for (const id of POLY_LAYERS) {
      expect(map._layers.has(id)).toBe(true);
    }
  });

  it('does not add while the style is unready (getStyle null), but arms an idle retry that re-adds', () => {
    const map = makeMap(false); // getStyle() === null at mount
    mount(map);

    expect(map.addSource).not.toHaveBeenCalledWith(
      POLY_SOURCE,
      expect.anything(),
    );
    const onceEvents = map.once.mock.calls.map((c) => c[0]);
    expect(onceEvents).toContain('idle');

    // Once the style settles, the armed idle retry adds the source + layers.
    act(() => {
      map._setStyleReady(true);
      map._fireOnce('idle');
    });
    expect(map.addSource).toHaveBeenCalledWith(POLY_SOURCE, expect.anything());
    for (const id of POLY_LAYERS) {
      expect(map._layers.has(id)).toBe(true);
    }
  });

  it('detaches the style.load / load / styledata listeners on unmount', () => {
    const map = makeMap(true);
    const { unmount } = mount(map);
    act(() => {
      unmount();
    });
    const offEvents = map.off.mock.calls.map((c) => c[0]);
    expect(offEvents).toContain('style.load');
    expect(offEvents).toContain('load');
    expect(offEvents).toContain('styledata');
  });
});

/**
 * retileStalledSource — guards the fix for "seed zones from home: the seeded
 * zones don't render until I toggle the overlay off/on".
 *
 * Root cause (verified live on the keyless Esri-raster fallback): when a
 * previously-empty GeoJSON source receives its first features while the map is
 * stuck at `loaded() === false`, maplibre's `setData()` -> SourceCache reload
 * path does NOT request viewport tiles for it, so the features never tile
 * (`querySourceFeatures` = 0) and never paint until the operator toggles the
 * overlay (which re-adds the layer and forces a fresh tile request). The proven
 * minimal kick is `clearTiles()` + `update(transform)` + `triggerRepaint()`,
 * gated on the exact failure fingerprint (features present, zero tiles) so the
 * healthy keyed path stays a no-op (no flicker from clearing live tiles).
 */
describe('retileStalledSource — paints first features on a stalled keyless map', () => {
  const SID = 'plan-data-poly';

  /** Minimal map exposing the private surface retileStalledSource reaches. */
  function makeKickMap(tileKeys: string[]) {
    const sc = {
      _tiles: Object.fromEntries(tileKeys.map((k) => [k, {}])),
      clearTiles: vi.fn(),
      update: vi.fn(),
    };
    const transform = { __t: true };
    return {
      map: {
        triggerRepaint: vi.fn(),
        transform,
        style: { _otherSourceCaches: { [SID]: sc } },
      } as unknown as MaplibreMap,
      sc,
      transform,
    };
  }

  it('kicks (clearTiles + update + repaint) when the source has features but zero tiles', () => {
    const { map, sc, transform } = makeKickMap([]);
    retileStalledSource(map, SID, true);
    expect(sc.clearTiles).toHaveBeenCalledTimes(1);
    expect(sc.update).toHaveBeenCalledWith(transform);
    expect((map as unknown as { triggerRepaint: ReturnType<typeof vi.fn> }).triggerRepaint).toHaveBeenCalledTimes(1);
  });

  it('does NOT kick when the source already has tiles (avoids clearing live tiles / flicker)', () => {
    const { map, sc } = makeKickMap(['0/0/0']);
    retileStalledSource(map, SID, true);
    expect(sc.update).not.toHaveBeenCalled();
    expect(sc.clearTiles).not.toHaveBeenCalled();
  });

  it('is a no-op when the source has no features', () => {
    const { map, sc } = makeKickMap([]);
    retileStalledSource(map, SID, false);
    expect(sc.update).not.toHaveBeenCalled();
  });

  it('falls back to the sourceCaches accessor and degrades silently when internals are absent', () => {
    // sourceCaches (older field name) instead of _otherSourceCaches
    const sc = { _tiles: {}, clearTiles: vi.fn(), update: vi.fn() };
    const map = {
      triggerRepaint: vi.fn(),
      transform: {},
      style: { sourceCaches: { [SID]: sc } },
    } as unknown as MaplibreMap;
    retileStalledSource(map, SID, true);
    expect(sc.update).toHaveBeenCalledTimes(1);

    // Missing cache entirely → no throw, no repaint.
    const bare = { triggerRepaint: vi.fn(), transform: {}, style: {} } as unknown as MaplibreMap;
    expect(() => retileStalledSource(bare, SID, true)).not.toThrow();
    expect((bare as unknown as { triggerRepaint: ReturnType<typeof vi.fn> }).triggerRepaint).not.toHaveBeenCalled();
  });
});
