/**
 * Tree-planting → WorkItem spine write seam (Slice 8-A of the
 * 2026-05-21 habitat-feature unification — D1 predecessor auto-edges;
 * Slice 8-D layers D2/D3 catalog wiring on top).
 *
 * One WorkItem per vegetation-category point DesignElement of the four
 * kinds (`oak-tree`, `pine-tree`, `apple-tree`, `shrub`). Line / polygon
 * vegetation (hedgerow, orchard, silvopasture) is covered by
 * `agroforestrySpineSync`, not here.
 *
 * Per-element WorkItem:
 *   id:          `tree__<designElement.id>` (stable, idempotent)
 *   source:      'tree-planting'
 *   overridden:  false
 *   title:       "Plant oak tree" / "Plant pine tree" / …
 *   designLayer: 'vegetation'
 *   phaseId:     null (steward override drives declared-phase linkage)
 *
 * D2 (resourcing) + D3 (costing) ship together with Slice 8-D: the
 * seeder writes `materialsAuto` (one rolled-up kit line, flat per
 * point), `costRangeAuto` (per-element band, scale=1), and `laborHrs`
 * (flat per-kind value). Project-wide rollup lives in
 * `treePlantingEconomicsMath.computeTreePlantingProgramEconomics`.
 *
 * Covenant: strictly D0 work-tracking + D2/D3 project-cost surfaces —
 * no riba / gharar / CSRA / salam / investor / financing /
 * cost-of-capital semantics.
 */

import type { WorkItem, MaterialLine, CostRange } from '@ogden/shared';
import type { DesignElement } from '../../store/designElementsStore.js';
import { getDesignElementsForProject } from '../../store/builtEnvironmentSelectors.js';
import { useWorkItemStore } from '../../store/workItemStore.js';
import {
  TREE_PLANTING_CATALOG,
  treePlantingElementScale,
  scaledTreePlantingCostBand,
  scaledTreePlantingMaterials,
  type TreePlantingCatalogEntry,
} from './treePlantingCatalog.js';

/** Four vegetation-category point kinds the seeder owns. */
export const TREE_PLANTING_KINDS = [
  'oak-tree',
  'pine-tree',
  'apple-tree',
  'shrub',
] as const;

export type TreePlantingKind = (typeof TREE_PLANTING_KINDS)[number];

/** Verb-led title shown on the work-item card. */
const TREE_PLANTING_TITLES: Record<TreePlantingKind, string> = {
  'oak-tree': 'Plant oak tree',
  'pine-tree': 'Plant pine tree',
  'apple-tree': 'Plant apple tree',
  shrub: 'Plant shrub',
};

/** Stable composite id: `tree__<designElement.id>`. */
export function treePlantingProvenanceId(designElementId: string): string {
  return `tree__${designElementId}`;
}

function isTreePlantingKind(kind: string): kind is TreePlantingKind {
  return (TREE_PLANTING_KINDS as readonly string[]).includes(kind);
}

/**
 * Pure: build the WorkItem set a tree-planting generation would emit
 * for a project. One WorkItem per vegetation-category point
 * DesignElement of the four `TREE_PLANTING_KINDS`. Hedgerow / orchard /
 * silvopasture and non-vegetation kinds are silently filtered.
 *
 * When a catalog entry exists for the kind, the seeder fills
 * `materialsAuto`, `costRangeAuto`, and `laborHrs`. Items lacking a
 * catalog entry still emit a row (D0 floor) with empty `materialsAuto`
 * and no D2/D3 fields.
 */
