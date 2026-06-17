/**
 * receptionSurveys -- the Plan-stage Reception survey stores, each built from
 * `createSurveyStore`. Two tiers, nine surveys (2026-06-16/17 restructure):
 *
 * Tier 2 -- Systems Reading (Stratum-3):
 *   2.1 s3-hydrology            -- water movement (flow lines + wet/dry zones)
 *   2.2 s3-soil                 -- soil/subsurface (sample points + zones)
 *   2.3 rf-s3-nutrient-cycling  -- organic-matter / nutrient flows (zones)
 *   2.4 rf-s3-pest-pressure     -- pest / disease / weed pressure (zones)
 *   2.5 silv-sec-s3-stock-water -- livestock water availability (points + zones)
 *
 * Tier 1 -- Land Reading (Stratum-2; added Stage 3 of the Tier-1 restructure):
 *   1.2 s2-climate              -- sun/wind/fire/frost/hazard sectors (zones)
 *   1.4 s2-infrastructure       -- buildings/roads/services/fencing/gates (mixed)
 *   1.5 rf-s2-land-health       -- erosion/compaction/degradation (zones)
 *   1.6 rf-s2-landscape-context -- catchment/corridors/vectors (mixed)
 *   (1.1 terrain + 1.3 ecology keep their bespoke slope/vegetation stores.)
 *
 * Each store is a module singleton so syncManifest can register it
 * (`ogden-recep-*-survey`, byProject blob) and the reception workbench can read
 * its drawn-feature count. `selectReceptionSurveyRecordCount(projectId, tier?)`
 * sums the stores' feature counts for a project -- optionally tier-scoped so the
 * Tier-1 view is fed only the s2-* surveys -- threaded into
 * `deriveReceptionProgress(..., capturedRecords)` and the reference panel.
 *
 * Class palettes + geometry kinds are reconciled against the resolved Stratum-2
 * and Stratum-3 checklists (universal + regen + silvopasture/residential
 * patches) and the existing `objectiveActTools` ids. ASCII-only labels per the
 * project string-escaping rule.
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

// ===========================================================================
// Tier 1 -- Land Reading surveys (Stratum-2). Climate / infrastructure /
// land-health / landscape-context gain bespoke map capture; terrain (1.1) and
// ecology (1.3) keep their existing slopeSurveyStore / vegetationSurveyStore.
// ===========================================================================

// ---------------------------------------------------------------------------
// 1.2 Climate & sectors (s2-climate) -- poly sectors. Keys mirror the
// `objectiveActTools` climate ids (sun/wind/fire-sector + frost/hazard).
// ---------------------------------------------------------------------------

export type ClimateSurveyClass =
  | 'sun-sector'
  | 'wind-sector'
  | 'fire-sector'
  | 'frost-pocket'
  | 'hazard-zone';

const CLIMATE_CLASSES: readonly SurveyClassDef<ClimateSurveyClass>[] = [
  { key: 'sun-sector', label: 'Sun / solar sector', color: '#f1c40f', kind: 'poly' },
  { key: 'wind-sector', label: 'Wind exposure sector', color: '#7fa8c9', kind: 'poly' },
  { key: 'fire-sector', label: 'Fire-risk sector', color: '#e74c3c', kind: 'poly' },
  { key: 'frost-pocket', label: 'Frost pocket', color: '#aed6f1', kind: 'poly' },
  { key: 'hazard-zone', label: 'Hazard zone', color: '#b9770e', kind: 'poly' },
];

export const climateSurvey = createSurveyStore<ClimateSurveyClass>({
  persistName: 'ogden-recep-climate-survey',
  idPrefix: 'recep-climate',
  toolPrefix: 'plan.reception.climate',
  sourceObjectiveId: 's2-climate',
  classes: CLIMATE_CLASSES,
});

// ---------------------------------------------------------------------------
// 1.4 Infrastructure & access (s2-infrastructure) -- mixed geometry. Buildings
// poly; roads/power/water/fencing line; gates point. Keys mirror the
// `objectiveActTools` access-utilities ids.
// ---------------------------------------------------------------------------

export type InfrastructureSurveyClass =
  | 'building'
  | 'road'
  | 'power-line'
  | 'water-line'
  | 'fencing'
  | 'gate';

const INFRASTRUCTURE_CLASSES: readonly SurveyClassDef<InfrastructureSurveyClass>[] = [
  { key: 'building', label: 'Building footprint', color: '#607d8b', kind: 'poly' },
  { key: 'road', label: 'Road / track / laneway', color: '#8d6e63', kind: 'line' },
  { key: 'power-line', label: 'Power line / service', color: '#f39c12', kind: 'line' },
  { key: 'water-line', label: 'Water line / supply', color: '#2980b9', kind: 'line' },
  { key: 'fencing', label: 'Fencing', color: '#555555', kind: 'line' },
  { key: 'gate', label: 'Gate / access point', color: '#27ae60', kind: 'point' },
];

export const infrastructureSurvey = createSurveyStore<InfrastructureSurveyClass>({
  persistName: 'ogden-recep-infrastructure-survey',
  idPrefix: 'recep-infrastructure',
  toolPrefix: 'plan.reception.infrastructure',
  sourceObjectiveId: 's2-infrastructure',
  classes: INFRASTRUCTURE_CLASSES,
});

// ---------------------------------------------------------------------------
// 1.5 Land health & degradation (rf-s2-land-health) -- poly zones.
// ---------------------------------------------------------------------------

export type LandHealthSurveyClass =
  | 'erosion'
  | 'compaction'
  | 'weed-burden'
  | 'bare-ground'
  | 'waterlogging';

const LAND_HEALTH_CLASSES: readonly SurveyClassDef<LandHealthSurveyClass>[] = [
  { key: 'erosion', label: 'Erosion (sheet/rill/gully)', color: '#a0522d', kind: 'poly' },
  { key: 'compaction', label: 'Compaction zone', color: '#6b4f2a', kind: 'poly' },
  { key: 'weed-burden', label: 'Weed burden', color: '#8e44ad', kind: 'poly' },
  { key: 'bare-ground', label: 'Bare ground', color: '#d9b365', kind: 'poly' },
  { key: 'waterlogging', label: 'Waterlogging / poor drainage', color: '#4a90d9', kind: 'poly' },
];

export const landHealthSurvey = createSurveyStore<LandHealthSurveyClass>({
  persistName: 'ogden-recep-land-health-survey',
  idPrefix: 'recep-land-health',
  toolPrefix: 'plan.reception.land-health',
  sourceObjectiveId: 'rf-s2-land-health',
  classes: LAND_HEALTH_CLASSES,
});

// ---------------------------------------------------------------------------
// 1.6 Surrounding landscape context (rf-s2-landscape-context) -- mixed.
// Catchment + neighbour land-use poly; wildlife corridor + off-farm vector line.
// ---------------------------------------------------------------------------

export type LandscapeSurveyClass =
  | 'catchment'
  | 'wildlife-corridor'
  | 'off-farm-vector'
  | 'neighbour-land-use';

const LANDSCAPE_CLASSES: readonly SurveyClassDef<LandscapeSurveyClass>[] = [
  { key: 'catchment', label: 'Water catchment', color: '#5ba3c9', kind: 'poly' },
  { key: 'wildlife-corridor', label: 'Wildlife corridor', color: '#2e7d32', kind: 'line' },
  { key: 'off-farm-vector', label: 'Off-farm vector (spray/runoff)', color: '#c0392b', kind: 'line' },
  { key: 'neighbour-land-use', label: 'Neighbour land use', color: '#95a5a6', kind: 'poly' },
];

export const landscapeSurvey = createSurveyStore<LandscapeSurveyClass>({
  persistName: 'ogden-recep-landscape-survey',
  idPrefix: 'recep-landscape',
  toolPrefix: 'plan.reception.landscape',
  sourceObjectiveId: 'rf-s2-landscape-context',
  classes: LANDSCAPE_CLASSES,
});

// ---------------------------------------------------------------------------
// Registry -- all nine surveys, keyed by their resolved objective id. The Tier-2
// (s3-*) surveys lead so their indices stay stable; the four Tier-1 (s2-*)
// surveys follow. The canvas mounts a layer + draw host per entry, and the
// reception record-count sums their feature counts (optionally tier-scoped).
// ---------------------------------------------------------------------------

/** A registry entry: the source objective + its (type-erased) store bundle. */
export interface ReceptionSurveyEntry {
  objectiveId: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  bundle: SurveyStoreBundle<any>;
}

