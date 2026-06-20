/**
 * @vitest-environment happy-dom
 *
 * useDimensionDrawTool — commit-gesture regression.
 *
 * Guards the fix for "predetermined-dimensions draw tool doesn't place the
 * feature on click": the Dimensions tool is reached by toggling out of
 * freehand, which tears down a MapboxDraw control; after that teardown
 * MapLibre suppresses the next synthesized `click`, while the raw
 * mousedown/mousemove/mouseup stream keeps flowing. The hook therefore commits
 * on a mousedown→mouseup within MapLibre's click tolerance — NOT on `click`.
 *
 * These tests assert the hook binds the raw stream (never `click`), commits a
 * within-tolerance left-button gesture, and ignores drags / right-clicks.
 */

import { describe, it, expect, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import type { Map as MaplibreMap, MapMouseEvent } from 'maplibre-gl';
import { useDimensionDrawTool, type DimensionValues } from '../useDimensionDrawTool.js';

interface FakeSource {
  data: GeoJSON.FeatureCollection | null;
  setData: (d: GeoJSON.FeatureCollection) => void;
}

function makeFakeMap() {
  const handlers: Record<string, Array<(e: MapMouseEvent) => void>> = {};
  const sources: Record<string, FakeSource> = {};
  const layers = new Set<string>();
  const map = {
    on: (ev: string, h: (e: MapMouseEvent) => void) => {
      (handlers[ev] ||= []).push(h);
    },
    off: (ev: string, h: (e: MapMouseEvent) => void) => {
      handlers[ev] = (handlers[ev] || []).filter((x) => x !== h);
    },
    addSource: (id: string) => {
      sources[id] = {
        data: null,
        setData(d: GeoJSON.FeatureCollection) {
          this.data = d;
        },
      };
    },
    getSource: (id: string) => sources[id],
    addLayer: (l: { id: string }) => {
      layers.add(l.id);
    },
    getLayer: (id: string) => (layers.has(id) ? { id } : undefined),
    removeLayer: (id: string) => {
      layers.delete(id);
    },
    removeSource: (id: string) => {
      delete sources[id];
    },
    boundEvents: () => Object.keys(handlers).filter((k) => (handlers[k] ?? []).length > 0),
    emit(ev: string, e: MapMouseEvent) {
      (handlers[ev] || []).forEach((h) => h(e));
    },
  };
  return map;
}

type FakeMap = ReturnType<typeof makeFakeMap>;

function ev(x: number, y: number, button = 0): MapMouseEvent {
  return {
    point: { x, y },
    lngLat: { lng: -1.5 + x * 1e-5, lat: 50 + y * 1e-5 },
    originalEvent: { button } as MouseEvent,
  } as unknown as MapMouseEvent;
}

const VALUES: DimensionValues = {
  widthM: 8,
  depthM: 6,
  radiusM: 4,
  lengthM: 10,
  bearingDeg: 0,
  rotationDeg: 0,
};

function mount(map: FakeMap, onComplete: (g: GeoJSON.Polygon | GeoJSON.LineString) => void) {
  return renderHook(() =>
    useDimensionDrawTool({
      map: map as unknown as MaplibreMap,
      shape: 'rect',
      values: VALUES,
      enabled: true,
      onComplete,
    }),
  );
}

describe('useDimensionDrawTool commit gesture', () => {
  it('binds the raw mouse stream and never the suppressed `click` event', () => {
    const map = makeFakeMap();
    mount(map, () => undefined);
    const bound = map.boundEvents();
    expect(bound).toContain('mousedown');
    expect(bound).toContain('mouseup');
    expect(bound).toContain('mousemove');
    expect(bound).not.toContain('click');
  });

  it('commits the parametric polygon on a within-tolerance mousedown→mouseup', () => {
    const map = makeFakeMap();
    const onComplete = vi.fn();
    mount(map, onComplete);

    map.emit('mousedown', ev(100, 100));
    map.emit('mouseup', ev(102, 101)); // ≤ 3px in both axes

    expect(onComplete).toHaveBeenCalledTimes(1);
    // calls[0] is guaranteed by the toHaveBeenCalledTimes(1) above; a Polygon
    // always carries an outer ring at coordinates[0]. Non-null assertions keep
    // noUncheckedIndexedAccess satisfied without weakening the shape checks.
    const geom = onComplete.mock.calls[0]![0] as GeoJSON.Polygon;
    expect(geom.type).toBe('Polygon');
    expect(geom.coordinates[0]!.length).toBeGreaterThanOrEqual(4);
  });

  it('does not commit when the pointer drags beyond the click tolerance', () => {
    const map = makeFakeMap();
    const onComplete = vi.fn();
    mount(map, onComplete);

    map.emit('mousedown', ev(100, 100));
    map.emit('mouseup', ev(140, 140)); // a pan / drag

    expect(onComplete).not.toHaveBeenCalled();
  });

  it('does not commit on a right-button press', () => {
    const map = makeFakeMap();
    const onComplete = vi.fn();
    mount(map, onComplete);

    map.emit('mousedown', ev(100, 100, 2)); // right button
    map.emit('mouseup', ev(100, 100, 2));

    expect(onComplete).not.toHaveBeenCalled();
  });

  it('ignores a stray mouseup with no preceding mousedown', () => {
    const map = makeFakeMap();
    const onComplete = vi.fn();
    mount(map, onComplete);

    map.emit('mouseup', ev(100, 100));

    expect(onComplete).not.toHaveBeenCalled();
  });
});
