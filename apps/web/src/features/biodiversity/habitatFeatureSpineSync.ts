/**
 * Habitat-feature → WorkItem spine write seam (Slice 5 of the
 * 2026-05-21 habitat-feature unification).
 *
 * Mirrors `coverCropSpineSync.pushCoverCropPlanToSpine` shape: a pure
 * `seedHabitatFeatureWorkItems` builder + a side-effecting
 * `pushHabitatFeaturesToSpine(projectId)` reader that calls
 * `replaceHabitatFeatureRows` on the WorkItem spine.
 *
 * Scope: emits one WorkItem per habitat-category DesignElement (the 7
 * first-class kinds added in Slice 1 — owl-box, raptor-perch, nest-box,
 * brush-pile, snag, insectary-strip, wetland-edge). Hedgerow / pond /
 * shrub remain in their existing design categories; B5 already counts
 * them and D0 covers them via whatever seeder owns those kinds — they
 * are NOT emitted by this seeder.
 *
 * Per-element WorkItem:
 *   id:          `hf__<designElement.id>` (stable, idempotent)
 *   source:      'habitat-feature'
 *   overridden:  false
 *   title:       Per-kind verb-led label ("Install owl box", …)
 *   designLayer: mapped from `DesignElement.phase`
 *                  (trees|soil → 'vegetation', water → 'water')
 *   phaseId:     null (no declared-phase auto-link — PhaseKey and
 *                BuildPhase are separate systems; steward can override)
 *
 * Covenant: strictly D0 work-tracking + D2/D3 project-cost surfaces —
 * no riba / gharar / CSRA / salam / investor / financing /
 * cost-of-capital semantics. Slice 6 closed D2 (materialsAuto via
 * `seedHabitatFeatureResources`) and D3 (costRangeAuto via
 * `seedHabitatFeatureCosts`, plus per-item laborHrs) by joining the
 * placed element to `HABITAT_FEATURE_CATALOG` and scaling by element
 * geometry. Project-wide rollup lives in
 * `habitatFeatureEconomicsMath.computeHabitatFeatureProgramEconomics`.
 *
 * See `~/.claude/plans/habitat-features-need-a-lively-oasis.md` and the
 * forthcoming ADR `wiki/decisions/2026-05-21-atlas-habitat-features-unification.md`.
 */

import type { WorkItem, MaterialLine, CostRange } from '@ogden/shared';
import type { DesignElement } from '../../store/designElementsStore.js';
import { getDesignElementsForProject } from '../../store/builtEnvironmentSelectors.js';
import { useWorkItemStore } from '../../store/workItemStore.js';
import {
  HABITAT_FEATURE_CATALOG,
  habitatCatalogEntryFor,
  habitatElementScale,
  scaledCostBand,
  scaledMaterials,
  type HabitatFeatureCatalogEntry,
} from './habitatFeatureCatalog.js';
import { seedHabitatFeatureDependencies } from './habitatFeatureDependencyGraph.js';

/** Seven habitat-category kinds the seeder owns. */
export const HABITAT_FEATURE_KINDS = [
  'owl-box',
  'raptor-perch',
  'nest-box',
  'brush-pile',
  'snag',
  'insectary-strip',
  'wetland-edge',
] as const;

export type HabitatFeatureKind = (typeof HABITAT_FEATURE_KINDS)[number];

/** Verb-led title shown on the work-item card. */
const HABITAT_FEATURE_TITLES: Record<HabitatFeatureKind, string> = {
  'owl-box': 'Install owl box',
  'raptor-perch': 'Place raptor perch',
  'nest-box': 'Install nest box',
  'brush-pile': 'Build brush pile',
  snag: 'Designate snag',
  'insectary-strip': 'Establish insectary strip',
  'wetland-edge': 'Establish wetland edge',
};

/** Stable composite id: `hf__<designElement.id>`. */
export function habitatFeatureProvenanceId(designElementId: string): string {
  return `hf__${designElementId}`;
}

function isHabitatFeatureKind(kind: string): kind is HabitatFeatureKind {
  return (HABITAT_FEATURE_KINDS as readonly string[]).includes(kind);
}

/** Map the Yeomans `PhaseKey` carried on the DesignElement to the
 *  WorkItem `designLayer` taxonomy. The two enums overlap but aren't
 *  identical — PhaseKey has 8 levels (climate/landshape/water/access/
 *  trees/buildings/subdivision/soil) while `designLayer` has 4 buckets
 *  (earthworks/water/vegetation/structures). */
function phaseToDesignLayer(
  phase: DesignElement['phase'],
): WorkItem['designLayer'] | undefined {
  switch (phase) {
    case 'landshape':
      return 'earthworks';
    case 'water':
      return 'water';
    case 'trees':
    case 'soil':
      return 'vegetation';
    case 'buildings':
      return 'structures';
    default:
      return undefined;
  }
}

/**
 * Pure: build the WorkItem set a habitat-feature generation would emit
 * for a project. One WorkItem per habitat-category DesignElement.
 * Non-habitat kinds (hedgerow / pond / shrub / paddock / structure / …)
 * are silently filtered.
 */