export const RECEPTION_SURVEYS: readonly ReceptionSurveyEntry[] = [
  // Tier 2 -- Systems Reading (Stratum-3). Indices 0-4 are load-bearing for the
  // fixed-order hook selectors below; do not reorder.
  { objectiveId: hydrologySurvey.config.sourceObjectiveId, bundle: hydrologySurvey },
  { objectiveId: soilSurvey.config.sourceObjectiveId, bundle: soilSurvey },
  { objectiveId: nutrientSurvey.config.sourceObjectiveId, bundle: nutrientSurvey },
  { objectiveId: pestSurvey.config.sourceObjectiveId, bundle: pestSurvey },
  { objectiveId: stockWaterSurvey.config.sourceObjectiveId, bundle: stockWaterSurvey },
  // Tier 1 -- Land Reading (Stratum-2). Indices 5-8.
  { objectiveId: climateSurvey.config.sourceObjectiveId, bundle: climateSurvey },
  { objectiveId: infrastructureSurvey.config.sourceObjectiveId, bundle: infrastructureSurvey },
  { objectiveId: landHealthSurvey.config.sourceObjectiveId, bundle: landHealthSurvey },
  { objectiveId: landscapeSurvey.config.sourceObjectiveId, bundle: landscapeSurvey },
];

/** Reception-survey tier. Tier 1 = Land Reading (Stratum-2); Tier 2 = Systems
 *  Reading (Stratum-3). */
