/**
 * receptionSurveys -- the five Plan-stage Tier-2 (Stratum-3) "Systems Reading"
 * survey stores, each built from `createSurveyStore` (2026-06-16 restructure).
 *
 * One thin config per resolved survey objective:
 *   2.1 s3-hydrology            -- water movement (flow lines + wet/dry zones)
 *   2.2 s3-soil                 -- soil/subsurface (sample points + zones)
 *   2.3 rf-s3-nutrient-cycling  -- organic-matter / nutrient flows (zones)
 *   2.4 rf-s3-pest-pressure     -- pest / disease / weed pressure (zones)
 *   2.5 silv-sec-s3-stock-water -- livestock water availability (points + zones)
 *
 * Each store is a module singleton so syncManifest can register it
 * (`ogden-recep-*-survey`, byProject blob) and the reception workbench can read
 * its drawn-feature count. `selectReceptionSurveyRecordCount` sums the five
 * stores' feature counts for a project -- the Stage-3 map-feature count threaded
 * into `deriveReceptionProgress(..., capturedRecords)` and the reference panel.
 *
 * Class palettes + geometry kinds are reconciled against the resolved Stratum-3
 * checklists (universal + regen + silvopasture/residential patches). ASCII-only
 * labels per the project string-escaping rule.
 */

import {
  createSurveyStore,
  type SurveyClassDef,
  type SurveyStoreBundle,
} from './createSurveyStore.js';

// ---------------------------------------------------------------------------
// 2.1 Water movement & hydrology (s3-hydrology) -- line + poly.
// ---------------------------------------------------------------------------

export type HydrologyClass =
  | 'flow-path'
  | 'seasonal-flow'
  | 'wet-zone'
  | 'dry-zone';

const HYDROLOGY_CLASSES: readonly SurveyClassDef<HydrologyClass>[] = [
  { key: 'flow-path', label: 'Surface flow path', color: '#2c7bb6', kind: 'line' },
  { key: 'seasonal-flow', label: 'Seasonal creek / waterway', color: '#5ba3c9', kind: 'line' },
  { key: 'wet-zone', label: 'Pooling / wet zone', color: '#4a90d9', kind: 'poly' },
  { key: 'dry-zone', label: 'Dry / shedding zone', color: '#d9b365', kind: 'poly' },
];

export const hydrologySurvey = createSurveyStore<HydrologyClass>({
  persistName: 'ogden-recep-hydrology-survey',
  idPrefix: 'recep-hydrology',
  toolPrefix: 'plan.reception.hydrology',
  sourceObjectiveId: 's3-hydrology',
  classes: HYDROLOGY_CLASSES,
});

// ---------------------------------------------------------------------------
// 2.2 Soil conditions & subsurface (s3-soil) -- point + poly.
// ---------------------------------------------------------------------------

export type SoilClass =
  | 'texture-sample'
  | 'compaction'
  | 'bearing-test'
  | 'contamination-risk';

const SOIL_CLASSES: readonly SurveyClassDef<SoilClass>[] = [
  { key: 'texture-sample', label: 'Texture / structure sample', color: '#8c6d4f', kind: 'point' },
  { key: 'bearing-test', label: 'Bearing / perc test', color: '#6b4f2a', kind: 'point' },
  { key: 'compaction', label: 'Compaction zone', color: '#b5651d', kind: 'poly' },
  { key: 'contamination-risk', label: 'Contamination risk zone', color: '#c0392b', kind: 'poly' },
];

export const soilSurvey = createSurveyStore<SoilClass>({
  persistName: 'ogden-recep-soil-survey',
  idPrefix: 'recep-soil',
  toolPrefix: 'plan.reception.soil',
  sourceObjectiveId: 's3-soil',
  classes: SOIL_CLASSES,
});

// ---------------------------------------------------------------------------
// 2.3 Nutrient cycling & organic-matter flows (rf-s3-nutrient-cycling) -- poly.
// ---------------------------------------------------------------------------

export type NutrientClass = 'om-rich' | 'om-depleted' | 'nutrient-sink';

