import { create } from 'zustand';
import type { LayerType } from '@ogden/shared';

export type MapStyle = 'satellite' | 'terrain' | 'topographic' | 'street' | 'hybrid';
export type DrawMode = 'none' | 'polygon' | 'line' | 'point';
export type ViewMode = '2d' | '2.5d' | '3d';

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

  // §2 view-mode control. '2d' = top-down MapLibre (pitch 0). '2.5d' = MapLibre
  // pitched to 45°. '3d' = Cesium globe overlay (flips is3DTerrain on).
  viewMode: ViewMode;
  setViewMode: (m: ViewMode) => void;

  // §2 viewshed overlay toggle — when on, MapCanvas fetches the stored
  // viewshed_geojson from the basemap-terrain route and renders it.
  viewshedVisible: boolean;
  setViewshedVisible: (v: boolean) => void;

  // §6 microclimate opportunity overlay — when on, MicroclimateOverlay fetches
  // the `microclimate` project layer (sun-trap, wind-shelter, frost-risk, and
  // comfort-class polygons) and renders it as a classed fill.
  microclimateVisible: boolean;
  setMicroclimateVisible: (v: boolean) => void;

  // §6 windbreak opportunity overlay — when on, WindbreakOverlay computes
  // candidate windbreak lines client-side from the parcel bbox + climate
  // prevailing-wind direction and paints them as a dashed Mapbox line layer.
  windbreakVisible: boolean;
  setWindbreakVisible: (v: boolean) => void;

  // §2 historical imagery (Esri Wayback). Null = not active. The raster layer
  // is added to MapCanvas when a release is selected.
  historicalRelease: { id: number; date: string } | null;
  setHistoricalRelease: (r: { id: number; date: string } | null) => void;

  // §2 split-screen compare — renders a second maplibre map side-by-side.
  splitScreenActive: boolean;
  setSplitScreenActive: (v: boolean) => void;
  splitScreenStyle: MapStyle;
  setSplitScreenStyle: (s: MapStyle) => void;

  // §2 Phase 5 — global overlay opacity (0..1). Applied by HistoricalImagery,
  // ViewshedOverlay, and OsmVectorOverlay raster/fill paints so the user can
  // dim overlays without individually toggling them.
  overlayOpacity: number;
  setOverlayOpacity: (v: number) => void;

  // §2 Phase 5 — OSM vector overlays (roads, waterbodies, buildings) fetched
  // from Overpass within the parcel bbox. Each key is independent.
  osmLayersVisible: { roads: boolean; water: boolean; buildings: boolean };
  setOsmLayerVisible: (k: 'roads' | 'water' | 'buildings', v: boolean) => void;
  osmOverlayStatus: 'idle' | 'loading' | 'ready' | 'error';
  osmOverlayError: string | null;
  setOsmOverlayStatus: (s: 'idle' | 'loading' | 'ready' | 'error', err?: string | null) => void;

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

  viewMode: '2d',
  setViewMode: (viewMode) =>
    set({ viewMode, is3DTerrain: viewMode === '3d' }),

  viewshedVisible: false,
  setViewshedVisible: (viewshedVisible) => set({ viewshedVisible }),

  microclimateVisible: false,
  setMicroclimateVisible: (microclimateVisible) => set({ microclimateVisible }),

  windbreakVisible: false,
  setWindbreakVisible: (windbreakVisible) => set({ windbreakVisible }),

  historicalRelease: null,
  setHistoricalRelease: (historicalRelease) => set({ historicalRelease }),

  splitScreenActive: false,
  setSplitScreenActive: (splitScreenActive) => set({ splitScreenActive }),
  splitScreenStyle: 'satellite',
  setSplitScreenStyle: (splitScreenStyle) => set({ splitScreenStyle }),

  overlayOpacity: 0.85,
  setOverlayOpacity: (overlayOpacity) => set({ overlayOpacity }),

  osmLayersVisible: { roads: false, water: false, buildings: false },
  setOsmLayerVisible: (k, v) =>
    set((state) => ({ osmLayersVisible: { ...state.osmLayersVisible, [k]: v } })),
  osmOverlayStatus: 'idle',
  osmOverlayError: null,
  setOsmOverlayStatus: (osmOverlayStatus, err = null) =>
    set({ osmOverlayStatus, osmOverlayError: err }),

  isMeasuring: false,
  setMeasuring: (isMeasuring) => set({ isMeasuring }),

  gaezSelection: null,
  setGaezSelection: (gaezSelection) => set({ gaezSelection }),

  gaezMaxYield: 0,
  setGaezMaxYield: (gaezMaxYield) => set({ gaezMaxYield }),

  soilSelection: null,
  setSoilSelection: (soilSelection) => set({ soilSelection }),
}));
