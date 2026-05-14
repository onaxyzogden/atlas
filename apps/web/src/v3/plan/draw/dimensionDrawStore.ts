/**
 * dimensionDrawStore — singleton state for the parametric "Dimensions" mode
 * available alongside freehand drawing in opting Plan tools.
 *
 * Mode `'freehand'` is the default; tools fall through to `useMapboxDrawTool`.
 * Mode `'dimensions'` swaps to `useDimensionDrawTool` which renders a ghost
 * footprint that follows the cursor and commits on a single click.
 *
 * Shape determines which dimension fields are active:
 *  - `'rect'`   → widthM, depthM, rotationDeg (structures, rectangular polygons)
 *  - `'circle'` → radiusM (round polygons, buffer rings)
 *  - `'line'`   → lengthM, bearingDeg (lines, swales)
 *
 * Values are always stored as metres + degrees. The `unit` flag is purely a
 * render-layer affordance for the input row.
 */

import { create } from 'zustand';

export type DimensionMode = 'freehand' | 'dimensions';
export type DimensionShape = 'rect' | 'circle' | 'line';
export type DimensionUnit = 'm' | 'ft';

export interface DimensionDrawState {
  mode: DimensionMode;
  shape: DimensionShape;
  unit: DimensionUnit;
  widthM: number;
  depthM: number;
  radiusM: number;
  lengthM: number;
  bearingDeg: number;
  rotationDeg: number;
  setMode: (mode: DimensionMode) => void;
  setShape: (shape: DimensionShape) => void;
  setUnit: (unit: DimensionUnit) => void;
  setValues: (patch: Partial<Pick<
    DimensionDrawState,
    'widthM' | 'depthM' | 'radiusM' | 'lengthM' | 'bearingDeg' | 'rotationDeg'
  >>) => void;
  /** Reset to freehand defaults — called on tool change to prevent stale state. */
  reset: () => void;
}

const DEFAULTS = {
  mode: 'freehand' as DimensionMode,
  shape: 'rect' as DimensionShape,
  unit: 'm' as DimensionUnit,
  widthM: 6,
  depthM: 8,
  radiusM: 5,
  lengthM: 20,
  bearingDeg: 0,
  rotationDeg: 0,
};

export const useDimensionDrawStore = create<DimensionDrawState>((set) => ({
  ...DEFAULTS,
  setMode: (mode) => set({ mode }),
  setShape: (shape) => set({ shape }),
  setUnit: (unit) => set({ unit }),
  setValues: (patch) => set(patch),
  reset: () => set(DEFAULTS),
}));

export const M_PER_FT = 0.3048;
export const metersToFeet = (m: number): number => m / M_PER_FT;
export const feetToMeters = (ft: number): number => ft * M_PER_FT;

/**
 * Selector hook that returns just the parametric dimension values. Each
 * field is selected separately so consumers don't re-render on every
 * unrelated store change (mode, shape, unit toggles).
 *
 * The returned object is freshly allocated each call but only used to feed
 * `useDimensionDrawTool`, which keeps its own refs — so identity churn here
 * does not cause map-side re-init.
 */
export function useDimensionValues() {
  const widthM = useDimensionDrawStore((s) => s.widthM);
  const depthM = useDimensionDrawStore((s) => s.depthM);
  const radiusM = useDimensionDrawStore((s) => s.radiusM);
  const lengthM = useDimensionDrawStore((s) => s.lengthM);
  const bearingDeg = useDimensionDrawStore((s) => s.bearingDeg);
  const rotationDeg = useDimensionDrawStore((s) => s.rotationDeg);
  return { widthM, depthM, radiusM, lengthM, bearingDeg, rotationDeg };
}