const NUTRIENT_CLASSES: readonly SurveyClassDef<NutrientClass>[] = [
  { key: 'om-rich', label: 'High organic-matter zone', color: '#2e7d32', kind: 'poly' },
  { key: 'om-depleted', label: 'Depleted / bare zone', color: '#c9a227', kind: 'poly' },
  { key: 'nutrient-sink', label: 'Nutrient accumulation', color: '#6d4c41', kind: 'poly' },
];

export const nutrientSurvey = createSurveyStore<NutrientClass>({
  persistName: 'ogden-recep-nutrient-survey',
  idPrefix: 'recep-nutrient',
  toolPrefix: 'plan.reception.nutrient',
  sourceObjectiveId: 'rf-s3-nutrient-cycling',
  classes: NUTRIENT_CLASSES,
});

// ---------------------------------------------------------------------------
// 2.4 Pest, disease & weed pressure (rf-s3-pest-pressure) -- poly.
// ---------------------------------------------------------------------------

export type PestClass =
  | 'pest-hotspot'
  | 'disease'
  | 'weed-infestation'
  | 'toxic-plants';

const PEST_CLASSES: readonly SurveyClassDef<PestClass>[] = [
  { key: 'pest-hotspot', label: 'Pest / insect pressure', color: '#e67e22', kind: 'poly' },
  { key: 'disease', label: 'Disease pressure', color: '#c0392b', kind: 'poly' },
  { key: 'weed-infestation', label: 'Weed infestation', color: '#8e44ad', kind: 'poly' },
  { key: 'toxic-plants', label: 'Toxic plants (paddock)', color: '#7f1d1d', kind: 'poly' },
];

export const pestSurvey = createSurveyStore<PestClass>({
  persistName: 'ogden-recep-pest-survey',
  idPrefix: 'recep-pest',
  toolPrefix: 'plan.reception.pest',
  sourceObjectiveId: 'rf-s3-pest-pressure',
  classes: PEST_CLASSES,
});

// ---------------------------------------------------------------------------
// 2.5 Livestock water availability & seasonal supply (silv-sec-s3-stock-water)
// -- point + poly. (Surfaces the stock-water-demand formula in its panel.)
// ---------------------------------------------------------------------------

export type StockWaterClass =
  | 'water-point'
  | 'creek-access'
  | 'paddock-reach'
  | 'seasonal-shortfall';

const STOCK_WATER_CLASSES: readonly SurveyClassDef<StockWaterClass>[] = [
  { key: 'water-point', label: 'Stock water point (trough/dam/tank)', color: '#2980b9', kind: 'point' },
  { key: 'creek-access', label: 'Creek / waterway access', color: '#16a085', kind: 'point' },
  { key: 'paddock-reach', label: 'Paddock served / reach', color: '#7cc4a4', kind: 'poly' },
  { key: 'seasonal-shortfall', label: 'Seasonal shortfall zone', color: '#e25b3a', kind: 'poly' },
];

export const stockWaterSurvey = createSurveyStore<StockWaterClass>({
  persistName: 'ogden-recep-stock-water-survey',
  idPrefix: 'recep-stock-water',
  toolPrefix: 'plan.reception.stock-water',
  sourceObjectiveId: 'silv-sec-s3-stock-water',
  classes: STOCK_WATER_CLASSES,
});

// ---------------------------------------------------------------------------
// Registry -- the five surveys, keyed by their resolved objective id. The
// canvas mounts a layer + draw host per entry, and the reception record-count
// sums their feature counts.
// ---------------------------------------------------------------------------

/** A registry entry: the source objective + its (type-erased) store bundle. */
export interface ReceptionSurveyEntry {
  objectiveId: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  bundle: SurveyStoreBundle<any>;
}

export const RECEPTION_SURVEYS: readonly ReceptionSurveyEntry[] = [
  { objectiveId: hydrologySurvey.config.sourceObjectiveId, bundle: hydrologySurvey },
  { objectiveId: soilSurvey.config.sourceObjectiveId, bundle: soilSurvey },
  { objectiveId: nutrientSurvey.config.sourceObjectiveId, bundle: nutrientSurvey },
  { objectiveId: pestSurvey.config.sourceObjectiveId, bundle: pestSurvey },
  { objectiveId: stockWaterSurvey.config.sourceObjectiveId, bundle: stockWaterSurvey },
];

