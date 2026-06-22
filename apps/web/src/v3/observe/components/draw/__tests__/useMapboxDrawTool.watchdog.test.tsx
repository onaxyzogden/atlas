// @vitest-environment happy-dom
/**
 * useMapboxDrawTool — connect-watchdog regression.
 *
 * Guards the fix for "Seed zones from home does nothing": MapboxDraw installs
 * its sources/layers AND its click handlers inside connect(), which onAdd runs
 * synchronously only when map.loaded() is true at addControl time; otherwise it
 * defers to a one-shot map.on('load') PLUS a 16ms poll that ALSO gates on
 * map.loaded(). And map.loaded() stays false until every source's TILES finish
 * loading — which on the keyless Esri raster fallback (after a keyed basemap
 * 403s and we setStyle to satellite) can be never. So waiting on map.loaded()
 * can't heal it: a tool that LOOKS armed never turns a click into draw.create.
 *
 * The watchdog therefore gates on the STYLE being parsed (tile-independent) and
 * then forces onAdd down its synchronous connect branch by reporting
 * loaded===true for exactly the one synchronous addControl call. It binds
 * `ensureDrawConnected` to 'styledata', 'idle' AND 'style.load', and also runs
 * it once synchronously at mount (for a map that already fell back before the
 * tool mounted). When the draw cold source ('mapbox-gl-draw-cold' — the source
 * connect() installs) is absent AND the style is parsed, it removeControl +
 * addControl the SAME draw instance with loaded forced true so connect() runs.
 *
 * This test drives the hook against a fully-faked maplibre Map + a stubbed
 * MapboxDraw whose onAdd installs the cold source ONLY when map.loaded() is true
 * — exactly mirroring real connect-deferral. That lets us prove, deterministically
 * and without any WebGL/MapLibre map:
 *   1. A first addControl while the style is unparsed defers connect (no cold
 *      source, click handlers never attach) — the inert-tool failure state.
 *   2. The DECISIVE property: once the style is parsed, the watchdog connects
 *      even though map.loaded() NEVER returns true (the keyless-raster case).
 *   3. It re-connects on styledata / idle / style.load after a setStyle wipe.
 *   4. While the cold source is present the watchdog is a no-op (no extra
 *      addControl, no churn) on subsequent style events — the keyed path is
 *      byte-for-byte unchanged.
 *
 * `@mapbox/mapbox-gl-draw` is mocked at the module level so both this hook and
 * its transitive `snapDrawModes` import receive the same stub (no real control is
 * ever constructed). We only exercise the stock (snap:false) path.
 *
 * What this CANNOT prove: that a real browser pointer click becomes a draw.create
 * after the re-add — that needs a live WebGL map and an operator gesture. It CAN
 * prove the connect-without-loaded() mechanism that was the missing link.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, cleanup } from '@testing-library/react';
import type { Map as MaplibreMap } from 'maplibre-gl';

const DRAW_COLD_SOURCE = 'mapbox-gl-draw-cold';

/* ------------------------------------------------------------------ *
 * Stubbed MapboxDraw.                                                 *
 *                                                                     *
 * `map.addControl(draw)` calls draw.onAdd(map). Real MapboxDraw's     *
 * onAdd connects immediately when map.loaded() is true, else defers   *
 * connect() to a one-shot map.on('load') + 16ms poll. We reproduce    *
 * ONLY the loaded()-gated branch (the deferral is the bug), so the    *
 * cold source appears iff map.loaded() is true at add time. The fix   *
 * forces loaded()===true across its re-add, so this stub installs the *
 * cold source then — the very behaviour under test.                   *
 * `removeControl(draw)` calls draw.onRemove() which tears the source  *
 * down — mirroring setStyle wiping the draw layers.                   *
 * ------------------------------------------------------------------ */
const { lastDraw } = vi.hoisted(() => ({
  lastDraw: { current: null as null | Record<string, unknown> },
}));

