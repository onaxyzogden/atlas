// @vitest-environment happy-dom
/**
 * surveyLayerStyleReload — guards the fix for "drawn slope/vegetation polygons
 * intermittently disappear from the map".
 *
 * Root cause: the survey layers re-added their MapLibre source+layers on ONLY
 * `map.on('style.load')`. A basemap swap runs `map.setStyle(target,
 * { diff:false })`, which wipes all app-added sources/layers; `style.load` is
 * unreliable across F5/setStyle interleavings, so the layers were frequently
 * never re-added (and the overlay toggle only flips `visibility`, a no-op on a
 * layer that no longer exists). The fix mirrors DesignElementLayers:
 *   - a `getStyle()` readiness gate (NOT isStyleLoaded(), which flips back to
 *     false mid-swap) with a `once('idle')` retry, and
 *   - re-add on `style.load` + `load` + `styledata` (styledata fires on the
 *     initial paint AND every basemap swap).
 *
 * These tests drive a hand-rolled mock map (the live v3 map mount hangs the
 * preview tool deterministically, so this is the proof of the re-add behaviour)
 * plus a storage-backend assertion for the swept synced stores.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, cleanup, act } from '@testing-library/react';
import type { Map as MaplibreMap } from 'maplibre-gl';
import SlopeSurveyLayer from '../terrain/SlopeSurveyLayer.js';
import VegetationSurveyLayer from '../ecology/VegetationSurveyLayer.js';
import { useSlopeSurveyStore } from '../../../store/slopeSurveyStore.js';
import { useVegetationSurveyStore } from '../../../store/vegetationSurveyStore.js';
import { useActEvidenceStore } from '../../../store/actEvidenceStore.js';
import { useProtocolStore } from '../../../store/protocolStore.js';
import { useReviewFlagStore } from '../../../store/reviewFlagStore.js';

// Minimal valid square ring — geometry content is irrelevant to layer wiring,
// but must be a real polygon so turf.centroid (the label feature) succeeds.
const SQUARE: GeoJSON.Polygon = {
  type: 'Polygon',
  coordinates: [
    [
      [0, 0],
      [0, 1],
      [1, 1],
      [1, 0],
      [0, 0],
    ],
  ],
};

/**
 * A stand-in for a MapLibre map that models just enough of the
 * source/layer/event surface the survey layers touch. Tracks which sources and
 * layers currently "exist" so a `_wipe()` (what setStyle(diff:false) does) plus
 * a fired `styledata` can be asserted to re-add them.
 */
function makeMap(styleReady = true) {
  const sources = new Set<string>();
  const layers = new Set<string>();
  const onHandlers: Record<string, Array<() => void>> = {};
  const onceHandlers: Record<string, Array<() => void>> = {};
  let style: { layers: never[] } | null = styleReady ? { layers: [] } : null;

  return {
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
    setLayoutProperty: vi.fn(),
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

// Unmount between tests so each case's cleanup effect runs on a fresh tree.
afterEach(cleanup);

/** Two-axis case table so slope + vegetation are exercised identically. */
const CASES = [
  {
    label: 'slope',
    Component: SlopeSurveyLayer,
    sourceId: 'slope-survey-src',
    layerIds: ['slope-survey-fill', 'slope-survey-line', 'slope-survey-label'],
    seed: () =>
      useSlopeSurveyStore
        .getState()
        .addFeature('proj-1', { slopeClass: 'gentle', geometry: SQUARE, acreage: 5 }),
    reset: () =>
      useSlopeSurveyStore.setState({ byProject: {}, active: false, activeProjectId: null }),
  },
  {
    label: 'vegetation',
    Component: VegetationSurveyLayer,
    sourceId: 'veg-survey-src',
    layerIds: ['veg-survey-fill', 'veg-survey-line', 'veg-survey-label'],
    seed: () =>
      useVegetationSurveyStore
        .getState()
        .addFeature('proj-1', { community: 'riparian', geometry: SQUARE, acreage: 5 }),
    reset: () =>
      useVegetationSurveyStore.setState({
        byProject: {},
        active: false,
        activeProjectId: null,
        activeCommunity: null,
      }),
  },
] as const;

describe.each(CASES)(
  '$label survey layer — survives basemap swaps',
  ({ Component, sourceId, layerIds, seed, reset }) => {
    beforeEach(() => {
      reset();
      seed();
    });

    function mount(map: MockMap) {
      return render(
        <Component map={map as unknown as MaplibreMap} projectId="proj-1" />,
      );
    }

    it('adds the source + 3 layers and registers style.load / load / styledata', () => {
      const map = makeMap(true);
      mount(map);

      expect(map.addSource).toHaveBeenCalledWith(sourceId, expect.anything());
      for (const id of layerIds) {
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

      // A setStyle(diff:false) basemap swap wipes everything we added...
      act(() => {
        map._wipe();
      });
      expect(map._sources.has(sourceId)).toBe(false);

      // ...and the styledata that fires on the new style's first paint re-adds it.
      act(() => {
        map._fire('styledata');
      });
      expect(map.addSource).toHaveBeenCalledWith(sourceId, expect.anything());
      expect(map._sources.has(sourceId)).toBe(true);
      for (const id of layerIds) {
        expect(map._layers.has(id)).toBe(true);
      }
    });

    it('does not add when the style is not ready, but arms an idle retry that re-adds', () => {
      const map = makeMap(false); // getStyle() === null at mount
      mount(map);

      expect(map.addSource).not.toHaveBeenCalled();
      const onceEvents = map.once.mock.calls.map((c) => c[0]);
      expect(onceEvents).toContain('idle');

      // Once the style settles, the armed idle retry adds the source + layers.
      act(() => {
        map._setStyleReady(true);
        map._fireOnce('idle');
      });
      expect(map.addSource).toHaveBeenCalledWith(sourceId, expect.anything());
      for (const id of layerIds) {
        expect(map._layers.has(id)).toBe(true);
      }
    });

    it('detaches all three listeners on unmount', () => {
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
  },
);

// ---------------------------------------------------------------------------
// Storage backend sweep — the three synced byProject stores that previously
// defaulted to localStorage now carry the shared IndexedDB persist backend,
// matching slopeSurveyStore / vegetationSurveyStore. Assert the backend is
// wired (getOptions().storage defined) so a future regression that drops it is
// caught the same way the slope/veg fix is.
// ---------------------------------------------------------------------------

describe('swept synced stores use the IndexedDB persist backend', () => {
  const STORES = [
    { name: 'ogden-act-evidence', store: useActEvidenceStore },
    { name: 'ogden-protocols', store: useProtocolStore },
    { name: 'ogden-review-flags', store: useReviewFlagStore },
    { name: 'ogden-slope-survey', store: useSlopeSurveyStore },
    { name: 'ogden-vegetation-survey', store: useVegetationSurveyStore },
  ] as const;

  it.each(STORES)('$name has a defined storage backend', ({ name, store }) => {
    const opts = store.persist.getOptions();
    expect(opts.name).toBe(name);
    expect(opts.storage).toBeDefined();
  });
});