/** The reception survey whose source objective is `objectiveId`, or undefined. */
export function receptionSurveyFor(
  objectiveId: string | null | undefined,
): ReceptionSurveyEntry | undefined {
  if (objectiveId == null) return undefined;
  return RECEPTION_SURVEYS.find((s) => s.objectiveId === objectiveId);
}

/**
 * Total DRAWN survey features across all five reception stores for a project.
 * A plain snapshot read (not a hook) -- the reception host calls it inside a
 * `useMemo`/subscription and threads it into `deriveReceptionProgress(...,
 * capturedRecords)` and the reference-panel "NN captured" caption.
 */
export function selectReceptionSurveyRecordCount(projectId: string): number {
  let count = 0;
  for (const { bundle } of RECEPTION_SURVEYS) {
    count += bundle.useStore.getState().listForProject(projectId).length;
  }
  return count;
}

/** True while ANY reception survey takeover is open (suppresses the inline
 *  workbench). Mirrors the slope/vegetation `active` flags in the OR-chain. */
export function isAnyReceptionSurveyActive(): boolean {
  return RECEPTION_SURVEYS.some((s) => s.bundle.useStore.getState().active);
}

// ---------------------------------------------------------------------------
// Reactive hooks (PlanTierShell + canvas). The five stores are module
// singletons, so each `.useStore` selector is called unconditionally in a fixed
// order -- rules-of-hooks safe. Snapshot equivalents above stay for tests/probes.
// ---------------------------------------------------------------------------

/**
 * The reception survey whose rail-takeover is open for `projectId`, or null.
 * Reactive: re-renders when any survey opens/closes. Mirrors the slope/veg
 * `active && activeProjectId === id` flags PlanTierShell derives, but folds all
 * five into one entry (the armed survey) so the shell stays survey-count-blind.
 */
export function useActiveReceptionSurveyEntry(
  projectId: string,
): ReceptionSurveyEntry | null {
  const a0 = hydrologySurvey.useStore((s) => s.active && s.activeProjectId === projectId);
  const a1 = soilSurvey.useStore((s) => s.active && s.activeProjectId === projectId);
  const a2 = nutrientSurvey.useStore((s) => s.active && s.activeProjectId === projectId);
  const a3 = pestSurvey.useStore((s) => s.active && s.activeProjectId === projectId);
  const a4 = stockWaterSurvey.useStore((s) => s.active && s.activeProjectId === projectId);
  if (a0) return RECEPTION_SURVEYS[0]!;
  if (a1) return RECEPTION_SURVEYS[1]!;
  if (a2) return RECEPTION_SURVEYS[2]!;
  if (a3) return RECEPTION_SURVEYS[3]!;
  if (a4) return RECEPTION_SURVEYS[4]!;
  return null;
}

/**
 * Reactive total drawn reception features across all five stores for a project
 * (re-renders as features are drawn/removed). The snapshot equivalent is
 * selectReceptionSurveyRecordCount; this hook feeds deriveReceptionProgress'
 * `capturedRecords` arg and the reference-panel "NN survey records" caption.
 */
export function useReceptionSurveyRecordCount(projectId: string): number {
  const c0 = hydrologySurvey.useStore((s) => Object.keys(s.byProject[projectId] ?? {}).length);
  const c1 = soilSurvey.useStore((s) => Object.keys(s.byProject[projectId] ?? {}).length);
  const c2 = nutrientSurvey.useStore((s) => Object.keys(s.byProject[projectId] ?? {}).length);
  const c3 = pestSurvey.useStore((s) => Object.keys(s.byProject[projectId] ?? {}).length);
  const c4 = stockWaterSurvey.useStore((s) => Object.keys(s.byProject[projectId] ?? {}).length);
  return c0 + c1 + c2 + c3 + c4;
}

/** Close every reception survey takeover (mutual-exclusion with the other rail
 *  takeovers; mirrors the slope/veg `close()` calls in onOpenSectorsEditor). */
export function closeAllReceptionSurveys(): void {
  for (const { bundle } of RECEPTION_SURVEYS) {
    bundle.useStore.getState().close();
  }
}