vi.mock('@mapbox/mapbox-gl-draw', () => {
  class FakeMapboxDraw {
    // Real MapboxDraw exposes a static `modes` map; snapDrawModes spreads it.
    static modes: Record<string, unknown> = {};
    private _map: FakeMap | null = null;
    mode: string | null = null;

    constructor(_opts?: unknown) {
      lastDraw.current = this as unknown as Record<string, unknown>;
    }

    onAdd(map: FakeMap) {
      this._map = map;
      // Real onAdd connects (installs sources/layers + click handlers) only
      // when map.loaded() is true; otherwise it defers. The watchdog's whole
      // job is to make this branch fire without the tiles ever loading.
      if (map.loaded()) {
        map.__installColdSource();
      }
      // Return a dummy container element, as MapboxDraw.onAdd does.
      return (globalThis.document?.createElement('div') ?? {}) as HTMLElement;
    }

    onRemove() {
      // setStyle / removeControl wipes the draw sources.
      this._map?.__removeColdSource();
      this._map = null;
    }

    changeMode(mode: string) {
      this.mode = mode;
    }

    getAll(): GeoJSON.FeatureCollection {
      return { type: 'FeatureCollection', features: [] };
    }

    deleteAll() {
      /* no-op */
    }
  }
  return { default: FakeMapboxDraw };
});

/* ------------------------------------------------------------------ *
 * Fake maplibre Map.                                                  *
 *                                                                     *
 * `loaded` (tiles done) and `styleParsed` (style JSON parsed) are     *
 * INDEPENDENT knobs — the keyless-raster bug is exactly the state     *
 * where styleParsed is true but loaded() never becomes true.         *
 * ------------------------------------------------------------------ */
function makeFakeMap() {
  const handlers: Record<string, Array<(e?: unknown) => void>> = {};
  const sources = new Set<string>();
  const layers = new Set<string>();
  let loaded = false;
  let styleParsed = false;

  // A fake canvas: the hook only touches `.style.cursor` and getCanvas().
  const canvas = { style: { cursor: '' } } as unknown as HTMLCanvasElement;

  const map = {
    // --- event emitter (maplibre on/off) ---
    on(ev: string, h: (e?: unknown) => void) {
      (handlers[ev] ||= []).push(h);
      return map;
    },
    off(ev: string, h: (e?: unknown) => void) {
      handlers[ev] = (handlers[ev] || []).filter((x) => x !== h);
      return map;
    },
    emit(ev: string, e?: unknown) {
      // Copy so a handler that re-binds during dispatch doesn't mutate the
      // array we're iterating.
      [...(handlers[ev] || [])].forEach((h) => h(e));
    },
    listenerCount(ev: string) {
      return (handlers[ev] || []).length;
    },

    // --- control lifecycle (maplibre addControl/removeControl) ---
    addControl: vi.fn((control: { onAdd: (m: unknown) => unknown }) => {
      control.onAdd(map);
      return map;
    }),
    removeControl: vi.fn((control: { onRemove: () => void }) => {
      control.onRemove();
      return map;
    }),

    // --- style/source/layer surface the hook reads ---
    // map.loaded() gates the REAL onAdd; the watchdog must NOT depend on it.
    loaded: () => loaded,
    getCanvas: () => canvas,
    // The hook's `styleReady` proxy: a parsed style has ≥1 layer. Independent
    // of tile load (`loaded`) — that independence is the crux of the fix.
    getStyle: () => ({
      layers: styleParsed ? [{ id: 'bg' }] : [],
      sources: {},
    }),
    getSource: (id: string) => (sources.has(id) ? { id } : undefined),
    getLayer: (id: string) => (layers.has(id) ? { id } : undefined),
    setPaintProperty: vi.fn(),

    // --- test-only hooks driven by the FakeMapboxDraw stub / the test ---
    __installColdSource() {
      sources.add(DRAW_COLD_SOURCE);
    },
    __removeColdSource() {
      sources.delete(DRAW_COLD_SOURCE);
    },
    __setLoaded(v: boolean) {
      loaded = v;
    },
    __setStyleParsed(v: boolean) {
      styleParsed = v;
    },
    __hasColdSource() {
      return sources.has(DRAW_COLD_SOURCE);
    },
    __canvasCursor() {
      return canvas.style.cursor;
    },
  };
  return map;
}