export function seedTreePlantingWorkItems(args: {
  projectId: string;
  designElements: DesignElement[];
  catalog?: readonly TreePlantingCatalogEntry[];
  now?: () => string;
}): WorkItem[] {
  const { projectId, designElements } = args;
  const catalog = args.catalog ?? TREE_PLANTING_CATALOG;
  const nowFn = args.now ?? (() => new Date().toISOString());
  const created = nowFn();
  const out: WorkItem[] = [];
  for (const el of designElements) {
    if (el.category !== 'vegetation') continue;
    if (!isTreePlantingKind(el.kind)) continue;
    // Point-only; defensive guard against future hedgerow
    // misclassification.
    if (el.geometry.type !== 'Point') continue;
    const entry = catalog.find((e) => e.kind === el.kind);
    let materialsAuto: MaterialLine[] = [];
    let costRangeAuto: CostRange | undefined;
    let laborHrs: number | undefined;
    if (entry) {
      const scale = treePlantingElementScale(el, entry.geometry);
      materialsAuto = scaledTreePlantingMaterials(entry, scale);
      costRangeAuto = scaledTreePlantingCostBand(entry, scale);
      laborHrs = entry.installLaborHrs * scale;
    }
    const item: WorkItem = {
      id: treePlantingProvenanceId(el.id),
      projectId,
      source: 'tree-planting',
      overridden: false,
      generatedFromTreeElement: el.id,
      createdAt: created,
      updatedAt: created,
      title: TREE_PLANTING_TITLES[el.kind],
      designLayer: 'vegetation',
      phaseId: null,
      status: 'todo',
      doneAt: null,
      dependsOn: [],
      dependsOnAuto: [],
      precedesAuto: [],
      materialsAuto,
      equipmentRequiredAuto: [],
      linkedFeatureId: el.id,
      notes: '',
    };
    if (costRangeAuto) item.costRangeAuto = costRangeAuto;
    if (laborHrs !== undefined) item.laborHrs = laborHrs;
    out.push(item);
  }
  return out;
}

/**
 * Pure helper — derive tree-planting `costRangeAuto` per WorkItem id.
 * Mirrors `seedAgroforestryCosts` / `seedHabitatFeatureCosts`. Items
 * lacking a catalog entry or a recoverable source DesignElement are
 * omitted.
 */
export function seedTreePlantingCosts(args: {
  items: WorkItem[];
  designElements: DesignElement[];
  catalog?: readonly TreePlantingCatalogEntry[];
}): Map<string, CostRange> {
  const { items, designElements } = args;
  const catalog = args.catalog ?? TREE_PLANTING_CATALOG;
  const elById = new Map(designElements.map((e) => [e.id, e]));
  const out = new Map<string, CostRange>();
  for (const it of items) {
    if (it.source !== 'tree-planting') continue;
    const elId = it.generatedFromTreeElement;
    if (!elId) continue;
    const el = elById.get(elId);
    if (!el) continue;
    const entry = catalog.find((e) => e.kind === el.kind);
    if (!entry) continue;
    const scale = treePlantingElementScale(el, entry.geometry);
    out.set(it.id, scaledTreePlantingCostBand(entry, scale));
  }
  return out;
}

/**
 * Pure helper — derive tree-planting resourcing per WorkItem id.
 * Mirrors `seedAgroforestryResources` / `seedHabitatFeatureResources`.
 * Empty `equipment` (hand-tool planting, no machinery in the per-
 * element BOM); flat `materials` array (point geometry).
 */
export function seedTreePlantingResources(args: {
  items: WorkItem[];
  designElements: DesignElement[];
  catalog?: readonly TreePlantingCatalogEntry[];
}): Map<string, { equipment: string[]; materials: MaterialLine[] }> {
  const { items, designElements } = args;
  const catalog = args.catalog ?? TREE_PLANTING_CATALOG;
  const elById = new Map(designElements.map((e) => [e.id, e]));
  const out = new Map<
    string,
    { equipment: string[]; materials: MaterialLine[] }
  >();
  for (const it of items) {
    if (it.source !== 'tree-planting') continue;
    const elId = it.generatedFromTreeElement;
    if (!elId) continue;
    const el = elById.get(elId);
    if (!el) continue;
    const entry = catalog.find((e) => e.kind === el.kind);
    if (!entry) continue;
    const scale = treePlantingElementScale(el, entry.geometry);
    out.set(it.id, {
      equipment: [],
      materials: scaledTreePlantingMaterials(entry, scale),
    });
  }
  return out;
}

/**
 * Push a fresh tree-planting generation onto the spine. Preserves
 * steward-overridden + every non-tree-planting row (cross-source
 * preservation gate). Mirrors `pushHabitatFeaturesToSpine` shape.
 */
export function pushTreePlantingsToSpine(projectId: string): void {
  const designElements = getDesignElementsForProject(projectId);
  const items = seedTreePlantingWorkItems({ projectId, designElements });
  useWorkItemStore.getState().replaceTreePlantingRows(projectId, items);
}
