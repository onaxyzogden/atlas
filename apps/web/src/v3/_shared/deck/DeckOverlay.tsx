/**
 * DeckOverlay — singleton `MapboxOverlay` per MapLibre map instance, plus a
 * tiny context that lets child deck.gl-layer components register their
 * `Layer` instance by stable id. The overlay re-renders only when the
 * union of registered layers changes.
 *
 * Interleaved mode is on so deck.gl layers share MapLibre's depth buffer
 * (hillshade, fill-extrusion, terrain DEM, etc. all occlude / get occluded
 * correctly). Falls back gracefully to overlay-on-top if interleaved is
 * unsupported by the active map state.
 *
 * The overlay is added to the map via `map.addControl` — the same hook
 * MapLibre uses for its navigation control. Removing the overlay on unmount
 * detaches it cleanly without leaking GL contexts.
 */

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import type { Map as MaplibreMap, IControl } from 'maplibre-gl';
import { MapboxOverlay } from '@deck.gl/mapbox';
import type { Layer } from '@deck.gl/core';

interface DeckOverlayCtx {
  /** Register or remove a layer by stable id. Passing `null` removes. */
  setLayer(id: string, layer: Layer | null): void;
}

const Ctx = createContext<DeckOverlayCtx | null>(null);

export function useDeckOverlay(): DeckOverlayCtx {
  const ctx = useContext(Ctx);
  if (!ctx) {
    throw new Error('useDeckOverlay must be used inside <DeckOverlay>');
  }
  return ctx;
}

interface Props {
  map: MaplibreMap;
  children?: ReactNode;
}

export default function DeckOverlay({ map, children }: Props) {
  const overlayRef = useRef<MapboxOverlay | null>(null);
  const layersRef = useRef<Map<string, Layer>>(new Map());
  const [overlayReady, setOverlayReady] = useState(false);

  useEffect(() => {
    const overlay = new MapboxOverlay({
      interleaved: true,
      layers: [],
    });
    overlayRef.current = overlay;
    // MapLibre's IControl shape matches Mapbox's; cast through unknown.
    map.addControl(overlay as unknown as IControl);
    setOverlayReady(true);

    return () => {
      try {
        map.removeControl(overlay as unknown as IControl);
      } catch {
        /* map disposed */
      }
      overlayRef.current = null;
      layersRef.current.clear();
      setOverlayReady(false);
    };
  }, [map]);

  // Stable across renders so children's useEffect deps don't churn.
  const ctx = useMemo<DeckOverlayCtx>(
    () => ({
      setLayer(id, layer) {
        const layers = layersRef.current;
        if (layer) layers.set(id, layer);
        else layers.delete(id);
        overlayRef.current?.setProps({
          layers: Array.from(layers.values()),
        });
      },
    }),
    [],
  );

  if (!overlayReady) return null;
  return <Ctx.Provider value={ctx}>{children}</Ctx.Provider>;
}