export type ReceptionSurveyTier = 'tier1' | 'tier2';

/**
 * Which reception tier a survey objective belongs to, by id. Every Land-Reading
 * survey id contains `s2-` (`s2-climate`, `rf-s2-land-health`, ...); every
 * Systems-Reading id contains `s3-` and none contains `s2-`. A self-contained
 * prefix check keeps this store layer free of a tier-shell (`receptionModel`)
 * import.
 */
export function surveyTierOf(objectiveId: string): ReceptionSurveyTier {
  return objectiveId.includes('s2-') ? 'tier1' : 'tier2';
}

/** The reception survey whose source objective is `objectiveId`, or undefined. */
export function receptionSurveyFor(
  objectiveId: string | null | undefined,
): ReceptionSurveyEntry | undefined {
  if (objectiveId == null) return undefined;
  return RECEPTION_SURVEYS.find((s) => s.objectiveId === objectiveId);
}

/**
 * The Tier-1 (Land-Reading) reception survey whose objective's LEAD decision
 * (`<objectiveId>-c1`) this item id is -- else undefined. DecisionWorkingPanel
 * uses it to surface the survey's Observe-Output map affordance on the
 * objective's entry decision (parity with the bespoke slope/veg triggers, which
 * host on one specific item).
 *
 * Scoped to tier 1: the four new s2-* Land-Reading surveys are the ones gaining
 * an open trigger here; the five Tier-2 s3-* surveys keep their deferred status
 * (extend by dropping the `surveyTierOf` filter).
 */
export function receptionSurveyForLeadItem(
  itemId: string | null | undefined,
): ReceptionSurveyEntry | undefined {
  if (!itemId) return undefined;
  return RECEPTION_SURVEYS.find(
    (e) =>
      itemId === `${e.objectiveId}-c1` &&
      surveyTierOf(e.objectiveId) === 'tier1',
  );
}

