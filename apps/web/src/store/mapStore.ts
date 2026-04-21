import { create } from 'zustand';
import type { LayerType } from '@ogden/shared';

export type MapStyle = 'satellite' | 'terrain' | 'street' | 'hybrid';
export type DrawMode = 'none' | 'polygon' | 'line' | 'point';

// Sprint CB — map-side FAO GAEZ v4 suitability overlay selection.
// Drives GaezOverlay: picking a (crop, waterSupply, inputLevel) tuple re-fetches
// the matching COG and re-paints the full-world canvas.
export type GaezWaterSupply = 'rainfed' | 'irrigated';
export type GaezInputLevel = 'low' | 'high';
// Sprint CC — map-side variable toggle. 'suitability' paints the 5-class choropleth
// (S1-N, unchanged from CB). 'yield' paints a continuous viridis ramp clamped to
// the per-tile 99th-percentile attainable yield.
export type GaezVariable = 'suitability' | 'yield';
export interface GaezSelection {
  crop: string;
  waterSupply: GaezWaterSupply;
  inputLevel: GaezInputLevel;
  variable: GaezVariable;
}

// Soil-properties overlay selection — one of the properties exposed by the
// SoilGrids catalog (bedrock_depth, ph, organic_carbon, clay, sand). Null until
// the user first enables the layer; SoilMapControls seeds the default.
export interface SoilSelection {
  property: string;
}

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

  // 3D terrain (Cesium)
  is3DTerrain: boolean;
  set3DTerrain: (v: boolean) => void;

  // UI state
  isMeasuring: boolean;
  setMeasuring: (v: boolean) => void;

  // Sprint CB — GAEZ suitability overlay selection (null until layer is enabled
  // and catalog loads; GaezMapControls seeds a default from the catalog).
  gaezSelection: GaezSelection | null;
  setGaezSelection: (sel: GaezSelection | null) => void;

  // Sprint CC — per-tile 99th-percentile yield max, published by the GaezOverlay
  // decode effect so the Legend can show "~N kg/ha" in yield mode. 0 when
  // variable === 'suitability'.
  gaezMaxYield: number;
  setGaezMaxYield: (v: number) => void;

  // Soil-properties overlay selection — null until the user enables the layer
  // and SoilMapControls fetches the catalog + seeds the default.
  soilSelection: SoilSelection | null;
  setSoilSelection: (sel: SoilSelection | null) => void;
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

  is3DTerrain: false,
  set3DTerrain: (is3DTerrain) => set({ is3DTerrain }),

  isMeasuring: false,
  setMeasuring: (isMeasuring) => set({ isMeasuring }),

  gaezSelection: null,
  setGaezSelection: (gaezSelection) => set({ gaezSelection }),

  gaezMaxYield: 0,
  setGaezMaxYield: (gaezMaxYield) => set({ gaezMaxYield }),

  soilSelection: null,
  setSoilSelection: (soilSelection) => set({ soilSelection }),
}));