export function seedHabitatFeatureWorkItems(args: {
  projectId: string;
  designElements: DesignElement[];
  catalog?: readonly HabitatFeatureCatalogEntry[];
  now?: () => string;
}): WorkItem[] {
  const { projectId, designElements } = args;
  const catalog = args.catalog ?? HABITAT_FEATURE_CATALOG;
  const nowFn = args.now ?? (() => new Date().toISOString());
  const created = nowFn();
  // Slice 8-B (D1): project steward-named host-tree linkages into
  // per-WorkItem `dependsOnAuto`. Missing / non-vegetation / non-point
  // hosts collapse to "no edge" — see `habitatFeatureDependencyGraph`.
  const depsByItemId = seedHabitatFeatureDependencies({ designElements });
  const out: WorkItem[] = [];
  for (const el of designElements) {
    if (!isHabitatFeatureKind(el.kind)) continue;
    const designLayer = phaseToDesignLayer(el.phase);
    // Slice 6 (D2 + D3): pull catalog entry + scale by geometry.
    // Point kinds → flat per-element values; line/polygon kinds → scaled
    // by polyline length / polygon area. Missing catalog entry
    // (defensive, won't happen for the 7 known kinds) collapses to
    // empty BOM and no cost/labor estimate.
    const entry = catalog.find((e) => e.kind === el.kind);
    let materialsAuto: MaterialLine[] = [];
    let costRangeAuto: CostRange | undefined;
    let laborHrs: number | undefined;
    if (entry) {
      const scale = habitatElementScale(el, entry.geometry);
      materialsAuto = scaledMaterials(entry, scale);
      costRangeAuto = scaledCostBand(entry, scale);
      laborHrs = entry.installLaborHrs * scale;
    }
    const item: WorkItem = {
      id: habitatFeatureProvenanceId(el.id),
      projectId,
      source: 'habitat-feature',
      overridden: false,
      generatedFromHabitatElement: el.id,
      createdAt: created,
      updatedAt: created,
      title: HABITAT_FEATURE_TITLES[el.kind],
      phaseId: null,
      status: 'todo',
      doneAt: null,
      dependsOn: [],
      dependsOnAuto: depsByItemId.get(habitatFeatureProvenanceId(el.id)) ?? [],
      precedesAuto: [],
      materialsAuto,
      equipmentRequiredAuto: [],
      linkedFeatureId: el.id,
      notes: '',
    };
    if (designLayer) item.designLayer = designLayer;
    if (costRangeAuto) item.costRangeAuto = costRangeAuto;
    if (laborHrs !== undefined) item.laborHrs = laborHrs;
    out.push(item);
  }
  return out;
}

/**
 * Slice 6 (D3): pure helper — derive habitat-feature-seeded
 * `costRangeAuto` per WorkItem id. Mirrors `seedCoverCropCosts` shape.
 * Items without a recoverable catalog entry or source DesignElement
 * are omitted; the steward sees no auto-band on those rows.
 */
export function seedHabitatFeatureCosts(args: {
  items: WorkItem[];
  designElements: DesignElement[];
  catalog?: readonly HabitatFeatureCatalogEntry[];
}): Map<string, CostRange> {
  const { items, designElements } = args;
  const catalog = args.catalog ?? HABITAT_FEATURE_CATALOG;
  const elById = new Map(designElements.map((e) => [e.id, e]));
  const out = new Map<string, CostRange>();
  for (const it of items) {
    if (it.source !== 'habitat-feature') continue;
    const elId = it.generatedFromHabitatElement;
    if (!elId) continue;
    const el = elById.get(elId);
    if (!el) continue;
    const entry = catalog.find((e) => e.kind === el.kind);
    if (!entry) continue;
    const scale = habitatElementScale(el, entry.geometry);
    out.set(it.id, scaledCostBand(entry, scale));
  }
  return out;
}

/**
 * Slice 6 (D2): pure helper — derive habitat-feature-seeded resourcing
 * per WorkItem id. Mirrors `seedCoverCropResources` shape: keyed by
 * WorkItem.id, each entry carries empty `equipment` (habitat-feature
 * install is hand-tool labor; no machinery in the per-element BOM)
 * and the scaled `materials` array. Items lacking a catalog entry or
 * a recoverable source DesignElement are omitted from the map.
 *
 * Exposed for downstream cashflow / phase-rollup consumers that want
 * to compute resourcing without forcing a spine push.
 */
export function seedHabitatFeatureResources(args: {
  items: WorkItem[];
  designElements: DesignElement[];
  catalog?: readonly HabitatFeatureCatalogEntry[];
}): Map<string, { equipment: string[]; materials: MaterialLine[] }> {
  const { items, designElements } = args;
  const catalog = args.catalog ?? HABITAT_FEATURE_CATALOG;
  const elById = new Map(designElements.map((e) => [e.id, e]));
  const out = new Map<string, { equipment: string[]; materials: MaterialLine[] }>();
  for (const it of items) {
    if (it.source !== 'habitat-feature') continue;
    const elId = it.generatedFromHabitatElement;
    if (!elId) continue;
    const el = elById.get(elId);
    if (!el) continue;
    const entry = catalog.find((e) => e.kind === el.kind);
    if (!entry) continue;
    const scale = habitatElementScale(el, entry.geometry);
    out.set(it.id, { equipment: [], materials: scaledMaterials(entry, scale) });
  }
  return out;
}

// `habitatCatalogEntryFor` is re-exported here so downstream call sites
// can stay on a single import surface (the spine-sync module).
export { habitatCatalogEntryFor };

/**
 * Push a fresh habitat-feature generation onto the spine. Preserves
 * steward-overridden + every non-habitat-feature row (cross-source
 * preservation gate). Mirrors `pushCoverCropPlanToSpine` shape.
 *
 * Reads through `getDesignElementsForProject` (the post-2026-05-12
 * V2-direct selector), so structure-class entities are projected from
 * `builtEnvironmentStoreV2` and land-design kinds come from
 * `landDesignStore`. Drafts are excluded by default (the steward must
 * commit a habitat element before it seeds work).
 */
export function pushHabitatFeaturesToSpine(projectId: string): void {
  const designElements = getDesignElementsForProject(projectId);
  const items = seedHabitatFeatureWorkItems({ projectId, designElements });
  useWorkItemStore.getState().replaceHabitatFeatureRows(projectId, items);
}