/**
 * Total DRAWN survey features across the reception stores for a project,
 * optionally scoped to one tier (`'tier1'` = the four s2-* surveys; `'tier2'` =
 * the five s3-* surveys; omitted = all nine). A plain snapshot read (not a
 * hook) -- the reception host calls it inside a `useMemo`/subscription and
 * threads it into `deriveReceptionProgress(..., capturedRecords)` and the
 * reference-panel "NN captured" caption.
 */
export function selectReceptionSurveyRecordCount(
  projectId: string,
  tier?: ReceptionSurveyTier,
): number {
  let count = 0;
  for (const { objectiveId, bundle } of RECEPTION_SURVEYS) {
    if (tier && surveyTierOf(objectiveId) !== tier) continue;
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
  const a5 = climateSurvey.useStore((s) => s.active && s.activeProjectId === projectId);
  const a6 = infrastructureSurvey.useStore((s) => s.active && s.activeProjectId === projectId);
  const a7 = landHealthSurvey.useStore((s) => s.active && s.activeProjectId === projectId);
  const a8 = landscapeSurvey.useStore((s) => s.active && s.activeProjectId === projectId);
  if (a0) return RECEPTION_SURVEYS[0]!;
  if (a1) return RECEPTION_SURVEYS[1]!;
  if (a2) return RECEPTION_SURVEYS[2]!;
  if (a3) return RECEPTION_SURVEYS[3]!;
  if (a4) return RECEPTION_SURVEYS[4]!;
  if (a5) return RECEPTION_SURVEYS[5]!;
  if (a6) return RECEPTION_SURVEYS[6]!;
  if (a7) return RECEPTION_SURVEYS[7]!;
  if (a8) return RECEPTION_SURVEYS[8]!;
  return null;
}

/**
 * Reactive total drawn reception features across the stores for a project
 * (re-renders as features are drawn/removed), optionally scoped to one tier so
 * the Tier-1 view counts only its four s2-* surveys. The snapshot equivalent is
 * selectReceptionSurveyRecordCount; this hook feeds deriveReceptionProgress'
 * `capturedRecords` arg and the reference-panel "NN survey records" caption.
 *
 * All nine selectors run unconditionally (fixed order) -- rules-of-hooks safe;
 * the tier filter is applied to the summation, not the subscription.
 */
export function useReceptionSurveyRecordCount(
  projectId: string,
  tier?: ReceptionSurveyTier,
): number {
  const c0 = hydrologySurvey.useStore((s) => Object.keys(s.byProject[projectId] ?? {}).length);
  const c1 = soilSurvey.useStore((s) => Object.keys(s.byProject[projectId] ?? {}).length);
  const c2 = nutrientSurvey.useStore((s) => Object.keys(s.byProject[projectId] ?? {}).length);
  const c3 = pestSurvey.useStore((s) => Object.keys(s.byProject[projectId] ?? {}).length);
  const c4 = stockWaterSurvey.useStore((s) => Object.keys(s.byProject[projectId] ?? {}).length);
  const c5 = climateSurvey.useStore((s) => Object.keys(s.byProject[projectId] ?? {}).length);
  const c6 = infrastructureSurvey.useStore((s) => Object.keys(s.byProject[projectId] ?? {}).length);
  const c7 = landHealthSurvey.useStore((s) => Object.keys(s.byProject[projectId] ?? {}).length);
  const c8 = landscapeSurvey.useStore((s) => Object.keys(s.byProject[projectId] ?? {}).length);
  const counts = [c0, c1, c2, c3, c4, c5, c6, c7, c8];
  return RECEPTION_SURVEYS.reduce(
    (sum, entry, i) =>
      tier && surveyTierOf(entry.objectiveId) !== tier ? sum : sum + (counts[i] ?? 0),
    0,
  );
}

/** Close every reception survey takeover (mutual-exclusion with the other rail
 *  takeovers; mirrors the slope/veg `close()` calls in onOpenSectorsEditor). */
export function closeAllReceptionSurveys(): void {
  for (const { bundle } of RECEPTION_SURVEYS) {
    bundle.useStore.getState().close();
  }
}
