import { create } from 'zustand';
import type { LayerType } from '@ogden/shared';

export type MapStyle = 'satellite' | 'terrain' | 'street' | 'hybrid';
export type DrawMode = 'none' | 'polygon' | 'line' | 'point';

interface MapState {
  // Viewport
  style: MapStyle;
  setStyle: (style: MapStyle) => void;

  // Layer visibility — all layers off by default, toggled on as data arrives
  visibleLayers: Set<LayerType>;
  toggleLayer: (layer: LayerType) => void;
  setLayerVisible: (layer: LayerType, visible: boolean) => void;

  // Drawing
  drawMode: DrawMode;
  setDrawMode: (mode: DrawMode) => void;

  // Phase filter
  activePhaseFilter: string; // 'all' or phase name
  setActivePhaseFilter: (filter: string) => void;

  // UI state
  isMeasuring: boolean;
  setMeasuring: (v: boolean) => void;
}

export const useMapStore = create<MapState>((set) => ({
  style: 'satellite',
  setStyle: (style) => set({ style }),

  visibleLayers: new Set<LayerType>(),
  toggleLayer: (layer) =>
    set((state) => {
      const next = new Set(state.visibleLayers);
      if (next.has(layer)) next.delete(layer);
      else next.add(layer);
      return { visibleLayers: next };
    }),
  setLayerVisible: (layer, visible) =>
    set((state) => {
      const next = new Set(state.visibleLayers);
      if (visible) next.add(layer);
      else next.delete(layer);
      return { visibleLayers: next };
    }),

  drawMode: 'none',
  setDrawMode: (drawMode) => set({ drawMode }),

  activePhaseFilter: 'all',
  setActivePhaseFilter: (activePhaseFilter) => set({ activePhaseFilter }),

  isMeasuring: false,
  setMeasuring: (isMeasuring) => set({ isMeasuring }),
}));