type FakeMap = ReturnType<typeof makeFakeMap>;

beforeEach(() => {
  lastDraw.current = null;
});
afterEach(cleanup);

async function mount(map: FakeMap) {
  // Import after the module mock is in place.
  const { useMapboxDrawTool } = await import('../useMapboxDrawTool.js');
  return renderHook(() =>
    useMapboxDrawTool({
      map: map as unknown as MaplibreMap,
      mode: 'draw_polygon',
      onComplete: () => undefined,
      enabled: true,
    }),
  );
}

describe('useMapboxDrawTool connect-watchdog', () => {
  it('binds the watchdog to styledata, idle and style.load', async () => {
    const map = makeFakeMap();
    map.__setLoaded(true);
    map.__setStyleParsed(true);
    await mount(map);

    expect(map.listenerCount('styledata')).toBe(1);
    expect(map.listenerCount('idle')).toBe(1);
    expect(map.listenerCount('style.load')).toBe(1);
  });

  it('a first addControl while the style is unparsed defers connect (inert tool)', async () => {
    const map = makeFakeMap();
    map.__setLoaded(false); // tiles not loaded
    map.__setStyleParsed(false); // style JSON not parsed yet
    await mount(map);

    // addControl ran once, but onAdd deferred connect -> NO cold source, so the
    // click handlers never attached. The synchronous mount-time watchdog also
    // bails because the style isn't parsed yet. This is the inert-tool failure
    // state: the tool LOOKS armed (the hook eagerly calls changeMode + sets the
    // crosshair right after addControl, before any connect) yet a real click
    // produces no draw.create because connect() — and its handlers — never ran.
    expect(map.addControl).toHaveBeenCalledTimes(1);
    expect(map.removeControl).not.toHaveBeenCalled();
    expect(map.__hasColdSource()).toBe(false);
    // The mode/cursor ARE set optimistically even though the tool is inert —
    // documenting exactly why it "looks armed but does nothing".
    expect((lastDraw.current as { mode: string | null }).mode).toBe('draw_polygon');
    expect(map.__canvasCursor()).toBe('crosshair');
  });

  it('connects at mount while map.loaded() stays false, as long as the style is parsed (keyless-raster case)', async () => {
    const map = makeFakeMap();
    map.__setLoaded(false); // the keyless Esri raster: tiles never finish ->
    //                          map.loaded() is false now and stays false.
    map.__setStyleParsed(true); // the style itself IS parsed.
    await mount(map);

    // First addControl (loaded false) installs no cold source; the synchronous
    // mount-time watchdog then removeControl + addControl with loaded forced
    // true, so the stubbed onAdd installs the cold source -> connect ran.
    expect(map.removeControl).toHaveBeenCalledTimes(1);
    expect(map.addControl).toHaveBeenCalledTimes(2);
    expect(map.__hasColdSource()).toBe(true);
    // Mode re-entered + crosshair re-applied after the re-add.
    expect((lastDraw.current as { mode: string | null }).mode).toBe('draw_polygon');
    expect(map.__canvasCursor()).toBe('crosshair');
    // CRITICAL: the override was transient — map.loaded() is honest again
    // (still false). We connected WITHOUT ever waiting on tile load.
    expect(map.loaded()).toBe(false);
  });

  it('re-adds the control on styledata once the style parses (loaded stays false)', async () => {
    const map = makeFakeMap();
    map.__setLoaded(false);
    map.__setStyleParsed(false);
    await mount(map);

    // Precondition: deferred, inert (style not parsed yet).
    expect(map.addControl).toHaveBeenCalledTimes(1);
    expect(map.__hasColdSource()).toBe(false);

    // The basemap fallback's style finishes parsing (tiles still not loaded).
    map.__setStyleParsed(true);
    map.emit('styledata');

    expect(map.removeControl).toHaveBeenCalledTimes(1);
    expect(map.addControl).toHaveBeenCalledTimes(2);
    expect(map.__hasColdSource()).toBe(true);
    expect((lastDraw.current as { mode: string | null }).mode).toBe('draw_polygon');
    expect(map.__canvasCursor()).toBe('crosshair');
    expect(map.loaded()).toBe(false);
  });

  it('also self-heals on idle', async () => {
    const map = makeFakeMap();
    map.__setLoaded(false);
    map.__setStyleParsed(false);
    await mount(map);

    expect(map.addControl).toHaveBeenCalledTimes(1);

    map.__setStyleParsed(true);
    map.emit('idle');

    expect(map.addControl).toHaveBeenCalledTimes(2);
    expect(map.__hasColdSource()).toBe(true);
    expect((lastDraw.current as { mode: string | null }).mode).toBe('draw_polygon');
  });

  it('also self-heals on style.load', async () => {
    const map = makeFakeMap();
    map.__setLoaded(false);
    map.__setStyleParsed(false);
    await mount(map);

    expect(map.addControl).toHaveBeenCalledTimes(1);

    map.__setStyleParsed(true);
    map.emit('style.load');

    expect(map.addControl).toHaveBeenCalledTimes(2);
    expect(map.__hasColdSource()).toBe(true);
    expect((lastDraw.current as { mode: string | null }).mode).toBe('draw_polygon');
  });

  it('does NOT re-add while the style is still unparsed (no thrash)', async () => {
    const map = makeFakeMap();
    map.__setLoaded(false);
    map.__setStyleParsed(false);
    await mount(map);

    expect(map.addControl).toHaveBeenCalledTimes(1);

    // Style churn while the style is still unparsed must not thrash addControl.
    map.emit('styledata');
    map.emit('idle');
    map.emit('style.load');

    expect(map.addControl).toHaveBeenCalledTimes(1);
    expect(map.removeControl).not.toHaveBeenCalled();
    expect(map.__hasColdSource()).toBe(false);
  });

  it('is a no-op on subsequent style events once the cold source is present', async () => {
    const map = makeFakeMap();
    // Healthy keyed path: loaded at mount, connect runs immediately on the
    // first add, so the mount-time watchdog short-circuits on the cold source.
    map.__setLoaded(true);
    map.__setStyleParsed(true);
    await mount(map);

    expect(map.addControl).toHaveBeenCalledTimes(1);
    expect(map.removeControl).not.toHaveBeenCalled();
    expect(map.__hasColdSource()).toBe(true);

    // Further style events (the normal re-style firehose) must not re-add: the
    // already-working path stays untouched.
    map.emit('styledata');
    map.emit('idle');
    map.emit('style.load');
    map.emit('styledata');

    expect(map.addControl).toHaveBeenCalledTimes(1);
    expect(map.removeControl).not.toHaveBeenCalled();
  });

  it('unbinds the watchdog (and removes the control) on unmount', async () => {
    const map = makeFakeMap();
    map.__setLoaded(true);
    map.__setStyleParsed(true);
    const { unmount } = await mount(map);

    expect(map.listenerCount('styledata')).toBe(1);
    expect(map.listenerCount('idle')).toBe(1);
    expect(map.listenerCount('style.load')).toBe(1);

    // Healthy mount: one teardown removeControl will be the only removeControl.
    const removeBefore = map.removeControl.mock.calls.length;
    unmount();

    expect(map.listenerCount('styledata')).toBe(0);
    expect(map.listenerCount('idle')).toBe(0);
    expect(map.listenerCount('style.load')).toBe(0);
    // After teardown a late style event must not revive the watchdog.
    map.emit('styledata');
    map.emit('idle');
    map.emit('style.load');
    expect(map.addControl).toHaveBeenCalledTimes(1);
    // Only the unmount removeControl fired after the listeners were bound.
    expect(map.removeControl.mock.calls.length).toBe(removeBefore + 1);
  });
});
